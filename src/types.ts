// Constants
export const VIEW_TYPE_DAILY_NOTES = 'daily-notes-viewer';
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const DEFAULT_AUTO_SAVE_DELAY = 2000;
export const DEFAULT_TEXTAREA_ROWS = 10;
export const SAVE_INDICATOR_DURATION = 2000;

// Vim mode types
export type VimMode = 'command' | 'insert';

// Display date format presets
export type DisplayDateFormat = 'full' | 'long' | 'medium' | 'short' | 'iso';

export const DATE_FORMAT_OPTIONS: Record<DisplayDateFormat, Intl.DateTimeFormatOptions | null> = {
	full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
	long: { year: 'numeric', month: 'long', day: 'numeric' },
	medium: { year: 'numeric', month: 'short', day: 'numeric' },
	short: { year: 'numeric', month: 'numeric', day: 'numeric' },
	iso: null,
};

export const DATE_FORMAT_LABELS: Record<DisplayDateFormat, string> = {
	full: 'Full (Thursday, February 8, 2026)',
	long: 'Long (February 8, 2026)',
	medium: 'Medium (Feb 8, 2026)',
	short: 'Short (2/8/2026)',
	iso: 'ISO (2026-02-08)',
};

// Settings interface
export interface DailyNotesViewerSettings {
	dailyNotesFolder: string;
	displayDateFormat: DisplayDateFormat;
	openOnStartup: boolean;
	sortOrder: 'newest' | 'oldest';
	autoSave: boolean;
	autoSaveDelay: number;
	vimModeEnabled: boolean;
	navigationEnabled: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: DailyNotesViewerSettings = {
	dailyNotesFolder: '',
	displayDateFormat: 'full',
	openOnStartup: true,
	sortOrder: 'newest',
	autoSave: true,
	autoSaveDelay: DEFAULT_AUTO_SAVE_DELAY,
	vimModeEnabled: false,
	navigationEnabled: true
};
