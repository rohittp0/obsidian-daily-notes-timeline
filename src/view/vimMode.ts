import type { VimMode } from '../types';

type PendingOperator = 'd' | 'y' | 'c';

export class VimModeManager {
	private currentMode: VimMode = 'command';
	private editors: Map<string, HTMLTextAreaElement>;
	private modeIndicators: Map<string, HTMLElement> = new Map();
	private enabled: boolean;

	// Operator-pending state
	private pendingOperator: PendingOperator | null = null;
	private pendingEditor: HTMLTextAreaElement | null = null;

	// Vim register (shared across all editors, session-only)
	private register: string = '';

	// Per-editor undo stacks
	private undoStacks: Map<HTMLTextAreaElement, Array<{ value: string; cursor: number }>> = new Map();
	private static readonly MAX_UNDO = 50;

	constructor(editors: Map<string, HTMLTextAreaElement>, enabled: boolean) {
		this.editors = editors;
		this.enabled = enabled;
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (!enabled) {
			this.clearPending();
			this.undoStacks.clear();
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

		editor.addEventListener('blur', () => {
			this.clearPending();
		});

		this.updateEditorState(editor);
	}

	// --- Operator-pending state ---

	private enterPending(op: PendingOperator, editor: HTMLTextAreaElement): void {
		this.pendingOperator = op;
		this.pendingEditor = editor;
		this.updateAllIndicators();
	}

	private clearPending(): void {
		if (this.pendingOperator !== null) {
			this.pendingOperator = null;
			this.pendingEditor = null;
			this.updateAllIndicators();
		}
	}

	// --- Line helpers ---

	private getCurrentLineRange(editor: HTMLTextAreaElement): { lineStart: number; lineEnd: number; lineText: string } {
		const pos = editor.selectionStart;
		const text = editor.value;
		const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
		let lineEnd = text.indexOf('\n', pos);
		if (lineEnd === -1) lineEnd = text.length;
		return { lineStart, lineEnd, lineText: text.substring(lineStart, lineEnd) };
	}

	private dispatchMutationEvents(editor: HTMLTextAreaElement): void {
		editor.dispatchEvent(new Event('input', { bubbles: true }));
		editor.dispatchEvent(new Event('keyup', { bubbles: true }));
	}

	// --- Undo ---

	private pushUndo(editor: HTMLTextAreaElement): void {
		let stack = this.undoStacks.get(editor);
		if (!stack) {
			stack = [];
			this.undoStacks.set(editor, stack);
		}
		stack.push({ value: editor.value, cursor: editor.selectionStart });
		if (stack.length > VimModeManager.MAX_UNDO) {
			stack.shift();
		}
	}

	private undo(editor: HTMLTextAreaElement): void {
		const stack = this.undoStacks.get(editor);
		if (!stack || stack.length === 0) return;

		const entry = stack.pop()!;
		editor.value = entry.value;
		editor.setSelectionRange(entry.cursor, entry.cursor);
		this.dispatchMutationEvents(editor);
	}

	// --- Line operations ---

	private deleteLine(editor: HTMLTextAreaElement): void {
		const text = editor.value;
		const { lineStart, lineEnd, lineText } = this.getCurrentLineRange(editor);

		// Store in register (always with trailing newline for paste consistency)
		this.register = lineText + '\n';

		let newText: string;
		let newCursorPos: number;

		if (lineStart === 0 && lineEnd === text.length) {
			// Only line — empty the editor
			newText = '';
			newCursorPos = 0;
		} else if (lineEnd === text.length) {
			// Last line — also consume preceding \n
			newText = text.substring(0, lineStart - 1);
			// Cursor to start of new last line
			const lastNewline = newText.lastIndexOf('\n');
			newCursorPos = lastNewline + 1;
		} else {
			// First or middle line — remove line + trailing \n
			newText = text.substring(0, lineStart) + text.substring(lineEnd + 1);
			newCursorPos = lineStart;
		}

		editor.value = newText;
		editor.setSelectionRange(newCursorPos, newCursorPos);
		this.dispatchMutationEvents(editor);
	}

	private yankLine(editor: HTMLTextAreaElement): void {
		const { lineText } = this.getCurrentLineRange(editor);
		this.register = lineText + '\n';
		// No text mutation, just update cursor overlay
		editor.dispatchEvent(new Event('keyup', { bubbles: true }));
	}

	private changeLine(editor: HTMLTextAreaElement): void {
		const text = editor.value;
		const { lineStart, lineEnd, lineText } = this.getCurrentLineRange(editor);

		// Store in register
		this.register = lineText + '\n';

		// Replace line content with empty, preserving surrounding newlines
		const newText = text.substring(0, lineStart) + text.substring(lineEnd);
		editor.value = newText;
		editor.setSelectionRange(lineStart, lineStart);
		this.dispatchMutationEvents(editor);

		// Enter insert mode
		this.setMode('insert');
	}

	private pasteBelow(editor: HTMLTextAreaElement): void {
		if (!this.register) return;

		const text = editor.value;
		const { lineEnd } = this.getCurrentLineRange(editor);

		// Content to paste (without trailing \n — we manage newlines ourselves)
		const content = this.register.endsWith('\n')
			? this.register.substring(0, this.register.length - 1)
			: this.register;

		let newText: string;
		let newCursorPos: number;

		if (text.length === 0) {
			// Empty editor
			newText = content;
			newCursorPos = 0;
		} else if (lineEnd === text.length) {
			// Last line (no \n at end)
			newText = text + '\n' + content;
			newCursorPos = text.length + 1;
		} else {
			// Insert after current line's \n
			newText = text.substring(0, lineEnd + 1) + content + '\n' + text.substring(lineEnd + 1);
			newCursorPos = lineEnd + 1;
		}

		editor.value = newText;
		editor.setSelectionRange(newCursorPos, newCursorPos);
		this.dispatchMutationEvents(editor);
	}

	private pasteAbove(editor: HTMLTextAreaElement): void {
		if (!this.register) return;

		const text = editor.value;
		const { lineStart } = this.getCurrentLineRange(editor);

		const content = this.register.endsWith('\n')
			? this.register.substring(0, this.register.length - 1)
			: this.register;

		let newText: string;
		let newCursorPos: number;

		if (text.length === 0) {
			newText = content;
			newCursorPos = 0;
		} else {
			newText = text.substring(0, lineStart) + content + '\n' + text.substring(lineStart);
			newCursorPos = lineStart;
		}

		editor.value = newText;
		editor.setSelectionRange(newCursorPos, newCursorPos);
		this.dispatchMutationEvents(editor);
	}

	// --- Key handling ---

	private handleEditorKeydown(e: KeyboardEvent, editor: HTMLTextAreaElement): void {
		if (!this.enabled) return;

		if (this.currentMode === 'command') {
			this.handleCommandModeKey(e, editor);
		} else if (this.currentMode === 'insert') {
			this.handleInsertModeKey(e, editor);
		}
	}

	private handleCommandModeKey(e: KeyboardEvent, editor: HTMLTextAreaElement): void {
		// Step 1: Handle pending operator
		if (this.pendingOperator !== null) {
			e.preventDefault();
			const op = this.pendingOperator;
			const pendingEditor = this.pendingEditor;
			this.clearPending();

			// Only execute if same key as operator AND same editor
			if (e.key === op && editor === pendingEditor) {
				switch (op) {
					case 'd': this.pushUndo(editor); this.deleteLine(editor); break;
					case 'y': this.yankLine(editor); break;
					case 'c': this.pushUndo(editor); this.changeLine(editor); break;
				}
			}
			// Any non-matching key is consumed (cancelled) — no side effects
			return;
		}

		// Step 2: Define allowed keys
		const operatorKeys = ['d', 'y', 'c'];
		const actionKeys = ['p', 'P', 'u'];
		const modeChangeKeys = ['i', 'I', 'a', 'A', 'o', 'O', 'Enter'];
		const navigationKeys = ['j', 'k', 'h', 'l', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
		const miscKeys = ['Escape'];

		// Block unrecognized keys (except ctrl/meta combos)
		if (!operatorKeys.includes(e.key) && !actionKeys.includes(e.key) &&
		    !modeChangeKeys.includes(e.key) && !navigationKeys.includes(e.key) &&
		    !miscKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			return;
		}

		// Step 3: Escape — explicit no-op
		if (e.key === 'Escape') {
			e.preventDefault();
			return;
		}

		// Step 4: Operators — enter pending state
		if (operatorKeys.includes(e.key)) {
			e.preventDefault();
			this.enterPending(e.key as PendingOperator, editor);
			return;
		}

		// Step 5: Actions — immediate execution
		if (e.key === 'p') {
			e.preventDefault();
			this.pushUndo(editor);
			this.pasteBelow(editor);
			return;
		}
		if (e.key === 'P') {
			e.preventDefault();
			this.pushUndo(editor);
			this.pasteAbove(editor);
			return;
		}
		if (e.key === 'u') {
			e.preventDefault();
			this.undo(editor);
			return;
		}

		// Step 6: Navigation — let through (no preventDefault)
		if (navigationKeys.includes(e.key)) {
			return;
		}

		// Step 7: Mode changes
		switch (e.key) {
			case 'i':
				e.preventDefault();
				this.pushUndo(editor);
				this.setMode('insert');
				break;
			case 'I':
				e.preventDefault();
				this.pushUndo(editor);
				this.moveCursorToLineStart(editor);
				this.setMode('insert');
				break;
			case 'a':
				e.preventDefault();
				this.pushUndo(editor);
				this.moveCursorRight(editor);
				this.setMode('insert');
				break;
			case 'A':
				e.preventDefault();
				this.pushUndo(editor);
				this.moveCursorToLineEnd(editor);
				this.setMode('insert');
				break;
			case 'o':
				e.preventDefault();
				this.pushUndo(editor);
				this.openLineBelow(editor);
				this.setMode('insert');
				break;
			case 'O':
				e.preventDefault();
				this.pushUndo(editor);
				this.openLineAbove(editor);
				this.setMode('insert');
				break;
			case 'Enter':
				e.preventDefault();
				this.pushUndo(editor);
				this.setMode('insert');
				break;
		}
	}

	private handleInsertModeKey(e: KeyboardEvent, _editor: HTMLTextAreaElement): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			this.setMode('command');
		}
	}

	// --- Editor state ---

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

	// --- Indicators ---

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
			if (this.pendingOperator !== null) {
				indicator.textContent = this.pendingOperator;
			} else {
				indicator.textContent = 'NORMAL';
			}
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

	// --- Cursor movement helpers ---

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
		this.dispatchMutationEvents(editor);
	}

	private openLineAbove(editor: HTMLTextAreaElement): void {
		this.moveCursorToLineStart(editor);
		const pos = editor.selectionStart;
		const before = editor.value.substring(0, pos);
		const after = editor.value.substring(pos);
		editor.value = before + '\n' + after;
		editor.setSelectionRange(pos, pos);
		this.dispatchMutationEvents(editor);
	}
}
