/**
 * UI Notifications Adapter Interface
 *
 * Abstracts UI notification operations to enable testing without Obsidian dependencies
 */

export interface UINotificationAdapter {
	/**
	 * Show an informational message to the user
	 */
	showInfo(message: string): void;

	/**
	 * Show an error message to the user
	 */
	showError(message: string): void;

	/**
	 * Show a success message to the user
	 */
	showSuccess(message: string): void;

	/**
	 * Show loading status with optional text
	 */
	showLoading(text?: string): void;

	/**
	 * Hide loading status
	 */
	hideLoading(): void;
}

/**
 * Simple test implementation for unit testing
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
		this.messages.push({ type: "loading", message: "loading", text });
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
	getMessagesOfType(type: string): Array<{ type: string; message: string; text?: string }> {
		return this.messages.filter((msg) => msg.type === type);
	}
}