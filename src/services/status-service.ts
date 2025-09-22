export class StatusService {
	private statusEl: HTMLElement | null = null;

	constructor(statusEl: HTMLElement | null) {
		this.statusEl = statusEl;
		if (this.statusEl) {
			this.statusEl.addClass("canvas-context-loading-status");
		}
	}

	showLoadingStatus(text = "Loading...") {
		if (!this.statusEl) {
			return;
		}
		this.statusEl.empty();
		this.statusEl.createEl("span", { text, cls: "loading-text" });
		this.statusEl.createEl("span", { cls: "spinner" });
	}

	hideLoadingStatus() {
		this.statusEl?.empty();
	}
}
