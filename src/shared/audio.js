const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function normalizeFilePath(filePath) {
  return path.resolve(filePath);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

function runPowerShell(script) {
  return runCommand("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script
  ]);
}

async function playBeep() {
  if (process.platform === "win32") {
    await runPowerShell("[console]::beep(900,250)");
    return;
  }

  if (process.platform === "darwin") {
    await runCommand("afplay", ["/System/Library/Sounds/Glass.aiff"]);
    return;
  }

  try {
    await runCommand("paplay", ["/usr/share/sounds/freedesktop/stereo/bell.oga"]);
  } catch (error) {
    process.stdout.write("\u0007");
  }
}

function buildWindowsPlayerScript(absolutePath) {
  const escapedPath = absolutePath.replace(/'/g, "''");
  const extension = path.extname(absolutePath).toLowerCase();

  if (extension === ".wav") {
    return [
      `$path = '${escapedPath}'`,
      "Add-Type -AssemblyName System",
      "$player = New-Object System.Media.SoundPlayer $path",
      "$player.PlaySync()"
    ].join("; ");
  }

  return [
    `$path = '${escapedPath}'`,
    "Add-Type -AssemblyName PresentationCore",
    "$player = New-Object System.Windows.Media.MediaPlayer",
    "$player.Open([System.Uri]::new($path))",
    "$player.Volume = 1.0",
    "$player.Play()",
    "$limit = [DateTime]::UtcNow.AddSeconds(3)",
    "while (-not $player.NaturalDuration.HasTimeSpan -and [DateTime]::UtcNow -lt $limit) { Start-Sleep -Milliseconds 100 }",
    "$ms = if ($player.NaturalDuration.HasTimeSpan) { [int]$player.NaturalDuration.TimeSpan.TotalMilliseconds } else { 3000 }",
    "Start-Sleep -Milliseconds ([Math]::Min(10000, $ms + 500))",
    "$player.Stop()",
    "$player.Close()"
  ].join("; ");
}

async function playFile(filePath) {
  const absolutePath = normalizeFilePath(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Sound file not found: ${absolutePath}`);
  }

  if (process.platform === "win32") {
    await runPowerShell(buildWindowsPlayerScript(absolutePath));
    return;
  }

  if (process.platform === "darwin") {
    await runCommand("afplay", [absolutePath]);
    return;
  }

  const linuxPlayers = [
    ["paplay", [absolutePath]],
    ["aplay", [absolutePath]],
    ["ffplay", ["-nodisp", "-autoexit", absolutePath]]
  ];

  let lastError;
  for (const [command, args] of linuxPlayers) {
    try {
      await runCommand(command, args);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No compatible audio player found.");
}

async function playSound(definition) {
  if (!definition || definition.type === "beep") {
    await playBeep();
    return;
  }

  if (definition.type === "file") {
    await playFile(definition.path);
    return;
  }

  throw new Error(`Unsupported sound type: ${definition.type}`);
}

module.exports = {
  normalizeFilePath,
  playSound
};
