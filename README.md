# Daily Notes Viewer for Obsidian

A powerful Obsidian plugin that displays all your daily notes in a single, unified view with inline editing capabilities. Perfect for reviewing your journal entries, tracking progress, and managing your daily notes efficiently.

## Features

- **Unified View**: See all your daily notes in one place, sorted by date
- **Inline Editing**: Edit any daily note directly from the viewer with a built-in textarea editor
- **Auto-Open on Startup**: Automatically opens the viewer when Obsidian starts (configurable)
- **Quick Navigation**: Click on any date to open that note in the editor
- **Refresh on Demand**: Refresh button to reload your daily notes list
- **Customizable Settings**: Configure folder location, sort order, and startup behavior
- **Clean UI**: Beautiful, responsive interface that adapts to your Obsidian theme
- **Multiple Access Points**: Access via ribbon icon, command palette, or automatically on startup

## Installation

### For Development

1. Clone this repository to your vault's plugins folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone <this-repo-url> daily-notes-viewer
   ```

2. Install dependencies:
   ```bash
   cd daily-notes-viewer
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Enable the plugin in Obsidian settings under Community Plugins

### For Production Use

1. Download the latest release from the releases page
2. Extract the files to your vault's plugin folder: `<vault>/.obsidian/plugins/daily-notes-viewer/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

### Opening the Daily Notes Viewer

There are three ways to open the viewer:

1. **Ribbon Icon**: Click the calendar icon in the left sidebar
2. **Command Palette**: Press `Cmd/Ctrl + P` and search for "Open Daily Notes Viewer"
3. **Auto-open**: The viewer will open automatically on startup (if enabled in settings)

### Viewing Notes

- All daily notes are displayed in a scrollable list, sorted by date
- Each note shows its date as a clickable link
- The markdown content is rendered with full formatting
- Empty notes are indicated with "(Empty note)"

### Editing Notes

1. Click the **Edit** button on any note
2. Make your changes in the textarea editor
3. Click **Save** to save changes or **Cancel** to discard

### Quick Actions

- **Open**: Opens the note in a new tab
- **Date Link**: Click the date to open the note in the current pane
- **Refresh**: Reload the list of daily notes

### Commands

- **Open Daily Notes Viewer**: Opens or reveals the viewer
- **Refresh Daily Notes Viewer**: Refreshes the notes list in an open viewer

## Settings

Access settings via Settings → Plugin Options → Daily Notes Viewer

### Available Settings

- **Daily notes folder**: Specify the folder where your daily notes are stored
  - Leave empty to search in the root folder
  - Example: `Daily Notes` or `Journal/Daily`

- **Date format**: Currently supports YYYY-MM-DD format (e.g., 2025-10-24)
  - This setting is informational only
  - Notes must use YYYY-MM-DD format to be detected

- **Open on startup**: Toggle automatic opening when Obsidian starts

- **Sort order**: Choose how to sort your daily notes
  - Newest first: Shows most recent notes at the top
  - Oldest first: Shows oldest notes at the top

## Daily Notes Format

The plugin automatically detects daily notes based on their filename format:

- **Required format**: `YYYY-MM-DD.md`
- **Examples**:
  - `2025-10-24.md`
  - `2024-12-31.md`
  - `2023-01-01.md`

Notes with other naming patterns will not be displayed in the viewer.

## Development

### Build Commands

- `npm run dev`: Start development mode with watch
- `npm run build`: Build for production
- `npm run version`: Bump version and update manifest

### Project Structure

```
daily-notes-viewer/
├── src/
│   └── main.ts          # Main plugin code
├── styles.css           # Plugin styles
├── manifest.json        # Plugin manifest
├── package.json         # NPM dependencies
└── README.md           # Documentation
```

### Key Components

- **DailyNotesView**: Custom ItemView that displays the daily notes
- **DailyNotesViewerPlugin**: Main plugin class that manages the view lifecycle
- **DailyNotesViewerSettingTab**: Settings interface for configuration

## Tips and Tricks

1. **Fast Navigation**: Use the date links to quickly jump to a specific daily note
2. **Bulk Review**: Scroll through all your daily notes to review your progress over time
3. **Quick Edits**: Make small edits directly in the viewer without opening separate tabs
4. **Pin the View**: Keep the viewer open in your sidebar for easy access
5. **Keyboard Shortcut**: Assign a custom hotkey to "Open Daily Notes Viewer" in Obsidian's hotkey settings

## Troubleshooting

### No daily notes showing up?

- Ensure your daily notes follow the YYYY-MM-DD.md naming format
- Check that the "Daily notes folder" setting points to the correct folder
- Click the Refresh button to reload the notes list

### Plugin not opening on startup?

- Verify that "Open on startup" is enabled in settings
- Check that the plugin is enabled in Community Plugins
- Try restarting Obsidian

### Edit button not working?

- Make sure you have write permissions for the note
- Check that the file still exists in your vault
- Try refreshing the viewer

## Support

If you encounter any issues or have feature requests, please:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information about the problem
3. Include your Obsidian version and plugin version

## Roadmap

Potential future features:

- Support for custom date formats
- Filtering options (by date range, tags, etc.)
- Search functionality within daily notes
- Export all daily notes to a single file
- Statistics and analytics for daily notes

## License

MIT License - see LICENSE file for details

## Credits

Built with the Obsidian API. Thanks to the Obsidian team for creating an amazing platform!

---

**Made with ❤️ for the Obsidian community**
