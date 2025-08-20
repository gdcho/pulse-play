// popup/popup.js
// Popup JavaScript for Video Speed Hotkey extension
// Handles settings interface interactions

console.log("Video Speed Hotkey: Popup script loaded");

// DOM elements
let elements = {};

// Current settings
let currentSettings = null;

// Reserved browser shortcuts to avoid conflicts
const RESERVED_SHORTCUTS = [
  "F1",
  "F5",
  "F11",
  "F12",
  "Tab",
  "Enter",
  "Escape",
  "KeyT",
  "KeyN",
  "KeyW",
  "KeyR",
  "KeyL",
  "KeyD",
  "KeyF",
  "KeyI",
  "KeyJ",
  "KeyU",
  "KeyH",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
];

const RESERVED_WITH_CTRL = [
  "KeyT",
  "KeyN",
  "KeyW",
  "KeyR",
  "KeyL",
  "KeyD",
  "KeyF",
  "KeyI",
  "KeyJ",
  "KeyU",
  "KeyH",
];
const RESERVED_WITH_ALT = ["KeyF", "KeyD", "KeyE", "KeyV", "KeyH", "KeyT"];

// Speed preview timeout
let speedPreviewTimeout = null;

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", initializePopup);

function initializePopup() {
  console.log("Video Speed Hotkey: Initializing popup");

  // Get DOM element references
  elements = {
    hotkeyInput: document.getElementById("hotkey-input"),
    hotkeyStatus: document.getElementById("hotkey-status"),
    hotkeyConflictWarning: document.getElementById("hotkey-conflict-warning"),
    clearHotkey: document.getElementById("clear-hotkey"),
    hotkeyEnabled: document.getElementById("hotkey-enabled"),
    speedMultiplier: document.getElementById("speed-multiplier"),
    speedValue: document.getElementById("speed-value"),
    speedPreview: document.getElementById("speed-preview"),
    previewSpeed: document.getElementById("preview-speed"),
    previewIndicator: document.getElementById("preview-indicator"),
    platformYoutube: document.getElementById("platform-youtube"),
    platformVimeo: document.getElementById("platform-vimeo"),
    platformNetflix: document.getElementById("platform-netflix"),
    platformGeneric: document.getElementById("platform-generic"),
    showIndicator: document.getElementById("show-indicator"),
    indicatorPosition: document.getElementById("indicator-position"),
    resetDefaults: document.getElementById("reset-defaults"),
    saveSettings: document.getElementById("save-settings"),
  };

  // Set up event listeners
  setupEventListeners();

  // Load current settings
  loadSettings();
}

function setupEventListeners() {
  // Hotkey input
  elements.hotkeyInput.addEventListener("keydown", handleHotkeyInput);
  elements.clearHotkey.addEventListener("click", clearHotkey);

  // Speed multiplier slider
  elements.speedMultiplier.addEventListener("input", updateSpeedValue);
  elements.speedMultiplier.addEventListener("input", showSpeedPreview);
  elements.speedMultiplier.addEventListener("mouseenter", showSpeedPreview);
  elements.speedMultiplier.addEventListener("mouseleave", hideSpeedPreview);

  // Buttons
  elements.resetDefaults.addEventListener("click", resetToDefaults);
  elements.saveSettings.addEventListener("click", saveSettings);

  console.log("Video Speed Hotkey: Event listeners set up");
}

function handleHotkeyInput(event) {
  event.preventDefault();

  // Capture the key press
  const key = event.code;
  const modifiers = [];

  if (event.ctrlKey) modifiers.push("ctrl");
  if (event.altKey) modifiers.push("alt");
  if (event.shiftKey) modifiers.push("shift");
  if (event.metaKey) modifiers.push("meta"); // For Mac Command key

  // Display the key combination (capitalize for display)
  const displayModifiers = modifiers.map(
    (mod) => mod.charAt(0).toUpperCase() + mod.slice(1),
  );
  let displayText = displayModifiers.join(" + ");
  if (displayText && key) displayText += " + ";
  displayText += key.replace("Key", "").replace("Digit", "");

  elements.hotkeyInput.value = displayText;

  // Store the raw key data for later use
  elements.hotkeyInput.dataset.key = key;
  elements.hotkeyInput.dataset.modifiers = JSON.stringify(modifiers);

  // Validate hotkey and show visual feedback
  validateHotkey(key, modifiers);

  console.log("Video Speed Hotkey: Captured hotkey:", { key, modifiers });
}

