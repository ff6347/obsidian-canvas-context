/**
 * Adapter Pattern Implementation
 *
 * This module provides adapter interfaces and implementations to decouple
 * business logic from platform-specific APIs (Obsidian).
 *
 * Benefits:
 * - Testable business logic with simple test doubles
 * - Clear separation of concerns
 * - Easy to mock for unit tests
 * - Platform-agnostic core logic
 */

// Interfaces
export type { UINotificationAdapter } from "./ui-notifications.ts";
export type { CanvasOperationAdapter, CanvasInfo, ExtendedCanvasConnection } from "./canvas-operations.ts";
export type { UIComponentAdapter, ButtonState } from "./ui-components.ts";
export type { DOMOperationAdapter } from "./dom-operations.ts";

// Test implementations (for unit testing)
export { TestNotificationAdapter } from "./ui-notifications.ts";
export { TestCanvasAdapter } from "./canvas-operations.ts";
export { TestUIComponentAdapter } from "./ui-components.ts";
export { TestDOMAdapter } from "./dom-operations.ts";

// Obsidian implementations (for production)
export { ObsidianNotificationAdapter } from "./obsidian-ui-notifications.ts";
export { ObsidianCanvasAdapter } from "./obsidian-canvas-operations.ts";
export { ObsidianUIComponentAdapter } from "./obsidian-ui-components.ts";
export { ObsidianDOMAdapter } from "./obsidian-dom-operations.ts";