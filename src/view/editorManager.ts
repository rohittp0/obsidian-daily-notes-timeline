import { App, TFile, Notice } from 'obsidian';
import { DEFAULT_TEXTAREA_ROWS, SAVE_INDICATOR_DURATION } from '../types';
import type { DailyNotesViewerSettings } from '../types';
import type { VimModeManager } from './vimMode';

export class EditorManager {
	private app: App;
	private settings: DailyNotesViewerSettings;
	private editors: Map<string, HTMLTextAreaElement>;
	private readonly saveTimeouts: Map<string, number>;
	private vimModeManager?: VimModeManager;

	constructor(
		app: App,
		settings: DailyNotesViewerSettings,
		editors: Map<string, HTMLTextAreaElement>,
		saveTimeouts: Map<string, number>
	) {
		this.app = app;
		this.settings = settings;
		this.editors = editors;
		this.saveTimeouts = saveTimeouts;
	}

	setVimModeManager(vimModeManager: VimModeManager): void {
		this.vimModeManager = vimModeManager;
	}

	updateSettings(settings: DailyNotesViewerSettings): void {
		this.settings = settings;
		if (this.vimModeManager) {
			this.vimModeManager.setEnabled(settings.vimModeEnabled);
		}
	}

	async createEditor(
		container: HTMLElement,
		file: TFile,
		statusEl: HTMLElement,
		modeIndicator: HTMLElement
	): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const textarea = this.buildTextarea(content);

			this.editors.set(file.path, textarea);
			container.appendChild(textarea);

			this.setupTextareaListeners(textarea, file, statusEl);
			this.autoResizeTextarea(textarea);

			// Setup vim mode for this editor
			if (this.vimModeManager) {
				this.vimModeManager.setupVimModeForEditor(textarea);
				this.vimModeManager.registerModeIndicator(file.path, modeIndicator);
			}
		} catch (_error) {
			this.renderError(container);
		}
	}

	private buildTextarea(content: string): HTMLTextAreaElement {
		const textarea = document.createElement('textarea');
		textarea.className = 'daily-note-editor';
		textarea.value = content;
		textarea.rows = Math.max(DEFAULT_TEXTAREA_ROWS, content.split('\n').length + 2);
		return textarea;
	}

	private setupTextareaListeners(
		textarea: HTMLTextAreaElement,
		file: TFile,
		statusEl: HTMLElement
	): void {
		textarea.addEventListener('input', () => {
			this.scheduleAutoSave(file, textarea, statusEl);
			this.autoResizeTextarea(textarea);
		});
	}

	private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
		// Temporarily reset height to get accurate scrollHeight
		const currentHeight = textarea.style.getPropertyValue('--textarea-height');
		textarea.style.removeProperty('--textarea-height');
		const newHeight = textarea.scrollHeight;
		// Only update if different to avoid unnecessary reflows
		if (currentHeight !== `${newHeight}px`) {
			textarea.style.setProperty('--textarea-height', `${newHeight}px`);
		}
	}

	private scheduleAutoSave(
		file: TFile,
		textarea: HTMLTextAreaElement,
		statusEl: HTMLElement
	): void {
		if (!this.settings.autoSave) return;

		this.clearExistingTimeout(file.path);
		this.showUnsavedIndicator(statusEl);
		this.scheduleSave(file, textarea, statusEl);
	}

	private clearExistingTimeout(path: string): void {
		const existingTimeout = this.saveTimeouts.get(path);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}
	}

	private showUnsavedIndicator(statusEl: HTMLElement): void {
		statusEl.textContent = '●';
		statusEl.removeClass('status-saved');
		statusEl.addClass('status-unsaved');
	}

	private scheduleSave(
		file: TFile,
		textarea: HTMLTextAreaElement,
		statusEl: HTMLElement
	): void {
		const timeout = window.setTimeout(async () => {
			await this.saveNote(file, textarea.value);
			this.showSavedIndicator(statusEl);
			this.saveTimeouts.delete(file.path);
		}, this.settings.autoSaveDelay);

		this.saveTimeouts.set(file.path, timeout);
	}

	private showSavedIndicator(statusEl: HTMLElement): void {
		statusEl.textContent = '✓';
		statusEl.removeClass('status-unsaved');
		statusEl.addClass('status-saved');

		setTimeout(() => {
			statusEl.textContent = '';
			statusEl.removeClass('status-saved');
		}, SAVE_INDICATOR_DURATION);
	}

	async saveNote(file: TFile, content: string): Promise<void> {
		try {
			await this.app.vault.modify(file, content);
		} catch (error) {
			new Notice(`Error saving ${file.basename}: ${error.message}`);
		}
	}

	async saveAllPendingChanges(dailyNotes: TFile[]): Promise<void> {
		for (const [path, timeout] of this.saveTimeouts) {
			clearTimeout(timeout);
			const editor = this.editors.get(path);
			if (editor) {
				const file = dailyNotes.find(f => f.path === path);
				if (file) {
					await this.saveNote(file, editor.value);
				}
			}
		}
	}

	private renderError(container: HTMLElement): void {
		container.createEl('p', {
			text: 'Error loading note content',
			cls: 'daily-note-error'
		});
	}
}
