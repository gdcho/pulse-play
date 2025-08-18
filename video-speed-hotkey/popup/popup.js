// Popup JavaScript for Video Speed Hotkey extension
// Handles settings interface interactions

console.log("Video Speed Hotkey: Popup script loaded");

// DOM elements
let elements = {};

// Current settings
let currentSettings = null;

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", initializePopup);

function initializePopup() {
  console.log("Video Speed Hotkey: Initializing popup");

  // Get DOM element references
  elements = {
    hotkeyInput: document.getElementById("hotkey-input"),
    clearHotkey: document.getElementById("clear-hotkey"),
    hotkeyEnabled: document.getElementById("hotkey-enabled"),
    speedMultiplier: document.getElementById("speed-multiplier"),
    speedValue: document.getElementById("speed-value"),
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

  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  // Display the key combination
  let displayText = modifiers.join(" + ");
  if (displayText && key) displayText += " + ";
  displayText += key.replace("Key", "").replace("Digit", "");

  elements.hotkeyInput.value = displayText;

  // Store the raw key data for later use
  elements.hotkeyInput.dataset.key = key;
  elements.hotkeyInput.dataset.modifiers = JSON.stringify(modifiers);

  console.log("Video Speed Hotkey: Captured hotkey:", { key, modifiers });
}

function clearHotkey() {
  elements.hotkeyInput.value = "";
  elements.hotkeyInput.dataset.key = "";
  elements.hotkeyInput.dataset.modifiers = "[]";
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

  // Display hotkey
  let hotkeyDisplay = currentSettings.hotkey.modifiers.join(" + ");
  if (hotkeyDisplay && currentSettings.hotkey.key) hotkeyDisplay += " + ";
  hotkeyDisplay += currentSettings.hotkey.key
    .replace("Key", "")
    .replace("Digit", "");
  elements.hotkeyInput.value = hotkeyDisplay;
  elements.hotkeyInput.dataset.key = currentSettings.hotkey.key;
  elements.hotkeyInput.dataset.modifiers = JSON.stringify(
    currentSettings.hotkey.modifiers,
  );

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

function resetToDefaults() {
  if (confirm("Reset all settings to defaults? This cannot be undone.")) {
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
    console.log("Video Speed Hotkey: Settings reset to defaults");
  }
}

function saveSettings() {
  if (!currentSettings) return;

  // Collect settings from form
  const newSettings = {
    hotkey: {
      key: elements.hotkeyInput.dataset.key || "Space",
      modifiers: JSON.parse(elements.hotkeyInput.dataset.modifiers || "[]"),
      enabled: elements.hotkeyEnabled.checked,
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

        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.style.background = "";
        }, 1500);
      } else {
        console.error("Video Speed Hotkey: Failed to save settings");
        alert("Failed to save settings. Please try again.");
      }
    },
  );
}
