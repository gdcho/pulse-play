// Background service worker for Video Speed Hotkey extension
// Handles settings management and cross-tab coordination

// Import settings utilities
importScripts("shared/settings.js");

console.log("Video Speed Hotkey: Background service worker loaded");

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Video Speed Hotkey: Extension installed");

  // Initialize settings using the settings utilities
  try {
    const settings = await VideoSpeedHotkeySettings.loadSettings();
    console.log("Video Speed Hotkey: Settings initialized:", settings);
  } catch (error) {
    console.error("Video Speed Hotkey: Error initializing settings:", error);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Video Speed Hotkey: Message received:", message);

  switch (message.type) {
    case "GET_SETTINGS":
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response

    case "UPDATE_SETTINGS":
      handleUpdateSettings(message.settings, sendResponse);
      return true;

    case "RESET_SETTINGS":
      handleResetSettings(sendResponse);
      return true;

    default:
      console.warn("Video Speed Hotkey: Unknown message type:", message.type);
      return false;
  }
});

// Load settings from storage
async function handleGetSettings(sendResponse) {
  try {
    const settings = await VideoSpeedHotkeySettings.loadSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error("Video Speed Hotkey: Error loading settings:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Save settings to storage and broadcast to all tabs
async function handleUpdateSettings(newSettings, sendResponse) {
  try {
    // Validate and save settings using the settings utilities
    const success = await VideoSpeedHotkeySettings.saveSettings(newSettings);

    if (!success) {
      sendResponse({ success: false, error: "Invalid settings provided" });
      return;
    }

    // Broadcast settings update to all tabs
    await broadcastSettingsUpdate(newSettings);

    console.log("Video Speed Hotkey: Settings updated and broadcasted");
    sendResponse({ success: true });
  } catch (error) {
    console.error("Video Speed Hotkey: Error saving settings:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Broadcasts settings updates to all tabs with content scripts
 * @param {Object} settings - Updated settings object
 */
async function broadcastSettingsUpdate(settings) {
  try {
    const tabs = await chrome.tabs.query({});
    const broadcastPromises = tabs.map(async (tab) => {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "SETTINGS_UPDATED",
          settings: settings,
        });
      } catch (error) {
        // Ignore errors for tabs that don't have content script or are not accessible
        // This is expected for chrome:// pages, extension pages, etc.
      }
    });

    await Promise.allSettled(broadcastPromises);
    console.log(
      `Video Speed Hotkey: Settings broadcasted to ${tabs.length} tabs`,
    );
  } catch (error) {
    console.error("Video Speed Hotkey: Error broadcasting settings:", error);
  }
}

// Handle tab updates and ensure content script injection
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // Content script will be automatically injected via manifest for most pages
    // But we can send initial settings to newly loaded pages
    try {
      const settings = await VideoSpeedHotkeySettings.loadSettings();

      // Small delay to ensure content script is loaded
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: "SETTINGS_UPDATED",
            settings: settings,
          });
        } catch (error) {
          // Ignore errors for pages that don't support content scripts
        }
      }, 100);
    } catch (error) {
      console.error(
        "Video Speed Hotkey: Error sending settings to new tab:",
        error,
      );
    }
  }
});

// Handle storage changes from other sources (like sync across devices)
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === "sync" && changes.videoSpeedHotkeySettings) {
    const newSettings = changes.videoSpeedHotkeySettings.newValue;
    if (newSettings) {
      console.log(
        "Video Speed Hotkey: Settings changed externally, broadcasting update",
      );
      await broadcastSettingsUpdate(newSettings);
    }
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Video Speed Hotkey: Extension startup");

  // Ensure settings are properly initialized
  try {
    await VideoSpeedHotkeySettings.loadSettings();
  } catch (error) {
    console.error(
      "Video Speed Hotkey: Error loading settings on startup:",
      error,
    );
  }
});

/**
 * Resets settings to default values and broadcasts the change
 * @param {Function} sendResponse - Response callback
 */
async function handleResetSettings(sendResponse) {
  try {
    const defaultSettings = await VideoSpeedHotkeySettings.resetToDefaults();
    await broadcastSettingsUpdate(defaultSettings);

    console.log("Video Speed Hotkey: Settings reset to defaults");
    sendResponse({ success: true, settings: defaultSettings });
  } catch (error) {
    console.error("Video Speed Hotkey: Error resetting settings:", error);
    sendResponse({ success: false, error: error.message });
  }
}
