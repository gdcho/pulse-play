// Background service worker for Video Speed Hotkey extension
// Handles settings management and cross-tab coordination

console.log("Video Speed Hotkey: Background service worker loaded");

// Default settings configuration
const DEFAULT_SETTINGS = {
  hotkey: {
    key: "Space",
    modifiers: [],
    enabled: true,
  },
  speedMultiplier: 2.0,
  platforms: {
    youtube: true,
    vimeo: true,
    netflix: true,
    generic: true,
  },
  ui: {
    showIndicator: true,
    indicatorPosition: "top-right",
    indicatorTimeout: 2000,
  },
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Video Speed Hotkey: Extension installed");

  // Load existing settings or set defaults
  const result = await chrome.storage.sync.get("settings");
  if (!result.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    console.log("Video Speed Hotkey: Default settings initialized");
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

    default:
      console.warn("Video Speed Hotkey: Unknown message type:", message.type);
  }
});

// Load settings from storage
async function handleGetSettings(sendResponse) {
  try {
    const result = await chrome.storage.sync.get("settings");
    const settings = result.settings || DEFAULT_SETTINGS;
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error("Video Speed Hotkey: Error loading settings:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Save settings to storage and broadcast to all tabs
async function handleUpdateSettings(newSettings, sendResponse) {
  try {
    await chrome.storage.sync.set({ settings: newSettings });

    // Broadcast settings update to all tabs
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          type: "SETTINGS_UPDATED",
          settings: newSettings,
        })
        .catch(() => {
          // Ignore errors for tabs that don't have content script
        });
    });

    console.log("Video Speed Hotkey: Settings updated and broadcasted");
    sendResponse({ success: true });
  } catch (error) {
    console.error("Video Speed Hotkey: Error saving settings:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Inject content script into newly updated tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // Content script will be automatically injected via manifest
    console.log("Video Speed Hotkey: Tab updated:", tab.url);
  }
});
