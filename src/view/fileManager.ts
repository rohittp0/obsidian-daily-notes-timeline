import { App, TFile } from 'obsidian';
import { DATE_PATTERN } from '../types';
import type { DailyNotesViewerSettings } from '../types';

export class FileManager {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	getTodayDateStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	getTodayPath(settings: DailyNotesViewerSettings): string {
		const folder = settings.dailyNotesFolder;
		const dateStr = this.getTodayDateStr();
		return folder ? `${folder}/${dateStr}.md` : `${dateStr}.md`;
	}

	loadDailyNotes(settings: DailyNotesViewerSettings): TFile[] {
		const allFiles = this.app.vault.getMarkdownFiles();
		const dailyNotes = allFiles.filter(file =>
			this.isDailyNote(file, settings.dailyNotesFolder)
		);
		return this.sortDailyNotes(dailyNotes, settings.sortOrder);
	}

	async loadDailyNotesFilteringEmpty(settings: DailyNotesViewerSettings): Promise<TFile[]> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const dailyNotes = allFiles.filter(file =>
			this.isDailyNote(file, settings.dailyNotesFolder)
		);
		const todayStr = this.getTodayDateStr();

		const nonEmpty: TFile[] = [];
		for (const file of dailyNotes) {
			if (file.basename === todayStr) {
				nonEmpty.push(file);
				continue;
			}
			const content = await this.app.vault.read(file);
			if (content.trim().length === 0) {
				await this.app.vault.trash(file, false);
			} else {
				nonEmpty.push(file);
			}
		}
		return this.sortDailyNotes(nonEmpty, settings.sortOrder);
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