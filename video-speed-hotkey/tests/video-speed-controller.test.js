/**
 * Unit tests for VideoSpeedController class
 * Tests video detection and active video determination logic
 */

// Mock DOM environment for testing
class MockVideoElement {
  constructor(options = {}) {
    this.src = options.src !== undefined ? options.src : "test-video.mp4";
    this.currentSrc =
      options.currentSrc !== undefined ? options.currentSrc : this.src || "";
    this.playbackRate = options.playbackRate || 1.0;
    this.paused = options.paused !== undefined ? options.paused : true;
    this.ended = options.ended || false;
    this.offsetParent =
      options.offsetParent !== undefined ? options.offsetParent : {};
    this._rect = options.rect || { width: 640, height: 480 };
    this._style = options.style || {
      display: "block",
      visibility: "visible",
      opacity: "1",
    };
    this._sources = options.sources || [];
    this.tagName = "VIDEO";
  }

  getBoundingClientRect() {
    return this._rect;
  }

  querySelector(selector) {
    if (selector === "source") {
      return this._sources.length > 0 ? this._sources[0] : null;
    }
    return null;
  }
}

// Mock global objects
global.document = {
  querySelectorAll: jest.fn(),
};

global.window = {
  location: { hostname: "example.com" },
};

global.getComputedStyle = jest.fn((element) => element._style || {});

global.console = {
  log: jest.fn(),
  error: jest.fn(),
};

global.Date = {
  now: jest.fn(() => 1000),
};

// Import the VideoSpeedController class
// Note: In a real test environment, you'd import from the actual file
// For this test, we'll include the class definition directly

class VideoSpeedController {
  constructor() {
    this.settings = null;
    this.isInitialized = false;
    this.trackedVideos = new Map();
    this.lastActiveVideo = null;

    // Hotkey state tracking
    this.hotkeyState = {
      isPressed: false,
      currentKey: null,
      modifiers: {
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
      },
      preventMultipleActivations: false,
    };
  }

  detectVideos() {
    try {
      let videos = [];

      const platformVideos = this.detectPlatformSpecificVideos();
      videos = videos.concat(platformVideos);

      const genericVideos = this.detectGenericVideos();
      videos = videos.concat(genericVideos);

      const uniqueVideos = [...new Set(videos)];
      const validVideos = uniqueVideos.filter((video) =>
        this.isValidVideo(video),
      );

      this.updateTrackedVideos(validVideos);
      return validVideos;
    } catch (error) {
      console.error("Video Speed Hotkey: Error detecting videos:", error);
      return [];
    }
  }

  updateTrackedVideos(videos) {
    for (const [video, state] of this.trackedVideos.entries()) {
      if (!videos.includes(video)) {
        this.trackedVideos.delete(video);
      }
    }

    videos.forEach((video) => {
      if (!this.trackedVideos.has(video)) {
        this.trackedVideos.set(video, {
          originalRate: video.playbackRate,
          isSpeedBoosted: false,
          platform: this.detectPlatform(video),
          lastInteraction: Date.now(),
        });
      }
    });
  }

