import {
	App,
	ItemView,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
	Notice,
	MarkdownRenderer
} from 'obsidian';

// Constants for the view type
const VIEW_TYPE_DAILY_NOTES = 'daily-notes-viewer';

// Interface for plugin settings
interface DailyNotesViewerSettings {
	dailyNotesFolder: string;
	dateFormat: string;
	openOnStartup: boolean;
	sortOrder: 'newest' | 'oldest';
}

// Default settings
const DEFAULT_SETTINGS: DailyNotesViewerSettings = {
	dailyNotesFolder: '',  // Empty means root folder
	dateFormat: 'YYYY-MM-DD',  // Common date format
	openOnStartup: true,
	sortOrder: 'newest'
}

// Custom view class for displaying daily notes
class DailyNotesView extends ItemView {
	plugin: DailyNotesViewerPlugin;
	dailyNotes: TFile[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: DailyNotesViewerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_DAILY_NOTES;
	}

	getDisplayText(): string {
		return 'Daily Notes Viewer';
	}

	getIcon(): string {
		return 'calendar-with-checkmark';
	}

	async onOpen() {
		await this.loadDailyNotes();
		await this.render();
	}

	async onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	// Load all daily notes from the specified folder
	async loadDailyNotes() {
		const { dailyNotesFolder, sortOrder } = this.plugin.settings;
		const allFiles = this.app.vault.getMarkdownFiles();

		// Filter files based on the daily notes folder and date format pattern
		this.dailyNotes = allFiles.filter(file => {
			// Check if file is in the specified folder (or root if empty)
			if (dailyNotesFolder) {
				if (!file.path.startsWith(dailyNotesFolder)) {
					return false;
				}
			}

			// Check if filename matches a date pattern
			const fileName = file.basename;
			const datePattern = /^\d{4}-\d{2}-\d{2}$/; // Matches YYYY-MM-DD format
			return datePattern.test(fileName);
		});

		// Sort by filename (which should be the date)
		this.dailyNotes.sort((a, b) => {
			if (sortOrder === 'newest') {
				return b.basename.localeCompare(a.basename);
			} else {
				return a.basename.localeCompare(b.basename);
			}
		});
	}

	// Render the view
	async render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('daily-notes-viewer');

		// Add header with controls
		const headerEl = contentEl.createDiv('daily-notes-header');
		headerEl.createEl('h2', { text: 'Daily Notes' });

		const controlsEl = headerEl.createDiv('daily-notes-controls');

		// Refresh button
		const refreshBtn = controlsEl.createEl('button', { text: 'Refresh' });
		refreshBtn.addEventListener('click', async () => {
			await this.loadDailyNotes();
			await this.render();
			new Notice('Daily notes refreshed');
		});

		// Notes count
		controlsEl.createEl('span', {
			text: `${this.dailyNotes.length} note${this.dailyNotes.length !== 1 ? 's' : ''}`,
			cls: 'daily-notes-count'
		});

		// Container for all daily notes
		const notesContainer = contentEl.createDiv('daily-notes-container');

		if (this.dailyNotes.length === 0) {
			notesContainer.createEl('p', {
				text: 'No daily notes found. Create daily notes with YYYY-MM-DD format (e.g., 2025-10-24.md)',
				cls: 'daily-notes-empty'
			});
			return;
		}

		// Render each daily note
		for (const file of this.dailyNotes) {
			await this.renderDailyNote(notesContainer, file);
		}
	}

	// Render a single daily note
	async renderDailyNote(container: HTMLElement, file: TFile) {
		const noteEl = container.createDiv('daily-note-item');

		// Header with date and actions
		const noteHeader = noteEl.createDiv('daily-note-header');

		// Date as clickable link
		const dateLink = noteHeader.createEl('h3', { cls: 'daily-note-date' });
		const link = dateLink.createEl('a', {
			text: file.basename,
			cls: 'internal-link'
		});
		link.addEventListener('click', async (e) => {
			e.preventDefault();
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		});

		// Action buttons
		const actionsEl = noteHeader.createDiv('daily-note-actions');

		// Open in new tab button
		const openBtn = actionsEl.createEl('button', {
			text: 'Open',
			cls: 'daily-note-btn'
		});
		openBtn.addEventListener('click', async () => {
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(file);
		});

		// Edit button
		const editBtn = actionsEl.createEl('button', {
			text: 'Edit',
			cls: 'daily-note-btn'
		});
		editBtn.addEventListener('click', () => {
			this.showEditMode(noteEl, file);
		});

		// Content area
		const contentDiv = noteEl.createDiv('daily-note-content');

		try {
			const content = await this.app.vault.read(file);
			if (content.trim()) {
				// Render markdown content
				await MarkdownRenderer.renderMarkdown(
					content,
					contentDiv,
					file.path,
					this
				);
			} else {
				contentDiv.createEl('p', {
					text: '(Empty note)',
					cls: 'daily-note-empty'
				});
			}
		} catch (error) {
			contentDiv.createEl('p', {
				text: 'Error loading note content',
				cls: 'daily-note-error'
			});
		}
	}

	// Show edit mode for a note
	showEditMode(noteEl: HTMLElement, file: TFile) {
		const contentDiv = noteEl.querySelector('.daily-note-content') as HTMLElement;
		if (!contentDiv) return;

		// Load current content
		this.app.vault.read(file).then(content => {
			contentDiv.empty();

			// Create textarea
			const textarea = contentDiv.createEl('textarea', {
				cls: 'daily-note-editor'
			});
			textarea.value = content;
			textarea.rows = 10;

			// Save and Cancel buttons
			const btnContainer = contentDiv.createDiv('daily-note-edit-actions');

			const saveBtn = btnContainer.createEl('button', {
				text: 'Save',
				cls: 'mod-cta'
			});
			saveBtn.addEventListener('click', async () => {
				try {
					await this.app.vault.modify(file, textarea.value);
					new Notice('Note saved');
					// Re-render this note
					noteEl.empty();
					const parent = noteEl.parentElement;
					if (parent) {
						noteEl.remove();
						await this.renderDailyNote(parent, file);
					}
				} catch (error) {
					new Notice('Error saving note: ' + error.message);
				}
			});

			const cancelBtn = btnContainer.createEl('button', {
				text: 'Cancel'
			});
			cancelBtn.addEventListener('click', () => {
				// Re-render this note
				noteEl.empty();
				const parent = noteEl.parentElement;
				if (parent) {
					noteEl.remove();
					this.renderDailyNote(parent, file);
				}
			});

			textarea.focus();
		});
	}
}

