# Video Speed Hotkey Chrome Extension

A Chrome extension that allows users to temporarily speed up video playback by holding down a configurable hotkey.

## Project Structure

```bash
video-speed-hotkey/
├── manifest.json          # Extension configuration (Manifest V3)
├── background/
│   └── service-worker.js  # Background service worker for settings management
├── content/
│   └── content-script.js  # Content script injected into web pages
├── popup/
│   ├── popup.html        # Settings interface HTML
│   ├── popup.js          # Settings interface JavaScript
│   └── popup.css         # Settings interface styling
├── icons/
│   ├── icon16.png        # 16x16 extension icon (placeholder)
│   ├── icon48.png        # 48x48 extension icon (placeholder)
│   └── icon128.png       # 128x128 extension icon (placeholder)
└── README.md             # This file
```

## Installation for Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `video-speed-hotkey` folder
4. The extension should now appear in your extensions list

## Features (Planned)

- Hold a configurable hotkey to temporarily speed up video playback
- Works on YouTube, Vimeo, Netflix, and other HTML5 video players
- Customizable speed multiplier (1.25x to 5x)
- Visual speed indicator with customizable positioning
- Cross-platform compatibility and settings synchronization

## Current Status

This is the initial project setup with:

- ✅ Manifest V3 configuration
- ✅ Basic directory structure
- ✅ Background service worker skeleton
- ✅ Content script skeleton
- ✅ Popup settings interface
- ⏳ Video detection and speed manipulation (next tasks)
- ⏳ Hotkey event handling (next tasks)
- ⏳ Visual indicators (next tasks)

## Development Notes

- The extension uses Manifest V3 for Chrome compatibility
- Settings are stored using Chrome's storage.sync API
- Content scripts are automatically injected into all web pages
- Icon files are currently placeholders and should be replaced with actual PNG images

## Next Steps

Follow the implementation plan in `.kiro/specs/video-speed-hotkey/tasks.md` to continue development.
