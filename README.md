# Daily Notes Viewer for Obsidian

A powerful Obsidian plugin that displays all your daily notes in a single, unified view with always-on editing, vim mode support, and keyboard navigation. Perfect for reviewing your journal entries, tracking progress, and managing your daily notes efficiently.

## Features

### Core Features
- **Unified View**: See all your daily notes in one place, sorted by date
- **Always-On Editing**: All notes are editable by default - just start typing
- **Auto-Save**: Changes are automatically saved while you type (configurable delay)
- **Keyboard Navigation**: Navigate between notes using arrow keys (or j/k in vim mode)
- **Vim Mode**: Optional vim-style editing with command and insert modes
- **Auto-Open on Startup**: Automatically opens the viewer when Obsidian starts
- **Customizable**: Extensive settings for folder location, sort order, navigation, and more

### Interface
- **Clean UI**: Beautiful, responsive interface that adapts to your Obsidian theme
- **Visual Indicators**: Save status and vim mode indicators for each note
- **Quick Actions**: Open notes in new tabs with a single click
- **Date Navigation**: Click on dates to open notes in the editor
- **Auto-Resizing**: Textareas automatically adjust to content size

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Go to **Community Plugins** and disable Safe Mode (if needed)
3. Click **Browse** and search for "Daily Notes Viewer"
4. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/rohittp0/obsidian-daily-notes-viewer/releases)
2. Extract `main.js`, `styles.css`, and `manifest.json` to:
   ```
   <vault>/.obsidian/plugins/daily-notes-viewer/
   ```
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### For Development

