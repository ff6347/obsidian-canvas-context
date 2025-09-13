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

			// Mock different frontmatter for each node
			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "system" } }) // system
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }) // assistant1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user2
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }); // assistant2 (shouldn't be called)

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("System prompt content")
				.mockResolvedValueOnce("User 1 content")
				.mockResolvedValueOnce("Assistant 1 content")
				.mockResolvedValueOnce("User 2 content")
				.mockResolvedValueOnce("Assistant 2 content"); // shouldn't be called

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

			(mockApp.metadataCache.getFileCache as any)
				.mockReturnValueOnce({ frontmatter: { role: "system" } })
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // context1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // user1
				.mockReturnValueOnce({ frontmatter: { role: "user" } }) // context2
				.mockReturnValueOnce({ frontmatter: { role: "assistant" } }); // assistant1

			(mockApp.vault.cachedRead as any)
				.mockResolvedValueOnce("System prompt")
				.mockResolvedValueOnce("Context 1 content")
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
	});
});
