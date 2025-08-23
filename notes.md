# Chrome Web Store Submission Notes - Pulse Play

## Single Purpose Description

Pulse Play is a single-purpose Chrome extension designed to provide instant video playback speed control. The extension allows users to temporarily speed up video content on any website by holding down a customizable hotkey, with visual feedback showing the current speed. When the hotkey is released, the video returns to normal playback speed. This single purpose is narrow and focused solely on enhancing video viewing experience through temporary speed control, making it easy for users to save time while watching educational content, tutorials, or any video that benefits from accelerated playback.

## Permission Justifications

### activeTab Justification

The `activeTab` permission is required to access the currently active tab when the extension popup is opened. This allows us to read the current page's URL to determine if video speed controls should be enabled, and to inject our content script only when needed. Without this permission, we cannot detect the current page context or provide the video speed functionality that is the core purpose of the extension.

### storage Justification

The `storage` permission is essential for saving and retrieving user preferences and settings. This includes hotkey configurations, speed multiplier preferences, visual indicator settings, and platform-specific enable/disable options. The storage permission enables the extension to remember user choices across browser sessions and devices, providing a consistent and personalized experience. Without this permission, users would lose their customizations every time they restart their browser.

### Host Permission Justification

The host permissions (`https://*/*` and `http://*/*`) are necessary for the extension to detect and control video players across various websites. These permissions allow Pulse Play to work on different video platforms including YouTube, Netflix, Vimeo, educational platforms, and any website with HTML5 video content. The extension only accesses video elements and does not collect, read, or transmit any website content or user data beyond what's necessary for video speed control functionality.

## Remote Code

**No, I am not using Remote code**

### Justification

Pulse Play does not use any remote code. All JavaScript functionality, including the content scripts, background service worker, and popup interface, is contained entirely within the extension package. The extension does not reference external files in script tags, load modules from external sources, or use eval() functions. All code runs locally on the user's device, ensuring security and privacy while maintaining the extension's core functionality.

## Data Usage

### What user data do you plan to collect from users now or in the future?

**None of the above categories apply to Pulse Play.**

Our extension operates entirely locally and does not collect any user data. Specifically:

- **Personally identifiable information**: We do not collect names, addresses, emails, or any identification numbers
- **Health information**: We do not collect any health-related data
- **Financial and payment information**: We do not collect financial data or payment information
- **Authentication information**: We do not collect passwords, credentials, or PINs
- **Personal communications**: We do not access emails, texts, or chat messages
- **Location**: We do not collect location data, IP addresses, or GPS coordinates
- **Web history**: We do not track visited web pages or browsing history
- **User activity**: We do not monitor clicks, keystrokes, mouse movements, or network activity
- **Website content**: We do not read, collect, or transmit website content beyond what's necessary for video speed control

## Data Collection Summary

**Pulse Play collects ZERO user data.** The extension:

- Stores only local settings (hotkeys, speed preferences) using Chrome's built-in storage
- Does not transmit any information to external servers
- Does not track user behavior or browsing patterns
- Does not access personal information or website content
- Operates entirely locally for maximum privacy and security

## Certifications

✅ **I do not sell or transfer user data to third parties, outside of the approved use cases**

✅ **I do not use or transfer user data for purposes that are unrelated to my item's single purpose**

✅ **I do not use or transfer user data to determine creditworthiness or for lending purposes**

## Privacy Policy

**Privacy Policy URL:**

The privacy policy clearly states that:

- No personal information is collected
- All data is stored locally
- No information is transmitted to external servers
- No third-party services are integrated
- The extension operates entirely locally for user privacy

## Additional Compliance Notes

### Single Purpose Compliance

Pulse Play has a single, narrow purpose: temporary video speed control. The extension does not:

- Provide multiple unrelated functions
- Collect user data for secondary purposes
- Integrate with external services
- Offer features beyond video speed enhancement

### Permission Minimization

All requested permissions are essential for the extension's core functionality:

- `activeTab`: Required for page context detection
- `storage`: Required for user preference persistence
- Host permissions: Required for cross-platform video support

### Security and Privacy

- No remote code execution
- No data collection or transmission
- Local-only operation
- Chrome's built-in security standards
- Transparent permission usage

---

**Pulse Play is fully compliant with Chrome Web Store policies and prioritizes user privacy and security.**
