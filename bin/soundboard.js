#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  addSound,
  getConfigPath,
  loadConfig,
  removeSound,
  setActiveSound,
  setCooldown,
  setEnabled
} = require("../src/shared/config");
const { playSound } = require("../src/shared/audio");

function printUsage() {
  console.log(`IDE Error Soundboard CLI

Usage:
  soundboard status
  soundboard list
  soundboard config-path
  soundboard import-folder [folder]
  soundboard add <name> <file-path>
  soundboard remove <name>
  soundboard select <name>
  soundboard play [name]
  soundboard enable
  soundboard disable
  soundboard cooldown <ms>
`);
}

function getNamedSound(name) {
  const config = loadConfig();
  const sound = config.sounds[name];
  if (!sound) {
    throw new Error(`Unknown sound: ${name}`);
  }
  return { config, sound };
}

function importFolder(folderPath) {
  const targetDir = path.resolve(folderPath || path.join(process.cwd(), "sounds"));
  const supported = new Set([".wav", ".mp3", ".ogg", ".aac", ".m4a"]);
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Folder not found: ${targetDir}`);
  }

  const files = fs.readdirSync(targetDir)
    .filter((entry) => supported.has(path.extname(entry).toLowerCase()));

  if (!files.length) {
    throw new Error(`No supported sound files found in ${targetDir}`);
  }

  for (const fileName of files) {
    const soundName = path.basename(fileName, path.extname(fileName));
    addSound(soundName, {
      type: "file",
      label: soundName,
      path: path.join(targetDir, fileName)
    });
  }

  return { targetDir, count: files.length };
}

async function main() {
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case "status": {
        const config = loadConfig();
        console.log(JSON.stringify({
          configPath: getConfigPath(),
          enabled: config.enabled,
          activeSound: config.activeSound,
          cooldownMs: config.cooldownMs,
          sounds: Object.keys(config.sounds)
        }, null, 2));
        return;
      }
      case "list": {
        const config = loadConfig();
        for (const [name, definition] of Object.entries(config.sounds)) {
          const marker = config.activeSound === name ? "*" : " ";
          const detail = definition.type === "file" ? definition.path : definition.type;
          console.log(`${marker} ${name} -> ${detail}`);
        }
        return;
      }
      case "config-path": {
        console.log(getConfigPath());
        return;
      }
      case "import-folder": {
        const [folderPath] = args;
        const result = importFolder(folderPath);
        console.log(`Imported ${result.count} sound(s) from ${result.targetDir}.`);
        return;
      }
      case "add": {
        const [name, filePath] = args;
        if (!name || !filePath) {
          throw new Error("Usage: soundboard add <name> <file-path>");
        }
        addSound(name, {
          type: "file",
          label: name,
          path: filePath
        });
        setActiveSound(name);
        console.log(`Added and selected sound '${name}'.`);
        return;
      }
      case "remove": {
        const [name] = args;
        if (!name) {
          throw new Error("Usage: soundboard remove <name>");
        }
        removeSound(name);
        console.log(`Removed sound '${name}'.`);
        return;
      }
      case "select": {
        const [name] = args;
        if (!name) {
          throw new Error("Usage: soundboard select <name>");
        }
        setActiveSound(name);
        console.log(`Selected sound '${name}'.`);
        return;
      }
      case "play": {
        const [name] = args;
        const targetName = name || loadConfig().activeSound;
        const target = getNamedSound(targetName).sound;
        await playSound(target);
        console.log(`Played '${targetName}'.`);
        return;
      }
      case "enable": {
        setEnabled(true);
        console.log("Monitoring enabled.");
        return;
      }
      case "disable": {
        setEnabled(false);
        console.log("Monitoring disabled.");
        return;
      }
      case "cooldown": {
        const [value] = args;
        const cooldownMs = Number(value);
        if (!Number.isFinite(cooldownMs)) {
          throw new Error("Usage: soundboard cooldown <ms>");
        }
        setCooldown(cooldownMs);
        console.log(`Cooldown set to ${cooldownMs}ms.`);
        return;
      }
      default:
        printUsage();
    }
  } catch (error) {
    console.error(`IDE Error Soundboard CLI: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
