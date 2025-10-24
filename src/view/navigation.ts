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
		// In vim command mode, both j/k and arrow keys navigate freely
		if (isVimCommandMode) {
			if (e.key === 'k' && !e.shiftKey) {
				return currentIndex - 1;
			}
			if (e.key === 'j' && !e.shiftKey) {
				return currentIndex + 1;
			}
			// Arrow keys also work in command mode
			if (e.key === 'ArrowUp') {
				return currentIndex - 1;
			}
			if (e.key === 'ArrowDown') {
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
	}

	focusFirstEditor(): void {
		const firstEditor = this.editors.values().next().value;
		if (firstEditor) {
			firstEditor.focus();
		}
	}
}