function clearHotkey() {
  elements.hotkeyInput.value = "";
  elements.hotkeyInput.dataset.key = "";
  elements.hotkeyInput.dataset.modifiers = "[]";

  // Clear validation status
  elements.hotkeyStatus.className = "hotkey-status";
  elements.hotkeyConflictWarning.style.display = "none";
}

function validateHotkey(key, modifiers) {
  let isValid = true;
  let hasConflict = false;

  // Check for reserved shortcuts
  if (RESERVED_SHORTCUTS.includes(key)) {
    isValid = false;
    hasConflict = true;
  }

  // Check for Ctrl+key conflicts
  if (modifiers.includes("ctrl") && RESERVED_WITH_CTRL.includes(key)) {
    hasConflict = true;
  }

  // Check for Alt+key conflicts
  if (modifiers.includes("alt") && RESERVED_WITH_ALT.includes(key)) {
    hasConflict = true;
  }

  // Update visual feedback
  elements.hotkeyStatus.className = `hotkey-status ${
    isValid ? "valid" : "invalid"
  }`;
  elements.hotkeyConflictWarning.style.display = hasConflict ? "block" : "none";

  return isValid;
}

function showSpeedPreview() {
  const speed = parseFloat(elements.speedMultiplier.value);

  // Update preview text
  elements.previewSpeed.textContent = speed.toFixed(1) + "x";

  // Update preview bar (map 1.25-5x to 0-100%)
  const percentage = ((speed - 1.25) / (5 - 1.25)) * 100;
  elements.previewIndicator.style.width = percentage + "%";

  // Show preview
  elements.speedPreview.style.display = "block";

  // Clear existing timeout
  if (speedPreviewTimeout) {
    clearTimeout(speedPreviewTimeout);
  }
}

function hideSpeedPreview() {
  // Hide preview after a delay
  speedPreviewTimeout = setTimeout(() => {
    elements.speedPreview.style.display = "none";
  }, 1000);
}

function updateSpeedValue() {
  const value = parseFloat(elements.speedMultiplier.value);
  elements.speedValue.textContent = value.toFixed(1) + "x";
}

function loadSettings() {
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
    if (response && response.success) {
      currentSettings = response.settings;
      renderSettings();
      console.log("Video Speed Hotkey: Settings loaded in popup");
    } else {
      console.error("Video Speed Hotkey: Failed to load settings");
    }
  });
}

function renderSettings() {
  if (!currentSettings) return;

  // Hotkey settings
  elements.hotkeyEnabled.checked = currentSettings.hotkey.enabled;

  // Display hotkey (capitalize modifiers for display)
  const displayModifiers = currentSettings.hotkey.modifiers.map(
    (mod) => mod.charAt(0).toUpperCase() + mod.slice(1),
  );
  let hotkeyDisplay = displayModifiers.join(" + ");
  if (hotkeyDisplay && currentSettings.hotkey.key) hotkeyDisplay += " + ";
  hotkeyDisplay += currentSettings.hotkey.key
    .replace("Key", "")
    .replace("Digit", "");
  elements.hotkeyInput.value = hotkeyDisplay;
  elements.hotkeyInput.dataset.key = currentSettings.hotkey.key;
  elements.hotkeyInput.dataset.modifiers = JSON.stringify(
    currentSettings.hotkey.modifiers,
  );

  // Validate current hotkey
  if (currentSettings.hotkey.key) {
    validateHotkey(
      currentSettings.hotkey.key,
      currentSettings.hotkey.modifiers,
    );
  }

  // Speed multiplier
  elements.speedMultiplier.value = currentSettings.speedMultiplier;
  updateSpeedValue();

  // Platform settings
  elements.platformYoutube.checked = currentSettings.platforms.youtube;
  elements.platformVimeo.checked = currentSettings.platforms.vimeo;
  elements.platformNetflix.checked = currentSettings.platforms.netflix;
  elements.platformGeneric.checked = currentSettings.platforms.generic;

  // UI settings
  elements.showIndicator.checked = currentSettings.ui.showIndicator;
  elements.indicatorPosition.value = currentSettings.ui.indicatorPosition;

  console.log("Video Speed Hotkey: Settings rendered in popup");
}

