const fs = require("fs");
const os = require("os");
const path = require("path");

const CONFIG_FOLDER_NAME = ".ide-error-soundboard";
const SUPPORTED_SOUND_EXTENSIONS = new Set([".wav", ".mp3", ".ogg", ".aac", ".m4a"]);

const DEFAULT_CONFIG = {
  version: 1,
  enabled: true,
  activeSound: "beep",
  cooldownMs: 3000,
  sounds: {
    beep: {
      type: "beep",
      label: "System Beep"
    }
  }
};

function candidateConfigDirs() {
  const candidates = [];

  if (process.env.IDE_ERROR_SOUNDBOARD_CONFIG_DIR) {
    candidates.push(process.env.IDE_ERROR_SOUNDBOARD_CONFIG_DIR);
  }

  candidates.push(path.join(os.homedir(), CONFIG_FOLDER_NAME));
  candidates.push(path.join(process.cwd(), CONFIG_FOLDER_NAME));

  return [...new Set(candidates)];
}

function resolveConfigDir() {
  for (const candidate of candidateConfigDirs()) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch (error) {
      continue;
    }
  }

  throw new Error("Unable to create a writable config directory for IDE Error Soundboard.");
}

function getConfigDir() {
  return resolveConfigDir();
}

function getConfigPath() {
  return path.join(getConfigDir(), "config.json");
}

function getUserSoundsDir() {
  const soundsDir = path.join(getConfigDir(), "sounds");
  fs.mkdirSync(soundsDir, { recursive: true });
  return soundsDir;
}

function sanitizeSoundName(name) {
  const trimmed = String(name || "").trim().toLowerCase();
  const normalized = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "sound";
}

function ensureSupportedSoundExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_SOUND_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported sound file type: ${extension || "<none>"}`);
  }
}

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function normalizeConfig(config) {
  const base = cloneDefaultConfig();
  const merged = {
    ...base,
    ...(config || {}),
    sounds: {
      ...base.sounds,
      ...((config && config.sounds) || {})
    }
  };

  if (!merged.sounds[merged.activeSound]) {
    merged.activeSound = "beep";
  }

  if (typeof merged.enabled !== "boolean") {
    merged.enabled = true;
  }

  if (!Number.isFinite(merged.cooldownMs) || merged.cooldownMs < 250) {
    merged.cooldownMs = base.cooldownMs;
  }

  return merged;
}

function loadConfig() {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    const initial = cloneDefaultConfig();
    saveConfig(initial);
    return initial;
  }

  // Retry loading a few times if parse fails (might be partially written by another process)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const text = fs.readFileSync(configPath, "utf8");
      if (!text || !text.trim()) {
        throw new Error("Empty config file");
      }
      return normalizeConfig(JSON.parse(text));
    } catch (error) {
      if (attempt === 5) {
        // Only reset if it's consistently failing (real corruption)
        const repaired = cloneDefaultConfig();
        saveConfig(repaired);
        return repaired;
      }
      // Busy wait short duration for retry
      const start = Date.now();
      while (Date.now() - start < attempt * 20) {}
    }
  }
}

function saveConfig(config) {
  const configPath = getConfigPath();
  const normalized = normalizeConfig(config);
  const content = `${JSON.stringify(normalized, null, 2)}\n`;

  // Atomic write via temp file + rename to prevent race conditions with readers
  const tempPath = `${configPath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, content, "utf8");
    fs.renameSync(tempPath, configPath);
  } catch (error) {
    // Fallback if atomic rename fails for some reason
    fs.writeFileSync(configPath, content, "utf8");
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
  }

  return normalized;
}

function addSound(name, definition) {
  const config = loadConfig();
  config.sounds[name] = definition;
  return saveConfig(config);
}

function importSoundFile(sourcePath, preferredName) {
  const absoluteSourcePath = path.resolve(sourcePath);
  if (!fs.existsSync(absoluteSourcePath)) {
    throw new Error(`Sound file not found: ${absoluteSourcePath}`);
  }

  ensureSupportedSoundExtension(absoluteSourcePath);

  const extension = path.extname(absoluteSourcePath).toLowerCase();
  const baseName = sanitizeSoundName(preferredName || path.basename(absoluteSourcePath, extension));
  const targetDir = getUserSoundsDir();
  let soundName = baseName;
  let targetPath = path.join(targetDir, `${soundName}${extension}`);
  let suffix = 2;

  while (fs.existsSync(targetPath)) {
    const sourceRealPath = fs.realpathSync(absoluteSourcePath);
    const targetRealPath = fs.realpathSync(targetPath);
    if (sourceRealPath === targetRealPath) {
      break;
    }

    soundName = `${baseName}-${suffix}`;
    targetPath = path.join(targetDir, `${soundName}${extension}`);
    suffix += 1;
  }

  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(absoluteSourcePath, targetPath);
  }

  addSound(soundName, {
    type: "file",
    label: soundName,
    path: targetPath
  });

  return { soundName, targetPath };
}

function upsertBundledSound(name, filePath, label) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  ensureSupportedSoundExtension(absolutePath);
  const config = loadConfig();
  config.sounds[name] = {
    type: "file",
    label: label || name,
    path: absolutePath
  };
  saveConfig(config);
  return config.sounds[name];
}

function removeSound(name) {
  const config = loadConfig();
  if (name === "beep") {
    throw new Error("The built-in beep sound cannot be removed.");
  }
  delete config.sounds[name];
  if (config.activeSound === name) {
    config.activeSound = "beep";
  }
  return saveConfig(config);
}

function setActiveSound(name) {
  const config = loadConfig();
  if (!config.sounds[name]) {
    throw new Error(`Unknown sound: ${name}`);
  }
  config.activeSound = name;
  return saveConfig(config);
}

function setEnabled(enabled) {
  const config = loadConfig();
  config.enabled = Boolean(enabled);
  return saveConfig(config);
}

function setCooldown(cooldownMs) {
  const config = loadConfig();
  config.cooldownMs = cooldownMs;
  return saveConfig(config);
}

module.exports = {
  getConfigDir,
  getConfigPath,
  getUserSoundsDir,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  addSound,
  importSoundFile,
  removeSound,
  setActiveSound,
  setEnabled,
  setCooldown,
  upsertBundledSound
};
