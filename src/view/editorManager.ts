import { App, TFile, Notice } from 'obsidian';
import { DEFAULT_TEXTAREA_ROWS, SAVE_INDICATOR_DURATION } from '../types';
import type { DailyNotesViewerSettings } from '../types';

export class EditorManager {
	private app: App;
	private settings: DailyNotesViewerSettings;
	private editors: Map<string, HTMLTextAreaElement>;
	private readonly saveTimeouts: Map<string, number>;

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

	updateSettings(settings: DailyNotesViewerSettings): void {
		this.settings = settings;
	}

	async createEditor(
		container: HTMLElement,
		file: TFile,
		statusEl: HTMLElement
	): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const textarea = this.buildTextarea(content);

			this.editors.set(file.path, textarea);
			container.appendChild(textarea);

			this.setupTextareaListeners(textarea, file, statusEl);
			this.autoResizeTextarea(textarea);
		} catch (error) {
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
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
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
		statusEl.style.color = 'var(--text-warning)';
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
		statusEl.style.color = 'var(--text-success)';

		setTimeout(() => {
			statusEl.textContent = '';
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
