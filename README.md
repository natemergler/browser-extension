# RabbitTrail Browser Extension

A Chrome browser extension for the RabbitTrail annotation system, adapted from the Hypothesis browser extension.

## Quick Start

### Prerequisites

- Node.js (version 20+)
- pnpm (version 9+)
- Chrome/Chromium browser
- RabbitTrail backend running locally on `http://localhost:3002`

### Development Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start the RabbitTrail backend:**

   ```bash
   cd ../../rabbit
   pnpm dev
   ```

   The browser extension assumes the API is available at `http://localhost:3002`.

3. **Build the extension:**

   ```bash
   pnpm build
   ```

4. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/` directory

5. **Iterate in watch mode (optional):**

   ```bash
   pnpm dev
   ```

   This starts a Node-based watcher that rebuilds when `src/`, `settings/`, or the bundled Hypothesis client change. Set `EXTENSION_SETTINGS` to point at an alternate settings JSON if needed.

6. **Backend Configuration:**
   The extension is pre-configured for development with `http://localhost:3002`. No additional configuration needed if your RabbitTrail backend is running on the default port.

## Backend Requirements

Your RabbitTrail backend must implement these endpoints:

### Badge API (Required)

```
GET /api/badge?uri={encoded_url}
Response: {"total": number}
```

This endpoint is used to display annotation counts in the browser badge.

### Welcome Page (Optional)

```
GET /welcome
```

Landing page for new users.

### Authentication

Authentication is handled by the bundled Hypothesis client. Ensure your backend is compatible with the Hypothesis authentication flow.

## Configuration

### Development Settings

- **File:** `settings/chrome-dev.json`
- **Service URL:** `http://localhost:3002` (pre-configured)

### Production Settings

- **File:** `settings/chrome-prod.json`
- **Service URL:** Update to your production backend URL
- **Note:** OAuth client IDs and Sentry DSNs are placeholders—replace them before distributing builds.

### Staging Settings

- **File:** `settings/chrome-staging.json`
- **Service URL:** Update to your staging backend URL
- **Note:** OAuth client IDs and Sentry DSNs are placeholders—replace them before use.

## Build Commands

```bash
pnpm build          # Build the extension once
pnpm dev            # Watch source files and rebuild on change
pnpm lint           # Run eslint
pnpm typecheck      # Run TypeScript project references
pnpm test           # Bundle legacy unit tests and execute them in Vitest/Playwright
pnpm clean          # Remove build artifacts
```

## Extension Features

- **Annotation Badge:** Shows annotation count for current page
- **Sidebar Injection:** Loads annotation interface on compatible pages
- **PDF Support:** Handles PDF annotation via embedded viewer
- **Direct Links:** Support for `#annotations:ID` URL fragments
- **Tab State Management:** Tracks annotation state per browser tab

## Removed Features

The following Hypothesis features have been removed for RabbitTrail:

- VitalSource integration
- LMS (Learning Management System) integration
- Third-party publisher integrations

## Development Notes

- Extension uses Rollup for bundling with Mustache templates
- Hypothesis client is pre-bundled from npm package
- TypeScript source in `src/`, builds to `build/`
- `pnpm test` bundles the legacy suite with Rollup and runs it via Vitest (uses headless Chromium)

## File Structure

```
src/
├── background/          # Background scripts
│   ├── extension.ts     # Main extension orchestrator
│   ├── sidebar-injector.ts # Client injection logic
│   ├── tab-state.ts     # Tab state management
│   ├── uri-info.ts      # Badge API communication
│   └── errors.ts        # Error handling
├── content/             # Content scripts
├── options/             # Extension options page
└── popup/               # Extension popup UI

settings/                # Configuration files
├── chrome-dev.json      # Development config
├── chrome-prod.json     # Production config
└── chrome-staging.json  # Staging config

build/                   # Built extension (created by pnpm build)
```

## Troubleshooting

### Badge not showing annotation counts

- Ensure RabbitTrail backend is running on `localhost:3002`
- Check that `/api/badge` endpoint is implemented
- Verify CORS headers allow extension origin

### Extension not loading on pages

- Check that pages are not on restricted protocols (`chrome://`, `file://`)
- Verify extension has necessary permissions
- Check browser console for error messages

### Client not authenticating

- Ensure backend authentication endpoints match Hypothesis client expectations
- Check that CORS is properly configured for authentication flows

For more detailed information, see `DEVELOPMENT.md`.