1. Clone this repository to your vault's plugins folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/rohittp0/obsidian-daily-notes-viewer daily-notes-viewer
   cd daily-notes-viewer
   npm install
   npm run dev
   ```

2. The plugin will automatically build and copy files to your vault
3. Reload Obsidian to see changes

## Usage

### Opening the Daily Notes Viewer

Access the viewer in multiple ways:

1. **Ribbon Icon**: Click the calendar icon in the left sidebar
2. **Command Palette**: `Cmd/Ctrl + P` → "Open Daily Notes Viewer"
3. **Auto-open**: Opens automatically on startup (if enabled in settings)

### Editing Notes

All notes are **always editable** - no buttons needed:

1. Click in any note to start editing
2. Changes auto-save after 2 seconds (default, configurable)
3. Watch the status indicator: `●` (typing) → `✓` (saved)

### Keyboard Navigation

**Without Vim Mode**:
- `↑` at cursor start → Move to previous note
- `↓` at cursor end → Move to next note
- Can be disabled in settings

**With Vim Mode Enabled**:

**Command Mode (NORMAL)**:
- `j` / `k` - Navigate between notes (no cursor position check)
- `↑` / `↓` - Navigate between notes
- `i` - Enter insert mode at cursor
- `I` - Enter insert mode at line start
- `a` - Enter insert mode after cursor
- `A` - Enter insert mode at line end
- `o` - Open new line below and enter insert mode
- `O` - Open new line above and enter insert mode

**Insert Mode (INSERT)**:
- All keys work normally for text editing
- `Esc` - Return to command mode
- No navigation (j/k type normally)

### Quick Actions

- **Date Link**: Click to open note in new tab
- **Open Button**: Opens note in new tab
- **Refresh Button**: Reload all daily notes
- **Mode Indicator**: Shows NORMAL/INSERT when vim mode is active
- **Save Indicator**: Shows save status (●/✓)

### Commands

- **Open Daily Notes Viewer**: Opens or reveals the viewer
- **Refresh Daily Notes Viewer**: Refreshes the notes list

## Settings

Access via **Settings → Daily Notes Viewer**

### File Settings

**Daily notes folder**
- Folder where your daily notes are stored
- Leave empty to search in root folder
- Example: `Daily Notes` or `Journal/Daily`

**Date format**
- Currently supports YYYY-MM-DD format only
- Files must be named like `2025-10-24.md`

**Sort order**
- `Newest first`: Most recent notes at the top
- `Oldest first`: Oldest notes at the top

### Behavior Settings

**Open on startup**
- Automatically open the viewer when Obsidian starts
- Default: Enabled

**Keyboard navigation**
- Enable navigation between notes using arrow keys (and j/k in vim mode)
- Default: Enabled
- When disabled: All keys work normally (no navigation)

**Vim mode**
- Enable vim-style editing with command and insert modes
- Default: Disabled
- Includes mode indicators (NORMAL/INSERT)

### Auto-Save Settings

**Auto-save**
- Automatically save notes while typing
- Default: Enabled

**Auto-save delay**
- Delay in milliseconds before auto-saving
- Default: 2000ms (2 seconds)
- Lower values save more frequently

## Daily Notes Format

The plugin detects daily notes by filename:

- **Required format**: `YYYY-MM-DD.md`
- **Valid examples**:
  - `2025-10-24.md` ✓
  - `2024-12-31.md` ✓
  - `2023-01-01.md` ✓
- **Invalid examples**:
  - `Oct 24, 2025.md` ✗
  - `2025-10-24-notes.md` ✗
  - `24-10-2025.md` ✗

Notes with other naming patterns will not be displayed.

## Development

### Build Commands

```bash
npm run dev        # Start development with watch mode
npm run build      # Build for production
npm run version    # Bump version and update manifest
```

### Project Structure

```
daily-notes-viewer/
├── src/
│   ├── main.ts                    # Plugin entry point
│   ├── types.ts                   # Type definitions & constants
│   ├── settings/
│   │   └── settingsTab.ts         # Settings UI
│   └── view/
│       ├── dailyNotesView.ts      # Main view orchestrator
│       ├── editorManager.ts       # Textarea & auto-save logic
│       ├── fileManager.ts         # File loading & filtering
│       ├── navigation.ts          # Keyboard navigation
│       ├── renderer.ts            # UI rendering
│       └── vimMode.ts             # Vim mode manager
├── styles.css                     # Plugin styles
├── manifest.json                  # Plugin manifest
├── .github/workflows/release.yml  # Auto-release workflow
└── README.md                      # This file
```

### Key Components

- **DailyNotesView**: Main view orchestrator
- **VimModeManager**: Handles vim mode states and transitions
- **NavigationManager**: Keyboard navigation between notes
- **EditorManager**: Textarea creation and auto-save
- **FileManager**: File discovery and sorting
- **Renderer**: UI rendering

### Code Quality

- TypeScript with strict typing
- Modular architecture (8 focused files)
- No file over 200 lines
- Single responsibility principle
- Clean separation of concerns

## Tips and Tricks

1. **Vim Mode**: Enable for efficient keyboard-based editing and navigation
2. **Pin the View**: Open in main pane for a dedicated daily notes workspace
3. **Custom Hotkey**: Assign a hotkey to "Open Daily Notes Viewer" for quick access
4. **Disable Navigation**: Turn off keyboard navigation if you prefer standard text editing
5. **Adjust Auto-Save**: Increase delay if you want fewer saves, decrease for more frequent saves
6. **Refresh**: Use the refresh button after creating new daily notes
7. **Sort Order**: Try different sort orders to find what works for your workflow

## Troubleshooting

### No daily notes showing up?

- Check filename format: Must be `YYYY-MM-DD.md`
- Verify "Daily notes folder" setting points to correct location
- Click Refresh button to reload
- Check that files exist in your vault

### Vim mode not working?

- Ensure "Vim mode" is enabled in settings
- Look for mode indicator (NORMAL/INSERT)
- Press `Esc` to enter command mode
- Press `i` to enter insert mode

### Navigation not working?

- Check "Keyboard navigation" is enabled in settings
- In vim mode: Must be in command mode for j/k
- Without vim mode: Cursor must be at start/end of note
- Try arrow keys instead of j/k (when vim is off)

### Auto-save not working?

- Verify "Auto-save" is enabled in settings
- Look for save indicator (● while typing, ✓ when saved)
- Check auto-save delay setting
- Ensure file permissions allow writing

### Plugin not opening on startup?

- Verify "Open on startup" is enabled
- Check plugin is enabled in Community Plugins
- Restart Obsidian
- Check for console errors (Cmd/Ctrl + Shift + I)

## Roadmap

Potential future features:

- ✓ Vim mode support
- ✓ Keyboard navigation
- ✓ Auto-save functionality
- Support for custom date formats
- Date range filtering
- Tag-based filtering
- Search within daily notes
- Bulk export functionality
- Note statistics and analytics
- Customizable vim keybindings

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter issues or have feature requests:

1. Check existing [GitHub issues](https://github.com/rohittp0/obsidian-daily-notes-viewer/issues)
2. Create a new issue with:
   - Obsidian version
   - Plugin version
   - Steps to reproduce
   - Expected vs actual behavior

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

- Built with the [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the daily notes workflow
- Thanks to the Obsidian community for feedback and support

---

**Made with ❤️ for the Obsidian community**

If you find this plugin helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 📝 Contributing code
