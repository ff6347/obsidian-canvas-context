"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CanvasContextPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/canvas/walker.ts
var import_obsidian = require("obsidian");
async function canvasGraphWalker(currentNodeId, data, app) {
  const messages = [];
  const visited = /* @__PURE__ */ new Set();
  const parentChain = getParentChain(currentNodeId, data, visited);
  const contextNodes = [];
  for (const nodeId of parentChain) {
    const horizontalNodes = getHorizontalContext(nodeId, data, parentChain);
    contextNodes.push(...horizontalNodes);
  }
  const allNodeIds = [...parentChain, ...contextNodes];
  const systemMessages = [];
  const conversationMessages = [];
  for (const nodeId of allNodeIds) {
    const node = data.nodes.find((n) => n.id === nodeId);
    if (node) {
      const { role, content } = await getNodeContentAndRole(node, app);
      if (content) {
        const allowedRoles = ["system", "user", "assistant"];
        const validRole = role && allowedRoles.includes(role) ? role : "user";
        const isHorizontalContext = contextNodes.includes(nodeId) && !parentChain.includes(nodeId);
        const finalContent = isHorizontalContext && validRole === "user" ? `<additional-document>
${content}
</additional-document>` : content;
        let message;
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
  messages.push(...systemMessages, ...conversationMessages);
  return messages;
}
function getParentChain(nodeId, data, visited) {
  const chain = [];
  let current = nodeId;
  while (current && !visited.has(current)) {
    chain.unshift(current);
    visited.add(current);
    const parentEdge = data.edges.find((edge) => edge.toNode === current);
    current = parentEdge?.fromNode || "";
  }
  return chain;
}
function getHorizontalContext(nodeId, data, excludeNodes) {
  const horizontalNodes = [];
  const connectedEdges = data.edges.filter(
    (edge) => edge.fromNode === nodeId || edge.toNode === nodeId
  );
  for (const edge of connectedEdges) {
    const connectedNodeId = edge.fromNode === nodeId ? edge.toNode : edge.fromNode;
    if (!excludeNodes.includes(connectedNodeId)) {
      if (edge.toNode === nodeId) {
        horizontalNodes.push(connectedNodeId);
      }
    }
  }
  return horizontalNodes;
}
async function getNodeContentAndRole(node, app) {
  if (node.type === "text") {
    return { role: null, content: null };
  } else if (node.type === "file") {
    try {
      const file = app.vault.getAbstractFileByPath(node.file);
      if (file instanceof import_obsidian.TFile) {
        const fileCache = app.metadataCache.getFileCache(file);
        const frontmatter = fileCache?.frontmatter;
        const content = await app.vault.cachedRead(file);
        const frontmatterInfo = (0, import_obsidian.getFrontMatterInfo)(content);
        const contentWithoutFrontmatter = frontmatterInfo.exists ? content.substring(frontmatterInfo.contentStart) : content;
        return {
          role: frontmatter?.role || null,
          content: contentWithoutFrontmatter || content
        };
      }
    } catch (error) {
      console.warn("Failed to read file:", node.file, error);
    }
    return {
      role: null,
      content: `File: ${node.file}`
    };
  } else if (node.type === "url") {
    return {
      role: null,
      content: `URL: ${node.url}`
    };
  }
  return { role: null, content: null };
}

// src/canvas/nodes-actions.ts
var NodeActions = class {
  ctx;
  constructor(that) {
    this.ctx = that;
  }
  buildNodeMenu(menu, node) {
    menu.addItem(
      (item) => item.setTitle("Send to LLM").setIcon("document").onClick(() => {
        console.log("node clicked");
        if (node?.canvas?.data && node?.id) {
          canvasGraphWalker(node.id, node.canvas.data, this.ctx.app).then((messages) => {
            console.log({ messages });
          }).catch((error) => {
            console.error("Walker error:", error);
          });
        } else {
          console.log("No canvas data or node id available");
        }
      })
    );
  }
};

// src/main.ts
var CanvasContextPlugin = class extends import_obsidian2.Plugin {
  nodeActions;
  async onload() {
    this.nodeActions = new NodeActions(this);
    this.registerEvent(
      this.app.workspace.on(
        "canvas:node-menu",
        (menu, node) => {
          if (this.nodeActions === void 0) {
            return;
          }
          this.nodeActions.buildNodeMenu(menu, node);
        }
      )
    );
  }
  onunload() {
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2NhbnZhcy93YWxrZXIudHMiLCAic3JjL2NhbnZhcy9ub2Rlcy1hY3Rpb25zLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBQbHVnaW4sIE1lbnUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCBOb2RlQWN0aW9ucyBmcm9tIFwiLi9jYW52YXMvbm9kZXMtYWN0aW9ucy5qc1wiO1xuaW1wb3J0IHR5cGUgeyBDYW52YXNDb25uZWN0aW9uIH0gZnJvbSBcIm9ic2lkaWFuLXR5cGluZ3NcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2FudmFzQ29udGV4dFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG5cdG5vZGVBY3Rpb25zOiBOb2RlQWN0aW9ucyB8IHVuZGVmaW5lZDtcblx0YXN5bmMgb25sb2FkKCkge1xuXHRcdHRoaXMubm9kZUFjdGlvbnMgPSBuZXcgTm9kZUFjdGlvbnModGhpcyk7XG5cblx0XHQvLyByZWdpc3RlciBDYW52YXMgbWVudSBoYW5kbGVycyAoT2JzaWRpYW4gZW1pdHMgdGhlc2UgZXZlbnRzKVxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbihcblx0XHRcdFx0XCJjYW52YXM6bm9kZS1tZW51XCIsXG5cdFx0XHRcdChtZW51OiBNZW51LCBub2RlOiBDYW52YXNDb25uZWN0aW9uKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHRoaXMubm9kZUFjdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLm5vZGVBY3Rpb25zLmJ1aWxkTm9kZU1lbnUobWVudSwgbm9kZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHQpLFxuXHRcdCk7XG5cdH1cblx0b251bmxvYWQoKSB7fVxufVxuIiwgImltcG9ydCB0eXBlIHsgTW9kZWxNZXNzYWdlIH0gZnJvbSBcImFpXCI7XG5pbXBvcnQgdHlwZSB7IENhbnZhc1ZpZXdEYXRhIH0gZnJvbSBcIm9ic2lkaWFuLXR5cGluZ3NcIjtcbmltcG9ydCB7IEFwcCwgVEZpbGUsIGdldEZyb250TWF0dGVySW5mbyB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FudmFzR3JhcGhXYWxrZXIoXG5cdGN1cnJlbnROb2RlSWQ6IHN0cmluZyxcblx0ZGF0YTogQ2FudmFzVmlld0RhdGEsXG5cdGFwcDogQXBwLFxuKTogUHJvbWlzZTxNb2RlbE1lc3NhZ2VbXT4ge1xuXHRjb25zdCBtZXNzYWdlczogTW9kZWxNZXNzYWdlW10gPSBbXTtcblx0Y29uc3QgdmlzaXRlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG5cdC8vIEdldCBwYXJlbnQgY2hhaW4gYnkgd2Fsa2luZyBVUCB0aGUgY29ubmVjdGlvbnNcblx0Y29uc3QgcGFyZW50Q2hhaW4gPSBnZXRQYXJlbnRDaGFpbihjdXJyZW50Tm9kZUlkLCBkYXRhLCB2aXNpdGVkKTtcblxuXHQvLyBGb3IgZWFjaCBub2RlIGluIHBhcmVudCBjaGFpbiwgY29sbGVjdCBob3Jpem9udGFsIGNvbnRleHRcblx0Y29uc3QgY29udGV4dE5vZGVzOiBzdHJpbmdbXSA9IFtdO1xuXHRmb3IgKGNvbnN0IG5vZGVJZCBvZiBwYXJlbnRDaGFpbikge1xuXHRcdGNvbnN0IGhvcml6b250YWxOb2RlcyA9IGdldEhvcml6b250YWxDb250ZXh0KG5vZGVJZCwgZGF0YSwgcGFyZW50Q2hhaW4pO1xuXHRcdGNvbnRleHROb2Rlcy5wdXNoKC4uLmhvcml6b250YWxOb2Rlcyk7XG5cdH1cblxuXHQvLyBCdWlsZCBtZXNzYWdlcyBpbiBwcmlvcml0eSBvcmRlcjpcblx0Ly8gMS4gU3lzdGVtIHByb21wdHMgZmlyc3Rcblx0Ly8gMi4gUGFyZW50IGNoYWluICsgdGhlaXIgaG9yaXpvbnRhbCBjb250ZXh0XG5cdC8vIDMuIFRhcmdldCBub2RlIGxhc3RcblxuXHQvLyBDb21iaW5lIGFsbCByZWxldmFudCBub2RlIElEc1xuXHRjb25zdCBhbGxOb2RlSWRzID0gWy4uLnBhcmVudENoYWluLCAuLi5jb250ZXh0Tm9kZXNdO1xuXG5cdC8vIFNlcGFyYXRlIHN5c3RlbSBtZXNzYWdlcyBmcm9tIG90aGVyIG1lc3NhZ2VzXG5cdGNvbnN0IHN5c3RlbU1lc3NhZ2VzOiBNb2RlbE1lc3NhZ2VbXSA9IFtdO1xuXHRjb25zdCBjb252ZXJzYXRpb25NZXNzYWdlczogTW9kZWxNZXNzYWdlW10gPSBbXTtcblxuXHQvLyBDb252ZXJ0IG5vZGUgSURzIHRvIGFjdHVhbCBub2RlcyBhbmQgYnVpbGQgbWVzc2FnZXNcblx0Zm9yIChjb25zdCBub2RlSWQgb2YgYWxsTm9kZUlkcykge1xuXHRcdGNvbnN0IG5vZGUgPSBkYXRhLm5vZGVzLmZpbmQoKG4pID0+IG4uaWQgPT09IG5vZGVJZCk7XG5cdFx0aWYgKG5vZGUpIHtcblx0XHRcdGNvbnN0IHsgcm9sZSwgY29udGVudCB9ID0gYXdhaXQgZ2V0Tm9kZUNvbnRlbnRBbmRSb2xlKG5vZGUsIGFwcCk7XG5cdFx0XHQvLyBTa2lwIG5vZGVzIHdpdGggbm8gY29udGVudCAobGlrZSB0ZXh0IG5vZGVzKVxuXHRcdFx0aWYgKGNvbnRlbnQpIHtcblx0XHRcdFx0Y29uc3QgYWxsb3dlZFJvbGVzID0gW1wic3lzdGVtXCIsIFwidXNlclwiLCBcImFzc2lzdGFudFwiXTtcblx0XHRcdFx0Y29uc3QgdmFsaWRSb2xlID0gcm9sZSAmJiBhbGxvd2VkUm9sZXMuaW5jbHVkZXMocm9sZSkgPyByb2xlIDogXCJ1c2VyXCI7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGhvcml6b250YWwgY29udGV4dCAobm90IGluIHBhcmVudCBjaGFpbilcblx0XHRcdFx0Y29uc3QgaXNIb3Jpem9udGFsQ29udGV4dCA9IGNvbnRleHROb2Rlcy5pbmNsdWRlcyhub2RlSWQpICYmICFwYXJlbnRDaGFpbi5pbmNsdWRlcyhub2RlSWQpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gV3JhcCBob3Jpem9udGFsIGNvbnRleHQgY29udGVudFxuXHRcdFx0XHRjb25zdCBmaW5hbENvbnRlbnQgPSBpc0hvcml6b250YWxDb250ZXh0ICYmIHZhbGlkUm9sZSA9PT0gXCJ1c2VyXCIgXG5cdFx0XHRcdFx0PyBgPGFkZGl0aW9uYWwtZG9jdW1lbnQ+XFxuJHtjb250ZW50fVxcbjwvYWRkaXRpb25hbC1kb2N1bWVudD5gXG5cdFx0XHRcdFx0OiBjb250ZW50O1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQ3JlYXRlIHByb3Blcmx5IHR5cGVkIG1lc3NhZ2UgYmFzZWQgb24gcm9sZVxuXHRcdFx0XHRsZXQgbWVzc2FnZTogTW9kZWxNZXNzYWdlO1xuXHRcdFx0XHRpZiAodmFsaWRSb2xlID09PSBcInN5c3RlbVwiKSB7XG5cdFx0XHRcdFx0bWVzc2FnZSA9IHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogZmluYWxDb250ZW50IH07XG5cdFx0XHRcdFx0c3lzdGVtTWVzc2FnZXMucHVzaChtZXNzYWdlKTtcblx0XHRcdFx0fSBlbHNlIGlmICh2YWxpZFJvbGUgPT09IFwiYXNzaXN0YW50XCIpIHtcblx0XHRcdFx0XHRtZXNzYWdlID0geyByb2xlOiBcImFzc2lzdGFudFwiLCBjb250ZW50OiBmaW5hbENvbnRlbnQgfTtcblx0XHRcdFx0XHRjb252ZXJzYXRpb25NZXNzYWdlcy5wdXNoKG1lc3NhZ2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG1lc3NhZ2UgPSB7IHJvbGU6IFwidXNlclwiLCBjb250ZW50OiBmaW5hbENvbnRlbnQgfTtcblx0XHRcdFx0XHRjb252ZXJzYXRpb25NZXNzYWdlcy5wdXNoKG1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gQ29tYmluZSBtZXNzYWdlcyB3aXRoIHN5c3RlbSBwcm9tcHRzIGZpcnN0XG5cdG1lc3NhZ2VzLnB1c2goLi4uc3lzdGVtTWVzc2FnZXMsIC4uLmNvbnZlcnNhdGlvbk1lc3NhZ2VzKTtcblxuXHRyZXR1cm4gbWVzc2FnZXM7XG59XG5cbmZ1bmN0aW9uIGdldFBhcmVudENoYWluKFxuXHRub2RlSWQ6IHN0cmluZyxcblx0ZGF0YTogQ2FudmFzVmlld0RhdGEsXG5cdHZpc2l0ZWQ6IFNldDxzdHJpbmc+LFxuKTogc3RyaW5nW10ge1xuXHRjb25zdCBjaGFpbjogc3RyaW5nW10gPSBbXTtcblx0bGV0IGN1cnJlbnQgPSBub2RlSWQ7XG5cblx0d2hpbGUgKGN1cnJlbnQgJiYgIXZpc2l0ZWQuaGFzKGN1cnJlbnQpKSB7XG5cdFx0Y2hhaW4udW5zaGlmdChjdXJyZW50KTsgLy8gQWRkIHRvIGZyb250IHRvIG1haW50YWluIG9yZGVyXG5cdFx0dmlzaXRlZC5hZGQoY3VycmVudCk7XG5cblx0XHQvLyBGaW5kIGVkZ2VzIHBvaW50aW5nIFRPIGN1cnJlbnQgbm9kZSAocGFyZW50cylcblx0XHRjb25zdCBwYXJlbnRFZGdlID0gZGF0YS5lZGdlcy5maW5kKChlZGdlKSA9PiBlZGdlLnRvTm9kZSA9PT0gY3VycmVudCk7XG5cdFx0Y3VycmVudCA9IHBhcmVudEVkZ2U/LmZyb21Ob2RlIHx8IFwiXCI7XG5cdH1cblxuXHRyZXR1cm4gY2hhaW47XG59XG5cbmZ1bmN0aW9uIGdldEhvcml6b250YWxDb250ZXh0KFxuXHRub2RlSWQ6IHN0cmluZyxcblx0ZGF0YTogQ2FudmFzVmlld0RhdGEsXG5cdGV4Y2x1ZGVOb2Rlczogc3RyaW5nW10sXG4pOiBzdHJpbmdbXSB7XG5cdGNvbnN0IGhvcml6b250YWxOb2Rlczogc3RyaW5nW10gPSBbXTtcblxuXHQvLyBGaW5kIGFsbCBlZGdlcyBjb25uZWN0ZWQgdG8gdGhpcyBub2RlXG5cdGNvbnN0IGNvbm5lY3RlZEVkZ2VzID0gZGF0YS5lZGdlcy5maWx0ZXIoXG5cdFx0KGVkZ2UpID0+IGVkZ2UuZnJvbU5vZGUgPT09IG5vZGVJZCB8fCBlZGdlLnRvTm9kZSA9PT0gbm9kZUlkLFxuXHQpO1xuXG5cdGZvciAoY29uc3QgZWRnZSBvZiBjb25uZWN0ZWRFZGdlcykge1xuXHRcdGNvbnN0IGNvbm5lY3RlZE5vZGVJZCA9XG5cdFx0XHRlZGdlLmZyb21Ob2RlID09PSBub2RlSWQgPyBlZGdlLnRvTm9kZSA6IGVkZ2UuZnJvbU5vZGU7XG5cblx0XHQvLyBTa2lwIGlmIGFscmVhZHkgaW4gZXhjbHVkZU5vZGVzIChwYXJlbnQgY2hhaW4pXG5cdFx0aWYgKCFleGNsdWRlTm9kZXMuaW5jbHVkZXMoY29ubmVjdGVkTm9kZUlkKSkge1xuXHRcdFx0Ly8gT25seSBhZGQgZWRnZXMgdGhhdCBwb2ludCBUTyB0aGlzIG5vZGUgKG5vdCBGUk9NIHRoaXMgbm9kZSB0byBjaGlsZHJlbilcblx0XHRcdC8vIFRoaXMgZW5zdXJlcyB3ZSBvbmx5IGdldCBob3Jpem9udGFsIGNvbnRleHQsIG5vdCBjaGlsZCBub2Rlc1xuXHRcdFx0aWYgKGVkZ2UudG9Ob2RlID09PSBub2RlSWQpIHtcblx0XHRcdFx0aG9yaXpvbnRhbE5vZGVzLnB1c2goY29ubmVjdGVkTm9kZUlkKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gaG9yaXpvbnRhbE5vZGVzO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXROb2RlQ29udGVudEFuZFJvbGUoXG5cdG5vZGU6IGFueSxcblx0YXBwOiBBcHAsXG4pOiBQcm9taXNlPHsgcm9sZTogc3RyaW5nIHwgbnVsbDsgY29udGVudDogc3RyaW5nIHwgbnVsbCB9PiB7XG5cdC8vIEhhbmRsZSBkaWZmZXJlbnQgbm9kZSB0eXBlc1xuXHRpZiAobm9kZS50eXBlID09PSBcInRleHRcIikge1xuXHRcdC8vIFNraXAgdGV4dCBub2RlcyBmb3Igbm93IC0gdXNlciB3b3VsZCBuZWVkIHRvIG1haW50YWluIGZyb250bWF0dGVyIG1hbnVhbGx5XG5cdFx0cmV0dXJuIHsgcm9sZTogbnVsbCwgY29udGVudDogbnVsbCB9O1xuXHR9IGVsc2UgaWYgKG5vZGUudHlwZSA9PT0gXCJmaWxlXCIpIHtcblx0XHQvLyBGb3IgZmlsZSBub2RlcywgdXNlIG1ldGFkYXRhIGNhY2hlIGZvciBmcm9udG1hdHRlciBhbmQgY2FjaGVkUmVhZCBmb3IgY29udGVudFxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChub2RlLmZpbGUpO1xuXHRcdFx0aWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuXHRcdFx0XHQvLyBHZXQgZnJvbnRtYXR0ZXIgZnJvbSBtZXRhZGF0YSBjYWNoZSAoYWxyZWFkeSBwYXJzZWQgYnkgT2JzaWRpYW4pXG5cdFx0XHRcdGNvbnN0IGZpbGVDYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcblx0XHRcdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSBmaWxlQ2FjaGU/LmZyb250bWF0dGVyO1xuXG5cdFx0XHRcdC8vIEdldCBmaWxlIGNvbnRlbnQgd2l0aG91dCBmcm9udG1hdHRlciB1c2luZyBPYnNpZGlhbidzIGJ1aWx0LWluIG1ldGhvZFxuXHRcdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG5cdFx0XHRcdGNvbnN0IGZyb250bWF0dGVySW5mbyA9IGdldEZyb250TWF0dGVySW5mbyhjb250ZW50KTtcblx0XHRcdFx0Y29uc3QgY29udGVudFdpdGhvdXRGcm9udG1hdHRlciA9IGZyb250bWF0dGVySW5mby5leGlzdHNcblx0XHRcdFx0XHQ/IGNvbnRlbnQuc3Vic3RyaW5nKGZyb250bWF0dGVySW5mby5jb250ZW50U3RhcnQpXG5cdFx0XHRcdFx0OiBjb250ZW50O1xuXG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0cm9sZTogZnJvbnRtYXR0ZXI/LnJvbGUgfHwgbnVsbCxcblx0XHRcdFx0XHRjb250ZW50OiBjb250ZW50V2l0aG91dEZyb250bWF0dGVyIHx8IGNvbnRlbnQsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdGNvbnNvbGUud2FybihcIkZhaWxlZCB0byByZWFkIGZpbGU6XCIsIG5vZGUuZmlsZSwgZXJyb3IpO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0cm9sZTogbnVsbCxcblx0XHRcdGNvbnRlbnQ6IGBGaWxlOiAke25vZGUuZmlsZX1gLFxuXHRcdH07XG5cdH0gZWxzZSBpZiAobm9kZS50eXBlID09PSBcInVybFwiKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJvbGU6IG51bGwsXG5cdFx0XHRjb250ZW50OiBgVVJMOiAke25vZGUudXJsfWAsXG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiB7IHJvbGU6IG51bGwsIGNvbnRlbnQ6IG51bGwgfTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IE1lbnUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgQ2FudmFzQ29ubmVjdGlvbiwgQ2FudmFzVmlld0NhbnZhcyB9IGZyb20gXCJvYnNpZGlhbi10eXBpbmdzXCI7XG5pbXBvcnQgdHlwZSBDYW52YXNDb250ZXh0UGx1Z2luIGZyb20gXCJzcmMvbWFpbi5qc1wiO1xuaW1wb3J0IHsgY2FudmFzR3JhcGhXYWxrZXIgfSBmcm9tIFwiLi93YWxrZXIuanNcIjtcblxuLy8gdHlwZSBDYW52YXNEYXRhRWRnZUNvbm5lY3Rpb24gPSBcImJvdHRvbVwiIHwgXCJ0b3BcIiB8IFwibGVmdFwiIHwgXCJyaWdodFwiO1xuLy8gaW50ZXJmYWNlIENhbnZhc0RhdGFOb2RlIHtcbi8vIFx0ZmlsZTogc3RyaW5nO1xuLy8gXHRoZWlnaHQ6IG51bWJlcjtcbi8vIFx0aWQ6IHN0cmluZztcbi8vIFx0c3VicGF0aD86IHN0cmluZztcbi8vIFx0dHlwZTogXCJmaWxlXCIgfCBcInRleHRcIiB8IFwidXJsXCI7XG4vLyBcdHdpZHRoOiBudW1iZXI7XG4vLyBcdHg6IG51bWJlcjtcbi8vIFx0eTogbnVtYmVyO1xuLy8gfVxuLy8gaW50ZXJmYWNlIENhbnZhc0RhdGFFZGdlIHtcbi8vIFx0ZnJvbU5vZGU6IHN0cmluZztcbi8vIFx0ZnJvbVNpZGU6IENhbnZhc0RhdGFFZGdlQ29ubmVjdGlvbjtcbi8vIFx0aWQ6IHN0cmluZztcbi8vIFx0dG9Ob2RlOiBzdHJpbmc7XG4vLyBcdHRvU2lkZTogQ2FudmFzRGF0YUVkZ2VDb25uZWN0aW9uO1xuLy8gfVxuaW50ZXJmYWNlIEV4dGVuZGVkQ2FudmFzQ29ubmVjdGlvbiBleHRlbmRzIENhbnZhc0Nvbm5lY3Rpb24ge1xuXHRpZD86IHN0cmluZztcblx0Y2FudmFzPzogQ2FudmFzVmlld0NhbnZhcztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTm9kZUFjdGlvbnMge1xuXHRjdHg6IENhbnZhc0NvbnRleHRQbHVnaW47XG5cdGNvbnN0cnVjdG9yKHRoYXQ6IENhbnZhc0NvbnRleHRQbHVnaW4pIHtcblx0XHR0aGlzLmN0eCA9IHRoYXQ7XG5cdH1cblx0YnVpbGROb2RlTWVudShtZW51OiBNZW51LCBub2RlOiBFeHRlbmRlZENhbnZhc0Nvbm5lY3Rpb24pIHtcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+XG5cdFx0XHRpdGVtXG5cdFx0XHRcdC5zZXRUaXRsZShcIlNlbmQgdG8gTExNXCIpXG5cdFx0XHRcdC5zZXRJY29uKFwiZG9jdW1lbnRcIilcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xuXHRcdFx0XHRcdC8vIFVzZSB0aGUgcGFzc2VkIGBub2RlYCBvYmplY3QgdG8gYWN0IG9uIG1vZGVsIChpbnNwZWN0IHByb3BlcnRpZXMgaW4gcnVudGltZSlcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIm5vZGUgY2xpY2tlZFwiKTtcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhub2RlKTtcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhub2RlLmNhbnZhcz8uZGF0YSk7XG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2cobm9kZS5pZCk7XG5cdFx0XHRcdFx0aWYgKG5vZGU/LmNhbnZhcz8uZGF0YSAmJiBub2RlPy5pZCkge1xuXHRcdFx0XHRcdFx0Y2FudmFzR3JhcGhXYWxrZXIobm9kZS5pZCwgbm9kZS5jYW52YXMuZGF0YSwgdGhpcy5jdHguYXBwKVxuXHRcdFx0XHRcdFx0XHQudGhlbigobWVzc2FnZXMpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh7IG1lc3NhZ2VzIH0pO1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuY2F0Y2goKGVycm9yKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIldhbGtlciBlcnJvcjpcIiwgZXJyb3IpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJObyBjYW52YXMgZGF0YSBvciBub2RlIGlkIGF2YWlsYWJsZVwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdCk7XG5cdH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUE2Qjs7O0FDRTdCLHNCQUErQztBQUUvQyxlQUFzQixrQkFDckIsZUFDQSxNQUNBLEtBQzBCO0FBQzFCLFFBQU0sV0FBMkIsQ0FBQztBQUNsQyxRQUFNLFVBQVUsb0JBQUksSUFBWTtBQUdoQyxRQUFNLGNBQWMsZUFBZSxlQUFlLE1BQU0sT0FBTztBQUcvRCxRQUFNLGVBQXlCLENBQUM7QUFDaEMsYUFBVyxVQUFVLGFBQWE7QUFDakMsVUFBTSxrQkFBa0IscUJBQXFCLFFBQVEsTUFBTSxXQUFXO0FBQ3RFLGlCQUFhLEtBQUssR0FBRyxlQUFlO0FBQUEsRUFDckM7QUFRQSxRQUFNLGFBQWEsQ0FBQyxHQUFHLGFBQWEsR0FBRyxZQUFZO0FBR25ELFFBQU0saUJBQWlDLENBQUM7QUFDeEMsUUFBTSx1QkFBdUMsQ0FBQztBQUc5QyxhQUFXLFVBQVUsWUFBWTtBQUNoQyxVQUFNLE9BQU8sS0FBSyxNQUFNLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxNQUFNO0FBQ25ELFFBQUksTUFBTTtBQUNULFlBQU0sRUFBRSxNQUFNLFFBQVEsSUFBSSxNQUFNLHNCQUFzQixNQUFNLEdBQUc7QUFFL0QsVUFBSSxTQUFTO0FBQ1osY0FBTSxlQUFlLENBQUMsVUFBVSxRQUFRLFdBQVc7QUFDbkQsY0FBTSxZQUFZLFFBQVEsYUFBYSxTQUFTLElBQUksSUFBSSxPQUFPO0FBRy9ELGNBQU0sc0JBQXNCLGFBQWEsU0FBUyxNQUFNLEtBQUssQ0FBQyxZQUFZLFNBQVMsTUFBTTtBQUd6RixjQUFNLGVBQWUsdUJBQXVCLGNBQWMsU0FDdkQ7QUFBQSxFQUEwQixPQUFPO0FBQUEsMEJBQ2pDO0FBR0gsWUFBSTtBQUNKLFlBQUksY0FBYyxVQUFVO0FBQzNCLG9CQUFVLEVBQUUsTUFBTSxVQUFVLFNBQVMsYUFBYTtBQUNsRCx5QkFBZSxLQUFLLE9BQU87QUFBQSxRQUM1QixXQUFXLGNBQWMsYUFBYTtBQUNyQyxvQkFBVSxFQUFFLE1BQU0sYUFBYSxTQUFTLGFBQWE7QUFDckQsK0JBQXFCLEtBQUssT0FBTztBQUFBLFFBQ2xDLE9BQU87QUFDTixvQkFBVSxFQUFFLE1BQU0sUUFBUSxTQUFTLGFBQWE7QUFDaEQsK0JBQXFCLEtBQUssT0FBTztBQUFBLFFBQ2xDO0FBQUEsTUFDRDtBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBR0EsV0FBUyxLQUFLLEdBQUcsZ0JBQWdCLEdBQUcsb0JBQW9CO0FBRXhELFNBQU87QUFDUjtBQUVBLFNBQVMsZUFDUixRQUNBLE1BQ0EsU0FDVztBQUNYLFFBQU0sUUFBa0IsQ0FBQztBQUN6QixNQUFJLFVBQVU7QUFFZCxTQUFPLFdBQVcsQ0FBQyxRQUFRLElBQUksT0FBTyxHQUFHO0FBQ3hDLFVBQU0sUUFBUSxPQUFPO0FBQ3JCLFlBQVEsSUFBSSxPQUFPO0FBR25CLFVBQU0sYUFBYSxLQUFLLE1BQU0sS0FBSyxDQUFDLFNBQVMsS0FBSyxXQUFXLE9BQU87QUFDcEUsY0FBVSxZQUFZLFlBQVk7QUFBQSxFQUNuQztBQUVBLFNBQU87QUFDUjtBQUVBLFNBQVMscUJBQ1IsUUFDQSxNQUNBLGNBQ1c7QUFDWCxRQUFNLGtCQUE0QixDQUFDO0FBR25DLFFBQU0saUJBQWlCLEtBQUssTUFBTTtBQUFBLElBQ2pDLENBQUMsU0FBUyxLQUFLLGFBQWEsVUFBVSxLQUFLLFdBQVc7QUFBQSxFQUN2RDtBQUVBLGFBQVcsUUFBUSxnQkFBZ0I7QUFDbEMsVUFBTSxrQkFDTCxLQUFLLGFBQWEsU0FBUyxLQUFLLFNBQVMsS0FBSztBQUcvQyxRQUFJLENBQUMsYUFBYSxTQUFTLGVBQWUsR0FBRztBQUc1QyxVQUFJLEtBQUssV0FBVyxRQUFRO0FBQzNCLHdCQUFnQixLQUFLLGVBQWU7QUFBQSxNQUNyQztBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBRUEsU0FBTztBQUNSO0FBRUEsZUFBZSxzQkFDZCxNQUNBLEtBQzJEO0FBRTNELE1BQUksS0FBSyxTQUFTLFFBQVE7QUFFekIsV0FBTyxFQUFFLE1BQU0sTUFBTSxTQUFTLEtBQUs7QUFBQSxFQUNwQyxXQUFXLEtBQUssU0FBUyxRQUFRO0FBRWhDLFFBQUk7QUFDSCxZQUFNLE9BQU8sSUFBSSxNQUFNLHNCQUFzQixLQUFLLElBQUk7QUFDdEQsVUFBSSxnQkFBZ0IsdUJBQU87QUFFMUIsY0FBTSxZQUFZLElBQUksY0FBYyxhQUFhLElBQUk7QUFDckQsY0FBTSxjQUFjLFdBQVc7QUFHL0IsY0FBTSxVQUFVLE1BQU0sSUFBSSxNQUFNLFdBQVcsSUFBSTtBQUMvQyxjQUFNLHNCQUFrQixvQ0FBbUIsT0FBTztBQUNsRCxjQUFNLDRCQUE0QixnQkFBZ0IsU0FDL0MsUUFBUSxVQUFVLGdCQUFnQixZQUFZLElBQzlDO0FBRUgsZUFBTztBQUFBLFVBQ04sTUFBTSxhQUFhLFFBQVE7QUFBQSxVQUMzQixTQUFTLDZCQUE2QjtBQUFBLFFBQ3ZDO0FBQUEsTUFDRDtBQUFBLElBQ0QsU0FBUyxPQUFPO0FBQ2YsY0FBUSxLQUFLLHdCQUF3QixLQUFLLE1BQU0sS0FBSztBQUFBLElBQ3REO0FBQ0EsV0FBTztBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sU0FBUyxTQUFTLEtBQUssSUFBSTtBQUFBLElBQzVCO0FBQUEsRUFDRCxXQUFXLEtBQUssU0FBUyxPQUFPO0FBQy9CLFdBQU87QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFNBQVMsUUFBUSxLQUFLLEdBQUc7QUFBQSxJQUMxQjtBQUFBLEVBQ0Q7QUFFQSxTQUFPLEVBQUUsTUFBTSxNQUFNLFNBQVMsS0FBSztBQUNwQzs7O0FDM0lBLElBQXFCLGNBQXJCLE1BQWlDO0FBQUEsRUFDaEM7QUFBQSxFQUNBLFlBQVksTUFBMkI7QUFDdEMsU0FBSyxNQUFNO0FBQUEsRUFDWjtBQUFBLEVBQ0EsY0FBYyxNQUFZLE1BQWdDO0FBQ3pELFNBQUs7QUFBQSxNQUFRLENBQUMsU0FDYixLQUNFLFNBQVMsYUFBYSxFQUN0QixRQUFRLFVBQVUsRUFDbEIsUUFBUSxNQUFNO0FBRWQsZ0JBQVEsSUFBSSxjQUFjO0FBSTFCLFlBQUksTUFBTSxRQUFRLFFBQVEsTUFBTSxJQUFJO0FBQ25DLDRCQUFrQixLQUFLLElBQUksS0FBSyxPQUFPLE1BQU0sS0FBSyxJQUFJLEdBQUcsRUFDdkQsS0FBSyxDQUFDLGFBQWE7QUFDbkIsb0JBQVEsSUFBSSxFQUFFLFNBQVMsQ0FBQztBQUFBLFVBQ3pCLENBQUMsRUFDQSxNQUFNLENBQUMsVUFBVTtBQUNqQixvQkFBUSxNQUFNLGlCQUFpQixLQUFLO0FBQUEsVUFDckMsQ0FBQztBQUFBLFFBQ0gsT0FBTztBQUNOLGtCQUFRLElBQUkscUNBQXFDO0FBQUEsUUFDbEQ7QUFBQSxNQUNELENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRDtBQUNEOzs7QUZ0REEsSUFBcUIsc0JBQXJCLGNBQWlELHdCQUFPO0FBQUEsRUFDdkQ7QUFBQSxFQUNBLE1BQU0sU0FBUztBQUNkLFNBQUssY0FBYyxJQUFJLFlBQVksSUFBSTtBQUd2QyxTQUFLO0FBQUEsTUFDSixLQUFLLElBQUksVUFBVTtBQUFBLFFBQ2xCO0FBQUEsUUFDQSxDQUFDLE1BQVksU0FBMkI7QUFDdkMsY0FBSSxLQUFLLGdCQUFnQixRQUFXO0FBQ25DO0FBQUEsVUFDRDtBQUNBLGVBQUssWUFBWSxjQUFjLE1BQU0sSUFBSTtBQUFBLFFBQzFDO0FBQUEsTUFDRDtBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBQUEsRUFDQSxXQUFXO0FBQUEsRUFBQztBQUNiOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iXQp9Cg==
