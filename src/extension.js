const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const {
  addSound,
  getConfigDir,
  getConfigPath,
  importSoundFile,
  loadConfig,
  removeSound,
  setActiveSound,
  setEnabled,
  upsertBundledSound
} = require("./shared/config");
const { playSound } = require("./shared/audio");
const { compileMatchers, textContainsError } = require("./shared/detector");

const DEFAULT_ERROR_TEXT_MATCHERS = [
  "error",
  "failed",
  "exception",
  "traceback",
  "command not found",
  "is not recognized"
];
const SUPPORTED_SOUND_EXTENSIONS = new Set([".wav", ".mp3", ".ogg", ".aac", ".m4a"]);

class SoundboardController {
  constructor(context) {
    this.context = context;
    this.lastTriggerAt = 0;
    this.isListening = false;
    this.outputChannel = vscode.window.createOutputChannel("IDE Error Soundboard");
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = "ideErrorSoundboard.toggleMonitoring";
    this.statusBarItem.tooltip = "Toggle IDE Error Soundboard monitoring";

    this.context.subscriptions.push(this.outputChannel, this.statusBarItem);

    this.registerCommands();
    this.runSafe("refresh runtime config", () => this.refreshRuntimeConfig());
    this.runSafe("register bundled sounds", () => this.registerBundledSounds());
    this.updateStatusBar();
    this.statusBarItem.show();
    this.runSafe("reset debug log", () => this.resetDebugLog());
    this.runSafe("setup config watcher", () => this.setupConfigWatcher());
    this.runSafe("register event handlers", () => this.registerEventHandlers());
    this.log("Extension activated.");
  }

  runSafe(label, action) {
    try {
      action();
    } catch (error) {
      this.log(`${label} failed: ${error.message}`);
      vscode.window.showErrorMessage(`IDE Error Soundboard: ${label} failed: ${error.message}`);
    }
  }

  resetDebugLog() {
    try {
      fs.writeFileSync(path.join(getConfigDir(), "debug.log"), "", "utf8");
    } catch (error) {
      // Ignore logging errors.
    }
  }

  registerBundledSounds() {
    const soundsDir = path.join(this.context.extensionPath, "sounds");
    if (!fs.existsSync(soundsDir)) {
      return;
    }

    const fileNames = fs.readdirSync(soundsDir)
      .filter((entry) => SUPPORTED_SOUND_EXTENSIONS.has(path.extname(entry).toLowerCase()));

    for (const fileName of fileNames) {
      const soundName = path.basename(fileName, path.extname(fileName)).toLowerCase();
      upsertBundledSound(soundName, path.join(soundsDir, fileName), soundName);
    }

    if (fileNames.length) {
      this.log(`Registered ${fileNames.length} bundled sound file(s).`);
    }
  }

