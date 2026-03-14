# Collaboration Guide

This document defines collaboration rules for contributors working on IDE Error Soundboard.

## Goals

- Keep the extension simple to install and operate.
- Preserve reliable failure detection behavior.
- Avoid breaking the shared CLI and config workflow.
- Document user-facing changes clearly.

## Core Rules

### 1. Keep IDE and CLI behavior aligned

If a sound, config field, or workflow is added in the extension UI, consider whether the CLI should support it as well.

### 2. Preserve shared config compatibility

The config file under `.ide-error-soundboard/config.json` is shared between the extension and CLI. Do not introduce breaking schema changes casually.

### 3. Prefer explicit logging

If detection behavior changes, update logging in a way that makes runtime diagnosis easier through the Output channel and `debug.log`.

### 4. Be careful with activation

A startup exception can make the entire extension appear missing. Keep activation resilient and isolate risky startup work behind safe error handling.

### 5. Treat sound assets as distributable content

Before bundling new audio files, verify:

- the file actually plays
- the filename is stable and descriptive
- the file is small enough to package reasonably
- distribution rights are acceptable for the intended release path

### 6. Do not silently remove user data

User-imported sounds are stored in the managed config folder. Avoid destructive cleanup logic unless it is explicitly requested and well documented.

### 7. Keep commands discoverable

Whenever new extension behavior is added, consider whether it should be exposed through:

- a Command Palette command
- the shared CLI
- README documentation

### 8. Update docs with behavior changes

If commands, sounds, setup requirements, or packaging expectations change, update `README.md` in the same change set.

## Code Style

- Prefer small, direct CommonJS modules.
- Use ASCII unless there is a clear reason not to.
- Keep comments short and high signal.
- Avoid unnecessary abstractions for simple file, config, or command flows.

## Sound Asset Rules

- Supported formats: `.wav`, `.mp3`, `.ogg`, `.aac`, `.m4a`
- Use lowercase, hyphenated names for bundled sounds where possible.
- Replace placeholder or corrupt files instead of documenting around them forever.
- Do not assume third-party downloaded meme clips are safe to redistribute without review.

## Release Rules

Before packaging:

1. Run syntax verification.
2. Confirm the sound list is accurate.
3. Confirm all commands in `package.json` are implemented.
4. Rebuild the `.vsix`.
5. Test activation in the target host, especially Antigravity.

## Antigravity-Specific Rules

- Full terminal text detection currently relies on the proposed `terminalDataWriteEvent` API.
- Any release notes or documentation must state the required Antigravity startup flag if the build depends on proposed APIs.
- If a stable non-proposed build is introduced later, document the difference clearly.

## Documentation Expectations

Every release should make it easy for a new user to answer:

- What does this extension do?
- How do I install it?
- How do I start Antigravity correctly?
- How do I add my own sounds?
- Which commands are available?
- Where are logs and config stored?

## Suggested Contributor Workflow

1. Read `README.md`.
2. Inspect `package.json` for commands and settings.
3. Validate runtime behavior in `src/extension.js`.
4. Run:

```powershell
node .\scripts\check-syntax.js
```

5. Package with:

```powershell
npx @vscode/vsce package
```

6. Test the packaged extension, not just the source tree.
