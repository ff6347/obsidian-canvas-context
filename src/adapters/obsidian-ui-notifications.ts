import { Notice } from "obsidian";
import type { UINotificationAdapter } from "../types/adapter-types.ts";
import type { StatusService } from "../services/status-service.ts";

/**
 * Obsidian implementation of UINotificationAdapter
 *
 * Uses Obsidian's Notice system and StatusService for user feedback
 */
export class ObsidianNotificationAdapter implements UINotificationAdapter {
	constructor(private statusService?: StatusService) {}

	show(message: string): void {
		// oxlint-disable-next-line no-new
		new Notice(message);
	}

	showInfo(message: string): void {
		// oxlint-disable-next-line no-new
		new Notice(message);
	}

	showError(message: string): void {
		// oxlint-disable-next-line no-new
		new Notice(message);
	}

	showSuccess(message: string): void {
		// oxlint-disable-next-line no-new
		new Notice(message);
	}

	showLoading(text?: string): void {
		if (this.statusService) {
			this.statusService.showLoadingStatus(text);
		}
	}

	hideLoading(): void {
		if (this.statusService) {
			this.statusService.hideLoadingStatus();
		}
	}
}