  registerEventHandlers() {
    this.runSafe("task monitoring", () => {
      const taskProcessApi = vscode.tasks?.onDidEndTaskProcess;
      if (typeof taskProcessApi === "function") {
        this.context.subscriptions.push(
          taskProcessApi((event) => this.onTaskProcessEnded(event))
        );
        this.log("Task process monitoring enabled.");
      }
    });

    this.runSafe("shell execution start monitoring", () => {
      const startShellExecutionApi = vscode.window.onDidStartTerminalShellExecution;
      if (typeof startShellExecutionApi === "function") {
        this.context.subscriptions.push(
          startShellExecutionApi((event) => this.onShellExecutionStarted(event))
        );
        this.log("Shell execution monitoring enabled.");
      }
    });

    this.runSafe("shell execution end monitoring", () => {
      const endShellExecutionApi = vscode.window.onDidEndTerminalShellExecution;
      if (typeof endShellExecutionApi === "function") {
        this.context.subscriptions.push(
          endShellExecutionApi((event) => this.onShellExecutionEnded(event))
        );
        this.log("Shell execution end monitoring enabled.");
      }
    });

    this.runSafe("terminal data monitoring", () => {
      try {
        const writeTerminalDataApi = vscode.window.onDidWriteTerminalData;
        if (typeof writeTerminalDataApi === "function") {
          this.context.subscriptions.push(
            writeTerminalDataApi((event) => this.onTerminalData(event))
          );
          this.log("Terminal data monitoring enabled.");
        }
      } catch (e) {
        this.log(`Terminal data monitoring unavailable: ${e.message}`);
      }
    });

    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("ideErrorSoundboard")) {
          this.log("Settings changed, refreshing config.");
          this.refreshRuntimeConfig();
          this.updateStatusBar();
        }
      })
    );
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    const line = `[${timestamp}] ${message}`;
    this.outputChannel.appendLine(line);

    try {
      fs.appendFileSync(path.join(getConfigDir(), "debug.log"), `${line}\n`, "utf8");
    } catch (error) {
      // Ignore logging errors.
    }
  }

  setupConfigWatcher() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      loadConfig();
    }

    this.log(`Watching config at: ${configPath}`);
    let debounceTimer;
    const watcher = fs.watch(configPath, (eventType) => {
      if (eventType === "change") {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.log("Config file changed on disk, reloading.");
          this.refreshRuntimeConfig();
          this.updateStatusBar();
        }, 100);
      }
    });

    this.context.subscriptions.push({ dispose: () => watcher.close() });
  }

  refreshRuntimeConfig() {
    const settings = vscode.workspace.getConfiguration("ideErrorSoundboard");
    const shared = loadConfig();
    this.preferSharedConfig = settings.get("preferSharedConfig", true);
    this.enabled = this.preferSharedConfig ? shared.enabled : settings.get("enabled", true);
    this.cooldownMs = this.preferSharedConfig ? shared.cooldownMs : settings.get("cooldownMs", 3000);
    this.errorMatchers = compileMatchers(settings.get("errorTextMatchers", DEFAULT_ERROR_TEXT_MATCHERS));
  }

  getCurrentConfig() {
    return loadConfig();
  }

  updateStatusBar() {
    const config = this.getCurrentConfig();
    const activeSound = config.sounds[config.activeSound];
    const label = activeSound ? activeSound.label || config.activeSound : config.activeSound;
    this.statusBarItem.text = this.enabled
      ? (this.isListening ? "$(broadcast) Soundboard: Monitoring" : `$(unmute) Soundboard: ${label}`)
      : "$(mute) Soundboard: Off";
  }

  markListening() {
    this.isListening = true;
    this.updateStatusBar();
    clearTimeout(this.listeningTimer);
    this.listeningTimer = setTimeout(() => {
      this.isListening = false;
      this.updateStatusBar();
    }, 600);
  }

  onShellExecutionStarted(event) {
    if (!this.enabled) {
      return;
    }

    this.markListening();
    const commandLine = event.execution?.commandLine?.value || event.execution?.commandLine || "<unknown>";
    this.log(`Shell execution started in \"${event.terminal.name}\": ${commandLine}`);
  }

  async onShellExecutionEnded(event) {
    if (!this.enabled) {
      return;
    }

    this.markListening();
    const exitCode = event.execution?.exitCode;
    if (typeof exitCode === "number" && exitCode !== 0) {
      this.log(`Shell execution failed in \"${event.terminal.name}\" with exit code ${exitCode}.`);
      await this.triggerSound(`non-zero exit code ${exitCode} in ${event.terminal.name}`);
      return;
    }

    this.log(`Shell execution completed in \"${event.terminal.name}\" with exit code ${exitCode}.`);
  }

  async onTaskProcessEnded(event) {
    if (!this.enabled) {
      return;
    }

    const exitCode = event.exitCode;
    const taskName = event.execution?.task?.name || "<unknown>";
    if (typeof exitCode === "number" && exitCode !== 0) {
      this.log(`Task failed: \"${taskName}\" exited with code ${exitCode}.`);
      await this.triggerSound(`task failure ${taskName} (${exitCode})`);
    }
  }

  async onTerminalData(event) {
    if (!this.enabled || !this.errorMatchers.length || typeof event?.data !== "string") {
      return;
    }

    this.markListening();
    if (!textContainsError(event.data, this.errorMatchers)) {
      return;
    }

    const preview = event.data.replace(/\s+/g, " ").trim().slice(0, 120);
    this.log(`Terminal output matched error text in \"${event.terminal?.name || "<unknown>"}\": ${preview}`);
    await this.triggerSound(`terminal output match in ${event.terminal?.name || "<unknown>"}`);
  }

  async triggerSound(reason) {
    const now = Date.now();
    if (now - this.lastTriggerAt < this.cooldownMs) {
      this.log(`Skipped sound because cooldown is active. Reason: ${reason}`);
      return;
    }

    this.lastTriggerAt = now;
    await this.playActiveSound(reason);
  }

  async playActiveSound(reason = "manual trigger") {
    try {
      const config = this.getCurrentConfig();
      const definition = config.sounds[config.activeSound];
      this.log(`Playing sound \"${config.activeSound}\" because ${reason}.`);
      await playSound(definition);
      this.log(`Playback finished for \"${config.activeSound}\".`);
    } catch (error) {
      this.log(`Playback failed: ${error.message}`);
      vscode.window.showErrorMessage(`IDE Error Soundboard: ${error.message}`);
    }
  }

  registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand("ideErrorSoundboard.selectSound", () => this.selectSound()),
      vscode.commands.registerCommand("ideErrorSoundboard.addSound", () => this.addSound()),
      vscode.commands.registerCommand("ideErrorSoundboard.importSoundFiles", () => this.importSoundFiles()),
      vscode.commands.registerCommand("ideErrorSoundboard.removeSound", () => this.removeSound()),
      vscode.commands.registerCommand("ideErrorSoundboard.testSound", () => this.playActiveSound("manual test")),
      vscode.commands.registerCommand("ideErrorSoundboard.toggleMonitoring", () => this.toggleMonitoring()),
      vscode.commands.registerCommand("ideErrorSoundboard.openSharedConfig", () => this.openSharedConfig()),
      vscode.commands.registerCommand("ideErrorSoundboard.showTerminalHelp", () => this.showTerminalHelp()),
      vscode.commands.registerCommand("ideErrorSoundboard.checkStatus", () => this.checkStatus()),
      vscode.commands.registerCommand("ideErrorSoundboard.importWorkspaceSounds", () => this.importWorkspaceSounds())
    );
  }

  async checkStatus() {
    this.outputChannel.show();
    const config = this.getCurrentConfig();
    const stats = [
      `Enabled: ${this.enabled}`,
      `Active Sound: ${config.activeSound}`,
      `Cooldown: ${this.cooldownMs}ms`,
      `Config Path: ${getConfigPath()}`,
      `Registered Sounds: ${Object.keys(config.sounds).length}`,
      `Task API available: ${typeof vscode.tasks?.onDidEndTaskProcess === "function"}`,
      `Shell execution start API available: ${typeof vscode.window.onDidStartTerminalShellExecution === "function"}`,
      `Shell execution end API available: ${typeof vscode.window.onDidEndTerminalShellExecution === "function"}`,
      `Terminal data API available: ${typeof vscode.window.onDidWriteTerminalData === "function"}`,
      `Error text matchers: ${this.errorMatchers.length}`
    ];
    this.log("--- Status Check ---");
    stats.forEach((line) => this.log(line));
    vscode.window.showInformationMessage("Soundboard status logged to Output channel.");
  }

  async selectSound() {
    const config = this.getCurrentConfig();
    const items = Object.entries(config.sounds).map(([name, definition]) => ({
      label: definition.label || name,
      description: name === config.activeSound ? "Active" : "",
      detail: definition.type === "file" ? definition.path : definition.type,
      name
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select the sound to play when terminal command failures are detected"
    });

    if (!selected) {
      return;
    }

    setActiveSound(selected.name);
    this.updateStatusBar();
  }

  async addSound() {
    const options = [
      {
        label: "Pick audio file(s)",
        detail: "Import .wav/.mp3/.ogg/.aac/.m4a files into the soundboard library",
        action: "pick"
      },
      {
        label: "Manual path entry",
        detail: "Register a sound from a typed file path",
        action: "manual"
      }
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "How do you want to add sounds?"
    });

    if (!selected) {
      return;
    }

    if (selected.action === "pick") {
      await this.importSoundFiles();
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: "Enter a short sound name",
      placeHolder: "build-fail"
    });
    if (!name) {
      return;
    }

    const pathValue = await vscode.window.showInputBox({
      prompt: "Enter a sound file path (.wav is best on Windows, mp3 also supported)",
      placeHolder: "C:\\sounds\\fail.wav"
    });
    if (!pathValue) {
      return;
    }

    const result = importSoundFile(pathValue, name);
    setActiveSound(result.soundName);
    this.log(`Imported sound \"${result.soundName}\" from ${pathValue}.`);
    this.updateStatusBar();
  }

  async importSoundFiles() {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: false,
      canSelectFiles: true,
      filters: {
        Audio: ["wav", "mp3", "ogg", "aac", "m4a"]
      },
      openLabel: "Import sound files"
    });

    if (!uris || !uris.length) {
      return;
    }

    const imported = [];
    for (const uri of uris) {
      const result = importSoundFile(uri.fsPath);
      imported.push(result.soundName);
    }

    setActiveSound(imported[imported.length - 1]);
    this.log(`Imported ${imported.length} sound file(s): ${imported.join(", ")}.`);
    this.updateStatusBar();
    vscode.window.showInformationMessage(`Imported ${imported.length} sound file(s). Active sound: ${imported[imported.length - 1]}.`);
  }

  async importWorkspaceSounds() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("IDE Error Soundboard: open a workspace folder first.");
      return;
    }

    const soundsDir = path.join(workspaceFolder, "sounds");
    if (!fs.existsSync(soundsDir)) {
      vscode.window.showErrorMessage(`IDE Error Soundboard: folder not found: ${soundsDir}`);
      return;
    }

    const files = fs.readdirSync(soundsDir)
      .filter((entry) => SUPPORTED_SOUND_EXTENSIONS.has(path.extname(entry).toLowerCase()));

    if (!files.length) {
      vscode.window.showInformationMessage("IDE Error Soundboard: no supported sound files found in /sounds.");
      return;
    }

    const imported = [];
    for (const fileName of files) {
      const result = importSoundFile(path.join(soundsDir, fileName));
      imported.push(result.soundName);
    }

    this.log(`Imported ${files.length} workspace sound file(s) from ${soundsDir}.`);
    this.updateStatusBar();
    vscode.window.showInformationMessage(`Imported ${files.length} sound file(s) from /sounds.`);
  }

  async removeSound() {
    const config = this.getCurrentConfig();
    const removable = Object.entries(config.sounds)
      .filter(([name]) => name !== "beep")
      .map(([name, definition]) => ({
        label: definition.label || name,
        description: name,
        detail: definition.path || definition.type,
        name
      }));

    if (!removable.length) {
      vscode.window.showInformationMessage("IDE Error Soundboard: no removable sounds found.");
      return;
    }

    const selected = await vscode.window.showQuickPick(removable, {
      placeHolder: "Select a sound to remove"
    });

    if (!selected) {
      return;
    }

    removeSound(selected.name);
    this.log(`Removed sound \"${selected.name}\".`);
    this.updateStatusBar();
  }

  async toggleMonitoring() {
    const config = this.getCurrentConfig();
    const next = !config.enabled;
    setEnabled(next);

    if (!this.preferSharedConfig) {
      await vscode.workspace
        .getConfiguration("ideErrorSoundboard")
        .update("enabled", next, vscode.ConfigurationTarget.Global);
    }

    this.log(`Monitoring ${next ? "enabled" : "disabled"}.`);
    this.refreshRuntimeConfig();
    this.updateStatusBar();
  }

  async openSharedConfig() {
    const document = await vscode.workspace.openTextDocument(getConfigPath());
    await vscode.window.showTextDocument(document);
  }

  async showTerminalHelp() {
    const terminal = vscode.window.createTerminal("Soundboard Help");
    const cliPath = path.join(this.context.extensionPath, "bin", "soundboard.js");
    const lines = [
      "IDE Error Soundboard terminal commands:",
      `node \"${cliPath}\" status`,
      `node \"${cliPath}\" list`,
      `node \"${cliPath}\" import-folder`,
      `node \"${cliPath}\" add build-fail \"C:\\\\sounds\\\\fail.wav\"`,
      `node \"${cliPath}\" select build-fail`,
      `node \"${cliPath}\" enable`,
      `node \"${cliPath}\" disable`,
      `node \"${cliPath}\" play`
    ];

    terminal.show();
    lines.forEach((line) => terminal.sendText(line, true));
  }
}

function activate(context) {
  try {
    new SoundboardController(context);
  } catch (error) {
    const message = `IDE Error Soundboard activation failed: ${error.message}`;
    try {
      const fallbackDir = getConfigDir();
      fs.mkdirSync(fallbackDir, { recursive: true });
      fs.appendFileSync(path.join(fallbackDir, "activation-error.log"), `${new Date().toISOString()} ${message}\n${error.stack || ""}\n`, "utf8");
    } catch (writeError) {
      // Ignore logging failures.
    }
    vscode.window.showErrorMessage(message);
    throw error;
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