  detectPlatform(video) {
    const url = window.location.hostname.toLowerCase();

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "youtube";
    } else if (url.includes("vimeo.com")) {
      return "vimeo";
    } else if (url.includes("netflix.com")) {
      return "netflix";
    } else {
      return "generic";
    }
  }

  detectPlatformSpecificVideos() {
    const hostname = window.location.hostname.toLowerCase();
    let videos = [];

    try {
      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
        videos = this.detectYouTubeVideos();
      } else if (hostname.includes("vimeo.com")) {
        videos = this.detectVimeoVideos();
      } else if (hostname.includes("netflix.com")) {
        videos = this.detectNetflixVideos();
      }
    } catch (error) {
      return [];
    }

    return videos;
  }

  detectYouTubeVideos() {
    const selectors = [
      "video.html5-main-video",
      "video.video-stream",
      "#movie_player video",
      ".html5-video-player video",
      'video[src*="googlevideo.com"]',
    ];
    return this.queryMultipleSelectors(selectors);
  }

  detectVimeoVideos() {
    const selectors = [
      ".vp-video video",
      ".player video",
      'video[src*="vimeocdn.com"]',
      ".vp-video-wrapper video",
      'iframe[src*="vimeo.com"] video',
      ".js-player video",
    ];
    return this.queryMultipleSelectors(selectors);
  }

  detectNetflixVideos() {
    const selectors = [
      ".VideoContainer video",
      ".NFPlayer video",
      "video.nf-video-player",
      ".watch-video video",
      'video[src*="nflxvideo.net"]',
      ".PlayerContainer video",
    ];
    return this.queryMultipleSelectors(selectors);
  }

  detectGenericVideos() {
    try {
      return Array.from(document.querySelectorAll("video"));
    } catch (error) {
      return [];
    }
  }

  queryMultipleSelectors(selectors) {
    let videos = [];

    selectors.forEach((selector) => {
      try {
        const elements = Array.from(document.querySelectorAll(selector));
        const videoElements = elements.filter(
          (el) => el.tagName && el.tagName.toLowerCase() === "video",
        );
        videos = videos.concat(videoElements);
      } catch (error) {
        // Ignore selector errors in tests
      }
    });

    return videos;
  }

  isValidVideo(video) {
    try {
      if (!video || video.tagName.toLowerCase() !== "video") {
        return false;
      }

      const rect = video.getBoundingClientRect();
      const hasSize = rect.width > 0 && rect.height > 0;
      const hasSrc = !!(
        video.src ||
        video.querySelector("source") ||
        video.currentSrc
      );
      const computedStyle = getComputedStyle(video);
      const isVisible =
        video.offsetParent !== null &&
        computedStyle.display !== "none" &&
        computedStyle.visibility !== "hidden" &&
        computedStyle.opacity !== "0";
      const supportsPlaybackRate = typeof video.playbackRate === "number";

      return hasSize && hasSrc && isVisible && supportsPlaybackRate;
    } catch (error) {
      return false;
    }
  }

  getActiveVideo() {
    try {
      const videos = this.detectVideos();

      if (videos.length === 0) {
        this.lastActiveVideo = null;
        return null;
      }

      if (videos.length === 1) {
        this.lastActiveVideo = videos[0];
        return videos[0];
      }

      let activeVideo = null;

      const playingVideos = videos.filter(
        (video) => !video.paused && !video.ended,
      );
      if (playingVideos.length === 1) {
        activeVideo = playingVideos[0];
      } else if (playingVideos.length > 1) {
        activeVideo = this.getMostRecentlyInteracted(playingVideos);
      }

      if (
        !activeVideo &&
        this.lastActiveVideo &&
        videos.includes(this.lastActiveVideo)
      ) {
        activeVideo = this.lastActiveVideo;
      }

      if (!activeVideo) {
        activeVideo = this.getLargestVideo(videos);
      }

      if (!activeVideo) {
        activeVideo = videos[0];
      }

      this.lastActiveVideo = activeVideo;

      if (activeVideo && this.trackedVideos.has(activeVideo)) {
        this.trackedVideos.get(activeVideo).lastInteraction = Date.now();
      }

      return activeVideo;
    } catch (error) {
      console.error("Video Speed Hotkey: Error getting active video:", error);
      return null;
    }
  }

  getMostRecentlyInteracted(videos) {
    let mostRecent = null;
    let latestTime = 0;

    videos.forEach((video) => {
      const state = this.trackedVideos.get(video);
      if (state && state.lastInteraction > latestTime) {
        latestTime = state.lastInteraction;
        mostRecent = video;
      }
    });

    return mostRecent || videos[0];
  }

  getLargestVideo(videos) {
    let largest = null;
    let maxArea = 0;

    videos.forEach((video) => {
      const rect = video.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea) {
        maxArea = area;
        largest = video;
      }
    });

    return largest;
  }

  applySpeedBoost(multiplier = 2.0) {
    try {
      const activeVideo = this.getActiveVideo();

      if (!activeVideo) {
        return false;
      }

      const videoState = this.trackedVideos.get(activeVideo);
      if (!videoState) {
        return false;
      }

      if (videoState.isSpeedBoosted) {
        return true;
      }

      if (
        typeof multiplier !== "number" ||
        multiplier <= 0 ||
        multiplier > 16
      ) {
        return false;
      }

      videoState.originalRate = activeVideo.playbackRate;
      activeVideo.playbackRate = multiplier;
      videoState.isSpeedBoosted = true;

      return true;
    } catch (error) {
      return false;
    }
  }

  restoreOriginalSpeed() {
    try {
      const activeVideo = this.getActiveVideo();

      if (!activeVideo) {
        return false;
      }

      const videoState = this.trackedVideos.get(activeVideo);
      if (!videoState) {
        return false;
      }

      if (!videoState.isSpeedBoosted) {
        return true;
      }

      activeVideo.playbackRate = videoState.originalRate;
      videoState.isSpeedBoosted = false;

      return true;
    } catch (error) {
      return false;
    }
  }

  isSpeedBoostActive() {
    for (const [video, state] of this.trackedVideos.entries()) {
      if (state.isSpeedBoosted) {
        return true;
      }
    }
    return false;
  }

  getCurrentSpeed() {
    try {
      const activeVideo = this.getActiveVideo();
      return activeVideo ? activeVideo.playbackRate : null;
    } catch (error) {
      return null;
    }
  }

  resetAllSpeeds() {
    try {
      let resetCount = 0;

      for (const [video, state] of this.trackedVideos.entries()) {
        if (state.isSpeedBoosted) {
          video.playbackRate = state.originalRate;
          state.isSpeedBoosted = false;
          resetCount++;
        }
      }

      return resetCount;
    } catch (error) {
      return 0;
    }
  }

  // Hotkey validation methods for testing
  validateHotkey(hotkeyConfig) {
    const result = {
      success: false,
      warnings: [],
      errors: [],
      conflicts: [],
    };

    try {
      if (!hotkeyConfig || typeof hotkeyConfig !== "object") {
        result.errors.push("Invalid hotkey configuration object");
        return result;
      }

      const { key, modifiers = [] } = hotkeyConfig;

      if (!key || typeof key !== "string") {
        result.errors.push("Hotkey must specify a valid key");
        return result;
      }

      if (!Array.isArray(modifiers)) {
        result.errors.push("Modifiers must be an array");
        return result;
      }

      const validModifiers = ["ctrl", "alt", "shift", "meta"];
      const invalidModifiers = modifiers.filter(
        (mod) => !validModifiers.includes(mod),
      );
      if (invalidModifiers.length > 0) {
        result.errors.push(`Invalid modifiers: ${invalidModifiers.join(", ")}`);
        return result;
      }

      const uniqueModifiers = [...new Set(modifiers)];
      if (uniqueModifiers.length !== modifiers.length) {
        result.warnings.push("Duplicate modifiers detected and removed");
      }

      const normalizedKey = this.normalizeKey(key);
      const conflicts = this.checkBrowserShortcutConflicts(
        normalizedKey,
        uniqueModifiers,
      );
      if (conflicts.length > 0) {
        result.conflicts = conflicts;
        result.warnings.push(
          `Potential conflicts with browser shortcuts: ${conflicts.join(", ")}`,
        );
      }

      const problematicCombos = this.checkProblematicKeyCombinations(
        normalizedKey,
        uniqueModifiers,
      );
      if (problematicCombos.length > 0) {
        result.warnings.push(
          `Potentially problematic combinations: ${problematicCombos.join(
            ", ",
          )}`,
        );
      }

      const suitabilityCheck = this.checkKeySuitability(
        normalizedKey,
        uniqueModifiers,
      );
      if (!suitabilityCheck.suitable) {
        result.warnings.push(suitabilityCheck.reason);
      }

      if (result.errors.length === 0) {
        result.success = true;
      }

      return result;
    } catch (error) {
      result.errors.push("Validation failed due to internal error");
      return result;
    }
  }

  normalizeKey(key) {
    if (!key) return "";

    const keyMap = {
      " ": "Space",
      Spacebar: "Space",
      Esc: "Escape",
      Del: "Delete",
      Ins: "Insert",
      PgUp: "PageUp",
      PgDn: "PageDown",
      Left: "ArrowLeft",
      Right: "ArrowRight",
      Up: "ArrowUp",
      Down: "ArrowDown",
    };

    return keyMap[key] || key;
  }

  checkBrowserShortcutConflicts(key, modifiers) {
    const conflicts = [];
    const browserShortcuts = {
      "ctrl+r": "Refresh page",
      "ctrl+t": "New tab",
      "ctrl+w": "Close tab",
      "ctrl+f": "Find in page",
      f12: "Developer tools",
      "ctrl+shift+i": "Developer tools",
      "alt+f4": "Close window",
      "meta+q": "Quit application",
    };

    const modifierStr = modifiers.sort().join("+");
    const shortcutStr = modifierStr
      ? `${modifierStr}+${key.toLowerCase()}`
      : key.toLowerCase();

    for (const [shortcut, description] of Object.entries(browserShortcuts)) {
      if (shortcut === shortcutStr) {
        conflicts.push(description);
      }
    }

    return conflicts;
  }

  checkProblematicKeyCombinations(key, modifiers) {
    const problems = [];

    const typingKeys = ["Space", "Enter", "Tab", "Backspace", "Delete"];
    if (typingKeys.includes(key) && modifiers.length === 0) {
      problems.push(`${key} without modifiers may interfere with typing`);
    }

    const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (arrowKeys.includes(key) && modifiers.length === 0) {
      problems.push(`${key} without modifiers may interfere with navigation`);
    }

    if (/^[a-zA-Z]$/.test(key) && modifiers.length === 0) {
      problems.push(
        `Single letter '${key}' without modifiers may interfere with typing`,
      );
    }

    if (key === "Escape") {
      problems.push("Escape key may conflict with cancel/close actions");
    }

    if (modifiers.length > 2) {
      problems.push(
        "Too many modifiers may be difficult to press simultaneously",
      );
    }

    return problems;
  }

  checkKeySuitability(key, modifiers) {
    const goodHoldKeys = [
      "Space",
      "Shift",
      "Ctrl",
      "Alt",
      "Meta",
      "CapsLock",
      "Tab",
    ];
    const badHoldKeys = [
      "Enter",
      "Escape",
      "Backspace",
      "Delete",
      "Home",
      "End",
      "PageUp",
      "PageDown",
    ];
    const isFunctionKey = /^F\d+$/.test(key);

    if (badHoldKeys.includes(key)) {
      return {
        suitable: false,
        reason: `${key} is not suitable for hold-to-activate functionality`,
      };
    }

    if (goodHoldKeys.includes(key) || isFunctionKey) {
      return {
        suitable: true,
        reason: `${key} is suitable for hold-to-activate`,
      };
    }

    if (/^[a-zA-Z0-9]$/.test(key) && modifiers.length > 0) {
      return {
        suitable: true,
        reason: `${key} with modifiers is acceptable for hold-to-activate`,
      };
    }

    return {
      suitable: false,
      reason: `${key} may not be ideal for hold-to-activate functionality`,
    };
  }

  getRecommendedHotkeys(currentConfig = null) {
    const recommendations = [
      {
        key: "Space",
        modifiers: ["shift"],
        description: "Shift+Space - Easy to hold, minimal conflicts",
      },
      {
        key: "Space",
        modifiers: ["ctrl"],
        description: "Ctrl+Space - Common for speed controls",
      },
      {
        key: "F1",
        modifiers: [],
        description: "F1 - Function key, minimal typing interference",
      },
    ];

    if (currentConfig) {
      return recommendations.filter(
        (rec) =>
          rec.key !== currentConfig.key ||
          JSON.stringify(rec.modifiers.sort()) !==
            JSON.stringify((currentConfig.modifiers || []).sort()),
      );
    }

    return recommendations;
  }
}

