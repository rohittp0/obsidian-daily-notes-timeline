import { ItemView, Scope, TFile, WorkspaceLeaf } from 'obsidian';
import type DailyNotesViewerPlugin from '../main';
import { VIEW_TYPE_DAILY_NOTES } from '../types';
import { FileManager } from './fileManager';
import { NavigationManager } from './navigation';
import { EditorManager } from './editorManager';
import { Renderer } from './renderer';
import { VimModeManager } from './vimMode';

export class DailyNotesView extends ItemView {
	plugin: DailyNotesViewerPlugin;
	dailyNotes: TFile[] = [];

	private editors: Map<string, HTMLTextAreaElement> = new Map();
	private saveTimeouts: Map<string, number> = new Map();

	private fileManager: FileManager;
	private navigationManager: NavigationManager;
	private readonly editorManager: EditorManager;
	private renderer: Renderer;
	private vimModeManager: VimModeManager;

	constructor(leaf: WorkspaceLeaf, plugin: DailyNotesViewerPlugin) {
		super(leaf);
		this.plugin = plugin;

		this.fileManager = new FileManager(this.app);
		this.navigationManager = new NavigationManager(this.editors);
		this.vimModeManager = new VimModeManager(this.editors, this.plugin.settings.vimModeEnabled);
		this.editorManager = new EditorManager(
			this.app,
			this.plugin.settings,
			this.editors,
			this.saveTimeouts
		);
		this.renderer = new Renderer(this.app, this.editorManager);
		this.renderer.displayDateFormat = this.plugin.settings.displayDateFormat;

		// Connect managers
		this.navigationManager.setVimModeManager(this.vimModeManager);
		this.navigationManager.updateSettings(this.plugin.settings);
		this.editorManager.setVimModeManager(this.vimModeManager);
	}

	getViewType(): string {
		return VIEW_TYPE_DAILY_NOTES;
	}

	getDisplayText(): string {
		return 'Daily notes';
	}

	getIcon(): string {
		return 'calendar-with-checkmark';
	}

	async onOpen(): Promise<void> {
		// Assign a scope so Obsidian's DynamicScope delegates Escape to us
		// instead of app.scope (which switches tabs). Returning undefined
		// blocks the parent scope chain but does NOT call preventDefault,
		// so textarea-level vim listeners still receive the event.
		this.scope = new Scope(this.app.scope);
		this.scope.register([], 'Escape', () => {
			// No-op — just consume the key in the scope chain
		});

		await this.loadDailyNotes();
		await this.render();
		this.navigationManager.setupKeyboardNavigation(this.contentEl);

		// Restore cursor focus when switching back to this tab
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf === this.leaf) {
					this.navigationManager.restoreLastFocus();
				}
			})
		);
	}

	async onClose(): Promise<void> {
		await this.editorManager.saveAllPendingChanges(this.dailyNotes);
		this.cleanup();
	}

	private cleanup(): void {
		this.scope = null;
		this.vimModeManager.cleanup();
		this.navigationManager.destroy();
		const { contentEl } = this;
		contentEl.empty();
		this.editors.clear();
		this.navigationManager.invalidateCache();
		this.saveTimeouts.clear();
	}

	async loadDailyNotes(): Promise<void> {
		this.dailyNotes = await this.fileManager.loadDailyNotesFilteringEmpty(this.plugin.settings);
	}

	async render(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('daily-notes-viewer');
		this.editors.clear();
		this.navigationManager.invalidateCache();
		this.editorManager.clearVirtualState();

		// Compute today state
		const todayStr = this.fileManager.getTodayDateStr();
		const todayPath = this.fileManager.getTodayPath(this.plugin.settings);
		const todayExists = this.dailyNotes.some(f => f.basename === todayStr);
		const noteCount = this.dailyNotes.length + (todayExists ? 0 : 1);

		// Update managers with latest settings
		this.vimModeManager.setEnabled(this.plugin.settings.vimModeEnabled);
		this.navigationManager.updateSettings(this.plugin.settings);
		this.editorManager.updateSettings(this.plugin.settings);
		this.renderer.displayDateFormat = this.plugin.settings.displayDateFormat;

		// Render header (with correct count including virtual)
		this.renderer.renderHeader(
			contentEl,
			noteCount,
			() => void this.handleRefresh(),
			this.plugin.settings.showHeader
		);

		// Render keyboard hints
		if (this.plugin.settings.showKeyboardHints) {
			this.renderer.renderKeyboardHints(
				contentEl,
				this.plugin.settings.vimModeEnabled,
				this.plugin.settings.navigationEnabled
			);
		}

		// Render notes
		const notesContainer = contentEl.createDiv('daily-notes-container');

		if (!todayExists) {
			const isNewest = this.plugin.settings.sortOrder === 'newest';
			if (isNewest) {
				await this.renderer.renderVirtualNote(notesContainer, todayStr, todayPath);
				await this.renderer.renderAllNotes(notesContainer, this.dailyNotes);
			} else {
				await this.renderer.renderAllNotes(notesContainer, this.dailyNotes);
				await this.renderer.renderVirtualNote(notesContainer, todayStr, todayPath);
			}
		} else if (this.dailyNotes.length === 0) {
			this.renderer.renderEmptyState(notesContainer);
		} else {
			await this.renderer.renderAllNotes(notesContainer, this.dailyNotes);
		}

		this.navigationManager.restoreLastFocus();
	}

	restoreFocus(): void {
		this.navigationManager.restoreLastFocus();
	}

	private async handleRefresh(): Promise<void> {
		await this.editorManager.saveAllPendingChanges(this.dailyNotes);
		await this.loadDailyNotes();
		await this.render();
	}
}
