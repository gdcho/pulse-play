/**
 * Unit tests for background service worker functionality
 */

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
  },
  tabs: {
    onUpdated: { addListener: jest.fn() },
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  storage: {
    onChanged: { addListener: jest.fn() },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// Mock settings utilities
global.VideoSpeedHotkeySettings = {
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  resetToDefaults: jest.fn(),
  DEFAULT_SETTINGS: {
    hotkey: { key: "Space", modifiers: [], enabled: true },
    speedMultiplier: 2.0,
    platforms: { youtube: true, vimeo: true, netflix: true, generic: true },
    ui: {
      showIndicator: true,
      indicatorPosition: "top-right",
      indicatorTimeout: 2000,
    },
  },
};

// Mock importScripts
global.importScripts = jest.fn();

describe("Background Service Worker", () => {
  let messageHandler;
  let tabUpdateHandler;
  let storageChangeHandler;
  let installHandler;
  let startupHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture event handlers
    chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler = handler;
    });

    chrome.tabs.onUpdated.addListener.mockImplementation((handler) => {
      tabUpdateHandler = handler;
    });

    chrome.storage.onChanged.addListener.mockImplementation((handler) => {
      storageChangeHandler = handler;
    });

    chrome.runtime.onInstalled.addListener.mockImplementation((handler) => {
      installHandler = handler;
    });

    chrome.runtime.onStartup.addListener.mockImplementation((handler) => {
      startupHandler = handler;
    });

    // Load the service worker
    require("../background/service-worker.js");
  });

  describe("Initialization", () => {
    test("should load settings on install", async () => {
      const mockSettings = { speedMultiplier: 2.5 };
      VideoSpeedHotkeySettings.loadSettings.mockResolvedValue(mockSettings);

      await installHandler();

      expect(VideoSpeedHotkeySettings.loadSettings).toHaveBeenCalled();
    });

    test("should handle settings load error on install", async () => {
      VideoSpeedHotkeySettings.loadSettings.mockRejectedValue(
        new Error("Storage error"),
      );

      // Should not throw
      await expect(installHandler()).resolves.toBeUndefined();
    });

    test("should load settings on startup", async () => {
      const mockSettings = { speedMultiplier: 2.5 };
      VideoSpeedHotkeySettings.loadSettings.mockResolvedValue(mockSettings);

      await startupHandler();

      expect(VideoSpeedHotkeySettings.loadSettings).toHaveBeenCalled();
    });
  });

  describe("Message Handling", () => {
    test("should handle GET_SETTINGS message", async () => {
      const mockSettings = { speedMultiplier: 2.5 };
      VideoSpeedHotkeySettings.loadSettings.mockResolvedValue(mockSettings);

      const sendResponse = jest.fn();
      const result = messageHandler(
        { type: "GET_SETTINGS" },
        { tab: { id: 1 } },
        sendResponse,
      );

      expect(result).toBe(true); // Should keep channel open

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(VideoSpeedHotkeySettings.loadSettings).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        settings: mockSettings,
      });
    });

    test("should handle GET_SETTINGS error", async () => {
      VideoSpeedHotkeySettings.loadSettings.mockRejectedValue(
        new Error("Storage error"),
      );

      const sendResponse = jest.fn();
      messageHandler(
        { type: "GET_SETTINGS" },
        { tab: { id: 1 } },
        sendResponse,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Storage error",
      });
    });

    test("should handle UPDATE_SETTINGS message", async () => {
      const newSettings = { speedMultiplier: 3.0 };
      VideoSpeedHotkeySettings.saveSettings.mockResolvedValue(true);
      chrome.tabs.query.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      chrome.tabs.sendMessage.mockResolvedValue();

      const sendResponse = jest.fn();
      const result = messageHandler(
        { type: "UPDATE_SETTINGS", settings: newSettings },
        { tab: { id: 1 } },
        sendResponse,
      );

      expect(result).toBe(true);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(VideoSpeedHotkeySettings.saveSettings).toHaveBeenCalledWith(
        newSettings,
      );
      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test("should handle UPDATE_SETTINGS with invalid settings", async () => {
      const invalidSettings = { speedMultiplier: 10.0 };
      VideoSpeedHotkeySettings.saveSettings.mockResolvedValue(false);

      const sendResponse = jest.fn();
      messageHandler(
        { type: "UPDATE_SETTINGS", settings: invalidSettings },
        { tab: { id: 1 } },
        sendResponse,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Invalid settings provided",
      });
    });

    test("should handle RESET_SETTINGS message", async () => {
      const defaultSettings = VideoSpeedHotkeySettings.DEFAULT_SETTINGS;
      VideoSpeedHotkeySettings.resetToDefaults.mockResolvedValue(
        defaultSettings,
      );
      chrome.tabs.query.mockResolvedValue([]);

      const sendResponse = jest.fn();
      const result = messageHandler(
        { type: "RESET_SETTINGS" },
        { tab: { id: 1 } },
        sendResponse,
      );

      expect(result).toBe(true);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(VideoSpeedHotkeySettings.resetToDefaults).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        settings: defaultSettings,
      });
    });

    test("should handle unknown message type", () => {
      const sendResponse = jest.fn();
      const result = messageHandler(
        { type: "UNKNOWN_TYPE" },
        { tab: { id: 1 } },
        sendResponse,
      );

      expect(result).toBe(false);
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });

  describe("Tab Management", () => {
    test("should send settings to newly loaded tabs", async () => {
      const mockSettings = { speedMultiplier: 2.5 };
      VideoSpeedHotkeySettings.loadSettings.mockResolvedValue(mockSettings);
      chrome.tabs.sendMessage.mockResolvedValue();

      // Simulate tab completion
      await tabUpdateHandler(
        1,
        { status: "complete" },
        { url: "https://youtube.com" },
      );

      expect(VideoSpeedHotkeySettings.loadSettings).toHaveBeenCalled();

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: "SETTINGS_UPDATED",
        settings: mockSettings,
      });
    });

    test("should ignore tab updates without complete status", async () => {
      await tabUpdateHandler(
        1,
        { status: "loading" },
        { url: "https://youtube.com" },
      );

      expect(VideoSpeedHotkeySettings.loadSettings).not.toHaveBeenCalled();
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    test("should handle tab message errors gracefully", async () => {
      const mockSettings = { speedMultiplier: 2.5 };
      VideoSpeedHotkeySettings.loadSettings.mockResolvedValue(mockSettings);
      chrome.tabs.sendMessage.mockRejectedValue(
        new Error("Tab not accessible"),
      );

      // Should not throw
      await expect(
        tabUpdateHandler(
          1,
          { status: "complete" },
          { url: "chrome://settings" },
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("Storage Change Handling", () => {
    test("should broadcast settings on external storage change", async () => {
      const newSettings = { speedMultiplier: 3.0 };
      chrome.tabs.query.mockResolvedValue([{ id: 1 }]);
      chrome.tabs.sendMessage.mockResolvedValue();

      await storageChangeHandler(
        { videoSpeedHotkeySettings: { newValue: newSettings } },
        "sync",
      );

      expect(chrome.tabs.query).toHaveBeenCalled();
    });

    test("should ignore non-sync storage changes", async () => {
      await storageChangeHandler(
        { videoSpeedHotkeySettings: { newValue: {} } },
        "local",
      );

      expect(chrome.tabs.query).not.toHaveBeenCalled();
    });

    test("should ignore changes to other storage keys", async () => {
      await storageChangeHandler({ otherKey: { newValue: {} } }, "sync");

      expect(chrome.tabs.query).not.toHaveBeenCalled();
    });
  });
});