function updateSetting(key, value) {
  if (!currentSettings) return;

  // Update the setting using dot notation
  const keys = key.split(".");
  let target = currentSettings;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }

  target[keys[keys.length - 1]] = value;

  console.log(`Video Speed Hotkey: Updated setting ${key} to`, value);
}

function resetToDefaults() {
  // Create custom confirmation dialog
  const confirmed = confirm(
    "Reset all settings to defaults?\n\n" +
      "This will:\n" +
      "• Set hotkey to Spacebar\n" +
      "• Set speed multiplier to 2.0x\n" +
      "• Enable all platforms\n" +
      "• Reset UI preferences\n\n" +
      "This action cannot be undone.",
  );

  if (confirmed) {
    // Default settings (matching background script)
    currentSettings = {
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

    renderSettings();

    // Show visual feedback
    const resetButton = elements.resetDefaults;
    const originalText = resetButton.textContent;
    resetButton.textContent = "Reset Complete!";
    resetButton.style.background = "#34a853";
    resetButton.style.color = "white";

    setTimeout(() => {
      resetButton.textContent = originalText;
      resetButton.style.background = "";
      resetButton.style.color = "";
    }, 2000);

    console.log("Video Speed Hotkey: Settings reset to defaults");
  }
}

function saveSettings() {
  if (!currentSettings) return;

  // Validate hotkey before saving
  const hotkeyKey = elements.hotkeyInput.dataset.key || "Space";
  const hotkeyModifiers = JSON.parse(
    elements.hotkeyInput.dataset.modifiers || "[]",
  );

  if (!validateHotkey(hotkeyKey, hotkeyModifiers)) {
    alert(
      "Please choose a different hotkey. The current selection may conflict with browser shortcuts.",
    );
    return;
  }

  // Validate speed multiplier
  const speedMultiplier = parseFloat(elements.speedMultiplier.value);
  if (speedMultiplier < 1.25 || speedMultiplier > 5) {
    alert("Speed multiplier must be between 1.25x and 5.0x");
    return;
  }

  // Collect settings from form
  const newSettings = {
    hotkey: {
      key: hotkeyKey,
      modifiers: hotkeyModifiers,
      enabled: elements.hotkeyEnabled.checked,
    },
    speedMultiplier: speedMultiplier,
    platforms: {
      youtube: elements.platformYoutube.checked,
      vimeo: elements.platformVimeo.checked,
      netflix: elements.platformNetflix.checked,
      generic: elements.platformGeneric.checked,
    },
    ui: {
      showIndicator: elements.showIndicator.checked,
      indicatorPosition: elements.indicatorPosition.value,
      indicatorTimeout: currentSettings.ui.indicatorTimeout, // Keep existing timeout
    },
  };

  // Validate that at least one platform is enabled
  const platformsEnabled = Object.values(newSettings.platforms).some(
    (enabled) => enabled,
  );
  if (!platformsEnabled) {
    alert("Please enable at least one platform for the extension to work.");
    return;
  }

  // Save to background script
  chrome.runtime.sendMessage(
    {
      type: "UPDATE_SETTINGS",
      settings: newSettings,
    },
    (response) => {
      if (response && response.success) {
        currentSettings = newSettings;
        console.log("Video Speed Hotkey: Settings saved successfully");

        // Visual feedback
        const saveButton = elements.saveSettings;
        const originalText = saveButton.textContent;
        saveButton.textContent = "Saved!";
        saveButton.style.background = "#34a853";
        saveButton.style.color = "white";

        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.style.background = "";
          saveButton.style.color = "";
        }, 1500);
      } else {
        console.error("Video Speed Hotkey: Failed to save settings");
        alert("Failed to save settings. Please try again.");
      }
    },
  );
}
