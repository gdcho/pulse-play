// popup/popup.js
// Popup JavaScript for Video Speed Hotkey extension
// Handles settings interface interactions

console.log("Video Speed Hotkey: Popup script loaded");

// DOM elements
let elements = {};

// Current settings
let currentSettings = null;

// Reserved browser shortcuts - commented out since hotkey is fixed
/*
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
*/

// Speed preview timeout
let speedPreviewTimeout = null;

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", initializePopup);

function initializePopup() {
  console.log("Video Speed Hotkey: Initializing popup");

  // Get DOM element references
  elements = {
    // Hotkey elements commented out since hotkey is fixed
    // hotkeyInput: document.getElementById("hotkey-input"),
    // hotkeyPreset: document.getElementById("hotkey-preset"),
    // hotkeyStatus: document.getElementById("hotkey-status"),
    // hotkeyConflictWarning: document.getElementById("hotkey-conflict-warning"),
    // clearHotkey: document.getElementById("clear-hotkey"),
    // hotkeyEnabled: document.getElementById("hotkey-enabled"),
    // modifierCtrl: document.getElementById("modifier-ctrl"),
    // modifierAlt: document.getElementById("modifier-alt"),
    // modifierShift: document.getElementById("modifier-shift"),
    // modifierMeta: document.getElementById("modifier-meta"),
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
  };

  // Set up event listeners
  setupEventListeners();

  // Load current settings
  loadSettings();
}

function setupEventListeners() {
  // Hotkey input - commented out since hotkey is fixed
  // elements.hotkeyInput.addEventListener("keydown", handleHotkeyInput);
  // elements.clearHotkey.addEventListener("click", clearHotkey);

  // Hotkey preset - commented out since hotkey is fixed
  // elements.hotkeyPreset.addEventListener("change", handleHotkeyPreset);

  // Modifier keys - commented out since hotkey is fixed
  // elements.modifierCtrl.addEventListener("change", updateModifierDisplay);
  // elements.modifierAlt.addEventListener("change", updateModifierDisplay);
  // elements.modifierShift.addEventListener("change", updateModifierDisplay);
  // elements.modifierMeta.addEventListener("change", updateModifierDisplay);

  // Speed multiplier slider
  elements.speedMultiplier.addEventListener("input", updateSpeedValue);
  elements.speedMultiplier.addEventListener("input", showSpeedPreview);
  elements.speedMultiplier.addEventListener("input", autoSaveSettings);
  elements.speedMultiplier.addEventListener("mouseenter", showSpeedPreview);
  elements.speedMultiplier.addEventListener("mouseleave", hideSpeedPreview);

  // Platform checkboxes - auto-save
  elements.platformYoutube.addEventListener("change", autoSaveSettings);
  elements.platformVimeo.addEventListener("change", autoSaveSettings);
  elements.platformNetflix.addEventListener("change", autoSaveSettings);
  elements.platformGeneric.addEventListener("change", autoSaveSettings);

  // Visual indicator settings - auto-save
  elements.showIndicator.addEventListener("change", autoSaveSettings);
  elements.indicatorPosition.addEventListener("change", autoSaveSettings);

  console.log("Video Speed Hotkey: Event listeners set up");
}

// Hotkey input handling - commented out since hotkey is fixed
/*
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
*/

// Clear hotkey function - commented out since hotkey is fixed
/*
function clearHotkey() {
  elements.hotkeyInput.value = "";
  elements.hotkeyInput.dataset.key = "";
  elements.hotkeyInput.dataset.modifiers = "[]";

  // Clear preset selection
  elements.hotkeyPreset.value = "";

  // Clear modifier checkboxes
  elements.modifierCtrl.checked = false;
  elements.modifierAlt.checked = false;
  elements.modifierShift.checked = false;
  elements.modifierMeta.checked = false;

  // Clear validation status
  elements.hotkeyStatus.className = "hotkey-status";
  elements.hotkeyConflictWarning.style.display = "none";
}
*/

// Hotkey preset handling - commented out since hotkey is fixed
/*
function handleHotkeyPreset() {
  const selectedKey = elements.hotkeyPreset.value;
  if (selectedKey) {
    // Update the hotkey input
    elements.hotkeyInput.dataset.key = selectedKey;
    elements.hotkeyInput.value = selectedKey;

    // Validate the new hotkey
    const modifiers = getSelectedModifiers();
    validateHotkey(selectedKey, modifiers);

    console.log("Video Speed Hotkey: Preset selected:", selectedKey);
  }
}
*/

// Get selected modifiers - commented out since hotkey is fixed
/*
function getSelectedModifiers() {
  const modifiers = [];
  if (elements.modifierCtrl.checked) modifiers.push("ctrl");
  if (elements.modifierAlt.checked) modifiers.push("alt");
  if (elements.modifierShift.checked) modifiers.push("shift");
  if (elements.modifierMeta.checked) modifiers.push("meta");
  return modifiers;
}
*/

// Update modifier display - commented out since hotkey is fixed
/*
function updateModifierDisplay() {
  const modifiers = getSelectedModifiers();
  const key = elements.hotkeyInput.dataset.key || elements.hotkeyPreset.value;

  if (key) {
    // Update display
    const displayModifiers = modifiers.map(
      (mod) => mod.charAt(0).toUpperCase() + mod.slice(1),
    );
    let displayText = displayModifiers.join(" + ");
    if (displayText && key) displayText += " + ";
    displayText += key.replace("Digit", "");
    elements.hotkeyInput.value = displayText;

    // Validate
    validateHotkey(key, modifiers);
  }
}
*/

// Validate hotkey function - commented out since hotkey is fixed
/*
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
*/

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

function autoSaveSettings() {
  if (!currentSettings) return;

  // Collect current settings from form
  const newSettings = {
    hotkey: {
      key: "Backquote",
      modifiers: [],
      enabled: true,
    },
    speedMultiplier: parseFloat(elements.speedMultiplier.value),
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

  console.log("Video Speed Hotkey: Auto-saving settings:", newSettings);
  console.log(
    "Video Speed Hotkey: Speed multiplier from slider:",
    elements.speedMultiplier.value,
  );
  console.log(
    "Video Speed Hotkey: Parsed speed multiplier:",
    newSettings.speedMultiplier,
  );

  // Validate that at least one platform is enabled
  const platformsEnabled = Object.values(newSettings.platforms).some(
    (enabled) => enabled,
  );
  if (!platformsEnabled) {
    // Re-enable generic if all platforms are disabled
    newSettings.platforms.generic = true;
    elements.platformGeneric.checked = true;
  }

  // Update current settings
  currentSettings = newSettings;

  // Save to background script
  chrome.runtime.sendMessage(
    {
      type: "UPDATE_SETTINGS",
      settings: newSettings,
    },
    (response) => {
      if (response && response.success) {
        console.log("Video Speed Hotkey: Settings auto-saved successfully");
      } else {
        console.error("Video Speed Hotkey: Failed to auto-save settings");
      }
    },
  );
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

  console.log("Video Speed Hotkey: Rendering settings:", currentSettings);

  // Hotkey is fixed to backquote - no need to render hotkey UI elements
  // The hotkey display is handled by the HTML template

  // Speed multiplier
  elements.speedMultiplier.value = currentSettings.speedMultiplier;
  console.log(
    "Video Speed Hotkey: Set speed multiplier slider to:",
    currentSettings.speedMultiplier,
  );
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
