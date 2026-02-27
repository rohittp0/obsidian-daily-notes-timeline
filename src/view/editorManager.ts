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
			const wrapper = this.buildTextarea(content);
			const textarea = (wrapper as any).textarea as HTMLTextAreaElement;

			this.editors.set(file.path, textarea);
			container.appendChild(wrapper);

			this.setupTextareaListeners(textarea, file, statusEl);
			this.autoResizeTextarea(textarea);

			// Setup vim mode for this editor
			if (this.vimModeManager) {
				this.vimModeManager.setupVimModeForEditor(textarea);
				this.vimModeManager.registerModeIndicator(file.path, modeIndicator);
			}
		} catch {
			this.renderError(container);
		}
	}

	private buildTextarea(content: string): HTMLDivElement {
		const textarea = document.createElement('textarea');
		textarea.className = 'daily-note-editor';
		textarea.value = content;
		textarea.rows = Math.max(DEFAULT_TEXTAREA_ROWS, content.split('\n').length + 2);

		const wrapper = document.createElement('div');
		wrapper.className = 'daily-note-editor-wrapper';
		wrapper.appendChild(textarea);

		const cursor = document.createElement('div');
		cursor.className = 'custom-cursor';
		wrapper.appendChild(cursor);

		const mirror = document.createElement('div');
		mirror.setAttribute('aria-hidden', 'true');
		mirror.style.position = 'absolute';
		mirror.style.visibility = 'hidden';
		mirror.style.height = 'auto';
		mirror.style.overflow = 'hidden';
		mirror.style.whiteSpace = 'pre-wrap';
		mirror.style.wordWrap = 'break-word';
		mirror.style.top = '0';
		mirror.style.left = '0';
		wrapper.appendChild(mirror);

		const syncMirrorStyle = (): void => {
			const cs = window.getComputedStyle(textarea);
			mirror.style.fontFamily = cs.fontFamily;
			mirror.style.fontSize = cs.fontSize;
			mirror.style.lineHeight = cs.lineHeight;
			mirror.style.padding = cs.padding;
			mirror.style.borderWidth = cs.borderWidth;
			mirror.style.borderStyle = cs.borderStyle;
			mirror.style.boxSizing = cs.boxSizing;
			mirror.style.letterSpacing = cs.letterSpacing;
			mirror.style.wordSpacing = cs.wordSpacing;
			mirror.style.textIndent = cs.textIndent;
			mirror.style.width = textarea.offsetWidth + 'px';
		};

		const updateCursor = (): void => {
			if (document.activeElement !== textarea) {
				cursor.style.display = 'none';
				return;
			}
			syncMirrorStyle();
			const text = textarea.value.substring(0, textarea.selectionStart);
			mirror.textContent = '';
			const textNode = document.createTextNode(text);
			mirror.appendChild(textNode);
			const marker = document.createElement('span');
			marker.style.display = 'inline';
			marker.textContent = '\u200B';
			mirror.appendChild(marker);
			const mTop = marker.offsetTop;
			const mLeft = marker.offsetLeft;
			const cs = window.getComputedStyle(textarea);
			const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.65;
			cursor.style.top = mTop + 'px';
			cursor.style.left = mLeft + 'px';
			cursor.style.width = '0.6em';
			cursor.style.height = lh + 'px';
			cursor.style.display = 'block';
			cursor.style.backgroundColor = '#18BEEC';
		};

		textarea.addEventListener('keyup', updateCursor);
		textarea.addEventListener('click', updateCursor);
		textarea.addEventListener('input', updateCursor);
		textarea.addEventListener('select', updateCursor);
		textarea.addEventListener('focus', () => { updateCursor(); });
		textarea.addEventListener('blur', () => { cursor.style.display = 'none'; });
		textarea.addEventListener('scroll', updateCursor);

		(wrapper as any).textarea = textarea;
		return wrapper;
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
		const timeout = window.setTimeout(() => {
			void this.performSave(file, textarea.value, statusEl);
		}, this.settings.autoSaveDelay);

		this.saveTimeouts.set(file.path, timeout);
	}

	private async performSave(file: TFile, content: string, statusEl: HTMLElement): Promise<void> {
		await this.saveNote(file, content);
		this.showSavedIndicator(statusEl);
		this.saveTimeouts.delete(file.path);
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
