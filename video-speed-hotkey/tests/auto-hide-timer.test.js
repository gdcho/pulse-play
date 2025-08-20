/**
 * Tests for auto-hide timer functionality
 * Tests the automatic hiding of speed indicator after timeout
 */

// Mock DOM environment
const { JSDOM } = require("jsdom");

// Set up DOM
const dom = new JSDOM(
  "<!DOCTYPE html><html><head></head><body></body></html>",
  {
    url: "https://example.com",
    pretendToBeVisual: true,
    resources: "usable",
  },
);

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
};

// Load the content script
const { VideoSpeedController } = require("../content/content-script.js");

describe("Auto-Hide Timer Functionality", () => {
  let controller;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    // Create controller instance
    controller = new VideoSpeedController();

    // Mock settings with auto-hide enabled
    controller.settings = {
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
        indicatorTimeout: 1000, // 1 second for faster testing
      },
    };

    // Mock getComputedStyle
    global.getComputedStyle = jest.fn(() => ({
      display: "block",
      visibility: "visible",
      opacity: "1",
    }));

    // Use fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up
    if (controller && controller.removeHotkeyListeners) {
      controller.removeHotkeyListeners();
    }
    controller.clearAutoHideTimer();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("setupAutoHideTimer", () => {
    test("should set up timer with configured timeout", () => {
      controller.showSpeedIndicator(2.0);

      expect(controller.autoHideTimer).toBeTruthy();
      expect(controller.autoHideStartTime).toBeTruthy();
    });

    test("should not set up timer when timeout is 0", () => {
      controller.settings.ui.indicatorTimeout = 0;
      controller.setupAutoHideTimer();

      expect(controller.autoHideTimer).toBeNull();
    });

    test("should clear existing timer before setting new one", () => {
      const clearSpy = jest.spyOn(controller, "clearAutoHideTimer");

      controller.setupAutoHideTimer();
      controller.setupAutoHideTimer();

      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe("clearAutoHideTimer", () => {
    test("should clear timer and reset start time", () => {
      controller.setupAutoHideTimer();
      expect(controller.autoHideTimer).toBeTruthy();

      controller.clearAutoHideTimer();

      expect(controller.autoHideTimer).toBeNull();
      expect(controller.autoHideStartTime).toBeNull();
    });

    test("should handle null timer gracefully", () => {
      controller.autoHideTimer = null;

      expect(() => controller.clearAutoHideTimer()).not.toThrow();
    });
  });

  describe("auto-hide behavior", () => {
    test("should hide indicator after timeout when not pressed", () => {
      controller.showSpeedIndicator(2.0);
      controller.hotkeyState.isPressed = false;

      // Fast-forward time to trigger auto-hide
      jest.advanceTimersByTime(1000);

      // Run all pending timers (including the setTimeout(0) in hideSpeedIndicator)
      jest.runAllTimers();

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeFalsy();
    });

    test("should not hide indicator when hotkey is pressed", () => {
      controller.showSpeedIndicator(2.0);
      controller.hotkeyState.isPressed = true;

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeTruthy();
    });

    test("should reset timer when indicator is updated", () => {
      controller.showSpeedIndicator(2.0);

      // Fast-forward halfway
      jest.advanceTimersByTime(500);

      // Update indicator (should reset timer)
      controller.updateSpeedIndicator(3.0);

      // Fast-forward another 500ms (total 1000ms, but timer was reset)
      jest.advanceTimersByTime(500);

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeTruthy(); // Should still be visible

      // Fast-forward the remaining time
      jest.advanceTimersByTime(500);

      // Run all pending timers (including the setTimeout(0) in hideSpeedIndicator)
      jest.runAllTimers();

      const hiddenIndicator = document.getElementById(
        "video-speed-hotkey-indicator",
      );
      expect(hiddenIndicator).toBeFalsy(); // Should now be hidden
    });
  });

  describe("isContinuousUse", () => {
    test("should return false when no start time", () => {
      expect(controller.isContinuousUse()).toBe(false);
    });

    test("should return false when elapsed time is less than threshold", () => {
      controller.autoHideStartTime = Date.now();

      expect(controller.isContinuousUse()).toBe(false);
    });

    test("should return true when elapsed time exceeds threshold", () => {
      controller.settings.ui.continuousUseThreshold = 1000; // 1 second
      controller.autoHideStartTime = Date.now() - 2000; // 2 seconds ago

      expect(controller.isContinuousUse()).toBe(true);
    });

    test("should use default threshold when not configured", () => {
      delete controller.settings.ui.continuousUseThreshold;
      controller.autoHideStartTime = Date.now() - 6000; // 6 seconds ago

      expect(controller.isContinuousUse()).toBe(true);
    });
  });

  describe("integration with speed control", () => {
    test("should clear timer when speed boost is deactivated", () => {
      controller.showSpeedIndicator(2.0);
      expect(controller.autoHideTimer).toBeTruthy();

      controller.hideSpeedIndicator();

      expect(controller.autoHideTimer).toBeNull();
    });

    test("should set up timer when speed boost is activated", () => {
      const setupSpy = jest.spyOn(controller, "setupAutoHideTimer");

      controller.showSpeedIndicator(2.0);

      expect(setupSpy).toHaveBeenCalled();
    });
  });
});
