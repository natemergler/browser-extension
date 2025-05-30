# RabbitTrail Browser Extension

A Chrome browser extension for the RabbitTrail annotation system, adapted from the Hypothesis browser extension.

## Quick Start

### Prerequisites
- Node.js (version 14+)
- Chrome/Chromium browser
- RabbitTrail backend running locally on `http://localhost:5000`

### Development Setup

1. **Install dependencies:**
   ```bash
   make deps
   ```

2. **Build the extension:**
   ```bash
   make dev
   ```

3. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" 
   - Select the `build/` directory

4. **Backend Configuration:**
   The extension is pre-configured for development with `localhost:5000`. No additional configuration needed if your RabbitTrail backend is running on the default port.

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
- **Service URL:** `http://localhost:5000` (pre-configured)

### Production Settings
- **File:** `settings/chrome-prod.json` 
- **Service URL:** Update to your production backend URL

### Staging Settings  
- **File:** `settings/chrome-staging.json`
- **Service URL:** Update to your staging backend URL

## Build Commands

```bash
make help           # Show available commands
make deps           # Install dependencies  
make dev            # Build for development
make watch          # Build and watch for changes
make lint           # Run linter
make test           # Run tests
make clean          # Clean build artifacts
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
- Tests use Mocha and can be run with `make test`

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

build/                   # Built extension (created by make)
```

## Troubleshooting

### Badge not showing annotation counts
- Ensure RabbitTrail backend is running on `localhost:5000`
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
