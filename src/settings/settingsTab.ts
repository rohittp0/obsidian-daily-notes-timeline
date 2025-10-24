import { App, PluginSettingTab, Setting } from 'obsidian';
import type DailyNotesViewerPlugin from '../main';

export class DailyNotesViewerSettingTab extends PluginSettingTab {
	plugin: DailyNotesViewerPlugin;

	constructor(app: App, plugin: DailyNotesViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Daily Notes Viewer Settings' });

		this.addDailyNotesFolderSetting(containerEl);
		this.addDateFormatSetting(containerEl);
		this.addOpenOnStartupSetting(containerEl);
		this.addSortOrderSetting(containerEl);
		this.addAutoSaveSetting(containerEl);
		this.addAutoSaveDelaySetting(containerEl);
	}

	private addDailyNotesFolderSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Daily notes folder')
			.setDesc('Folder where your daily notes are stored (leave empty for root folder)')
			.addText(text => text
				.setPlaceholder('Example: Daily Notes')
				.setValue(this.plugin.settings.dailyNotesFolder)
				.onChange(async (value) => {
					this.plugin.settings.dailyNotesFolder = value;
					await this.plugin.saveSettings();
				}));
	}

	private addDateFormatSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Date format')
			.setDesc('Currently supports YYYY-MM-DD format (e.g., 2025-10-24)')
			.addText(text => text
				.setValue(this.plugin.settings.dateFormat)
				.setDisabled(true));
	}

	private addOpenOnStartupSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Open on startup')
			.setDesc('Automatically open the Daily Notes Viewer when Obsidian starts')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.openOnStartup)
				.onChange(async (value) => {
					this.plugin.settings.openOnStartup = value;
					await this.plugin.saveSettings();
				}));
	}

	private addSortOrderSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Sort order')
			.setDesc('Choose how to sort your daily notes')
			.addDropdown(dropdown => dropdown
				.addOption('newest', 'Newest first')
				.addOption('oldest', 'Oldest first')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value: 'newest' | 'oldest') => {
					this.plugin.settings.sortOrder = value;
					await this.plugin.saveSettings();
				}));
	}

	private addAutoSaveSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Auto-save')
			.setDesc('Automatically save notes while typing')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSave)
				.onChange(async (value) => {
					this.plugin.settings.autoSave = value;
					await this.plugin.saveSettings();
				}));
	}

	private addAutoSaveDelaySetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Auto-save delay')
			.setDesc('Delay in milliseconds before auto-saving (default: 2000ms)')
			.addText(text => text
				.setPlaceholder('2000')
				.setValue(String(this.plugin.settings.autoSaveDelay))
				.onChange(async (value) => {
					const delay = parseInt(value);
					if (!isNaN(delay) && delay > 0) {
						this.plugin.settings.autoSaveDelay = delay;
						await this.plugin.saveSettings();
					}
				}));
	}
}
