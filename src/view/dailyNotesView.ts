import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import type DailyNotesViewerPlugin from '../main';
import { VIEW_TYPE_DAILY_NOTES } from '../types';
import { FileManager } from './fileManager';
import { NavigationManager } from './navigation';
import { EditorManager } from './editorManager';
import { Renderer } from './renderer';

export class DailyNotesView extends ItemView {
	plugin: DailyNotesViewerPlugin;
	dailyNotes: TFile[] = [];

	private editors: Map<string, HTMLTextAreaElement> = new Map();
	private saveTimeouts: Map<string, number> = new Map();

	private fileManager: FileManager;
	private navigationManager: NavigationManager;
	private readonly editorManager: EditorManager;
	private renderer: Renderer;

	constructor(leaf: WorkspaceLeaf, plugin: DailyNotesViewerPlugin) {
		super(leaf);
		this.plugin = plugin;

		this.fileManager = new FileManager(this.app);
		this.navigationManager = new NavigationManager(this.editors);
		this.editorManager = new EditorManager(
			this.app,
			this.plugin.settings,
			this.editors,
			this.saveTimeouts
		);
		this.renderer = new Renderer(this.app, this.editorManager);
	}

	getViewType(): string {
		return VIEW_TYPE_DAILY_NOTES;
	}

	getDisplayText(): string {
		return 'Daily Notes';
	}

	getIcon(): string {
		return 'calendar-with-checkmark';
	}

	async onOpen(): Promise<void> {
		await this.loadDailyNotes();
		await this.render();
		this.navigationManager.setupKeyboardNavigation(this.contentEl);
	}

	async onClose(): Promise<void> {
		await this.editorManager.saveAllPendingChanges(this.dailyNotes);
		this.cleanup();
	}

	private cleanup(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.editors.clear();
		this.saveTimeouts.clear();
	}

	async loadDailyNotes(): Promise<void> {
		this.dailyNotes = this.fileManager.loadDailyNotes(this.plugin.settings);
	}

	async render(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('daily-notes-viewer');
		this.editors.clear();

		// Update editor manager with latest settings
		this.editorManager.updateSettings(this.plugin.settings);

		// Render header
		this.renderer.renderHeader(
			contentEl,
			this.dailyNotes.length,
			() => this.handleRefresh()
		);

		// Render keyboard hints
		this.renderer.renderKeyboardHints(contentEl);

		// Render notes
		const notesContainer = contentEl.createDiv('daily-notes-container');

		if (this.dailyNotes.length === 0) {
			this.renderer.renderEmptyState(notesContainer);
			return;
		}

		await this.renderer.renderAllNotes(notesContainer, this.dailyNotes);
		this.navigationManager.focusFirstEditor();
	}

	private async handleRefresh(): Promise<void> {
		await this.loadDailyNotes();
		await this.render();
	}
}
