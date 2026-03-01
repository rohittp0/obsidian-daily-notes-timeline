import { App, PluginSettingTab, Setting } from 'obsidian';
import type DailyNotesViewerPlugin from '../main';
import { type DisplayDateFormat, DATE_FORMAT_LABELS, DATE_FORMAT_OPTIONS } from '../types';

export class DailyNotesViewerSettingTab extends PluginSettingTab {
	plugin: DailyNotesViewerPlugin;

	constructor(app: App, plugin: DailyNotesViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.addDailyNotesFolderSetting(containerEl);
		this.addDateFormatSetting(containerEl);
		this.addOpenOnStartupSetting(containerEl);
		this.addSortOrderSetting(containerEl);
		this.addNavigationSetting(containerEl);
		this.addVimModeSetting(containerEl);
		this.addShowKeyboardHintsSetting(containerEl);
		this.addShowHeaderSetting(containerEl);
		this.addAutoSaveSetting(containerEl);
		this.addAutoSaveDelaySetting(containerEl);
	}

	private addDailyNotesFolderSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Daily notes folder')
			.setDesc('Folder where your daily notes are stored (leave empty for root folder)')
			.addText(text => text
				.setPlaceholder('Example: daily notes')
				.setValue(this.plugin.settings.dailyNotesFolder)
				.onChange(async (value) => {
					this.plugin.settings.dailyNotesFolder = value;
					await this.plugin.saveSettings();
				}));
	}

	private addDateFormatSetting(containerEl: HTMLElement): void {
		const today = new Date();
		const current = this.plugin.settings.displayDateFormat;
		const opts = DATE_FORMAT_OPTIONS[current];
		const preview = opts
			? new Intl.DateTimeFormat(undefined, opts).format(today)
			: today.toISOString().slice(0, 10);

		new Setting(containerEl)
			.setName('Date display format')
			.setDesc(`How dates appear in headings. Preview: ${preview}`)
			.addDropdown(dropdown => {
				for (const [key, label] of Object.entries(DATE_FORMAT_LABELS)) {
					dropdown.addOption(key, label);
				}
				dropdown
					.setValue(this.plugin.settings.displayDateFormat)
					.onChange(async (value) => {
						this.plugin.settings.displayDateFormat = value as DisplayDateFormat;
						await this.plugin.saveSettings();
						this.display(); // refresh preview
					});
			});
	}

	private addOpenOnStartupSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Open on startup')
			.setDesc('Automatically open the daily notes viewer when Obsidian starts')
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

	private addNavigationSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Keyboard navigation')
			.setDesc('Enable navigation between notes using arrow keys (and j/k in vim mode)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.navigationEnabled)
				.onChange(async (value) => {
					this.plugin.settings.navigationEnabled = value;
					await this.plugin.saveSettings();
				}));
	}

	private addVimModeSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Vim mode')
			.setDesc('Enable vim-style navigation and editing (esc for command mode, i/a/o for insert mode)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.vimModeEnabled)
				.onChange(async (value) => {
					this.plugin.settings.vimModeEnabled = value;
					await this.plugin.saveSettings();
				}));
	}

	private addShowKeyboardHintsSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Show keyboard hints')
			.setDesc('Show the keyboard shortcut hints bar below the header')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showKeyboardHints)
				.onChange(async (value) => {
					this.plugin.settings.showKeyboardHints = value;
					await this.plugin.saveSettings();
				}));
	}

	private addShowHeaderSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Show header')
			.setDesc('Show the "Daily notes" heading above the controls')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showHeader)
				.onChange(async (value) => {
					this.plugin.settings.showHeader = value;
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
