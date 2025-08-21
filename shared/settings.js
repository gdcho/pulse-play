// shared/settings.js
/**
 * Settings management utilities for Video Speed Hotkey extension
 * Provides data model, validation, and Chrome storage API integration
 */

// Default settings configuration
const DEFAULT_SETTINGS = {
  hotkey: {
    key: "Backquote",
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

// Settings validation schema
const VALIDATION_RULES = {
  hotkey: {
    key: {
      type: "string",
      required: true,
      validKeys: [
        "Backquote",
        "Space",
        "Enter",
        "Tab",
        "Escape",
        "Backspace",
        "Delete",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "KeyA",
        "KeyB",
        "KeyC",
        "KeyD",
        "KeyE",
        "KeyF",
        "KeyG",
        "KeyH",
        "KeyI",
        "KeyJ",
        "KeyK",
        "KeyL",
        "KeyM",
        "KeyN",
        "KeyO",
        "KeyP",
        "KeyQ",
        "KeyR",
        "KeyS",
        "KeyT",
        "KeyU",
        "KeyV",
        "KeyW",
        "KeyX",
        "KeyY",
        "KeyZ",
        "Digit0",
        "Digit1",
        "Digit2",
        "Digit3",
        "Digit4",
        "Digit5",
        "Digit6",
        "Digit7",
        "Digit8",
        "Digit9",
      ],
    },
    modifiers: {
      type: "array",
      validModifiers: ["alt", "ctrl", "shift", "meta"],
    },
    enabled: {
      type: "boolean",
      required: true,
    },
  },
  speedMultiplier: {
    type: "number",
    min: 1.25,
    max: 5.0,
    required: true,
  },
  platforms: {
    youtube: { type: "boolean", required: true },
    vimeo: { type: "boolean", required: true },
    netflix: { type: "boolean", required: true },
    generic: { type: "boolean", required: true },
  },
  ui: {
    showIndicator: { type: "boolean", required: true },
    indicatorPosition: {
      type: "string",
      validValues: ["top-left", "top-right", "bottom-left", "bottom-right"],
      required: true,
    },
    indicatorTimeout: {
      type: "number",
      min: 500,
      max: 10000,
      required: true,
    },
  },
};

/**
 * Validates a settings object against the validation rules
 * @param {Object} settings - Settings object to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validateSettings(settings) {
  const errors = [];

  if (!settings || typeof settings !== "object") {
    return { isValid: false, errors: ["Settings must be an object"] };
  }

  // Validate hotkey settings
  if (settings.hotkey) {
    const hotkey = settings.hotkey;

    if (
      hotkey.key &&
      !VALIDATION_RULES.hotkey.key.validKeys.includes(hotkey.key)
    ) {
      errors.push(`Invalid hotkey: ${hotkey.key}`);
    }

    if (hotkey.modifiers && Array.isArray(hotkey.modifiers)) {
      const invalidModifiers = hotkey.modifiers.filter(
        (mod) =>
          !VALIDATION_RULES.hotkey.modifiers.validModifiers.includes(mod),
      );
      if (invalidModifiers.length > 0) {
        errors.push(`Invalid modifiers: ${invalidModifiers.join(", ")}`);
      }
    }

    if (typeof hotkey.enabled !== "boolean") {
      errors.push("Hotkey enabled must be a boolean");
    }
  }

  // Validate speed multiplier
  if (settings.speedMultiplier !== undefined) {
    const speed = settings.speedMultiplier;
    if (typeof speed !== "number" || speed < 1.25 || speed > 5.0) {
      errors.push("Speed multiplier must be a number between 1.25 and 5.0");
    }
  }

  // Validate platforms
  if (settings.platforms) {
    const platforms = settings.platforms;
    ["youtube", "vimeo", "netflix", "generic"].forEach((platform) => {
      if (
        platforms[platform] !== undefined &&
        typeof platforms[platform] !== "boolean"
      ) {
        errors.push(`Platform ${platform} must be a boolean`);
      }
    });
  }

  // Validate UI settings
  if (settings.ui) {
    const ui = settings.ui;

    if (
      ui.showIndicator !== undefined &&
      typeof ui.showIndicator !== "boolean"
    ) {
      errors.push("UI showIndicator must be a boolean");
    }

    if (
      ui.indicatorPosition &&
      !VALIDATION_RULES.ui.indicatorPosition.validValues.includes(
        ui.indicatorPosition,
      )
    ) {
      errors.push(`Invalid indicator position: ${ui.indicatorPosition}`);
    }

    if (ui.indicatorTimeout !== undefined) {
      const timeout = ui.indicatorTimeout;
      if (typeof timeout !== "number" || timeout < 500 || timeout > 10000) {
        errors.push("Indicator timeout must be a number between 500 and 10000");
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Merges user settings with default settings, ensuring all required fields exist
 * @param {Object} userSettings - User-provided settings
 * @returns {Object} - Complete settings object with defaults filled in
 */
function mergeWithDefaults(userSettings) {
  if (!userSettings || typeof userSettings !== "object") {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  // Deep merge user settings
  if (userSettings.hotkey && typeof userSettings.hotkey === "object") {
    Object.assign(merged.hotkey, userSettings.hotkey);
  }

  if (typeof userSettings.speedMultiplier === "number") {
    merged.speedMultiplier = userSettings.speedMultiplier;
  }

  if (userSettings.platforms) {
    Object.assign(merged.platforms, userSettings.platforms);
  }

  if (userSettings.ui) {
    Object.assign(merged.ui, userSettings.ui);
  }

  return merged;
}

/**
 * Loads settings from Chrome storage API
 * @returns {Promise<Object>} - Promise resolving to settings object
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(["videoSpeedHotkeySettings"]);
    const storedSettings = result.videoSpeedHotkeySettings;

    if (!storedSettings) {
      // First time setup - return defaults and save them
      const defaultSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      await saveSettings(defaultSettings);
      return defaultSettings;
    }

    // Validate stored settings
    const validation = validateSettings(storedSettings);
    if (!validation.isValid) {
      console.warn(
        "Invalid settings found, migrating to defaults:",
        validation.errors,
      );
      // For invalid settings, start with defaults and only merge valid parts
      const migratedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

      // Try to preserve valid parts of the stored settings
      if (
        storedSettings.platforms &&
        typeof storedSettings.platforms === "object"
      ) {
        Object.keys(storedSettings.platforms).forEach((platform) => {
          if (
            typeof storedSettings.platforms[platform] === "boolean" &&
            migratedSettings.platforms.hasOwnProperty(platform)
          ) {
            migratedSettings.platforms[platform] =
              storedSettings.platforms[platform];
          }
        });
      }

      if (storedSettings.hotkey && typeof storedSettings.hotkey === "object") {
        if (typeof storedSettings.hotkey.enabled === "boolean") {
          migratedSettings.hotkey.enabled = storedSettings.hotkey.enabled;
        }
        if (
          VALIDATION_RULES.hotkey.key.validKeys.includes(
            storedSettings.hotkey.key,
          )
        ) {
          migratedSettings.hotkey.key = storedSettings.hotkey.key;
        }
        if (Array.isArray(storedSettings.hotkey.modifiers)) {
          const validModifiers = storedSettings.hotkey.modifiers.filter((mod) =>
            VALIDATION_RULES.hotkey.modifiers.validModifiers.includes(mod),
          );
          migratedSettings.hotkey.modifiers = validModifiers;
        }
      }

      if (
        typeof storedSettings.speedMultiplier === "number" &&
        storedSettings.speedMultiplier >= 1.25 &&
        storedSettings.speedMultiplier <= 5.0
      ) {
        migratedSettings.speedMultiplier = storedSettings.speedMultiplier;
      }

      if (storedSettings.ui && typeof storedSettings.ui === "object") {
        if (typeof storedSettings.ui.showIndicator === "boolean") {
          migratedSettings.ui.showIndicator = storedSettings.ui.showIndicator;
        }
        if (
          VALIDATION_RULES.ui.indicatorPosition.validValues.includes(
            storedSettings.ui.indicatorPosition,
          )
        ) {
          migratedSettings.ui.indicatorPosition =
            storedSettings.ui.indicatorPosition;
        }
        if (
          typeof storedSettings.ui.indicatorTimeout === "number" &&
          storedSettings.ui.indicatorTimeout >= 500 &&
          storedSettings.ui.indicatorTimeout <= 10000
        ) {
          migratedSettings.ui.indicatorTimeout =
            storedSettings.ui.indicatorTimeout;
        }
      }

      await saveSettings(migratedSettings);
      return migratedSettings;
    }

    // Merge with defaults to ensure new fields are present
    return mergeWithDefaults(storedSettings);
  } catch (error) {
    console.error("Failed to load settings:", error);
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

/**
 * Saves settings to Chrome storage API
 * @param {Object} settings - Settings object to save
 * @returns {Promise<boolean>} - Promise resolving to success status
 */
async function saveSettings(settings) {
  try {
    // Validate settings before saving
    const validation = validateSettings(settings);
    if (!validation.isValid) {
      console.error("Cannot save invalid settings:", validation.errors);
      return false;
    }

    await chrome.storage.sync.set({
      videoSpeedHotkeySettings: settings,
    });

    return true;
  } catch (error) {
    console.error("Failed to save settings:", error);
    return false;
  }
}

/**
 * Resets settings to default values
 * @returns {Promise<Object>} - Promise resolving to default settings
 */
async function resetToDefaults() {
  const defaultSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  await saveSettings(defaultSettings);
  return defaultSettings;
}

/**
 * Migrates settings from older versions (for future use)
 * @param {Object} oldSettings - Settings from previous version
 * @param {string} fromVersion - Version being migrated from
 * @returns {Object} - Migrated settings object
 */
function migrateSettings(oldSettings, fromVersion) {
  if (!oldSettings || typeof oldSettings !== "object") {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  // Start with defaults
  const migrated = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  // Handle old format where hotkey was just a string
  if (typeof oldSettings.hotkey === "string") {
    if (VALIDATION_RULES.hotkey.key.validKeys.includes(oldSettings.hotkey)) {
      migrated.hotkey.key = oldSettings.hotkey;
    }
  } else if (oldSettings.hotkey && typeof oldSettings.hotkey === "object") {
    // New format - merge normally
    Object.assign(migrated.hotkey, oldSettings.hotkey);
  }

  // Handle old field names
  if (typeof oldSettings.speed === "number") {
    migrated.speedMultiplier = oldSettings.speed;
  } else if (typeof oldSettings.speedMultiplier === "number") {
    migrated.speedMultiplier = oldSettings.speedMultiplier;
  }

  // Merge other valid settings
  if (oldSettings.platforms && typeof oldSettings.platforms === "object") {
    Object.assign(migrated.platforms, oldSettings.platforms);
  }

  if (oldSettings.ui && typeof oldSettings.ui === "object") {
    Object.assign(migrated.ui, oldSettings.ui);
  }

  return migrated;
}

// Export functions for use in other modules
if (typeof module !== "undefined" && module.exports) {
  // Node.js environment (for testing)
  module.exports = {
    DEFAULT_SETTINGS,
    VALIDATION_RULES,
    validateSettings,
    mergeWithDefaults,
    loadSettings,
    saveSettings,
    resetToDefaults,
    migrateSettings,
  };
} else {
  // Browser/Worker environment
  const g =
    typeof self !== "undefined"
      ? self
      : typeof window !== "undefined"
      ? window
      : globalThis;
  g.VideoSpeedHotkeySettings = {
    DEFAULT_SETTINGS,
    VALIDATION_RULES,
    validateSettings,
    mergeWithDefaults,
    loadSettings,
    saveSettings,
    resetToDefaults,
    migrateSettings,
  };
}
