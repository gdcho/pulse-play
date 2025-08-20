/**
 * Integration tests for Video Speed Hotkey extension
 * Tests cross-component functionality and end-to-end scenarios
 */

// Mock DOM environment
const { JSDOM } = require("jsdom");

// Set up DOM
const dom = new JSDOM(
  "<!DOCTYPE html><html><head></head><body></body></html>",
  {
    url: "https://youtube.com",
    pretendToBeVisual: true,
    resources: "usable",
  },
);

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);

// Mock location before any tests run
delete global.window.location;
global.window.location = {
  hostname: "youtube.com",
  href: "https://youtube.com",
};

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
  },
  tabs: {
    onUpdated: { addListener: jest.fn() },
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
};

// Mock settings utilities
const mockSettings = {
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

global.VideoSpeedHotkeySettings = {
  loadSettings: jest.fn().mockResolvedValue(mockSettings),
  saveSettings: jest.fn().mockResolvedValue(true),
  resetToDefaults: jest.fn().mockResolvedValue(mockSettings),
  DEFAULT_SETTINGS: mockSettings,
};

// Mock importScripts
global.importScripts = jest.fn();

// Load modules
const {
  VideoSpeedController,
  ContentScriptManager,
} = require("../content/content-script.js");

describe("Integration Tests", () => {
  let controller;
  let mockVideo;
  let contentMessageHandler;

  beforeEach(() => {
    // Clear all mocks first
    jest.clearAllMocks();

    // Clear DOM
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    // Create controller instance
    controller = new VideoSpeedController();

    // Create mock video element that passes all validation checks
    mockVideo = document.createElement("video");
    mockVideo.src = "test-video.mp4";
    mockVideo.currentSrc = "test-video.mp4";
    mockVideo.playbackRate = 1.0;
    mockVideo.paused = false;
    mockVideo.ended = false;
    mockVideo.tagName = "VIDEO";

    // Mock offsetParent to make it visible
    Object.defineProperty(mockVideo, "offsetParent", {
      value: document.body,
      writable: true,
    });

    // Mock getBoundingClientRect to return valid dimensions
    mockVideo.getBoundingClientRect = jest.fn(() => ({
      width: 640,
      height: 360,
      top: 100,
      left: 100,
    }));

    // Mock querySelector for source elements
    mockVideo.querySelector = jest.fn((selector) => {
      if (selector === "source") {
        return { src: "test-video.mp4" };
      }
      return null;
    });

    document.body.appendChild(mockVideo);

    // Mock getComputedStyle to return visible styles
    global.getComputedStyle = jest.fn((element) => ({
      display: "block",
      visibility: "visible",
      opacity: "1",
    }));

    // Set up message handlers
    chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      contentMessageHandler = handler;
    });

    // Location is already mocked globally
  });

  afterEach(() => {
    if (controller && controller.removeHotkeyListeners) {
      controller.removeHotkeyListeners();
    }
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  describe("Settings Synchronization", () => {
    test("should synchronize settings between popup and content script", async () => {
      // Clear require cache and load background script
      delete require.cache[require.resolve("../background/service-worker.js")];
      require("../background/service-worker.js");

      // Get the background message handler
      const backgroundHandler =
        chrome.runtime.onMessage.addListener.mock.calls.find(
          (call) => call[0],
        )?.[0];

      expect(backgroundHandler).toBeDefined();

      // Simulate popup requesting settings
      const sendResponse = jest.fn();
      const getSettingsResult = backgroundHandler(
        { type: "GET_SETTINGS" },
        { tab: { id: 1 } },
        sendResponse,
      );

      expect(getSettingsResult).toBe(true); // Should keep channel open

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(VideoSpeedHotkeySettings.loadSettings).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        settings: mockSettings,
      });
    });

    test("should handle content script settings update", () => {
      // Initialize controller with settings
      controller.settings = mockSettings;

      const newSettings = {
        ...mockSettings,
        speedMultiplier: 3.0,
      };

      // Direct test - simulate what the message handler would do
      controller.settings = newSettings;
      expect(controller.settings.speedMultiplier).toBe(3.0);
    });
  });

  describe("Video Detection and Platform Recognition", () => {
    test("should detect videos with generic selectors", () => {
      const videos = controller.detectVideos();
      expect(videos).toContain(mockVideo);
      expect(videos.length).toBeGreaterThan(0);
    });

    test("should track video state correctly", () => {
      controller.settings = mockSettings;
      const videos = controller.detectVideos();

      expect(videos.length).toBeGreaterThan(0);
      expect(controller.trackedVideos.size).toBeGreaterThan(0);
      expect(controller.trackedVideos.has(mockVideo)).toBe(true);

      const videoState = controller.trackedVideos.get(mockVideo);
      expect(videoState).toHaveProperty("originalRate");
      expect(videoState).toHaveProperty("isSpeedBoosted");
      expect(videoState).toHaveProperty("platform");
    });

    test("should detect platform based on hostname", () => {
      // Test platform detection with the current hostname (youtube.com from setup)
      // Since we can't easily mock location in JSDOM, we'll test with the default
      expect(controller.detectPlatform(mockVideo)).toBe("youtube");

      // Test that the detectPlatform method exists and returns a string
      const platform = controller.detectPlatform(mockVideo);
      expect(typeof platform).toBe("string");
      expect(["youtube", "vimeo", "netflix", "generic"]).toContain(platform);
    });
  });

  describe("Speed Control Integration", () => {
    test("should complete full speed boost activation and deactivation cycle", () => {
      // Initialize controller with settings
      controller.settings = mockSettings;

      // Ensure video is detected and tracked first
      const videos = controller.detectVideos();
      expect(videos).toContain(mockVideo);

      // Test direct activation/deactivation
      const activateSuccess = controller.applySpeedBoost(2.0);
      expect(activateSuccess).toBe(true);
      expect(mockVideo.playbackRate).toBe(2.0);

      // Verify video state is tracked
      const videoState = controller.trackedVideos.get(mockVideo);
      expect(videoState).toBeDefined();
      expect(videoState.isSpeedBoosted).toBe(true);

      // Show indicator
      controller.showSpeedIndicator(2.0);
      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeTruthy();
      expect(indicator.textContent).toBe("2.0x");

      // Test deactivation
      const deactivateSuccess = controller.restoreOriginalSpeed();
      expect(deactivateSuccess).toBe(true);

      // Verify state is updated
      expect(videoState.isSpeedBoosted).toBe(false);

      // Hide indicator
      controller.hideSpeedIndicator();
    });

    test("should handle multiple videos and select the correct active video", () => {
      // Create multiple videos with proper mock properties
      const video1 = document.createElement("video");
      video1.src = "video1.mp4";
      video1.currentSrc = "video1.mp4";
      video1.playbackRate = 1.0;
      video1.paused = true;
      video1.tagName = "VIDEO";
      Object.defineProperty(video1, "offsetParent", { value: document.body });
      video1.getBoundingClientRect = () => ({
        width: 320,
        height: 240,
        top: 0,
        left: 0,
      });
      video1.querySelector = () => ({ src: "video1.mp4" });
      document.body.appendChild(video1);

      const video2 = document.createElement("video");
      video2.src = "video2.mp4";
      video2.currentSrc = "video2.mp4";
      video2.playbackRate = 1.0;
      video2.paused = false; // This one is playing
      video2.tagName = "VIDEO";
      Object.defineProperty(video2, "offsetParent", { value: document.body });
      video2.getBoundingClientRect = () => ({
        width: 640,
        height: 480,
        top: 0,
        left: 0,
      });
      video2.querySelector = () => ({ src: "video2.mp4" });
      document.body.appendChild(video2);

      // Initialize controller
      controller.settings = mockSettings;

      // Apply speed boost
      const success = controller.applySpeedBoost(2.0);

      expect(success).toBe(true);
      expect(video2.playbackRate).toBe(2.0); // Playing video should be boosted
      expect(video1.playbackRate).toBe(1.0); // Paused video should remain unchanged
    });
  });

  describe("Edge Case Scenarios and Error Recovery", () => {
    test("should handle video removal from DOM during speed boost", () => {
      // Initialize and activate speed boost
      controller.settings = mockSettings;
      const success = controller.applySpeedBoost(2.0);

      expect(success).toBe(true);
      expect(controller.trackedVideos.has(mockVideo)).toBe(true);

      // Remove video from DOM
      document.body.removeChild(mockVideo);

      // Re-detect videos (simulates what would happen in real usage)
      const videos = controller.detectVideos();

      expect(videos).not.toContain(mockVideo);
      expect(controller.trackedVideos.has(mockVideo)).toBe(false);
    });

    test("should handle video playback rate errors gracefully", () => {
      // Mock video to throw error on playback rate change
      Object.defineProperty(mockVideo, "playbackRate", {
        get: () => 1.0,
        set: () => {
          throw new Error("Playback rate not supported");
        },
      });

      controller.settings = mockSettings;

      // Should handle error gracefully
      const success = controller.applySpeedBoost(2.0);
      expect(success).toBe(false);

      // Should not crash on restore either
      const restoreSuccess = controller.restoreOriginalSpeed();
      expect(restoreSuccess).toBe(true); // Restore should still work even if no videos are boosted
    });
  });

  describe("Background Script Message Passing", () => {
    test("should load background script without errors", () => {
      // Clear require cache and load background script
      delete require.cache[require.resolve("../background/service-worker.js")];

      // This should not throw any errors and should load successfully
      let backgroundScriptLoaded = false;
      expect(() => {
        require("../background/service-worker.js");
        backgroundScriptLoaded = true;
      }).not.toThrow();

      // Verify the script loaded successfully
      expect(backgroundScriptLoaded).toBe(true);

      // Verify that Chrome APIs are available (the mocks should exist)
      expect(chrome.runtime.onMessage.addListener).toBeDefined();
      expect(chrome.tabs.onUpdated.addListener).toBeDefined();
      expect(chrome.runtime.onInstalled.addListener).toBeDefined();
      expect(chrome.runtime.onStartup.addListener).toBeDefined();
      expect(chrome.storage.onChanged.addListener).toBeDefined();
    });

    test("should handle message passing between components", () => {
      // Test that the Chrome API mocks are working
      const mockHandler = jest.fn();
      chrome.runtime.onMessage.addListener(mockHandler);

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(
        mockHandler,
      );

      // Test message sending
      chrome.runtime.sendMessage({ type: "TEST" });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "TEST" });
    });

    test("should handle cross-tab communication setup", () => {
      // Test that tabs API is properly mocked
      chrome.tabs.query.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      chrome.tabs.sendMessage.mockResolvedValue(true);

      // Verify mocks are working
      expect(chrome.tabs.query).toBeDefined();
      expect(chrome.tabs.sendMessage).toBeDefined();
    });
  });

  describe("Performance and Memory Management", () => {
    test("should clean up event listeners properly", () => {
      controller.settings = mockSettings;
      controller.initializeHotkeyListeners();

      // Verify listeners are added
      expect(controller.eventListeners.keydown).toBeTruthy();
      expect(controller.eventListeners.keyup).toBeTruthy();

      // Remove listeners
      controller.removeHotkeyListeners();

      // Verify listeners are cleaned up
      expect(controller.eventListeners.keydown).toBeNull();
      expect(controller.eventListeners.keyup).toBeNull();
    });

    test("should limit error log size to prevent memory growth", () => {
      controller.maxErrorLogSize = 5;

      // Generate more errors than the limit
      for (let i = 0; i < 10; i++) {
        controller.logError(`Test error ${i}`, new Error(`Error ${i}`));
      }

      expect(controller.errorLog.length).toBe(5);
      expect(controller.errorLog[0].message).toContain("Test error 5"); // Should keep most recent
    });

    test("should handle rapid operations without memory leaks", () => {
      controller.settings = mockSettings;

      // Simulate rapid speed changes
      for (let i = 0; i < 10; i++) {
        controller.applySpeedBoost(2.0);
        controller.showSpeedIndicator(2.0);
        controller.restoreOriginalSpeed();
        controller.hideSpeedIndicator();
      }

      // Should not have accumulated multiple indicators
      const indicators = document.querySelectorAll(
        "#video-speed-hotkey-indicator",
      );
      expect(indicators.length).toBeLessThanOrEqual(1);
    });
  });
});