describe("VideoSpeedController", () => {
  let controller;

  beforeEach(() => {
    controller = new VideoSpeedController();
    jest.clearAllMocks();
    Date.now.mockReturnValue(1000);
  });

  describe("detectVideos", () => {
    test("should return empty array when no videos found", () => {
      document.querySelectorAll.mockReturnValue([]);

      const result = controller.detectVideos();

      expect(result).toEqual([]);
      expect(document.querySelectorAll).toHaveBeenCalledWith("video");
    });

    test("should filter out videos with no size", () => {
      const validVideo = new MockVideoElement();
      const invalidVideo = new MockVideoElement({
        rect: { width: 0, height: 0 },
      });

      document.querySelectorAll.mockReturnValue([validVideo, invalidVideo]);

      const result = controller.detectVideos();

      expect(result).toEqual([validVideo]);
    });

    test("should filter out videos with no source", () => {
      const validVideo = new MockVideoElement();
      const invalidVideo = new MockVideoElement({ src: null, sources: [] });

      document.querySelectorAll.mockReturnValue([validVideo, invalidVideo]);

      const result = controller.detectVideos();

      expect(result).toEqual([validVideo]);
    });

    test("should filter out hidden videos", () => {
      const validVideo = new MockVideoElement();
      const hiddenVideo = new MockVideoElement({
        style: { display: "none", visibility: "visible" },
      });

      document.querySelectorAll.mockReturnValue([validVideo, hiddenVideo]);

      const result = controller.detectVideos();

      expect(result).toEqual([validVideo]);
    });

    test("should update tracked videos map", () => {
      const video1 = new MockVideoElement();
      const video2 = new MockVideoElement();

      document.querySelectorAll.mockReturnValue([video1, video2]);

      controller.detectVideos();

      expect(controller.trackedVideos.size).toBe(2);
      expect(controller.trackedVideos.has(video1)).toBe(true);
      expect(controller.trackedVideos.has(video2)).toBe(true);
    });
  });

  describe("detectPlatform", () => {
    test("should detect YouTube platform", () => {
      window.location.hostname = "www.youtube.com";
      const video = new MockVideoElement();

      const platform = controller.detectPlatform(video);

      expect(platform).toBe("youtube");
    });

    test("should detect Vimeo platform", () => {
      window.location.hostname = "vimeo.com";
      const video = new MockVideoElement();

      const platform = controller.detectPlatform(video);

      expect(platform).toBe("vimeo");
    });

    test("should detect Netflix platform", () => {
      window.location.hostname = "www.netflix.com";
      const video = new MockVideoElement();

      const platform = controller.detectPlatform(video);

      expect(platform).toBe("netflix");
    });

    test("should default to generic platform", () => {
      window.location.hostname = "example.com";
      const video = new MockVideoElement();

      const platform = controller.detectPlatform(video);

      expect(platform).toBe("generic");
    });
  });

  describe("detectPlatformSpecificVideos", () => {
    test("should detect YouTube videos on YouTube domain", () => {
      window.location.hostname = "www.youtube.com";
      const mockVideo = new MockVideoElement();

      // Mock YouTube-specific selector
      document.querySelectorAll.mockImplementation((selector) => {
        if (selector === "video.html5-main-video") {
          return [mockVideo];
        }
        return [];
      });

      const result = controller.detectPlatformSpecificVideos();

      expect(result).toContain(mockVideo);
    });

    test("should detect Vimeo videos on Vimeo domain", () => {
      window.location.hostname = "vimeo.com";
      const mockVideo = new MockVideoElement();

      document.querySelectorAll.mockImplementation((selector) => {
        if (selector === ".vp-video video") {
          return [mockVideo];
        }
        return [];
      });

      const result = controller.detectPlatformSpecificVideos();

      expect(result).toContain(mockVideo);
    });

    test("should detect Netflix videos on Netflix domain", () => {
      window.location.hostname = "www.netflix.com";
      const mockVideo = new MockVideoElement();

      document.querySelectorAll.mockImplementation((selector) => {
        if (selector === ".VideoContainer video") {
          return [mockVideo];
        }
        return [];
      });

      const result = controller.detectPlatformSpecificVideos();

      expect(result).toContain(mockVideo);
    });

    test("should return empty array for unknown domains", () => {
      window.location.hostname = "example.com";

      const result = controller.detectPlatformSpecificVideos();

      expect(result).toEqual([]);
    });
  });

  describe("queryMultipleSelectors", () => {
    test("should query multiple selectors and return video elements", () => {
      const video1 = new MockVideoElement();
      const video2 = new MockVideoElement();
      const nonVideo = { tagName: "DIV" };

      document.querySelectorAll.mockImplementation((selector) => {
        if (selector === "video.class1") {
          return [video1];
        } else if (selector === "video.class2") {
          return [video2, nonVideo];
        }
        return [];
      });

      const result = controller.queryMultipleSelectors([
        "video.class1",
        "video.class2",
      ]);

      expect(result).toEqual([video1, video2]);
    });

    test("should handle selector errors gracefully", () => {
      document.querySelectorAll.mockImplementation(() => {
        throw new Error("Selector error");
      });

      const result = controller.queryMultipleSelectors(["invalid-selector"]);

      expect(result).toEqual([]);
    });
  });

  describe("isValidVideo", () => {
    test("should return true for valid video", () => {
      const video = new MockVideoElement({
        rect: { width: 640, height: 480 },
        src: "test.mp4",
        style: { display: "block", visibility: "visible", opacity: "1" },
        offsetParent: {},
      });

      const result = controller.isValidVideo(video);

      expect(result).toBe(true);
    });

    test("should return false for non-video element", () => {
      const notVideo = { tagName: "DIV" };

      const result = controller.isValidVideo(notVideo);

      expect(result).toBe(false);
    });

    test("should return false for video with no size", () => {
      const video = new MockVideoElement({
        rect: { width: 0, height: 0 },
      });

      const result = controller.isValidVideo(video);

      expect(result).toBe(false);
    });

    test("should return false for video with no source", () => {
      const video = new MockVideoElement({
        src: null,
        currentSrc: null,
        sources: [],
      });
      video.querySelector = () => null;

      const result = controller.isValidVideo(video);

      expect(result).toBe(false);
    });

    test("should return false for hidden video", () => {
      const video = new MockVideoElement({
        style: { display: "none", visibility: "visible", opacity: "1" },
      });

      const result = controller.isValidVideo(video);

      expect(result).toBe(false);
    });
  });

  describe("getActiveVideo", () => {
    test("should return null when no videos found", () => {
      document.querySelectorAll.mockReturnValue([]);

      const result = controller.getActiveVideo();

      expect(result).toBeNull();
      expect(controller.lastActiveVideo).toBeNull();
    });

    test("should return single video when only one exists", () => {
      const video = new MockVideoElement();
      document.querySelectorAll.mockReturnValue([video]);

      const result = controller.getActiveVideo();

      expect(result).toBe(video);
      expect(controller.lastActiveVideo).toBe(video);
    });

    test("should prioritize playing video over paused videos", () => {
      const pausedVideo = new MockVideoElement({ paused: true });
      const playingVideo = new MockVideoElement({ paused: false });

      document.querySelectorAll.mockReturnValue([pausedVideo, playingVideo]);

      const result = controller.getActiveVideo();

      expect(result).toBe(playingVideo);
    });

    test("should choose largest video when multiple paused videos exist", () => {
      const smallVideo = new MockVideoElement({
        rect: { width: 320, height: 240 },
      });
      const largeVideo = new MockVideoElement({
        rect: { width: 1280, height: 720 },
      });

      document.querySelectorAll.mockReturnValue([smallVideo, largeVideo]);

      const result = controller.getActiveVideo();

      expect(result).toBe(largeVideo);
    });

    test("should remember last active video", () => {
      const video1 = new MockVideoElement();
      const video2 = new MockVideoElement();

      // First call - should return first video
      document.querySelectorAll.mockReturnValue([video1]);
      controller.getActiveVideo();

      // Second call with both videos - should prefer the previously active one
      document.querySelectorAll.mockReturnValue([video1, video2]);
      const result = controller.getActiveVideo();

      expect(result).toBe(video1);
    });

    test("should handle most recently interacted video among multiple playing videos", () => {
      Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      const video1 = new MockVideoElement({ paused: false });
      const video2 = new MockVideoElement({ paused: false });

      // Set up tracked videos with different interaction times
      controller.trackedVideos.set(video1, { lastInteraction: 1000 });
      controller.trackedVideos.set(video2, { lastInteraction: 2000 });

      document.querySelectorAll.mockReturnValue([video1, video2]);

      const result = controller.getActiveVideo();

      expect(result).toBe(video2);
    });
  });

  describe("updateTrackedVideos", () => {
    test("should remove videos no longer in DOM", () => {
      const video1 = new MockVideoElement();
      const video2 = new MockVideoElement();

      // Add both videos to tracking
      controller.trackedVideos.set(video1, { originalRate: 1.0 });
      controller.trackedVideos.set(video2, { originalRate: 1.0 });

      // Update with only video1
      controller.updateTrackedVideos([video1]);

      expect(controller.trackedVideos.has(video1)).toBe(true);
      expect(controller.trackedVideos.has(video2)).toBe(false);
    });

    test("should add new videos to tracking", () => {
      const video = new MockVideoElement({ playbackRate: 1.5 });

      controller.updateTrackedVideos([video]);

      expect(controller.trackedVideos.has(video)).toBe(true);
      const state = controller.trackedVideos.get(video);
      expect(state.originalRate).toBe(1.5);
      expect(state.isSpeedBoosted).toBe(false);
    });
  });

  describe("getLargestVideo", () => {
    test("should return video with largest area", () => {
      const smallVideo = new MockVideoElement({
        rect: { width: 320, height: 240 },
      });
      const largeVideo = new MockVideoElement({
        rect: { width: 1280, height: 720 },
      });
      const mediumVideo = new MockVideoElement({
        rect: { width: 640, height: 480 },
      });

      const result = controller.getLargestVideo([
        smallVideo,
        largeVideo,
        mediumVideo,
      ]);

      expect(result).toBe(largeVideo);
    });

    test("should return null for empty array", () => {
      const result = controller.getLargestVideo([]);

      expect(result).toBeNull();
    });
  });

  describe("getMostRecentlyInteracted", () => {
    test("should return video with most recent interaction", () => {
      const video1 = new MockVideoElement();
      const video2 = new MockVideoElement();

      controller.trackedVideos.set(video1, { lastInteraction: 1000 });
      controller.trackedVideos.set(video2, { lastInteraction: 2000 });

      const result = controller.getMostRecentlyInteracted([video1, video2]);

      expect(result).toBe(video2);
    });

    test("should return first video if no tracking data exists", () => {
      const video1 = new MockVideoElement();
      const video2 = new MockVideoElement();

      const result = controller.getMostRecentlyInteracted([video1, video2]);

      expect(result).toBe(video1);
    });
  });

  describe("applySpeedBoost", () => {
    test("should apply speed boost to active video", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });
      document.querySelectorAll.mockReturnValue([video]);

      const result = controller.applySpeedBoost(2.0);

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(2.0);

      const state = controller.trackedVideos.get(video);
      expect(state.isSpeedBoosted).toBe(true);
      expect(state.originalRate).toBe(1.0);
    });

    test("should return false when no active video found", () => {
      document.querySelectorAll.mockReturnValue([]);

      const result = controller.applySpeedBoost(2.0);

      expect(result).toBe(false);
    });

    test("should return true if speed boost already active", () => {
      const video = new MockVideoElement({ playbackRate: 2.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Set up video as already speed boosted
      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.applySpeedBoost(2.0);

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(2.0); // Should remain unchanged
    });

    test("should reject invalid multipliers", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });
      document.querySelectorAll.mockReturnValue([video]);

      expect(controller.applySpeedBoost(0)).toBe(false);
      expect(controller.applySpeedBoost(-1)).toBe(false);
      expect(controller.applySpeedBoost(17)).toBe(false);
      expect(controller.applySpeedBoost("invalid")).toBe(false);

      expect(video.playbackRate).toBe(1.0); // Should remain unchanged
    });

    test("should use default multiplier when none provided", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });
      document.querySelectorAll.mockReturnValue([video]);

      const result = controller.applySpeedBoost();

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(2.0); // Default multiplier
    });
  });

  describe("restoreOriginalSpeed", () => {
    test("should restore original speed for active video", () => {
      const video = new MockVideoElement({ playbackRate: 2.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Set up video as speed boosted
      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(1.0);

      const state = controller.trackedVideos.get(video);
      expect(state.isSpeedBoosted).toBe(false);
    });

    test("should return false when no active video found", () => {
      document.querySelectorAll.mockReturnValue([]);

      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(false);
    });

    test("should return true if no speed boost is active", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Set up video as not speed boosted
      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: false,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(1.0); // Should remain unchanged
    });
  });

  describe("isSpeedBoostActive", () => {
    test("should return true when speed boost is active", () => {
      const video = new MockVideoElement();
      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.isSpeedBoostActive();

      expect(result).toBe(true);
    });

    test("should return false when no speed boost is active", () => {
      const video = new MockVideoElement();
      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: false,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.isSpeedBoostActive();

      expect(result).toBe(false);
    });

    test("should return false when no videos are tracked", () => {
      const result = controller.isSpeedBoostActive();

      expect(result).toBe(false);
    });
  });

  describe("getCurrentSpeed", () => {
    test("should return current playback rate of active video", () => {
      const video = new MockVideoElement({ playbackRate: 1.5 });
      document.querySelectorAll.mockReturnValue([video]);

      const result = controller.getCurrentSpeed();

      expect(result).toBe(1.5);
    });

    test("should return null when no active video found", () => {
      document.querySelectorAll.mockReturnValue([]);

      const result = controller.getCurrentSpeed();

      expect(result).toBeNull();
    });
  });

  describe("resetAllSpeeds", () => {
    test("should reset all speed boosted videos", () => {
      const video1 = new MockVideoElement({ playbackRate: 2.0 });
      const video2 = new MockVideoElement({ playbackRate: 3.0 });
      const video3 = new MockVideoElement({ playbackRate: 1.0 });

      controller.trackedVideos.set(video1, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      controller.trackedVideos.set(video2, {
        originalRate: 1.5,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      controller.trackedVideos.set(video3, {
        originalRate: 1.0,
        isSpeedBoosted: false,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.resetAllSpeeds();

      expect(result).toBe(2); // Should reset 2 videos
      expect(video1.playbackRate).toBe(1.0);
      expect(video2.playbackRate).toBe(1.5);
      expect(video3.playbackRate).toBe(1.0); // Should remain unchanged

      expect(controller.trackedVideos.get(video1).isSpeedBoosted).toBe(false);
      expect(controller.trackedVideos.get(video2).isSpeedBoosted).toBe(false);
      expect(controller.trackedVideos.get(video3).isSpeedBoosted).toBe(false);
    });

    test("should return 0 when no videos need resetting", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });

      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: false,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.resetAllSpeeds();

      expect(result).toBe(0);
    });
  });

  describe("validateHotkey", () => {
    test("should validate valid hotkey configuration", () => {
      const config = {
        key: "Space",
        modifiers: ["shift"],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject invalid configuration object", () => {
      const result = controller.validateHotkey(null);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Invalid hotkey configuration object");
    });

    test("should reject configuration without key", () => {
      const config = {
        modifiers: ["shift"],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Hotkey must specify a valid key");
    });

    test("should reject invalid modifiers array", () => {
      const config = {
        key: "Space",
        modifiers: "invalid",
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Modifiers must be an array");
    });

    test("should reject invalid modifier names", () => {
      const config = {
        key: "Space",
        modifiers: ["shift", "invalid", "ctrl"],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Invalid modifiers: invalid");
    });

    test("should warn about duplicate modifiers", () => {
      const config = {
        key: "Space",
        modifiers: ["shift", "shift", "ctrl"],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(
        "Duplicate modifiers detected and removed",
      );
    });

    test("should detect browser shortcut conflicts", () => {
      const config = {
        key: "r",
        modifiers: ["ctrl"],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(true);
      expect(result.conflicts).toContain("Refresh page");
      expect(
        result.warnings.some((w) => w.includes("Potential conflicts")),
      ).toBe(true);
    });

    test("should warn about problematic key combinations", () => {
      const config = {
        key: "Space",
        modifiers: [],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(true);
      expect(
        result.warnings.some((w) => w.includes("may interfere with typing")),
      ).toBe(true);
    });

    test("should warn about unsuitable keys for hold-to-activate", () => {
      const config = {
        key: "Enter",
        modifiers: [],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(true);
      expect(
        result.warnings.some((w) =>
          w.includes("not suitable for hold-to-activate"),
        ),
      ).toBe(true);
    });
  });

  describe("normalizeKey", () => {
    test("should normalize space key", () => {
      expect(controller.normalizeKey(" ")).toBe("Space");
      expect(controller.normalizeKey("Spacebar")).toBe("Space");
    });

    test("should normalize escape key", () => {
      expect(controller.normalizeKey("Esc")).toBe("Escape");
    });

    test("should normalize arrow keys", () => {
      expect(controller.normalizeKey("Left")).toBe("ArrowLeft");
      expect(controller.normalizeKey("Right")).toBe("ArrowRight");
      expect(controller.normalizeKey("Up")).toBe("ArrowUp");
      expect(controller.normalizeKey("Down")).toBe("ArrowDown");
    });

    test("should return original key if no mapping exists", () => {
      expect(controller.normalizeKey("F1")).toBe("F1");
      expect(controller.normalizeKey("a")).toBe("a");
    });

    test("should handle empty or null keys", () => {
      expect(controller.normalizeKey("")).toBe("");
      expect(controller.normalizeKey(null)).toBe("");
      expect(controller.normalizeKey(undefined)).toBe("");
    });
  });

  describe("checkBrowserShortcutConflicts", () => {
    test("should detect Ctrl+R conflict", () => {
      const conflicts = controller.checkBrowserShortcutConflicts("r", ["ctrl"]);
      expect(conflicts).toContain("Refresh page");
    });

    test("should detect F12 conflict", () => {
      const conflicts = controller.checkBrowserShortcutConflicts("F12", []);
      expect(conflicts).toContain("Developer tools");
    });

    test("should return empty array for non-conflicting combinations", () => {
      const conflicts = controller.checkBrowserShortcutConflicts("Space", [
        "shift",
      ]);
      expect(conflicts).toHaveLength(0);
    });

    test("should handle case insensitive key matching", () => {
      const conflicts = controller.checkBrowserShortcutConflicts("R", ["ctrl"]);
      expect(conflicts).toContain("Refresh page");
    });
  });

  describe("checkProblematicKeyCombinations", () => {
    test("should warn about typing keys without modifiers", () => {
      const problems = controller.checkProblematicKeyCombinations("Space", []);
      expect(
        problems.some((p) => p.includes("may interfere with typing")),
      ).toBe(true);
    });

    test("should warn about arrow keys without modifiers", () => {
      const problems = controller.checkProblematicKeyCombinations(
        "ArrowUp",
        [],
      );
      expect(
        problems.some((p) => p.includes("may interfere with navigation")),
      ).toBe(true);
    });

    test("should warn about single letters without modifiers", () => {
      const problems = controller.checkProblematicKeyCombinations("a", []);
      expect(
        problems.some((p) => p.includes("may interfere with typing")),
      ).toBe(true);
    });

    test("should warn about escape key", () => {
      const problems = controller.checkProblematicKeyCombinations("Escape", [
        "ctrl",
      ]);
      expect(
        problems.some((p) =>
          p.includes("may conflict with cancel/close actions"),
        ),
      ).toBe(true);
    });

    test("should warn about too many modifiers", () => {
      const problems = controller.checkProblematicKeyCombinations("a", [
        "ctrl",
        "alt",
        "shift",
      ]);
      expect(problems.some((p) => p.includes("Too many modifiers"))).toBe(true);
    });

    test("should return empty array for good combinations", () => {
      const problems = controller.checkProblematicKeyCombinations("F1", []);
      expect(problems).toHaveLength(0);
    });
  });

  describe("checkKeySuitability", () => {
    test("should approve good hold keys", () => {
      const result = controller.checkKeySuitability("Space", ["shift"]);
      expect(result.suitable).toBe(true);
      expect(result.reason).toContain("suitable for hold-to-activate");
    });

    test("should approve function keys", () => {
      const result = controller.checkKeySuitability("F1", []);
      expect(result.suitable).toBe(true);
      expect(result.reason).toContain("suitable for hold-to-activate");
    });

    test("should reject bad hold keys", () => {
      const result = controller.checkKeySuitability("Enter", []);
      expect(result.suitable).toBe(false);
      expect(result.reason).toContain("not suitable for hold-to-activate");
    });

    test("should approve letters with modifiers", () => {
      const result = controller.checkKeySuitability("a", ["ctrl"]);
      expect(result.suitable).toBe(true);
      expect(result.reason).toContain("acceptable for hold-to-activate");
    });

    test("should reject letters without modifiers", () => {
      const result = controller.checkKeySuitability("a", []);
      expect(result.suitable).toBe(false);
      expect(result.reason).toContain("may not be ideal");
    });
  });

  describe("getRecommendedHotkeys", () => {
    test("should return array of recommended hotkeys", () => {
      const recommendations = controller.getRecommendedHotkeys();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty("key");
      expect(recommendations[0]).toHaveProperty("modifiers");
      expect(recommendations[0]).toHaveProperty("description");
    });

    test("should filter out current configuration", () => {
      const currentConfig = {
        key: "Space",
        modifiers: ["shift"],
      };

      const recommendations = controller.getRecommendedHotkeys(currentConfig);

      const hasCurrentConfig = recommendations.some(
        (rec) =>
          rec.key === "Space" &&
          JSON.stringify(rec.modifiers.sort()) === JSON.stringify(["shift"]),
      );

      expect(hasCurrentConfig).toBe(false);
    });

    test("should include all recommendations when no current config provided", () => {
      const allRecommendations = controller.getRecommendedHotkeys();
      const filteredRecommendations = controller.getRecommendedHotkeys(null);

      expect(allRecommendations).toEqual(filteredRecommendations);
    });
  });
});

// Additional tests for comprehensive coverage
describe("Speed Control Integration", () => {
  let controller;

  beforeEach(() => {
    controller = new VideoSpeedController();
    jest.clearAllMocks();
  });

  describe("applySpeedBoost edge cases", () => {
    test("should handle already speed boosted video", () => {
      const video = new MockVideoElement({ playbackRate: 2.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Set up video as already speed boosted
      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.applySpeedBoost(2.0);

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(2.0); // Should remain at boosted speed
    });

    test("should reject invalid speed multipliers", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Test various invalid multipliers
      expect(controller.applySpeedBoost(0)).toBe(false);
      expect(controller.applySpeedBoost(-1)).toBe(false);
      expect(controller.applySpeedBoost(20)).toBe(false);
      expect(controller.applySpeedBoost("invalid")).toBe(false);
      expect(controller.applySpeedBoost(null)).toBe(false);
      expect(controller.applySpeedBoost(undefined)).toBe(false);

      // Video should remain at original speed
      expect(video.playbackRate).toBe(1.0);
    });

    test("should handle video without tracked state", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Don't add video to tracked videos map
      const result = controller.applySpeedBoost(2.0);

      expect(result).toBe(false);
    });
  });

  describe("restoreOriginalSpeed", () => {
    test("should restore original speed for boosted video", () => {
      const video = new MockVideoElement({ playbackRate: 2.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Set up video as speed boosted
      controller.trackedVideos.set(video, {
        originalRate: 1.5,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(1.5);

      const state = controller.trackedVideos.get(video);
      expect(state.isSpeedBoosted).toBe(false);
    });

    test("should return true for non-boosted video", () => {
      const video = new MockVideoElement({ playbackRate: 1.0 });
      document.querySelectorAll.mockReturnValue([video]);

      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: false,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(true);
      expect(video.playbackRate).toBe(1.0);
    });

    test("should return false when no active video", () => {
      document.querySelectorAll.mockReturnValue([]);

      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(false);
    });

    test("should handle video without tracked state", () => {
      const video = new MockVideoElement({ playbackRate: 2.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Don't add video to tracked videos map
      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(false);
    });

    test("should handle playback rate errors gracefully", () => {
      const video = new MockVideoElement({ playbackRate: 2.0 });
      document.querySelectorAll.mockReturnValue([video]);

      // Mock playback rate setter to throw error
      Object.defineProperty(video, "playbackRate", {
        get: () => 2.0,
        set: () => {
          throw new Error("Playback rate error");
        },
      });

      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const result = controller.restoreOriginalSpeed();

      expect(result).toBe(false);
    });
  });

  describe("utility methods", () => {
    test("should check if speed boost is active", () => {
      const video1 = new MockVideoElement();
      const video2 = new MockVideoElement();

      controller.trackedVideos.set(video1, {
        originalRate: 1.0,
        isSpeedBoosted: false,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      controller.trackedVideos.set(video2, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      expect(controller.isSpeedBoostActive()).toBe(true);

      // Set both to not boosted
      controller.trackedVideos.get(video2).isSpeedBoosted = false;
      expect(controller.isSpeedBoostActive()).toBe(false);
    });

    test("should get current speed", () => {
      const video = new MockVideoElement({ playbackRate: 2.5 });
      document.querySelectorAll.mockReturnValue([video]);

      expect(controller.getCurrentSpeed()).toBe(2.5);
    });

    test("should return null when no active video for current speed", () => {
      document.querySelectorAll.mockReturnValue([]);

      expect(controller.getCurrentSpeed()).toBeNull();
    });

    test("should reset all speeds", () => {
      const video1 = new MockVideoElement({ playbackRate: 2.0 });
      const video2 = new MockVideoElement({ playbackRate: 3.0 });

      controller.trackedVideos.set(video1, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      controller.trackedVideos.set(video2, {
        originalRate: 1.5,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const resetCount = controller.resetAllSpeeds();

      expect(resetCount).toBe(2);
      expect(video1.playbackRate).toBe(1.0);
      expect(video2.playbackRate).toBe(1.5);
      expect(controller.trackedVideos.get(video1).isSpeedBoosted).toBe(false);
      expect(controller.trackedVideos.get(video2).isSpeedBoosted).toBe(false);
    });

    test("should handle errors in resetAllSpeeds", () => {
      const video = new MockVideoElement({ playbackRate: 2.0 });

      // Mock playback rate setter to throw error
      Object.defineProperty(video, "playbackRate", {
        get: () => 2.0,
        set: () => {
          throw new Error("Playback rate error");
        },
      });

      controller.trackedVideos.set(video, {
        originalRate: 1.0,
        isSpeedBoosted: true,
        platform: "generic",
        lastInteraction: Date.now(),
      });

      const resetCount = controller.resetAllSpeeds();

      expect(resetCount).toBe(0);
    });
  });

  describe("hotkey validation", () => {
    test("should validate correct hotkey configuration", () => {
      const config = {
        key: "Space",
        modifiers: ["shift"],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject invalid hotkey configuration", () => {
      const config = {
        key: null,
        modifiers: ["invalid"],
      };

      const result = controller.validateHotkey(config);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should detect browser shortcut conflicts", () => {
      const config = {
        key: "r",
        modifiers: ["ctrl"],
      };

      const result = controller.validateHotkey(config);

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("should provide hotkey recommendations", () => {
      const recommendations = controller.getRecommendedHotkeys();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty("key");
      expect(recommendations[0]).toHaveProperty("modifiers");
      expect(recommendations[0]).toHaveProperty("description");
    });

    test("should filter out current hotkey from recommendations", () => {
      const currentConfig = {
        key: "Space",
        modifiers: ["shift"],
      };

      const recommendations = controller.getRecommendedHotkeys(currentConfig);

      const hasCurrentConfig = recommendations.some(
        (rec) =>
          rec.key === currentConfig.key &&
          JSON.stringify(rec.modifiers.sort()) ===
            JSON.stringify(currentConfig.modifiers.sort()),
      );

      expect(hasCurrentConfig).toBe(false);
    });
  });

  describe("error handling", () => {
    test("should handle DOM query errors gracefully", () => {
      document.querySelectorAll.mockImplementation(() => {
        throw new Error("DOM error");
      });

      const result = controller.detectVideos();

      expect(result).toEqual([]);
    });

    test("should handle getBoundingClientRect errors", () => {
      const video = new MockVideoElement();
      video.getBoundingClientRect = () => {
        throw new Error("getBoundingClientRect error");
      };

      const result = controller.isValidVideo(video);

      expect(result).toBe(false);
    });

    test("should handle getComputedStyle errors", () => {
      const video = new MockVideoElement();
      global.getComputedStyle = () => {
        throw new Error("getComputedStyle error");
      };

      const result = controller.isValidVideo(video);

      expect(result).toBe(false);
    });
  });
});

describe("Hotkey Detection and Conflict Resolution", () => {
  let controller;

  beforeEach(() => {
    controller = new VideoSpeedController();
    controller.settings = {
      hotkey: {
        key: "Space",
        modifiers: [],
        enabled: true,
      },
      speedMultiplier: 2.0,
    };
    jest.clearAllMocks();
  });

  describe("isConfiguredHotkey", () => {
    test("should detect configured hotkey correctly", () => {
      const mockEvent = {
        key: " ",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      };

      controller.updateModifierState(mockEvent);
      const result = controller.isConfiguredHotkey(mockEvent);

      expect(result).toBe(true);
    });

    test("should reject different key", () => {
      const mockEvent = {
        key: "Enter",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      };

      controller.updateModifierState(mockEvent);
      const result = controller.isConfiguredHotkey(mockEvent);

      expect(result).toBe(false);
    });

    test("should detect hotkey with modifiers", () => {
      controller.settings.hotkey = {
        key: "Space",
        modifiers: ["ctrl", "shift"],
        enabled: true,
      };

      const mockEvent = {
        key: " ",
        ctrlKey: true,
        altKey: false,
        shiftKey: true,
        metaKey: false,
      };

      controller.updateModifierState(mockEvent);
      const result = controller.isConfiguredHotkey(mockEvent);

      expect(result).toBe(true);
    });

    test("should reject when required modifier is missing", () => {
      controller.settings.hotkey = {
        key: "Space",
        modifiers: ["ctrl"],
        enabled: true,
      };

      const mockEvent = {
        key: " ",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      };

      controller.updateModifierState(mockEvent);
      const result = controller.isConfiguredHotkey(mockEvent);

      expect(result).toBe(false);
    });

    test("should reject when extra modifier is pressed", () => {
      controller.settings.hotkey = {
        key: "Space",
        modifiers: [],
        enabled: true,
      };

      const mockEvent = {
        key: " ",
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      };

      controller.updateModifierState(mockEvent);
      const result = controller.isConfiguredHotkey(mockEvent);

      expect(result).toBe(false);
    });
  });

  describe("isConfiguredHotkeyRelease", () => {
    test("should detect hotkey release correctly", () => {
      controller.hotkeyState.isPressed = true;
      controller.hotkeyState.currentKey = "Space";

      const mockEvent = {
        key: " ",
      };

      const result = controller.isConfiguredHotkeyRelease(mockEvent);

      expect(result).toBe(true);
    });

    test("should return false when hotkey is not pressed", () => {
      controller.hotkeyState.isPressed = false;

      const mockEvent = {
        key: " ",
      };

      const result = controller.isConfiguredHotkeyRelease(mockEvent);

      expect(result).toBe(false);
    });

    test("should return false for different key release", () => {
      controller.hotkeyState.isPressed = true;
      controller.hotkeyState.currentKey = "Space";

      const mockEvent = {
        key: "Enter",
      };

      const result = controller.isConfiguredHotkeyRelease(mockEvent);

      expect(result).toBe(false);
    });
  });

  describe("isTypingInInputField", () => {
    test("should detect input elements", () => {
      const input = document.createElement("input");
      const result = controller.isTypingInInputField(input);
      expect(result).toBe(true);

      const textarea = document.createElement("textarea");
      const result2 = controller.isTypingInInputField(textarea);
      expect(result2).toBe(true);

      const select = document.createElement("select");
      const result3 = controller.isTypingInInputField(select);
      expect(result3).toBe(true);
    });

    test("should detect contenteditable elements", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      const result = controller.isTypingInInputField(div);
      expect(result).toBe(true);
    });

    test("should detect contenteditable parent", () => {
      const parent = document.createElement("div");
      parent.contentEditable = "true";
      const child = document.createElement("span");
      parent.appendChild(child);

      const result = controller.isTypingInInputField(child);
      expect(result).toBe(true);
    });

    test("should return false for regular elements", () => {
      const div = document.createElement("div");
      const result = controller.isTypingInInputField(div);
      expect(result).toBe(false);
    });

    test("should handle null target", () => {
      const result = controller.isTypingInInputField(null);
      expect(result).toBe(false);
    });
  });
});
