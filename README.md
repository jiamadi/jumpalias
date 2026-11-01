# JumpAlias Chrome Extension

A Chrome extension that lets you jump to saved URLs from the address bar using memorable paths.

## Features

- **Path shortcuts**: Press `j` and then `Tab` or Space, then enter a path such as `dev github` or `dev docs`
- **Shortcut tree**: The popup groups shared path prefixes into expandable folders
- **Quick capture**: Press `Command+Shift+K` on macOS or `Ctrl+Shift+K` on Windows/Linux to add the current page; its URL is filled in automatically and you only enter a path
- **Chrome Sync**: Shortcuts follow the signed-in Chrome profile through `chrome.storage.sync`
- **Conflict handling**: Each path syncs independently; timestamp and device ID resolve conflicting edits
- **Safe deletion**: Active devices acknowledge deletions before cloud cleanup; devices inactive for over 30 days rebuild from cloud with a local recovery backup
- **Bilingual UI**: Toggle between Chinese and English; Chinese is the default
- **Multiple URL Support**: Supports https://, http://, chrome-extension://, and chrome:// URLs
- **Custom Shortcuts**: Create your own shortcuts for any website or Chrome extension page
- **Import/Export**: Backup and restore your shortcuts
- **Dark/Light Theme**: Toggle between themes
- **Easy Management**: Add, edit, and delete shortcuts through a simple interface

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The extension will be installed and ready to use

## Usage

### Method 1: Omnibox
- Click on the Chrome address bar
- Type `j`, press Tab, then type a path
- Press Enter to navigate to the website or extension page

### Method 2: Popup Interface
- Click the extension icon in the toolbar
- Add shortcuts through the popup interface
- Click on any shortcut to navigate to the website

## Adding Shortcuts

1. Open the extension popup
2. Enter a path — spaces create a namespace, such as `dev github`, `dev docs`, or `work jira`
3. Enter the complete URL (including protocol)
4. Click the "+" button to add the shortcut

A path is both a node and a potential folder. For example, you can save `dev`
to one URL and also create `dev github` and `dev docs`; the popup renders `dev` as a
clickable node with those children beneath it. Whether a node has its own URL
is entirely your choice.

## Supported URL Types

- **Regular websites**: `https://github.com`, `http://example.com`
- **Chrome extension pages**: `chrome-extension://pkgccpejnmalmdinmhkkfafefagiiiad/json-format/index.html`
- **Chrome internal pages**: `chrome://extensions/`, `chrome://settings/`

## Import/Export

- **Export**: Click the "Export" button to copy all shortcuts to clipboard as JSON
- **Import**: Click the "Import" button and select a JSON file to restore shortcuts

## Examples

| Shortcut | URL |
|----------|-----|
| `dev github` | `https://github.com` |
| `dev docs` | `https://developer.mozilla.org` |
| `work mail` | `https://mail.google.com` |
| `json` | `chrome-extension://pkgccpejnmalmdinmhkkfafefagiiiad/json-format/index.html` |
| `ext` | `chrome://extensions/` |

## Technical Details

Synchronization architecture, migration and limitations: [Synchronization](docs/synchronization.md).
Run its regression tests with `node --test tests/*.test.cjs`.

- **Manifest Version**: 3
- **Permissions**: storage, clipboardWrite, tabs
- **Background Script**: service_worker.js
- **Popup**: popup.html with popup.js and popup.css

## Contributing

Feel free to submit issues and enhancement requests!

## Project history

JumpAlias evolved from [Omnibox-Shortcuts](https://github.com/zohaib2002/Omnibox-Shortcuts).
The original Git history and contributor attribution are retained.
The current repository is [jiamadi/jumpalias](https://github.com/jiamadi/jumpalias).

## License

This project is available under the [MIT License](LICENSE).

本项目采用 MIT 许可证，允许使用、修改和分发；请保留版权及许可声明。
