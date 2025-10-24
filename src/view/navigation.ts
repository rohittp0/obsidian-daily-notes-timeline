import type { VimModeManager } from './vimMode';

export class NavigationManager {
	private editors: Map<string, HTMLTextAreaElement>;
	private vimModeManager?: VimModeManager;

	constructor(editors: Map<string, HTMLTextAreaElement>) {
		this.editors = editors;
	}

	setVimModeManager(vimModeManager: VimModeManager): void {
		this.vimModeManager = vimModeManager;
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
		const editorsArray = Array.from(this.editors.values());
		const currentIndex = editorsArray.indexOf(currentEditor);

		if (currentIndex === -1) return;

		// Check if vim mode is enabled and in command mode
		const isVimCommandMode = this.vimModeManager?.isEnabled() &&
		                         this.vimModeManager?.getCurrentMode() === 'command';

		const cursorAtStart = currentEditor.selectionStart === 0;
		const cursorAtEnd = currentEditor.selectionStart === currentEditor.value.length;

		const nextIndex = this.getNextEditorIndex(e, currentIndex, cursorAtStart, cursorAtEnd, isVimCommandMode);

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
		isVimCommandMode: boolean
	): number | null {
		// In vim command mode, j/k always navigate (no cursor position check needed)
		if (isVimCommandMode) {
			if (e.key === 'k' && !e.shiftKey) {
				return currentIndex - 1;
			}
			if (e.key === 'j' && !e.shiftKey) {
				return currentIndex + 1;
			}
		}

		// In normal mode or insert mode, only navigate at cursor boundaries
		// Navigate up: Arrow Up or 'k' (vim)
		if ((e.key === 'ArrowUp' && cursorAtStart) ||
		    (e.key === 'k' && cursorAtStart && !e.shiftKey && !isVimCommandMode)) {
			return currentIndex - 1;
		}

		// Navigate down: Arrow Down or 'j' (vim)
		if ((e.key === 'ArrowDown' && cursorAtEnd) ||
		    (e.key === 'j' && cursorAtEnd && !e.shiftKey && !isVimCommandMode)) {
			return currentIndex + 1;
		}

		return null;
	}

	private focusEditor(editor: HTMLTextAreaElement, placeAtStart: boolean): void {
		editor.focus();
		const position = placeAtStart ? 0 : editor.value.length;
		editor.setSelectionRange(position, position);
	}

	focusFirstEditor(): void {
		const firstEditor = this.editors.values().next().value;
		if (firstEditor) {
			firstEditor.focus();
		}
	}
}
