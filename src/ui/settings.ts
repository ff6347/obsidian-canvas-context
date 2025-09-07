import { App, PluginSettingTab, Setting } from "obsidian";
import type CanvasContextPlugin from "../main.ts";

export class CanvasContextSettingTab extends PluginSettingTab {
	plugin: CanvasContextPlugin;

	constructor(app: App, plugin: CanvasContextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.settings)
					.onChange(async (value) => {
						this.plugin.settings.settings = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
