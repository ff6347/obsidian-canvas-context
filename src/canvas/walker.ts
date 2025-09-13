import type { ModelMessage } from "ai";
import type { CanvasViewData } from "obsidian-typings";
import { App, TFile, getFrontMatterInfo } from "obsidian";
import matter from "gray-matter";

export async function canvasGraphWalker(
	currentNodeId: string,
	data: CanvasViewData,
	app: App,
): Promise<ModelMessage[]> {
	const messages: ModelMessage[] = [];
	const visited = new Set<string>();

	// Get parent chain by walking UP the connections
	const parentChain = getParentChain(currentNodeId, data, visited);

	// For each node in parent chain, collect horizontal context
	const contextNodes: string[] = [];
	for (const nodeId of parentChain) {
		const horizontalNodes = getHorizontalContext(nodeId, data, parentChain);
		contextNodes.push(...horizontalNodes);
	}

	// Combine all relevant node IDs
	const allNodeIds = [...parentChain, ...contextNodes];

	// Separate system messages from other messages
	const systemMessages: ModelMessage[] = [];
	const conversationMessages: ModelMessage[] = [];

	// Convert node IDs to actual nodes and build messages
	for (const nodeId of allNodeIds) {
		const node = data.nodes.find((n) => n.id === nodeId);
		if (node) {
			const { role, content } = await getNodeContentAndRole(node, app);
			// Skip nodes with no content (like text nodes)
			if (content) {
				const allowedRoles = ["system", "user", "assistant"];
				const validRole = role && allowedRoles.includes(role) ? role : "user";

				// Check if this is horizontal context (not in parent chain)
				const isHorizontalContext =
					contextNodes.includes(nodeId) && !parentChain.includes(nodeId);

				// Wrap horizontal context content
				const finalContent =
					isHorizontalContext && validRole === "user"
						? `<additional-document>\n${content}\n</additional-document>`
						: content;

				// Create properly typed message based on role
				let message: ModelMessage;
				if (validRole === "system") {
					message = { role: "system", content: finalContent };
					systemMessages.push(message);
				} else if (validRole === "assistant") {
					message = { role: "assistant", content: finalContent };
					conversationMessages.push(message);
				} else {
					message = { role: "user", content: finalContent };
					conversationMessages.push(message);
				}
			}
		}
	}

	// Combine messages with system prompts first
	messages.push(...systemMessages, ...conversationMessages);

	return messages;
}

function getParentChain(
	nodeId: string,
	data: CanvasViewData,
	visited: Set<string>,
): string[] {
	const chain: string[] = [];
	let current = nodeId;

	while (current && !visited.has(current)) {
		chain.unshift(current); // Add to front to maintain order
		visited.add(current);

		// Find edges pointing TO current node (parents)
		const parentEdge = data.edges.find((edge) => edge.toNode === current);
		current = parentEdge?.fromNode || "";
	}

	return chain;
}

/**
 * Only gets directly connected nodes not their children or siblings.
 */
function getHorizontalContext(
	nodeId: string,
	data: CanvasViewData,
	excludeNodes: string[],
): string[] {
	const horizontalNodes: string[] = [];

	// Find all edges connected to this node
	const connectedEdges = data.edges.filter(
		(edge) => edge.fromNode === nodeId || edge.toNode === nodeId,
	);

	for (const edge of connectedEdges) {
		const connectedNodeId =
			edge.fromNode === nodeId ? edge.toNode : edge.fromNode;

		// Skip if already in excludeNodes (parent chain)
		if (!excludeNodes.includes(connectedNodeId)) {
			// Only add edges that point TO this node (not FROM this node to children)
			// This ensures we only get horizontal context, not child nodes
			if (edge.toNode === nodeId) {
				horizontalNodes.push(connectedNodeId);
			}
		}
	}

	return horizontalNodes;
}

async function getNodeContentAndRole(
	node: any,
	app: App,
): Promise<{ role: string | null; content: string | null }> {
	// Handle different node types
	if (node.type === "text") {
		// Parse text nodes with frontmatter support
		const parsed = matter(node.text || "");
		return {
			role: parsed.data.role || "user", // Default to user role
			content: parsed.content.trim() || null,
		};
	} else if (node.type === "file") {
		// For file nodes, use metadata cache for frontmatter and cachedRead for content
		try {
			const file = app.vault.getAbstractFileByPath(node.file);
			if (file instanceof TFile) {
				// Get frontmatter from metadata cache (already parsed by Obsidian)
				const fileCache = app.metadataCache.getFileCache(file);
				const frontmatter = fileCache?.frontmatter;

				// Get file content without frontmatter using Obsidian's built-in method
				const content = await app.vault.cachedRead(file);
				const frontmatterInfo = getFrontMatterInfo(content);
				const contentWithoutFrontmatter = frontmatterInfo.exists
					? content.substring(frontmatterInfo.contentStart)
					: content;

				return {
					role: frontmatter?.role || null,
					content: contentWithoutFrontmatter || content,
				};
			}
		} catch (error) {
			console.warn("Failed to read file:", node.file, error);
		}
		return {
			role: null,
			content: `File: ${node.file}`,
		};
	} else if (node.type === "url") {
		return {
			role: null,
			content: `URL: ${node.url}`,
		};
	}

	return { role: null, content: null };
}
