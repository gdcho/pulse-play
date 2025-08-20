/**
 * Tests for speed indicator functionality
 * Tests the visual feedback system for video speed changes
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

describe("Speed Indicator Functionality", () => {
  let controller;
  let mockVideo;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    // Create controller instance
    controller = new VideoSpeedController();

    // Mock settings with indicator enabled
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
        indicatorTimeout: 2000,
      },
    };

    // Create mock video element
    mockVideo = document.createElement("video");
    mockVideo.src = "test-video.mp4";
    mockVideo.playbackRate = 1.0;
    mockVideo.getBoundingClientRect = () => ({
      width: 640,
      height: 360,
      top: 100,
      left: 100,
    });
    document.body.appendChild(mockVideo);

    // Mock getComputedStyle
    global.getComputedStyle = jest.fn(() => ({
      display: "block",
      visibility: "visible",
      opacity: "1",
    }));
  });

  afterEach(() => {
    // Clean up
    if (controller && controller.removeHotkeyListeners) {
      controller.removeHotkeyListeners();
    }
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    jest.clearAllMocks();
  });

  describe("showSpeedIndicator", () => {
    test("should create and display speed indicator with correct speed", () => {
      const result = controller.showSpeedIndicator(2.5);

      expect(result).toBe(true);

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeTruthy();
      expect(indicator.textContent).toBe("2.5x");
      expect(indicator.className).toContain("video-speed-hotkey-indicator");
    });

    test("should position indicator based on settings", () => {
      // Test top-right positioning (default)
      controller.showSpeedIndicator(2.0);
      let indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator.style.top).toBe("20px");
      expect(indicator.style.right).toBe("20px");

      // Test bottom-left positioning
      controller.hideSpeedIndicator();
      controller.settings.ui.indicatorPosition = "bottom-left";
      controller.showSpeedIndicator(2.0);
      indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator.style.bottom).toBe("20px");
      expect(indicator.style.left).toBe("20px");
    });

    test("should not show indicator when disabled in settings", () => {
      controller.settings.ui.showIndicator = false;
      const result = controller.showSpeedIndicator(2.0);

      expect(result).toBe(false);
      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeFalsy();
    });

    test("should remove existing indicator before showing new one", () => {
      // Show first indicator
      controller.showSpeedIndicator(2.0);
      const firstIndicator = document.getElementById(
        "video-speed-hotkey-indicator",
      );
      expect(firstIndicator.textContent).toBe("2.0x");

      // Show second indicator
      controller.showSpeedIndicator(3.0);
      const indicators = document.querySelectorAll(
        "#video-speed-hotkey-indicator",
      );
      expect(indicators.length).toBe(1);
      expect(indicators[0].textContent).toBe("3.0x");
    });

    test("should handle missing speed parameter gracefully", () => {
      const result = controller.showSpeedIndicator();

      expect(result).toBe(true);
      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator.textContent).toBe("2.0x"); // Default fallback
    });

    test("should apply correct CSS styles", () => {
      controller.showSpeedIndicator(2.0);
      const indicator = document.getElementById("video-speed-hotkey-indicator");

      expect(indicator.style.position).toBe("fixed");
      expect(indicator.style.zIndex).toBe("2147483647");
      expect(indicator.style.backgroundColor).toBe("rgba(0, 0, 0, 0.9)");
      expect(indicator.style.color).toBe("white");
      expect(indicator.style.pointerEvents).toBe("none");
    });
  });

  describe("hideSpeedIndicator", () => {
    test("should hide existing indicator", (done) => {
      // Show indicator first
      controller.showSpeedIndicator(2.0);
      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeTruthy();

      // Hide indicator
      const result = controller.hideSpeedIndicator();
      expect(result).toBe(true);

      // Check that hiding class is added
      expect(indicator.className).toContain(
        "video-speed-hotkey-indicator-hiding",
      );

      // Check that element is removed after timeout
      setTimeout(() => {
        const hiddenIndicator = document.getElementById(
          "video-speed-hotkey-indicator",
        );
        expect(hiddenIndicator).toBeFalsy();
        done();
      }, 250);
    });

    test("should return true when no indicator exists", () => {
      const result = controller.hideSpeedIndicator();
      expect(result).toBe(true);
    });

    test("should handle errors gracefully", () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      // Create indicator with problematic setup
      const indicator = document.createElement("div");
      indicator.id = "video-speed-hotkey-indicator";
      document.body.appendChild(indicator);

      // Mock removeChild to throw error
      const originalRemoveChild = document.body.removeChild;
      const mockRemoveChild = jest.fn(() => {
        throw new Error("Mock error");
      });
      document.body.removeChild = mockRemoveChild;

      // Mock console.error to capture the error
      const originalConsoleError = console.error;
      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      const result = controller.hideSpeedIndicator();
      expect(result).toBe(true); // Method itself succeeds

      // Run timers to trigger the async removal
      jest.runAllTimers();

      // Check that error was logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Video Speed Hotkey: Error removing indicator:",
        expect.any(Error),
      );

      // Restore original methods
      document.body.removeChild = originalRemoveChild;
      console.error = originalConsoleError;
      jest.useRealTimers();
    });
  });

  describe("CSS Style Sheet Management", () => {
    test("should create style sheet for indicator rules", () => {
      const styleSheet = controller.getOrCreateStyleSheet();
      expect(styleSheet).toBeTruthy();

      const styleElement = document.getElementById("video-speed-hotkey-styles");
      expect(styleElement).toBeTruthy();
      expect(styleElement.tagName).toBe("STYLE");
    });

    test("should reuse existing style sheet", () => {
      const firstStyleSheet = controller.getOrCreateStyleSheet();
      const secondStyleSheet = controller.getOrCreateStyleSheet();

      // Check that both calls return a valid style sheet
      expect(firstStyleSheet).toBeTruthy();
      expect(secondStyleSheet).toBeTruthy();

      // Check that only one style element exists (reused)
      const styleElements = document.querySelectorAll(
        "#video-speed-hotkey-styles",
      );
      expect(styleElements.length).toBe(1);
    });

    test("should add CSS rules for animations", () => {
      const styleSheet = controller.getOrCreateStyleSheet();
      controller.addIndicatorCSSRules(styleSheet);

      expect(styleSheet.cssRules.length).toBeGreaterThan(0);

      // Check for specific rules
      const rules = Array.from(styleSheet.cssRules).map(
        (rule) => rule.selectorText,
      );
      expect(rules).toContain(".video-speed-hotkey-indicator-visible");
      expect(rules).toContain(".video-speed-hotkey-indicator-hiding");
    });

    test("should not add duplicate CSS rules", () => {
      const styleSheet = controller.getOrCreateStyleSheet();
      controller.addIndicatorCSSRules(styleSheet);
      const initialRuleCount = styleSheet.cssRules.length;

      controller.addIndicatorCSSRules(styleSheet);
      expect(styleSheet.cssRules.length).toBe(initialRuleCount);
    });
  });

  describe("Integration with Speed Control", () => {
    test("should show indicator when speed boost is activated", () => {
      // Mock video detection
      jest.spyOn(controller, "getActiveVideo").mockReturnValue(mockVideo);

      // Simulate hotkey press
      const mockEvent = {
        key: "Space",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        target: document.body,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      controller.activateSpeedBoost(mockEvent);

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator).toBeTruthy();
      expect(indicator.textContent).toBe("2.0x");
    });

    test("should hide indicator when speed boost is deactivated", () => {
      // First activate speed boost
      jest.spyOn(controller, "getActiveVideo").mockReturnValue(mockVideo);
      controller.hotkeyState.isPressed = true;
      controller.showSpeedIndicator(2.0);

      // Then deactivate
      controller.deactivateSpeedBoost();

      // Check indicator is hidden
      setTimeout(() => {
        const indicator = document.getElementById(
          "video-speed-hotkey-indicator",
        );
        expect(indicator).toBeFalsy();
      }, 250);
    });

    test("should hide indicator on window blur", () => {
      controller.showSpeedIndicator(2.0);

      controller.handleWindowBlur();

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator.className).toContain(
        "video-speed-hotkey-indicator-hiding",
      );
    });

    test("should hide indicator on tab visibility change", () => {
      controller.showSpeedIndicator(2.0);

      // Mock document.hidden
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });

      controller.handleVisibilityChange();

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator.className).toContain(
        "video-speed-hotkey-indicator-hiding",
      );
    });
  });

  describe("Positioning Options", () => {
    const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];

    positions.forEach((position) => {
      test(`should position indicator correctly for ${position}`, () => {
        controller.settings.ui.indicatorPosition = position;
        controller.showSpeedIndicator(2.0);

        const indicator = document.getElementById(
          "video-speed-hotkey-indicator",
        );

        switch (position) {
          case "top-left":
            expect(indicator.style.top).toBe("20px");
            expect(indicator.style.left).toBe("20px");
            break;
          case "top-right":
            expect(indicator.style.top).toBe("20px");
            expect(indicator.style.right).toBe("20px");
            break;
          case "bottom-left":
            expect(indicator.style.bottom).toBe("20px");
            expect(indicator.style.left).toBe("20px");
            break;
          case "bottom-right":
            expect(indicator.style.bottom).toBe("20px");
            expect(indicator.style.right).toBe("20px");
            break;
        }
      });
    });

    test("should default to top-right for invalid position", () => {
      controller.settings.ui.indicatorPosition = "invalid-position";
      controller.showSpeedIndicator(2.0);

      const indicator = document.getElementById("video-speed-hotkey-indicator");
      expect(indicator.style.top).toBe("20px");
      expect(indicator.style.right).toBe("20px");
    });
  });

  describe("Error Handling", () => {
    test("should handle DOM manipulation errors gracefully", () => {
      // Mock appendChild to throw error
      const originalAppendChild = document.body.appendChild;
      document.body.appendChild = jest.fn(() => {
        throw new Error("Mock DOM error");
      });

      const result = controller.showSpeedIndicator(2.0);
      expect(result).toBe(false);

      // Restore original method
      document.body.appendChild = originalAppendChild;
    });

    test("should handle missing settings gracefully", () => {
      controller.settings = null;
      const result = controller.showSpeedIndicator(2.0);
      expect(result).toBe(false);
    });

    test("should handle style sheet creation errors", () => {
      // Mock document.head to be null and document.body.appendChild to throw
      const originalHead = document.head;
      const originalAppendChild = document.body.appendChild;

      Object.defineProperty(document, "head", {
        value: null,
        configurable: true,
      });

      document.body.appendChild = jest.fn(() => {
        throw new Error("Mock appendChild error");
      });

      const styleSheet = controller.getOrCreateStyleSheet();
      expect(styleSheet).toBe(null);

      // Restore original methods
      Object.defineProperty(document, "head", {
        value: originalHead,
        configurable: true,
      });
      document.body.appendChild = originalAppendChild;
    });
  });
});
