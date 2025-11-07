# Building the extension

This document describes how to build the RabbitTrail browser extension and load it into Chrome or Edge.

## Prerequisites

- [Node.js 20+](https://nodejs.org/en/download/)
- [pnpm 9+](https://pnpm.io/installation)

## Install dependencies

From the `browser-extension/` directory run:

```bash
pnpm install
```

This installs the bundled Hypothesis client and all build tooling without requiring a native compiler toolchain.

## Build the extension

The build is configured by JSON settings in `settings/`. By default we target `settings/chrome-dev.json`, which points to a Rabbit backend on `http://localhost:3002`.

```powershell
pnpm build
```

To use an alternate settings file, either pass the `--settings` flag or set the `EXTENSION_SETTINGS` environment variable before running the build:

```powershell
pnpm build -- --settings settings/chrome-prod.json

$env:EXTENSION_SETTINGS = "settings/custom-dev.json"

```

Both forms produce a `build/` folder that can be loaded unpacked in Chromium-based browsers. PDF.js assets are copied automatically.

## Development watch mode

Use the pnpm dev script to rebuild whenever sources or settings change:

```powershell
pnpm dev
```

The watcher performs an initial build and then monitors `src/`, `settings/`, and the bundled Hypothesis client for updates. Press `Ctrl+C` to stop the watcher.

## Loading the extension in Chrome or Edge

1. Run `pnpm build` and note the `build/` output directory.
2. Navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the `build/` folder.

If you are replacing an existing production build, unload the published extension first or use a separate browser profile.
You won't know the extension ID yet, and that's OK.
