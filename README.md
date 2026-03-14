# IDE Error Soundboard

IDE Error Soundboard is a VS Code compatible extension for terminal-driven workflows. It listens for command failures in the integrated terminal and plays a configurable sound so errors are immediately noticeable.

This project is designed for editors that expose terminal shell execution events. In Antigravity, the full "typed terminal error text" experience currently depends on the proposed `terminalDataWriteEvent` API, so Antigravity must be launched with the appropriate proposed API flag for this extension.

## Contents

- [Overview](#overview)
- [Features](#features)
- [How Detection Works](#how-detection-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Antigravity Setup](#antigravity-setup)
- [Commands](#commands)
- [Configuration](#configuration)
- [Terminal CLI](#terminal-cli)
- [Bundled Sounds](#bundled-sounds)
- [Adding Your Own Sounds](#adding-your-own-sounds)
- [Project Structure](#project-structure)
- [Packaging](#packaging)
- [Publishing Notes](#publishing-notes)
- [Troubleshooting](#troubleshooting)
- [Development Notes](#development-notes)
- [License](#license)

## Overview

The extension provides a soundboard for terminal failures. It supports:

- sound playback when terminal commands fail
- configurable active sound selection
- bundled meme and reaction sounds
- import of user-provided sound files
- status bar monitoring controls
- shared JSON configuration used by both the extension and the CLI

The extension is intentionally simple to operate from inside the IDE, while still exposing a terminal CLI for automation.

## Features

- Monitors terminal command failures in the integrated terminal.
- Plays the selected sound when an error is detected.
- Supports `.wav`, `.mp3`, `.ogg`, `.aac`, and `.m4a` files.
- Automatically registers bundled sounds shipped with the extension.
- Lets users import custom sound files using a file picker.
- Lets users add sounds by manual file path.
- Shares one configuration file between the IDE UI and CLI.
- Provides a status bar toggle and diagnostics output.
- Includes a CLI for listing, importing, selecting, and testing sounds.

## How Detection Works

The extension currently uses multiple detection paths:

1. Task process failures via task end events.
2. Terminal shell execution start and end events.
3. Terminal output text matching for error-like output.

Default error text matchers are:

- `error`
- `failed`
- `exception`
- `traceback`
- `command not found`
- `is not recognized`

### Important Antigravity Note

In Antigravity, direct terminal output inspection uses the proposed `terminalDataWriteEvent` API. That means full typo-style detection such as `giit`, `npmm`, or similar terminal mistakes requires launching Antigravity with:

```powershell
antigravity --enable-proposed-api parip.ide-error-soundboard
```

Without that flag, the extension may still load, but arbitrary terminal text detection may be incomplete depending on what the host provides.

## Requirements

- Node.js for CLI usage and packaging tasks
- A VS Code compatible editor
- For Antigravity full terminal text detection:
  - the updated `.vsix`
  - Antigravity launched with `--enable-proposed-api parip.ide-error-soundboard`

## Installation

### Install From VSIX

Install the packaged extension file:

```text
ide-error-soundboard-0.1.0.vsix
```

You can install it from your editor's Extensions view using "Install from VSIX".

### Install For Antigravity

1. Close all Antigravity windows.
2. Install the `.vsix`.
3. Launch Antigravity from a terminal with:

```powershell
antigravity --enable-proposed-api parip.ide-error-soundboard
```

If `antigravity` is not available in `PATH`, launch the executable directly:

```powershell
& "C:\Path\To\Antigravity.exe" --enable-proposed-api parip.ide-error-soundboard
```

## Antigravity Setup

This extension uses the proposed `terminalDataWriteEvent` API for the best error-text detection behavior in Antigravity.

If you launch Antigravity normally without the proposed API flag:

- the extension may still activate
- status and configuration commands may still work
- terminal typo detection may not behave as expected

Recommended startup:

```powershell
antigravity --enable-proposed-api parip.ide-error-soundboard
```

If you want this behavior every time, add the same argument to your Antigravity shortcut target.

## Commands

All IDE commands are available from the Command Palette.

### Extension Commands

- `IDE Error Soundboard: Select Active Sound`
- `IDE Error Soundboard: Add Sound`
- `IDE Error Soundboard: Import Sound Files`
- `IDE Error Soundboard: Remove Sound`
- `IDE Error Soundboard: Test Active Sound`
- `IDE Error Soundboard: Toggle Monitoring`
- `IDE Error Soundboard: Open Shared Config`
- `IDE Error Soundboard: Show Terminal Commands`
- `IDE Error Soundboard: Check Diagnostic Status`
- `IDE Error Soundboard: Import Workspace Sounds`

### What Each Command Does

`Select Active Sound`
: Opens a quick pick for choosing the sound that will play on failure.

`Add Sound`
: Lets the user either pick audio files from disk or manually enter a sound path.

`Import Sound Files`
: Opens a file picker and copies supported audio files into the extension's managed user sound library.

`Remove Sound`
: Removes a previously registered custom or bundled sound from the current config.

`Test Active Sound`
: Plays the currently selected sound immediately.

`Toggle Monitoring`
: Turns error monitoring on or off.

`Open Shared Config`
: Opens the shared JSON configuration file.

`Show Terminal Commands`
: Opens a terminal with example CLI commands.

`Check Diagnostic Status`
: Writes diagnostic details to the extension output channel.

`Import Workspace Sounds`
: Imports sound files from a `sounds` folder in the current workspace.

## Configuration

The extension contributes the following settings:

### `ideErrorSoundboard.enabled`

- Type: `boolean`
- Default: `true`

Enable or disable terminal monitoring.

### `ideErrorSoundboard.cooldownMs`

- Type: `number`
- Default: `3000`
- Minimum: `250`

The minimum gap between sound triggers.

### `ideErrorSoundboard.preferSharedConfig`

- Type: `boolean`
- Default: `true`

When enabled, the extension uses the shared JSON config so IDE and CLI actions stay in sync.

### `ideErrorSoundboard.errorTextMatchers`

- Type: `string[]`
- Default:

```json
[
  "error",
  "failed",
  "exception",
  "traceback",
  "command not found",
  "is not recognized"
]
```

Fallback terminal text patterns that can trigger sound playback.

## Terminal CLI

The project also includes a CLI entry point at `bin/soundboard.js`.

### CLI Commands

```powershell
node .\bin\soundboard.js status
node .\bin\soundboard.js list
node .\bin\soundboard.js config-path
node .\bin\soundboard.js import-folder
node .\bin\soundboard.js add build-fail "C:\sounds\fail.wav"
node .\bin\soundboard.js remove build-fail
node .\bin\soundboard.js select yeet
node .\bin\soundboard.js play
node .\bin\soundboard.js play yeet
node .\bin\soundboard.js enable
node .\bin\soundboard.js disable
node .\bin\soundboard.js cooldown 1500
```

### CLI Behavior

- `status` prints the current config summary
- `list` prints all registered sounds
- `config-path` prints the shared config file path
- `import-folder` imports supported sound files from a folder
- `add` registers a sound by name and path
- `remove` removes a sound
- `select` changes the active sound
- `play` plays the active sound or a named sound
- `enable` and `disable` change monitoring state
- `cooldown` changes the cooldown in milliseconds

## Bundled Sounds

The following sounds are currently present in the repository and packaged into the extension:

### English / General Meme Sounds

- `ack`
- `among-us-role`
- `anime-wow`
- `apple-pay`
- `bone-crack`
- `bruh`
- `charlie-kirk-loud`
- `charlie-kirk-phone`
- `chicken-screaming`
- `dexter-meme`
- `diddy-blud`
- `emotional-damage`
- `faaah`
- `faaahhh`
- `fahhh`
- `fahhh-alt`
- `fahhhhhhh`
- `fart`
- `fart-button`
- `fbi`
- `granny-bazooka`
- `hub-intro`
- `ive-got-this-faaaaaah`
- `lizard-button`
- `metal-pipe-clang`
- `movie-bruh`
- `phone-ringing`
- `rizz-effect`
- `romance`
- `smoke-detector-beep`
- `spongebob-fail`
- `tuco-get-out`
- `undertaker-bell`
- `vine-boom`
- `what-a-good-boy`
- `yeet`

### Indian Meme Sounds

- `aayein-meme`
- `ai-baigan`
- `america-kya-kehta-tha`
- `are-kehna-kya-chahte-ho`
- `awaz-nichy`
- `chalti-firti-cocaine`
- `golmaal-hai-bhai`
- `he-prabhu`
- `paisa-hi-paisa`
- `rahul-gandhi-aloo-sona`
- `so-beautiful`
- `uthale-re-deva`
- `wah-sab-ji-wah`
- `wo-bulati-hai-magar`
- `ye-baburao-ka-style-hai`

### Sound Quality Note

Two files in the current repository are unusually small and may be placeholders or damaged:

- `sounds/emotional-damage.mp3`
- `sounds/fahhh.mp3`

If either file fails during playback, replace it with a valid audio file and repackage the extension.

## Adding Your Own Sounds

Users can add their own audio files in several ways.

### From the IDE

Use:

- `IDE Error Soundboard: Import Sound Files`
- or `IDE Error Soundboard: Add Sound`

Imported files are copied into the managed user sound library located under:

```text
C:\Users\<your-user>\.ide-error-soundboard\sounds
```

The imported sound is then registered in the shared config and can be selected as the active sound.

### From a Workspace Folder

If your current workspace contains a `sounds` folder, run:

- `IDE Error Soundboard: Import Workspace Sounds`

### From the CLI

Examples:

```powershell
node .\bin\soundboard.js add custom-error "C:\sounds\custom-error.wav"
node .\bin\soundboard.js select custom-error
node .\bin\soundboard.js play custom-error
```

## Project Structure

```text
bin/
  soundboard.js           CLI entry point
scripts/
  check-syntax.js         Lightweight syntax verification
  download_sounds.js      Helper for downloading additional sound files
sounds/                   Bundled audio files shipped in the VSIX
src/
  extension.js            Extension entry point and runtime controller
  shared/
    audio.js              Cross-platform audio playback
    config.js             Shared config, managed sound library, import helpers
    detector.js           Terminal text matcher helpers
README.md
COLLABORATION.md
package.json
```

## Packaging

### Verify Syntax

```powershell
node .\scripts\check-syntax.js
```

### Build VSIX

```powershell
npx @vscode/vsce package
```

### Build Open VSX Package

```powershell
npm run package:ovsx
```

## Publishing Notes

This project currently uses the proposed `terminalDataWriteEvent` API for full Antigravity terminal text detection.

That means:

- it is suitable for local `.vsix` distribution and controlled installs
- it is not a normal "publish once and works everywhere" Marketplace extension as-is
- stable/public distribution may require a second build variant without proposed APIs

If you plan to publish publicly, consider maintaining:

1. a full-feature Antigravity build
2. a stable Marketplace-safe build with reduced detection behavior

## Troubleshooting

### The extension loads but no sound plays

Check:

- monitoring is enabled
- the active sound is valid
- the sound file exists
- audio works normally on the system
- Antigravity was launched with the proposed API flag

Run:

- `IDE Error Soundboard: Test Active Sound`
- `IDE Error Soundboard: Check Diagnostic Status`

### The status bar does not appear

Check that the extension is installed and active. If needed, restart the editor and reinstall the `.vsix`.

### Antigravity says the extension cannot use `terminalDataWriteEvent`

Launch Antigravity with:

```powershell
antigravity --enable-proposed-api parip.ide-error-soundboard
```

### Where are logs written?

The extension writes files under:

```text
C:\Users\<your-user>\.ide-error-soundboard
```

Common files:

- `config.json`
- `debug.log`
- `activation-error.log`

### Where is the shared config?

From the IDE:

- `IDE Error Soundboard: Open Shared Config`

From CLI:

```powershell
node .\bin\soundboard.js config-path
```

## Development Notes

- The extension is implemented in CommonJS JavaScript.
- Config is intentionally shared between the IDE and CLI.
- Bundled sounds are auto-registered at activation time.
- User-imported sounds are copied into a managed config-local sound library.
- Playback on Windows uses PowerShell-backed audio playback.

The helper script `scripts/download_sounds.js` currently references external audio sources used to populate the local sound pack. Review audio ownership and distribution rights before distributing those files publicly.

## License

This project is licensed under the terms of the [MIT License](./LICENSE).
