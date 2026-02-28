import type { VimModeManager } from './vimMode';
import type { DailyNotesViewerSettings } from '../types';
import { scheduleCursorUpdate } from './editorManager';

interface ScrollContext {
	scrollContainer: HTMLElement;
	noteItem: HTMLElement;
	wrapper: HTMLElement;
	cursor: HTMLElement;
}

export class NavigationManager {
	private editors: Map<string, HTMLTextAreaElement>;
	private editorsCache: HTMLTextAreaElement[] | null = null;
	private editorIndexMap: Map<HTMLTextAreaElement, number> | null = null;
	private cacheGeneration = -1;
	private currentGeneration = 0;
	private vimModeManager?: VimModeManager;
	private settings?: DailyNotesViewerSettings;
	private scrollRafId: number | null = null;
	private scrollContextCache: WeakMap<HTMLTextAreaElement, ScrollContext> = new WeakMap();
	private lastFocusedPath: string | null = null;
	private lastCursorPos = 0;

	constructor(editors: Map<string, HTMLTextAreaElement>) {
		this.editors = editors;
	}

	/** Call when the editors map has been mutated (add/remove/clear) */
	invalidateCache(): void {
		this.currentGeneration++;
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

		// Track last-focused editor via event delegation
		container.addEventListener('focusin', (e: FocusEvent) => {
			const target = e.target;
			if (!(target instanceof HTMLTextAreaElement)) return;
			// Reverse-lookup path from editors Map
			for (const [path, editor] of this.editors) {
				if (editor === target) {
					this.lastFocusedPath = path;
					break;
				}
			}
		});

		container.addEventListener('focusout', (e: FocusEvent) => {
			const target = e.target;
			if (!(target instanceof HTMLTextAreaElement)) return;
			this.lastCursorPos = target.selectionStart;
		});
	}

	/** Restore focus to the last-focused editor and cursor position */
	restoreLastFocus(): void {
		if (!this.lastFocusedPath) {
			this.focusFirstEditor();
			return;
		}
		const textarea = this.editors.get(this.lastFocusedPath);
		if (!textarea) {
			this.focusFirstEditor();
			return;
		}
		textarea.focus();
		const pos = Math.min(this.lastCursorPos, textarea.value.length);
		textarea.setSelectionRange(pos, pos);
		scheduleCursorUpdate(textarea);
	}

	private getEditorsArray(): HTMLTextAreaElement[] {
		if (!this.editorsCache || this.cacheGeneration !== this.currentGeneration) {
			this.editorsCache = Array.from(this.editors.values());
			this.editorIndexMap = new Map();
			for (let i = 0; i < this.editorsCache.length; i++) {
				this.editorIndexMap.set(this.editorsCache[i], i);
			}
			this.cacheGeneration = this.currentGeneration;
		}
		return this.editorsCache;
	}

	private getEditorIndex(editor: HTMLTextAreaElement): number {
		this.getEditorsArray(); // ensure cache is fresh
		return this.editorIndexMap?.get(editor) ?? -1;
	}

	private handleNavigationKey(e: KeyboardEvent, currentEditor: HTMLTextAreaElement): void {
		// Check if navigation is disabled
		if (this.settings && !this.settings.navigationEnabled) {
			return;
		}

		const editorsArray = this.getEditorsArray();
		const currentIndex = this.getEditorIndex(currentEditor);

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
		// Direct cursor overlay update — no synthetic events
		scheduleCursorUpdate(editor);
		this.scheduleScrollCursorIntoView(editor);
	}

	private moveCursorVertically(editor: HTMLTextAreaElement, direction: 'up' | 'down'): boolean {
		const text = editor.value;
		const pos = editor.selectionStart;

		if (direction === 'up') {
			// No \n before cursor means we're on line 1
			const lineStart = text.lastIndexOf('\n', pos - 1);
			if (lineStart === -1) return false;

			const currentCol = pos - (lineStart + 1);
			const prevLineStart = text.lastIndexOf('\n', lineStart - 1) + 1;
			const prevLineLength = lineStart - prevLineStart;
			const newPos = prevLineStart + Math.min(currentCol, prevLineLength);
			editor.setSelectionRange(newPos, newPos);
		} else {
			// No \n after cursor means we're on last line
			const lineEnd = text.indexOf('\n', pos);
			if (lineEnd === -1) return false;

			const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
			const currentCol = pos - lineStart;
			const nextLineStart = lineEnd + 1;
			const nextLineEnd = text.indexOf('\n', nextLineStart);
			const nextLineLength = (nextLineEnd === -1 ? text.length : nextLineEnd) - nextLineStart;
			const newPos = nextLineStart + Math.min(currentCol, nextLineLength);
			editor.setSelectionRange(newPos, newPos);
		}

		// Direct cursor overlay update — no synthetic events, internally coalesced via RAF
		scheduleCursorUpdate(editor);
		this.scheduleScrollCursorIntoView(editor);
		return true;
	}

	private scheduleScrollCursorIntoView(editor: HTMLTextAreaElement): void {
		if (this.scrollRafId !== null) {
			cancelAnimationFrame(this.scrollRafId);
		}
		this.scrollRafId = requestAnimationFrame(() => {
			this.scrollRafId = null;
			this.scrollCursorIntoView(editor);
		});
	}

	/** Populate scroll context cache for an editor (called once, results reused) */
	cacheScrollContext(editor: HTMLTextAreaElement): void {
		if (this.scrollContextCache.has(editor)) return;
		const scrollContainer = editor.closest('.daily-notes-viewer') as HTMLElement;
		const noteItem = editor.closest('.daily-note-item') as HTMLElement;
		const wrapper = editor.closest('.daily-note-editor-wrapper') as HTMLElement;
		const cursor = wrapper?.querySelector('.custom-cursor') as HTMLElement;
		if (scrollContainer && noteItem && wrapper && cursor) {
			this.scrollContextCache.set(editor, { scrollContainer, noteItem, wrapper, cursor });
		}
	}

	private scrollCursorIntoView(editor: HTMLTextAreaElement): void {
		// Use cached DOM references — avoids 4 tree walks per cursor move
		let ctx = this.scrollContextCache.get(editor);
		if (!ctx) {
			this.cacheScrollContext(editor);
			ctx = this.scrollContextCache.get(editor);
		}
		if (!ctx) return;

		const { scrollContainer, noteItem } = ctx;

		// Determine the target element to keep in view
		let target: Element;
		if (editor.selectionStart === 0 && noteItem) {
			target = noteItem;
		} else {
			target = ctx.cursor || editor;
		}

		// Account for sticky header height at the top
		const stickyHeader = noteItem?.querySelector('.daily-note-header') as HTMLElement | null;
		const stickyHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
		const topBuffer = Math.max(40, stickyHeight + 8);
		const bottomBuffer = 40;
		const containerRect = scrollContainer.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();

		if (targetRect.top < containerRect.top + topBuffer) {
			// Target is above visible area (or behind sticky header)
			scrollContainer.scrollTop -= (containerRect.top + topBuffer - targetRect.top);
		} else if (targetRect.bottom > containerRect.bottom - bottomBuffer) {
			// Target is below visible area
			scrollContainer.scrollTop += (targetRect.bottom - containerRect.bottom + bottomBuffer);
		}
	}

	destroy(): void {
		if (this.scrollRafId !== null) {
			cancelAnimationFrame(this.scrollRafId);
			this.scrollRafId = null;
		}
	}

	focusFirstEditor(): void {
		const firstEditor = this.editors.values().next().value;
		if (firstEditor) {
			firstEditor.focus();
		}
	}
}
