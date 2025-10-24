import { App, TFile } from 'obsidian';
import { DATE_PATTERN } from '../types';
import type { DailyNotesViewerSettings } from '../types';

export class FileManager {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	loadDailyNotes(settings: DailyNotesViewerSettings): TFile[] {
		const allFiles = this.app.vault.getMarkdownFiles();
		const dailyNotes = allFiles.filter(file =>
			this.isDailyNote(file, settings.dailyNotesFolder)
		);
		return this.sortDailyNotes(dailyNotes, settings.sortOrder);
	}

	private isDailyNote(file: TFile, folder: string): boolean {
		if (folder && !file.path.startsWith(folder)) {
			return false;
		}
		return DATE_PATTERN.test(file.basename);
	}

	private sortDailyNotes(files: TFile[], sortOrder: 'newest' | 'oldest'): TFile[] {
		return files.sort((a, b) => {
			const comparison = b.basename.localeCompare(a.basename);
			return sortOrder === 'newest' ? comparison : -comparison;
		});
	}
}