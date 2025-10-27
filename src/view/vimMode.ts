import type { VimMode } from '../types';

export class VimModeManager {
	private currentMode: VimMode = 'command';
	private editors: Map<string, HTMLTextAreaElement>;
	private modeIndicators: Map<string, HTMLElement> = new Map();
	private enabled: boolean;

	constructor(editors: Map<string, HTMLTextAreaElement>, enabled: boolean) {
		this.editors = editors;
		this.enabled = enabled;
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (!enabled) {
			this.setMode('insert');
			this.clearAllIndicators();
		}
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	getCurrentMode(): VimMode {
		return this.currentMode;
	}

	setMode(mode: VimMode): void {
		this.currentMode = mode;
		this.updateAllEditors();
		this.updateAllIndicators();
	}

	registerModeIndicator(editorPath: string, indicator: HTMLElement): void {
		this.modeIndicators.set(editorPath, indicator);
		this.updateIndicator(indicator);
	}

	setupVimModeForEditor(editor: HTMLTextAreaElement): void {
		if (!this.enabled) {
			this.enableEditor(editor);
			return;
		}

		editor.addEventListener('keydown', (e: KeyboardEvent) => {
			this.handleEditorKeydown(e, editor);
		});

		editor.addEventListener('focus', () => {
			this.updateEditorState(editor);
		});

		this.updateEditorState(editor);
	}

	private handleEditorKeydown(e: KeyboardEvent, editor: HTMLTextAreaElement): void {
		if (!this.enabled) return;

		// Handle mode transitions
		if (this.currentMode === 'command') {
			this.handleCommandModeKey(e, editor);
		} else if (this.currentMode === 'insert') {
			this.handleInsertModeKey(e, editor);
		}
	}

	private handleCommandModeKey(e: KeyboardEvent, editor: HTMLTextAreaElement): void {
		// Prevent all input in command mode except mode-changing keys
		const modeChangeKeys = ['i', 'I', 'a', 'A', 'o', 'O', 'Enter'];
		const navigationKeys = ['j', 'k', 'h', 'l', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

		if (!modeChangeKeys.includes(e.key) && !navigationKeys.includes(e.key) &&
		    !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			return;
		}

		// Mode change keys
		switch (e.key) {
			case 'i': // Insert at cursor
				e.preventDefault();
				this.setMode('insert');
				break;
			case 'I': // Insert at beginning of line
				e.preventDefault();
				this.moveCursorToLineStart(editor);
				this.setMode('insert');
				break;
			case 'a': // Append after cursor
				e.preventDefault();
				this.moveCursorRight(editor);
				this.setMode('insert');
				break;
			case 'A': // Append at end of line
				e.preventDefault();
				this.moveCursorToLineEnd(editor);
				this.setMode('insert');
				break;
			case 'o': // Open line below
				e.preventDefault();
				this.openLineBelow(editor);
				this.setMode('insert');
				break;
			case 'O': // Open line above
				e.preventDefault();
				this.openLineAbove(editor);
				this.setMode('insert');
				break;
			case 'Enter':
				e.preventDefault();
				this.setMode('insert');
				break;
		}
	}

	private handleInsertModeKey(e: KeyboardEvent, _editor: HTMLTextAreaElement): void {
		// Escape to command mode
		if (e.key === 'Escape') {
			e.preventDefault();
			this.setMode('command');
		}
	}

	private updateAllEditors(): void {
		for (const editor of this.editors.values()) {
			this.updateEditorState(editor);
		}
	}

	private updateEditorState(editor: HTMLTextAreaElement): void {
		if (!this.enabled || this.currentMode === 'insert') {
			this.enableEditor(editor);
		} else {
			this.disableEditor(editor);
		}
	}

	private enableEditor(editor: HTMLTextAreaElement): void {
		editor.removeAttribute('readonly');
	}

	private disableEditor(editor: HTMLTextAreaElement): void {
		editor.setAttribute('readonly', 'true');
	}

	private updateAllIndicators(): void {
		for (const indicator of this.modeIndicators.values()) {
			this.updateIndicator(indicator);
		}
	}

	private updateIndicator(indicator: HTMLElement): void {
		if (!this.enabled) {
			indicator.textContent = '';
			indicator.removeClass('vim-normal');
			indicator.removeClass('vim-insert');
			return;
		}

		if (this.currentMode === 'command') {
			indicator.textContent = 'NORMAL';
			indicator.removeClass('vim-insert');
			indicator.addClass('vim-normal');
		} else {
			indicator.textContent = 'INSERT';
			indicator.removeClass('vim-normal');
			indicator.addClass('vim-insert');
		}
	}

	private clearAllIndicators(): void {
		for (const indicator of this.modeIndicators.values()) {
			indicator.textContent = '';
			indicator.removeClass('vim-normal');
			indicator.removeClass('vim-insert');
		}
	}

	// Cursor movement helpers
	private moveCursorRight(editor: HTMLTextAreaElement): void {
		const pos = editor.selectionStart;
		editor.setSelectionRange(pos + 1, pos + 1);
	}

	private moveCursorToLineStart(editor: HTMLTextAreaElement): void {
		const pos = editor.selectionStart;
		const text = editor.value.substring(0, pos);
		const lineStart = text.lastIndexOf('\n') + 1;
		editor.setSelectionRange(lineStart, lineStart);
	}

	private moveCursorToLineEnd(editor: HTMLTextAreaElement): void {
		const pos = editor.selectionStart;
		const text = editor.value.substring(pos);
		const lineEnd = text.indexOf('\n');
		const newPos = lineEnd === -1 ? editor.value.length : pos + lineEnd;
		editor.setSelectionRange(newPos, newPos);
	}

	private openLineBelow(editor: HTMLTextAreaElement): void {
		this.moveCursorToLineEnd(editor);
		const pos = editor.selectionStart;
		const before = editor.value.substring(0, pos);
		const after = editor.value.substring(pos);
		editor.value = before + '\n' + after;
		editor.setSelectionRange(pos + 1, pos + 1);
		editor.dispatchEvent(new Event('input', { bubbles: true }));
	}

	private openLineAbove(editor: HTMLTextAreaElement): void {
		this.moveCursorToLineStart(editor);
		const pos = editor.selectionStart;
		const before = editor.value.substring(0, pos);
		const after = editor.value.substring(pos);
		editor.value = before + '\n' + after;
		editor.setSelectionRange(pos, pos);
		editor.dispatchEvent(new Event('input', { bubbles: true }));
	}
}
