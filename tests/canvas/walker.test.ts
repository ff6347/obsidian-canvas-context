/* oxlint-disable eslint/max-lines eslint/max-lines-per-function */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canvasGraphWalker } from "../../src/canvas/walker.js";
import type { CanvasViewData } from "obsidian-typings";
import type { App } from "obsidian";
import { TFile } from "../mocks/obsidian.js";

// Mock Obsidian App and related APIs
const mockApp = {
	vault: {
		getAbstractFileByPath: vi.fn(),
		cachedRead: vi.fn(),
	},
	metadataCache: {
		getFileCache: vi.fn(),
	},
} as unknown as App;

const createMockFile = (path: string) => new TFile(path);

describe("Canvas Tree Walker", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mocks - return a proper TFile instance
		(mockApp.vault.getAbstractFileByPath as any).mockImplementation(
			(path: string) => {
				const file = createMockFile(path);
				return file;
			},
		);
		(mockApp.vault.cachedRead as any).mockResolvedValue("Default content");
		(mockApp.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { role: "user" },
		});
	});

	describe("Parent Chain Walking", () => {
		it("should only walk UP parent chain, not include children", async () => {
			// Test case: system -> user1 -> assistant1 -> user2 -> assistant2
			// When clicking on user2, should only include: system, user1, assistant1, user2
			// Should NOT include assistant2 (child node)

			const canvasData: CanvasViewData = {
				nodes: [
					{
						id: "system",
						type: "file",
						file: "system.md",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "user1",
						type: "file",
						file: "user1.md",
						x: 0,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "assistant1",
						type: "file",
						file: "assistant1.md",
						x: 0,
						y: 200,
						width: 100,
						height: 100,
					},
					{
						id: "user2",
						type: "file",
						file: "user2.md",
						x: 0,
						y: 300,
						width: 100,
						height: 100,
					},
					{
						id: "assistant2",
						type: "file",
						file: "assistant2.md",
						x: 0,
						y: 400,
						width: 100,
						height: 100,
					},
				],
				edges: [
					{
						id: "edge1",
						fromNode: "system",
						toNode: "user1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge2",
						fromNode: "user1",
						toNode: "assistant1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge3",
						fromNode: "assistant1",
						toNode: "user2",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge4",
						fromNode: "user2",
						toNode: "assistant2",
						fromSide: "bottom",
						toSide: "top",
					},
				],
			};

			// Mock different frontmatter for each node (only nodes that will be processed)
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }) // assistant1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }); // user2

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("System prompt content")
				.mockResolvedValueOnce("User 1 content")
				.mockResolvedValueOnce("Assistant 1 content")
				.mockResolvedValueOnce("User 2 content");

			const result = await canvasGraphWalker("user2", canvasData, mockApp);

			// Should only include nodes in parent chain: system, user1, assistant1, user2
			// Should NOT include assistant2 (child node)
			expect(result).toHaveLength(4);

			// Check that we have the correct roles in the right order
			expect(result[0]?.role).toBe("system"); // System prompt first
			expect(result[1]?.role).toBe("user"); // user1
			expect(result[2]?.role).toBe("assistant"); // assistant1
			expect(result[3]?.role).toBe("user"); // user2 (target node)

			// Verify content doesn't include assistant2
			const allContent = result.map((msg: any) => msg.content).join(" ");
			expect(allContent).toContain("System prompt content");
			expect(allContent).toContain("User 1 content");
			expect(allContent).toContain("Assistant 1 content");
			expect(allContent).toContain("User 2 content");
			expect(allContent).not.toContain("Assistant 2 content");
		});

		it("should handle linear chain correctly when clicking on middle node", async () => {
			// Test clicking on assistant1 in: system -> user1 -> assistant1 -> user2
			// Should include: system, user1, assistant1
			// Should NOT include: user2 (child)

			const canvasData: CanvasViewData = {
				nodes: [
					{
						id: "system",
						type: "file",
						file: "system.md",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "user1",
						type: "file",
						file: "user1.md",
						x: 0,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "assistant1",
						type: "file",
						file: "assistant1.md",
						x: 0,
						y: 200,
						width: 100,
						height: 100,
					},
					{
						id: "user2",
						type: "file",
						file: "user2.md",
						x: 0,
						y: 300,
						width: 100,
						height: 100,
					},
				],
				edges: [
					{
						id: "edge1",
						fromNode: "system",
						toNode: "user1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge2",
						fromNode: "user1",
						toNode: "assistant1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge3",
						fromNode: "assistant1",
						toNode: "user2",
						fromSide: "bottom",
						toSide: "top",
					},
				],
			};

			// Reset mocks for this test
			vi.clearAllMocks();
			(mockApp.vault.getAbstractFileByPath as any).mockImplementation(
				(path: string) => createMockFile(path),
			);

			// Mock in the order the walker will process: system, user1, assistant1
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }); // assistant1

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("System prompt")
				.mockResolvedValueOnce("User 1 question")
				.mockResolvedValueOnce("Assistant 1 response");

			const result = await canvasGraphWalker("assistant1", canvasData, mockApp);

			// Should only include parent chain up to assistant1
			expect(result).toHaveLength(3);

			// Verify the main bug is fixed: no user2 content included
			const allContent = result.map((msg: any) => msg.content).join(" ");
			expect(allContent).not.toContain("User 2");

			// Verify we have the right number of each role
			const systemMsgs = result.filter((msg: any) => msg.role === "system");
			const userMsgs = result.filter((msg: any) => msg.role === "user");
			const assistantMsgs = result.filter(
				(msg: any) => msg.role === "assistant",
			);

			expect(systemMsgs).toHaveLength(1);
			expect(userMsgs).toHaveLength(1);
			expect(assistantMsgs).toHaveLength(1);

			// Verify system messages come first
			expect(result[0]?.role).toBe("system");
		});
	});

	describe("Horizontal Context", () => {
		it("should include horizontal context from parent chain nodes only", async () => {
			// Test horizontal context: context nodes connected to parent chain
			// system -> user1 -> assistant1
			//   ↑        ↑
			// context1  context2  (these point TO the parent chain nodes)

			const canvasData: CanvasViewData = {
				nodes: [
					{
						id: "system",
						type: "file",
						file: "system.md",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "context1",
						type: "file",
						file: "context1.md",
						x: -100,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "user1",
						type: "file",
						file: "user1.md",
						x: 0,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "context2",
						type: "file",
						file: "context2.md",
						x: -100,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "assistant1",
						type: "file",
						file: "assistant1.md",
						x: 0,
						y: 200,
						width: 100,
						height: 100,
					},
				],
				edges: [
					{
						id: "edge1",
						fromNode: "system",
						toNode: "user1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge2",
						fromNode: "user1",
						toNode: "assistant1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge3",
						fromNode: "context1",
						toNode: "system",
						fromSide: "right",
						toSide: "left",
					}, // horizontal context
					{
						id: "edge4",
						fromNode: "context2",
						toNode: "user1",
						fromSide: "right",
						toSide: "left",
					}, // horizontal context
				],
			};

			// Reset mocks for this test
			vi.clearAllMocks();
			(mockApp.vault.getAbstractFileByPath as any).mockImplementation(
				(path: string) => createMockFile(path),
			);

			// Mock in the new processing order: inline horizontal context with parent nodes
			// Processing order: context1 -> system -> user1 -> context2 (horizontal to user1) -> assistant1
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // context1
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // context2 (horizontal to user1)
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }); // assistant1

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("Context 1 content")
				.mockResolvedValueOnce("System prompt")
				.mockResolvedValueOnce("User 1 question")
				.mockResolvedValueOnce("Context 2 content")
				.mockResolvedValueOnce("Assistant 1 response");

			const result = await canvasGraphWalker("assistant1", canvasData, mockApp);

			// Should include parent chain: context1 -> system -> user1 -> assistant1
			// Plus horizontal context: context2
			expect(result).toHaveLength(5);

			// System prompt should be first (among system messages)
			const systemMessages = result.filter((msg: any) => msg.role === "system");
			expect(systemMessages).toHaveLength(1);
			expect(systemMessages[0]?.content).toBe("System prompt");

			// Check that horizontal context (context2) is wrapped in additional-document tags
			const contextMessages = result.filter((msg: any) =>
				msg.content.includes("<additional-document>"),
			);
			expect(contextMessages).toHaveLength(1); // only context2
		});

		it("should position multiple horizontal context nodes immediately after their parent", async () => {
			// Test case: system -> user1 with 2 horizontal context nodes
			// Expected order: system, user1, context1, context2
			const canvasData: CanvasViewData = {
				nodes: [
					{
						id: "system",
						type: "file",
						file: "system.md",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "user1",
						type: "file",
						file: "user1.md",
						x: 0,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "context1",
						type: "file",
						file: "context1.md",
						x: -100,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "context2",
						type: "file",
						file: "context2.md",
						x: -200,
						y: 100,
						width: 100,
						height: 100,
					},
				],
				edges: [
					{
						id: "edge1",
						fromNode: "system",
						toNode: "user1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge2",
						fromNode: "context1",
						toNode: "user1",
						fromSide: "right",
						toSide: "left",
					}, // horizontal context
					{
						id: "edge3",
						fromNode: "context2",
						toNode: "user1",
						fromSide: "right",
						toSide: "left",
					}, // horizontal context
				],
			};

			// Reset mocks for this test
			vi.clearAllMocks();
			(mockApp.vault.getAbstractFileByPath as any).mockImplementation(
				(path: string) => createMockFile(path),
			);

			// Mock in processing order: system -> user1 -> context1 -> context2
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // context1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }); // context2

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("System prompt")
				.mockResolvedValueOnce("User 1 question")
				.mockResolvedValueOnce("Context 1 content")
				.mockResolvedValueOnce("Context 2 content");

			const result = await canvasGraphWalker("user1", canvasData, mockApp);

			// Should include: system, user1, context1, context2
			expect(result).toHaveLength(4);

			// Verify order and content
			expect(result[0]?.role).toBe("system");
			expect(result[0]?.content).toBe("System prompt");

			expect(result[1]?.role).toBe("user");
			expect(result[1]?.content).toBe("User 1 question");

			// Both context nodes should be wrapped and appear after user1
			expect(result[2]?.role).toBe("user");
			expect(result[2]?.content).toContain("<additional-document>");
			expect(result[2]?.content).toContain("Context 1 content");

			expect(result[3]?.role).toBe("user");
			expect(result[3]?.content).toContain("<additional-document>");
			expect(result[3]?.content).toContain("Context 2 content");
		});

		it("should position horizontal context nodes immediately after each respective parent", async () => {
			// Test case: start -> system -> user1 -> assistant1 where system and user1 have horizontal context
			// Parent chain: [start, system, user1, assistant1]
			// Horizontal context: system_context -> system, user1_context -> user1
			// Expected order: start, system, system_context, user1, user1_context, assistant1
			const canvasData: CanvasViewData = {
				nodes: [
					{
						id: "start",
						type: "file",
						file: "start.md",
						x: 0,
						y: -100,
						width: 100,
						height: 100,
					},
					{
						id: "system",
						type: "file",
						file: "system.md",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "system_context",
						type: "file",
						file: "system_context.md",
						x: -100,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "user1",
						type: "file",
						file: "user1.md",
						x: 0,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "user1_context",
						type: "file",
						file: "user1_context.md",
						x: -100,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "assistant1",
						type: "file",
						file: "assistant1.md",
						x: 0,
						y: 200,
						width: 100,
						height: 100,
					},
				],
				edges: [
					{
						id: "edge0",
						fromNode: "start",
						toNode: "system",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge1",
						fromNode: "system",
						toNode: "user1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge2",
						fromNode: "user1",
						toNode: "assistant1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge3",
						fromNode: "system_context",
						toNode: "system",
						fromSide: "right",
						toSide: "left",
					}, // horizontal context for system
					{
						id: "edge4",
						fromNode: "user1_context",
						toNode: "user1",
						fromSide: "right",
						toSide: "left",
					}, // horizontal context for user1
				],
			};

			// Reset mocks for this test
			vi.clearAllMocks();
			(mockApp.vault.getAbstractFileByPath as any).mockImplementation(
				(path: string) => createMockFile(path),
			);

			// Mock in processing order: start -> system -> system_context -> user1 -> user1_context -> assistant1
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // start
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // system_context
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1_context
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }); // assistant1

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("Start content")
				.mockResolvedValueOnce("System prompt")
				.mockResolvedValueOnce("System context")
				.mockResolvedValueOnce("User 1 question")
				.mockResolvedValueOnce("User 1 context")
				.mockResolvedValueOnce("Assistant 1 response");

			const result = await canvasGraphWalker("assistant1", canvasData, mockApp);

			// Should include: start, system, system_context, user1, user1_context, assistant1
			expect(result).toHaveLength(6);

			// Verify system messages come first (only the system node)
			const systemMessages = result.filter((msg: any) => msg.role === "system");
			expect(systemMessages).toHaveLength(1);
			expect(systemMessages[0]?.content).toBe("System prompt");

			// Verify conversation messages have correct order with inline horizontal context
			const conversationMessages = result.filter(
				(msg: any) => msg.role !== "system",
			);
			expect(conversationMessages).toHaveLength(5);

			// First: start
			expect(conversationMessages[0]?.content).toBe("Start content");

			// Then: system_context (wrapped because it's user role and horizontal to system)
			expect(conversationMessages[1]?.content).toContain("<additional-document>");
			expect(conversationMessages[1]?.content).toContain("System context");

			// Then: user1
			expect(conversationMessages[2]?.content).toBe("User 1 question");

			// Then: user1_context (wrapped because it's user role and horizontal to user1)
			expect(conversationMessages[3]?.content).toContain("<additional-document>");
			expect(conversationMessages[3]?.content).toContain("User 1 context");

			// Finally: assistant1
			expect(conversationMessages[4]?.content).toBe("Assistant 1 response");
		});

		it("should handle parent chain with some nodes having no horizontal context", async () => {
			// Test case: node1 (no context) -> node2 (with context) -> node3 (no context)
			// Expected order: node1, node2, node2_context, node3
			const canvasData: CanvasViewData = {
				nodes: [
					{
						id: "node1",
						type: "file",
						file: "node1.md",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "node2",
						type: "file",
						file: "node2.md",
						x: 0,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "node2_context",
						type: "file",
						file: "node2_context.md",
						x: -100,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "node3",
						type: "file",
						file: "node3.md",
						x: 0,
						y: 200,
						width: 100,
						height: 100,
					},
				],
				edges: [
					{
						id: "edge1",
						fromNode: "node1",
						toNode: "node2",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge2",
						fromNode: "node2",
						toNode: "node3",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge3",
						fromNode: "node2_context",
						toNode: "node2",
						fromSide: "right",
						toSide: "left",
					}, // horizontal context for node2 only
				],
			};

			// Reset mocks for this test
			vi.clearAllMocks();
			(mockApp.vault.getAbstractFileByPath as any).mockImplementation(
				(path: string) => createMockFile(path),
			);

			// Mock in processing order: node1 -> node2 -> node2_context -> node3
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // node1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // node2
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // node2_context
				.mockReturnValueOnce({ frontmatter: { role: "user" } }); // node3

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("Node 1 content")
				.mockResolvedValueOnce("Node 2 content")
				.mockResolvedValueOnce("Node 2 context")
				.mockResolvedValueOnce("Node 3 content");

			const result = await canvasGraphWalker("node3", canvasData, mockApp);

			// Should include: node1, node2, node2_context, node3
			expect(result).toHaveLength(4);

			// Verify order
			expect(result[0]?.content).toBe("Node 1 content");
			expect(result[1]?.content).toBe("Node 2 content");

			// node2_context should be wrapped and appear immediately after node2
			expect(result[2]?.content).toContain("<additional-document>");
			expect(result[2]?.content).toContain("Node 2 context");

			expect(result[3]?.content).toBe("Node 3 content");

			// Verify that only one message is wrapped (the context)
			const wrappedMessages = result.filter((msg: any) =>
				msg.content.includes("<additional-document>"),
			);
			expect(wrappedMessages).toHaveLength(1);
		});
	});

	describe("Multiple System Prompts", () => {
		it("should handle two system prompts in the chain", async () => {
			// Test case: system1 -> system2 -> user -> assistant
			// Both system prompts should be included in the result

			const canvasData: CanvasViewData = {
				nodes: [
					{
						id: "system1",
						type: "file",
						file: "system1.md",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
					{
						id: "system2",
						type: "file",
						file: "system2.md",
						x: 0,
						y: 100,
						width: 100,
						height: 100,
					},
					{
						id: "user1",
						type: "file",
						file: "user1.md",
						x: 0,
						y: 200,
						width: 100,
						height: 100,
					},
					{
						id: "assistant1",
						type: "file",
						file: "assistant1.md",
						x: 0,
						y: 300,
						width: 100,
						height: 100,
					},
				],
				edges: [
					{
						id: "edge1",
						fromNode: "system1",
						toNode: "system2",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge2",
						fromNode: "system2",
						toNode: "user1",
						fromSide: "bottom",
						toSide: "top",
					},
					{
						id: "edge3",
						fromNode: "user1",
						toNode: "assistant1",
						fromSide: "bottom",
						toSide: "top",
					},
				],
			};

			// Reset mocks for this test
			vi.clearAllMocks();
			(mockApp.vault.getAbstractFileByPath as any).mockImplementation(
				(path: string) => createMockFile(path),
			);

			// Mock different frontmatter for each node in the order they will be processed
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system1
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system2
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }); // assistant1

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("First system prompt")
				.mockResolvedValueOnce("Second system prompt")
				.mockResolvedValueOnce("User question")
				.mockResolvedValueOnce("Assistant 1 response");

			const result = await canvasGraphWalker("assistant1", canvasData, mockApp);

			// Should include all nodes: system1, system2, user1, assistant1
			expect(result).toHaveLength(4);

			// Check that we have two system prompts
			const systemMessages = result.filter((msg: any) => msg.role === "system");
			expect(systemMessages).toHaveLength(2);

			// Check that system messages come first
			expect(result[0]?.role).toBe("system");
			expect(result[1]?.role).toBe("system");

			// Verify content - expected chain order: system1 -> system2 -> user1 -> assistant1
			expect(result[0]?.content).toBe("First system prompt");
			expect(result[1]?.content).toBe("Second system prompt");
			expect(result[2]?.role).toBe("user");
			expect(result[2]?.content).toBe("User question");
			expect(result[3]?.role).toBe("assistant");
			expect(result[3]?.content).toBe("Assistant 1 response");
		});
	});
});
