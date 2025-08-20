/**
 * Unit tests for settings management utilities
 */

// Mock Chrome storage API for testing
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// Import settings module
const {
  DEFAULT_SETTINGS,
  VALIDATION_RULES,
  validateSettings,
  mergeWithDefaults,
  loadSettings,
  saveSettings,
  resetToDefaults,
  migrateSettings,
} = require("../shared/settings.js");

describe("Settings Validation", () => {
  test("should validate correct default settings", () => {
    const result = validateSettings(DEFAULT_SETTINGS);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should reject invalid hotkey", () => {
    const invalidSettings = {
      ...DEFAULT_SETTINGS,
      hotkey: { ...DEFAULT_SETTINGS.hotkey, key: "InvalidKey" },
    };
    const result = validateSettings(invalidSettings);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Invalid hotkey: InvalidKey");
  });

  test("should reject invalid speed multiplier", () => {
    const invalidSettings = {
      ...DEFAULT_SETTINGS,
      speedMultiplier: 10.0, // Too high
    };
    const result = validateSettings(invalidSettings);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Speed multiplier must be a number between 1.25 and 5.0",
    );
  });

  test("should reject invalid modifiers", () => {
    const invalidSettings = {
      ...DEFAULT_SETTINGS,
      hotkey: { ...DEFAULT_SETTINGS.hotkey, modifiers: ["InvalidModifier"] },
    };
    const result = validateSettings(invalidSettings);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Invalid modifiers: InvalidModifier");
  });

  test("should reject invalid indicator position", () => {
    const invalidSettings = {
      ...DEFAULT_SETTINGS,
      ui: { ...DEFAULT_SETTINGS.ui, indicatorPosition: "invalid-position" },
    };
    const result = validateSettings(invalidSettings);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Invalid indicator position: invalid-position",
    );
  });

  test("should reject invalid indicator timeout", () => {
    const invalidSettings = {
      ...DEFAULT_SETTINGS,
      ui: { ...DEFAULT_SETTINGS.ui, indicatorTimeout: 100 }, // Too low
    };
    const result = validateSettings(invalidSettings);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Indicator timeout must be a number between 500 and 10000",
    );
  });
});

describe("Settings Merging", () => {
  test("should return defaults for null input", () => {
    const result = mergeWithDefaults(null);
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  test("should merge partial settings with defaults", () => {
    const partialSettings = {
      speedMultiplier: 3.0,
      platforms: { youtube: false },
    };
    const result = mergeWithDefaults(partialSettings);

    expect(result.speedMultiplier).toBe(3.0);
    expect(result.platforms.youtube).toBe(false);
    expect(result.platforms.vimeo).toBe(true); // Should keep default
    expect(result.hotkey).toEqual(DEFAULT_SETTINGS.hotkey); // Should keep default
  });

  test("should preserve all user settings when complete", () => {
    const customSettings = {
      hotkey: { key: "KeyS", modifiers: ["Ctrl"], enabled: true },
      speedMultiplier: 2.5,
      platforms: { youtube: false, vimeo: true, netflix: false, generic: true },
      ui: {
        showIndicator: false,
        indicatorPosition: "bottom-left",
        indicatorTimeout: 3000,
      },
    };
    const result = mergeWithDefaults(customSettings);
    expect(result).toEqual(customSettings);
  });
});

describe("Settings Storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should load default settings on first run", async () => {
    chrome.storage.sync.get.mockResolvedValue({});
    chrome.storage.sync.set.mockResolvedValue();

    const result = await loadSettings();

    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      videoSpeedHotkeySettings: DEFAULT_SETTINGS,
    });
  });

  test("should load and validate stored settings", async () => {
    const storedSettings = {
      ...DEFAULT_SETTINGS,
      speedMultiplier: 2.5,
    };
    chrome.storage.sync.get.mockResolvedValue({
      videoSpeedHotkeySettings: storedSettings,
    });

    const result = await loadSettings();

    expect(result.speedMultiplier).toBe(2.5);
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test("should migrate invalid stored settings", async () => {
    const invalidSettings = {
      speedMultiplier: 10.0, // Invalid
      platforms: { youtube: true },
    };
    chrome.storage.sync.get.mockResolvedValue({
      videoSpeedHotkeySettings: invalidSettings,
    });
    chrome.storage.sync.set.mockResolvedValue();

    const result = await loadSettings();

    expect(result.speedMultiplier).toBe(DEFAULT_SETTINGS.speedMultiplier);
    expect(result.platforms.youtube).toBe(true);
    expect(result.platforms.vimeo).toBe(DEFAULT_SETTINGS.platforms.vimeo);
    expect(chrome.storage.sync.set).toHaveBeenCalled();
  });

  test("should save valid settings", async () => {
    chrome.storage.sync.set.mockResolvedValue();

    const customSettings = {
      ...DEFAULT_SETTINGS,
      speedMultiplier: 3.0,
    };

    const result = await saveSettings(customSettings);

    expect(result).toBe(true);
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      videoSpeedHotkeySettings: customSettings,
    });
  });

  test("should reject saving invalid settings", async () => {
    const invalidSettings = {
      ...DEFAULT_SETTINGS,
      speedMultiplier: 10.0, // Invalid
    };

    const result = await saveSettings(invalidSettings);

    expect(result).toBe(false);
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test("should handle storage errors gracefully", async () => {
    chrome.storage.sync.get.mockRejectedValue(new Error("Storage error"));

    const result = await loadSettings();

    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  test("should reset to defaults", async () => {
    chrome.storage.sync.set.mockResolvedValue();

    const result = await resetToDefaults();

    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      videoSpeedHotkeySettings: DEFAULT_SETTINGS,
    });
  });
});

describe("Settings Migration", () => {
  test("should migrate old settings format", () => {
    const oldSettings = {
      hotkey: "Space", // Old format - just string
      speed: 2.0, // Old field name
    };

    const result = migrateSettings(oldSettings, "0.9.0");

    // Should merge with defaults and preserve what it can
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  test("should handle null old settings", () => {
    const result = migrateSettings(null, "0.9.0");
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});