// Main plugin class
export default class DailyNotesViewerPlugin extends Plugin {
	settings: DailyNotesViewerSettings;

	async onload() {
		await this.loadSettings();

		// Register the custom view
		this.registerView(
			VIEW_TYPE_DAILY_NOTES,
			(leaf) => new DailyNotesView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('calendar-with-checkmark', 'Open Daily Notes Viewer', () => {
			this.activateView();
		});

		// Add command
		this.addCommand({
			id: 'open-daily-notes-viewer',
			name: 'Open Daily Notes Viewer',
			callback: () => {
				this.activateView();
			}
		});

		// Add command to refresh the view
		this.addCommand({
			id: 'refresh-daily-notes-viewer',
			name: 'Refresh Daily Notes Viewer',
			callback: async () => {
				const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAILY_NOTES);
				if (leaves.length > 0) {
					const view = leaves[0].view as DailyNotesView;
					await view.loadDailyNotes();
					await view.render();
					new Notice('Daily notes refreshed');
				} else {
					new Notice('Daily Notes Viewer is not open');
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new DailyNotesViewerSettingTab(this.app, this));

		// Open on startup if configured
		if (this.settings.openOnStartup) {
			this.app.workspace.onLayoutReady(() => {
				this.activateView();
			});
		}
	}

	onunload() {
		// Detach all leaves with our view type
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_DAILY_NOTES);
	}

	async activateView() {
		const { workspace } = this.app;

		// Check if view is already open
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_DAILY_NOTES)[0];

		if (!leaf) {
			// Create new leaf in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
			} else {
				leaf = workspace.getLeaf(true);
			}
			await leaf.setViewState({
				type: VIEW_TYPE_DAILY_NOTES,
				active: true,
			});
		}

		// Reveal the leaf
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Settings tab
class DailyNotesViewerSettingTab extends PluginSettingTab {
	plugin: DailyNotesViewerPlugin;

	constructor(app: App, plugin: DailyNotesViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Daily Notes Viewer Settings' });

		// Daily notes folder setting
		new Setting(containerEl)
			.setName('Daily notes folder')
			.setDesc('Folder where your daily notes are stored (leave empty for root folder)')
			.addText(text => text
				.setPlaceholder('Example: Daily Notes')
				.setValue(this.plugin.settings.dailyNotesFolder)
				.onChange(async (value) => {
					this.plugin.settings.dailyNotesFolder = value;
					await this.plugin.saveSettings();
				}));

		// Date format setting (informational)
		new Setting(containerEl)
			.setName('Date format')
			.setDesc('Currently supports YYYY-MM-DD format (e.g., 2025-10-24)')
			.addText(text => text
				.setValue(this.plugin.settings.dateFormat)
				.setDisabled(true));

		// Open on startup setting
		new Setting(containerEl)
			.setName('Open on startup')
			.setDesc('Automatically open the Daily Notes Viewer when Obsidian starts')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.openOnStartup)
				.onChange(async (value) => {
					this.plugin.settings.openOnStartup = value;
					await this.plugin.saveSettings();
				}));

		// Sort order setting
		new Setting(containerEl)
			.setName('Sort order')
			.setDesc('Choose how to sort your daily notes')
			.addDropdown(dropdown => dropdown
				.addOption('newest', 'Newest first')
				.addOption('oldest', 'Oldest first')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value: 'newest' | 'oldest') => {
					this.plugin.settings.sortOrder = value;
					await this.plugin.saveSettings();
				}));
	}
}
