import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { DailyNotesView } from './view/dailyNotesView';
import { DailyNotesViewerSettingTab } from './settings/settingsTab';
import { VIEW_TYPE_DAILY_NOTES, DEFAULT_SETTINGS } from './types';
import type { DailyNotesViewerSettings } from './types';

export default class DailyNotesViewerPlugin extends Plugin {
	settings: DailyNotesViewerSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_DAILY_NOTES,
			(leaf: WorkspaceLeaf) => new DailyNotesView(leaf, this)
		);

		this.addRibbonIcon('calendar-with-checkmark', 'Open Daily Notes Viewer', () => {
			this.activateView();
		});

		this.registerCommands();
		this.addSettingTab(new DailyNotesViewerSettingTab(this.app, this));

		if (this.settings.openOnStartup) {
			this.app.workspace.onLayoutReady(() => {
				this.activateView();
			});
		}
	}

	onunload(): void {
		// Note: We don't detach leaves here as per Obsidian plugin guidelines
		// Obsidian will handle cleanup of views automatically
	}

	private registerCommands(): void {
		this.addCommand({
			id: 'open-daily-notes-viewer',
			name: 'Open Daily Notes Viewer',
			callback: () => this.activateView()
		});

		this.addCommand({
			id: 'refresh-daily-notes-viewer',
			name: 'Refresh Daily Notes Viewer',
			callback: () => this.refreshView()
		});
	}

	private async refreshView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAILY_NOTES);
		if (leaves.length > 0) {
			const view = leaves[0].view as DailyNotesView;
			await view.loadDailyNotes();
			await view.render();
			new Notice('Daily notes refreshed');
		} else {
			new Notice('Daily Notes Viewer is not open');
		}
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_DAILY_NOTES)[0];

		if (!leaf) {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({
				type: VIEW_TYPE_DAILY_NOTES,
				active: true,
			});
		}

		await workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}