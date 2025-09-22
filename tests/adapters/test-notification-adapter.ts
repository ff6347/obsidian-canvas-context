import type { UINotificationAdapter } from "../../src/types/adapter-types.ts";

/**
 * Simple test implementation for unit testing UI notifications
 */
export class TestNotificationAdapter implements UINotificationAdapter {
	public messages: Array<{ type: string; message: string; text?: string }> = [];

	showInfo(message: string): void {
		this.messages.push({ type: "info", message });
	}

	showError(message: string): void {
		this.messages.push({ type: "error", message });
	}

	showSuccess(message: string): void {
		this.messages.push({ type: "success", message });
	}

	showLoading(text?: string): void {
		this.messages.push({
			type: "loading",
			message: "loading",
			...(text !== undefined && { text }),
		});
	}

	hideLoading(): void {
		this.messages.push({ type: "hideLoading", message: "hideLoading" });
	}

	/**
	 * Test helper: clear all messages
	 */
	clearMessages(): void {
		this.messages = [];
	}

	/**
	 * Test helper: get messages of specific type
	 */
	getMessagesOfType(
		type: string,
	): Array<{ type: string; message: string; text?: string }> {
		return this.messages.filter((msg) => msg.type === type);
	}
}
