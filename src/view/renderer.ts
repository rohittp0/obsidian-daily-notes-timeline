import { App, TFile, Notice } from 'obsidian';
import { EditorManager } from './editorManager';
import { type DisplayDateFormat, DATE_FORMAT_OPTIONS } from '../types';

export class Renderer {
	private app: App;
	private editorManager: EditorManager;
	displayDateFormat: DisplayDateFormat = 'full';

	constructor(app: App, editorManager: EditorManager) {
		this.app = app;
		this.editorManager = editorManager;
	}

	formatDateStr(dateStr: string): string {
		if (this.displayDateFormat === 'iso') return dateStr;
		const opts = DATE_FORMAT_OPTIONS[this.displayDateFormat];
		if (!opts) return dateStr;
		const date = new Date(dateStr + 'T00:00:00');
		if (isNaN(date.getTime())) return dateStr;
		return new Intl.DateTimeFormat(undefined, opts).format(date);
	}

	renderHeader(container: HTMLElement, notesCount: number, onRefresh: () => void): void {
		const headerEl = container.createDiv('daily-notes-header');
		headerEl.createEl('h2', { text: 'Daily notes' });

		const controlsEl = headerEl.createDiv('daily-notes-controls');
		this.renderRefreshButton(controlsEl, onRefresh);
		this.renderNotesCount(controlsEl, notesCount);
	}

	private renderRefreshButton(container: HTMLElement, onRefresh: () => void): void {
		const refreshBtn = container.createEl('button', { text: 'Refresh' });
		refreshBtn.addEventListener('click', () => {
			onRefresh();
			new Notice('Daily notes refreshed');
		});
	}

	private renderNotesCount(container: HTMLElement, count: number): void {
		container.createEl('span', {
			text: `${count} note${count !== 1 ? 's' : ''}`,
			cls: 'daily-notes-count'
		});
	}

	renderKeyboardHints(container: HTMLElement, vimModeEnabled: boolean, navigationEnabled: boolean): void {
		const hintsEl = container.createDiv('daily-notes-hints');

		let hintText = '';

		if (navigationEnabled) {
			hintText = 'Navigate: ↑↓';
			if (vimModeEnabled) {
				hintText += ' or j/k • Esc: command mode • i/a/o: insert • dd/yy/cc/p/u: edit';
			}
			hintText += ' • ';
		}
		else
			hintText += 'Auto-saves while typing';

		hintsEl.createEl('small', {
			text: hintText,
			cls: 'daily-notes-hint-text'
		});
	}

	renderEmptyState(container: HTMLElement): void {
		container.createEl('p', {
			text: 'No daily notes found. Create daily notes with YYYY-MM-DD format (e.g., 2025-10-24.md)',
			cls: 'daily-notes-empty'
		});
	}

	async renderVirtualNote(
		container: HTMLElement,
		dateStr: string,
		expectedPath: string
	): Promise<void> {
		const noteEl = container.createDiv('daily-note-item');
		noteEl.setAttribute('data-note-path', expectedPath);

		const noteHeader = noteEl.createDiv('daily-note-header');
		noteHeader.createEl('h3', { text: this.formatDateStr(dateStr), cls: 'daily-note-date' });

		const actionsEl = noteHeader.createDiv('daily-note-actions');
		const statusEl = this.renderStatusIndicator(actionsEl);

		const contentDiv = noteEl.createDiv('daily-note-content');
		await this.editorManager.createVirtualEditor(contentDiv, expectedPath, statusEl);
	}

	async renderAllNotes(container: HTMLElement, files: TFile[]): Promise<void> {
		for (const file of files) {
			await this.renderDailyNote(container, file);
		}
	}

	private async renderDailyNote(container: HTMLElement, file: TFile): Promise<void> {
		const noteEl = container.createDiv('daily-note-item');
		noteEl.setAttribute('data-note-path', file.path);

		const noteHeader = noteEl.createDiv('daily-note-header');
		this.renderNoteDate(noteHeader, file);

		const actionsEl = noteHeader.createDiv('daily-note-actions');
		this.renderOpenButton(actionsEl, file);
		const statusEl = this.renderStatusIndicator(actionsEl);

		const contentDiv = noteEl.createDiv('daily-note-content');
		await this.editorManager.createEditor(contentDiv, file, statusEl);
	}

	private renderNoteDate(container: HTMLElement, file: TFile): void {
		const dateLink = container.createEl('h3', { cls: 'daily-note-date' });
		const link = dateLink.createEl('a', {
			text: this.formatDateStr(file.basename),
			cls: 'internal-link'
		});
		link.addEventListener('click', (e) => {
			e.preventDefault();
			const leaf = this.app.workspace.getLeaf('tab');
			void leaf.openFile(file);
		});
	}

	private renderOpenButton(container: HTMLElement, file: TFile): void {
		const openBtn = container.createEl('button', {
			text: 'Open',
			cls: 'daily-note-btn'
		});
		openBtn.addEventListener('click', () => {
			const leaf = this.app.workspace.getLeaf('tab');
			void leaf.openFile(file);
		});
	}

	private renderStatusIndicator(container: HTMLElement): HTMLElement {
		return container.createEl('span', {
			cls: 'daily-note-status',
			text: ''
		});
	}
}
