import type { VimModeManager } from './vimMode';
import type { DailyNotesViewerSettings } from '../types';

export class NavigationManager {
	private editors: Map<string, HTMLTextAreaElement>;
	private vimModeManager?: VimModeManager;
	private settings?: DailyNotesViewerSettings;

	constructor(editors: Map<string, HTMLTextAreaElement>) {
		this.editors = editors;
	}

	setVimModeManager(vimModeManager: VimModeManager): void {
		this.vimModeManager = vimModeManager;
	}

	updateSettings(settings: DailyNotesViewerSettings): void {
		this.settings = settings;
	}

	setupKeyboardNavigation(container: HTMLElement): void {
		container.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) return;

			const target = e.target as HTMLElement;
			if (!(target instanceof HTMLTextAreaElement)) return;

			this.handleNavigationKey(e, target);
		});
	}

	private handleNavigationKey(e: KeyboardEvent, currentEditor: HTMLTextAreaElement): void {
		// Check if navigation is disabled
		if (this.settings && !this.settings.navigationEnabled) {
			return;
		}

		const editorsArray = Array.from(this.editors.values());
		const currentIndex = editorsArray.indexOf(currentEditor);

		if (currentIndex === -1) return;

		const isVimEnabled = this.vimModeManager?.isEnabled();
		const isVimCommandMode = isVimEnabled && this.vimModeManager?.getCurrentMode() === 'command';
		const isVimInsertMode = isVimEnabled && this.vimModeManager?.getCurrentMode() === 'insert';

		// If vim mode is enabled and we're in insert mode, don't navigate
		if (isVimInsertMode) {
			return;
		}

		// In vim command mode (or arrow keys), try line-by-line movement first
		const isDownKey = e.key === 'j' || e.key === 'ArrowDown';
		const isUpKey = e.key === 'k' || e.key === 'ArrowUp';

		if (isVimCommandMode && (isDownKey || isUpKey) && !e.shiftKey) {
			const direction = isDownKey ? 'down' : 'up';
			if (this.moveCursorVertically(currentEditor, direction)) {
				e.preventDefault();
				return;
			}
			// At boundary — fall through to cross-note navigation
		}

		const cursorAtStart = currentEditor.selectionStart === 0;
		const cursorAtEnd = currentEditor.selectionStart === currentEditor.value.length;

		const nextIndex = this.getNextEditorIndex(
			e,
			currentIndex,
			cursorAtStart,
			cursorAtEnd,
			isVimCommandMode || false,
			isVimEnabled || false
		);

		if (nextIndex !== null && nextIndex >= 0 && nextIndex < editorsArray.length) {
			e.preventDefault();
			this.focusEditor(editorsArray[nextIndex], e.key === 'ArrowDown' || e.key === 'j');
		}
	}

	private getNextEditorIndex(
		e: KeyboardEvent,
		currentIndex: number,
		cursorAtStart: boolean,
		cursorAtEnd: boolean,
		isVimCommandMode: boolean,
		isVimEnabled: boolean
	): number | null {
		// In vim command mode, j/k and arrow keys navigate to adjacent notes
		// only when moveCursorVertically already failed (cursor at first/last line)
		if (isVimCommandMode) {
			if ((e.key === 'k' || e.key === 'ArrowUp') && !e.shiftKey) {
				return currentIndex - 1;
			}
			if ((e.key === 'j' || e.key === 'ArrowDown') && !e.shiftKey) {
				return currentIndex + 1;
			}
		}

		// If vim is enabled but we're not in command mode, don't navigate
		if (isVimEnabled) {
			return null;
		}

		// When vim is disabled, only arrow keys work (at cursor boundaries)
		// j/k should NOT navigate
		if (e.key === 'ArrowUp' && cursorAtStart) {
			return currentIndex - 1;
		}

		if (e.key === 'ArrowDown' && cursorAtEnd) {
			return currentIndex + 1;
		}

		return null;
	}

	private focusEditor(editor: HTMLTextAreaElement, placeAtStart: boolean): void {
		editor.focus();
		const position = placeAtStart ? 0 : editor.value.length;
		editor.setSelectionRange(position, position);
		editor.dispatchEvent(new Event('keyup'));
		this.scrollCursorIntoView(editor);
	}

	private isCursorOnFirstLine(editor: HTMLTextAreaElement): boolean {
		const textBeforeCursor = editor.value.substring(0, editor.selectionStart);
		return !textBeforeCursor.includes('\n');
	}

	private isCursorOnLastLine(editor: HTMLTextAreaElement): boolean {
		const textAfterCursor = editor.value.substring(editor.selectionStart);
		return !textAfterCursor.includes('\n');
	}

	private moveCursorVertically(editor: HTMLTextAreaElement, direction: 'up' | 'down'): boolean {
		const text = editor.value;
		const pos = editor.selectionStart;

		if (direction === 'up' && this.isCursorOnFirstLine(editor)) {
			return false;
		}
		if (direction === 'down' && this.isCursorOnLastLine(editor)) {
			return false;
		}

		// Find current line start and column
		const textBefore = text.substring(0, pos);
		const currentLineStart = textBefore.lastIndexOf('\n') + 1;
		const currentCol = pos - currentLineStart;

		let newPos: number;

		if (direction === 'up') {
			// Find the previous line
			const prevLineEnd = currentLineStart - 1; // position of the \n before current line
			const textBeforePrevLine = text.substring(0, prevLineEnd);
			const prevLineStart = textBeforePrevLine.lastIndexOf('\n') + 1;
			const prevLineLength = prevLineEnd - prevLineStart;
			newPos = prevLineStart + Math.min(currentCol, prevLineLength);
		} else {
			// Find the next line
			const currentLineEnd = text.indexOf('\n', pos);
			const nextLineStart = currentLineEnd + 1;
			const nextLineEnd = text.indexOf('\n', nextLineStart);
			const nextLineLength = (nextLineEnd === -1 ? text.length : nextLineEnd) - nextLineStart;
			newPos = nextLineStart + Math.min(currentCol, nextLineLength);
		}

		editor.setSelectionRange(newPos, newPos);
		editor.dispatchEvent(new Event('keyup'));
		this.scrollCursorIntoView(editor);
		return true;
	}

	private scrollCursorIntoView(editor: HTMLTextAreaElement): void {
		const noteItem = editor.closest('.daily-note-item');
		if (noteItem) {
			const cursorPos = editor.selectionStart;
			if (cursorPos === 0) {
				// Navigating to start of note — show the date heading too
				noteItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				return;
			}
		}
		const wrapper = editor.closest('.daily-note-editor-wrapper');
		const cursorEl = wrapper?.querySelector('.custom-cursor');
		if (cursorEl) {
			cursorEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		} else {
			editor.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}

	focusFirstEditor(): void {
		const firstEditor = this.editors.values().next().value;
		if (firstEditor) {
			firstEditor.focus();
		}
	}
}
