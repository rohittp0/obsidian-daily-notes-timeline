export class NavigationManager {
	private editors: Map<string, HTMLTextAreaElement>;

	constructor(editors: Map<string, HTMLTextAreaElement>) {
		this.editors = editors;
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

		const cursorAtStart = currentEditor.selectionStart === 0;
		const cursorAtEnd = currentEditor.selectionStart === currentEditor.value.length;

		const nextIndex = this.getNextEditorIndex(e, currentIndex, cursorAtStart, cursorAtEnd);

		if (nextIndex !== null && nextIndex >= 0 && nextIndex < editorsArray.length) {
			e.preventDefault();
			this.focusEditor(editorsArray[nextIndex], e.key === 'ArrowDown' || e.key === 'j');
		}
	}

	private getNextEditorIndex(
		e: KeyboardEvent,
		currentIndex: number,
		cursorAtStart: boolean,
		cursorAtEnd: boolean
	): number | null {
		// Navigate up: Arrow Up or 'k' (vim)
		if ((e.key === 'ArrowUp' && cursorAtStart) || (e.key === 'k' && cursorAtStart && !e.shiftKey)) {
			return currentIndex - 1;
		}
		// Navigate down: Arrow Down or 'j' (vim)
		if ((e.key === 'ArrowDown' && cursorAtEnd) || (e.key === 'j' && cursorAtEnd && !e.shiftKey)) {
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