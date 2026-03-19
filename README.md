# Pulse Play - Video Speed Controller

A powerful Chrome extension that gives you instant control over video playback speed with customizable hotkeys and visual feedback.

## 🚀 **Chrome Web Store Listing Content**

### **Extension Name**

**Pulse Play - Video Speed Controller**

### **Short Description**

Take control of video playback speed instantly! Boost videos up to 5x faster with customizable hotkeys and visual indicators.

### **Detailed Description**

**🎬 Master Your Video Experience**

Transform how you watch videos with Pulse Play's intelligent speed control system. Whether you're catching up on lectures, powering through tutorials, or just want to save time, Pulse Play puts you in control.

**⚡ Lightning-Fast Speed Control**

- **Hold-to-Boost**: Press and hold the backtick (`` ` ``) key to instantly speed up videos
- **Speed Lock**: Double-tap the backtick to lock speed — video stays boosted hands-free
- **Customizable Speed**: Adjust from 0.25x to 5x speed with precision
- **Smart Detection**: Automatically works with YouTube, Netflix, Vimeo, and any HTML5 video player
- **Visual Feedback**: Ambient-style on-screen indicator shows current speed and lock status

**🎯 Perfect for Every Use Case**

- **Students**: Speed through lectures and educational content
- **Professionals**: Accelerate training videos and presentations
- **Content Creators**: Review footage at different speeds
- **Casual Viewers**: Save time on long-form content

**⚙️ Fully Customizable**

- **Speed Multiplier**: Precise control from 0.25x to 5x
- **Speed Lock**: Double-tap to lock/unlock speed; optional overlay hide when locked
- **Visual Settings**: Customize indicator position and display options
- **Dark/Light Theme**: YouTube-style theme toggle in the popup

**🔒 Privacy & Performance**

- **No Data Collection**: We don't track your browsing or video habits
- **Lightweight**: Minimal impact on browser performance
- **Instant Response**: Real-time speed changes with zero lag
- **Cross-Platform**: Works seamlessly across all your devices

**🎮 How It Works**

1. **Install** the extension from the Chrome Web Store
2. **Navigate** to any video on a supported platform
3. **Hold** the backtick (`` ` ``) key to boost speed — release to return to normal
4. **Double-tap** the backtick to lock speed hands-free; double-tap again to unlock
5. **Customize** speed multiplier, indicator position, and theme via the popup

**🌟 Why Choose Pulse Play?**

- **Professional Quality**: Built with modern web standards and best practices
- **Active Development**: Regular updates and feature improvements
- **Community Driven**: User feedback shapes new features
- **Free Forever**: No premium tiers or hidden costs

**📱 Supported Platforms**

- ✅ YouTube
- ✅ Netflix
- ✅ Vimeo
- ✅ Any HTML5 video player
- ✅ Educational platforms
- ✅ Streaming services

**🎯 Perfect For**

- Students and educators
- Content creators and editors
- Business professionals
- Anyone who values their time

**Download Pulse Play today and experience video content like never before!**

---

## 🛠️ **Technical Features**

### **Core Functionality**

- ✅ **Hold-to-Boost**: Backtick key triggers instant speed boost
- ✅ **Speed Lock**: Double-tap to lock/unlock; survives tab switches
- ✅ **Speed Control**: 0.25x to 5x playback speed range
- ✅ **Platform Support**: YouTube, Netflix, Vimeo, and generic HTML5 players
- ✅ **Ambient Overlay**: Frosted-glass pill indicator with speed and lock icon
- ✅ **Theme Support**: Light/dark mode synced instantly to content script
- ✅ **Settings Sync**: Cross-device configuration via Chrome Storage API

### **Advanced Settings**

- **Speed Multiplier**: Precise control from 0.25x to 5x
- **Speed Lock**: Double-tap to lock; optional hide overlay when locked
- **Indicator Position**: Top/bottom left/right corner placement
- **Theme Toggle**: YouTube-style dark/light toggle in popup
- **Live Updates**: Speed changes apply instantly while locked

## 📁 **Project Structure**

```bash
pulse-play/
├── manifest.json          # Extension configuration (Manifest V3)
├── background/
│   └── service-worker.js  # Background service worker for settings management
├── content/
│   └── content-script.js  # Content script injected into web pages
├── popup/
│   ├── popup.html        # Settings interface HTML
│   ├── popup.js          # Settings interface JavaScript
│   ├── popup.css         # Settings interface styling
│   └── lucide.min.js     # Lucide Icons (v0.577.0, local copy)
├── shared/
│   ├── settings.js       # Settings management and validation
│   └── scrollbar-styles.css  # Shared scrollbar styles
├── icons/
│   ├── icon16.png        # 16x16 extension icon
│   ├── icon48.png        # 48x48 extension icon
│   └── icon128.png       # 128x128 extension icon
└── README.md             # This file
```

## 🚀 **Installation for Development**

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `pulse-play` folder
4. The extension should now appear in your extensions list

## 🎯 **Current Status**

**✅ Fully Implemented Features:**

- Manifest V3 configuration with modern Chrome standards
- Hold-to-boost and speed lock (double-tap) hotkey system
- Ambient frosted-glass overlay with Lucide SVG icons
- Advanced settings management with validation and cross-device sync
- Cross-platform video detection and control
- YouTube-style popup UI with dark/light theme toggle
- Real-time theme and speed updates without page refresh

**🚀 Ready for Production:**

- All core functionality implemented and tested
- Comprehensive error handling and logging
- Performance optimized for smooth operation
- User-friendly interface and controls
- Cross-browser compatibility

## 🔧 **Development Notes**

- Built with **Manifest V3** for modern Chrome compatibility
- Uses **Chrome Storage API** for settings persistence and sync
- **Content scripts** automatically inject into supported video pages
- **Service worker** handles background tasks and settings management
- **Modular architecture** for easy maintenance and updates

## 📝 **Chrome Web Store Requirements**

### **Screenshots Needed:**

1. **Main Interface**: Popup settings with hotkey configuration
2. **Speed Control**: Video playing with speed indicator visible
3. **Platform Support**: Working on YouTube/Netflix
4. **Settings Panel**: Advanced configuration options

### **Promotional Images:**

- **Small Tile**: 440x280px - Focus on speed and control
- **Large Tile**: 920x680px - Show interface and features
- **Marquee**: 1400x560px - Professional presentation

### **Keywords for SEO:**

- video speed controller
- playback speed
- video accelerator
- speed up videos
- hotkey video control
- YouTube speed
- Netflix speed
- video player enhancement
- time-saving tools
- productivity extension

---

**Ready to revolutionize your video experience? Download Pulse Play today!**

---

## 🏷️ **Footer**

Made with ❤️ by [rj labs](https://github.com/rj-labs-co) | [☕ Buy me a coffee](https://www.buymeacoffee.com/rjsgml) - Support my work
