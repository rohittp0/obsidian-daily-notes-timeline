// Constants
export const VIEW_TYPE_DAILY_NOTES = 'daily-notes-viewer';
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const DEFAULT_AUTO_SAVE_DELAY = 2000;
export const DEFAULT_TEXTAREA_ROWS = 10;
export const SAVE_INDICATOR_DURATION = 2000;

// Vim mode types
export type VimMode = 'command' | 'insert';

// Settings interface
export interface DailyNotesViewerSettings {
	dailyNotesFolder: string;
	dateFormat: string;
	openOnStartup: boolean;
	sortOrder: 'newest' | 'oldest';
	autoSave: boolean;
	autoSaveDelay: number;
	vimModeEnabled: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: DailyNotesViewerSettings = {
	dailyNotesFolder: '',
	dateFormat: 'YYYY-MM-DD',
	openOnStartup: true,
	sortOrder: 'newest',
	autoSave: true,
	autoSaveDelay: DEFAULT_AUTO_SAVE_DELAY,
	vimModeEnabled: false
};
