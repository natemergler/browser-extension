# Development Documentation

## Extension Architecture

### Core Components

1. **Extension Class** (`src/background/extension.ts`)
   - Main orchestrator that coordinates all extension functionality
   - Manages tab state, badge counts, and user interactions

2. **Sidebar Injector** (`src/background/sidebar-injector.ts`)
   - Handles injection of the Hypothesis client into web pages
   - Manages PDF viewer integration
   - VitalSource/LMS integration code has been removed

3. **Tab State Management** (`src/background/tab-state.ts`)
   - Tracks annotation state per browser tab
   - Updates badge counts when annotations change
   - Handles tab navigation and closure

4. **URI Info & Badge API** (`src/background/uri-info.ts`)
   - Communicates with backend `/api/badge` endpoint
   - Normalizes URLs for badge requests
   - Handles API errors gracefully

### Direct Link Support
The extension supports these URL fragments for deep linking:
- `#annotations:ID` - Navigate to specific annotation
- `#annotations:query:QUERY` - Navigate to annotation search results  
- `#annotations:group:ID` - Navigate to group annotations

### URL Normalization
Badge requests automatically:
- Remove URL fragments
- Block badge requests for certain domains (chrome://, extension pages, etc.)
- Encode URLs properly for API requests

## Client Integration

### Bundled Hypothesis Client
- The extension includes a pre-built Hypothesis client from the `hypothesis` npm package
- Client files are copied from `node_modules/hypothesis/build/` to `build/client/` during build
- Client handles authentication, annotation CRUD, and UI rendering
- No additional client configuration needed for basic functionality

### Custom Client Configuration
You can pass custom configuration to the client during injection:

```typescript
// Example from sidebar-injector.ts
const config = {
  apiUrl: 'http://localhost:5000/api/',
  serviceUrl: 'http://localhost:5000',
  // Additional client options...
};
await injector.injectIntoTab(tab, config);
```

## API Requirements

### Badge API (Critical)
```http
GET /api/badge?uri={encoded_url}
Response: {"total": number}
```

The badge API is the most critical endpoint. It's called frequently to update annotation counts in the browser badge.

**URL Processing:**
- URLs are normalized (fragments removed, encoded)
- Certain domains are blocked (chrome://, moz-extension://, etc.)
- The `uri` parameter is URL-encoded

**Response Format:**
```json
{"total": 42}
```

### Authentication APIs (Inferred)
The bundled client likely expects these endpoints:

```http
POST /api/token          # Get auth token
GET /api/profile         # Get user profile  
POST /api/logout         # Logout
```

### Annotation CRUD (Inferred)
```http
GET /api/search              # Search annotations
POST /api/annotations        # Create annotation  
GET /api/annotations/:id     # Get annotation
PUT /api/annotations/:id     # Update annotation
DELETE /api/annotations/:id  # Delete annotation
```

### Group APIs (Inferred)
```http
GET /api/groups             # Get user groups
GET /api/groups/:id         # Get group details
```

**Note**: These endpoints are inferred from typical Hypothesis client behavior. Monitor network requests or examine the bundled client code to determine exact requirements.

## Error Handling

The extension includes sophisticated error handling (`src/background/errors.ts`) with:

### Error Types
- `AlreadyInjectedError` - Client already active on page
- `BlockedSiteError` - Site blocks annotation
- `LocalFileError` - Local file access issues  
- `NoFileAccessError` - File access permission denied
- `RestrictedProtocolError` - Unsupported URL protocol

### Hypothesis-Specific Patterns
The error handling includes patterns that may need adjustment for RabbitTrail:
- URL pattern matching for error categorization  
- User-friendly error messages
- Automatic retry logic for transient failures

## Build System

### Rollup Configuration
- Uses Rollup for bundling TypeScript to JavaScript
- Mustache templates for HTML generation
- Copies static assets and client files to build directory

### Template System
- Mustache templates in `src/templates/`
- Variables injected during build from settings files
- Allows environment-specific configuration

### Client Bundling Process
1. `make deps` installs hypothesis npm package
2. `make dev` copies client files from `node_modules/hypothesis/build/` to `build/client/`
3. Extension loads client from local build directory

## Configuration Files

### Development (`settings/chrome-dev.json`)
```json
{
  "apiUrl": "http://localhost:5000/api/",
  "authDomain": "localhost:5000",
  "enableExperimentalNewNoteButton": false,
  "rpcAllowedOrigins": ["http://localhost:5000"],
  "services": [
    {
      "apiUrl": "http://localhost:5000/api/",
      "authority": "localhost:5000",
      "grantToken": null,
      "groups": [],
      "icon": null
    }
  ]
}
```

### Key Configuration Options
- `apiUrl` - Base URL for API requests
- `authDomain` - Domain for authentication
- `rpcAllowedOrigins` - Allowed origins for RPC calls
- `services` - Service configuration array

## Testing

### Test Structure
- Tests in `tests/` directory using Mocha
- Background script tests focus on injection logic and API communication
- Mock Chrome APIs for testing extension functionality

### Running Tests
```bash
make test           # Run all tests
npm test           # Alternative test command
```

### Test Coverage
- Core extension functionality
- Error handling scenarios  
- URL normalization and badge API requests
- Client injection logic (VitalSource/LMS tests removed)

## Development Workflow

### Watch Mode
```bash
make watch          # Build and watch for changes
```

### Debugging
1. Load extension in Chrome with "Developer mode" enabled
2. Open Chrome DevTools 
3. Go to Extensions tab in DevTools
4. Click "Inspect views: background page" for background script debugging
5. Use browser console for content script debugging

### Network Monitoring
To understand client API usage:
1. Open DevTools Network tab
2. Load a page with annotations
3. Monitor requests to your backend
4. Note API endpoints and request/response formats

## Code Organization

### TypeScript Source (`src/`)
```
src/
├── background/
│   ├── extension.ts         # Main orchestrator
│   ├── sidebar-injector.ts  # Client injection
│   ├── tab-state.ts         # Tab management
│   ├── uri-info.ts          # Badge API
│   ├── errors.ts            # Error handling
│   ├── direct-link-query.ts # URL fragment parsing
│   └── chrome-api.ts        # Chrome API wrappers
├── content/                 # Content scripts
├── options/                 # Options page
└── popup/                   # Popup UI
```

### Build Output (`build/`)
```
build/
├── manifest.json           # Extension manifest
├── client/                 # Bundled Hypothesis client
├── background.js           # Background scripts
├── content/                # Content scripts
└── options/                # Options page
```

## Removed Features

### VitalSource Integration
- Removed detection of VitalSource URLs
- Removed frame injection for VitalSource reader
- Removed VitalSource-specific permissions

### LMS Integration  
- Removed LMS assignment URL detection
- Removed LMS-specific injection logic
- Simplified content type detection

### Code Cleanup Status
- ✅ TypeScript source files cleaned
- ✅ Broken test references removed  
- ✅ Comments indicate removal points
- ✅ No functional VitalSource/LMS code remains

## Implementation Checklist

### Backend Development
- [ ] Implement `/api/badge` endpoint
- [ ] Set up CORS for extension origin
- [ ] Implement authentication endpoints
- [ ] Add annotation CRUD endpoints
- [ ] Test with extension requests

### Extension Customization
- [ ] Update manifest.json branding
- [ ] Customize popup UI for RabbitTrail
- [ ] Update error messages and help text
- [ ] Add RabbitTrail-specific features

### Production Deployment
- [ ] Update production configuration files
- [ ] Set up staging environment
- [ ] Test with production backend
- [ ] Package for Chrome Web Store (if needed)

## Debugging Common Issues

### Badge API Issues
1. Check backend CORS configuration
2. Verify `/api/badge` endpoint returns proper JSON
3. Check URL encoding in requests
4. Monitor network requests in DevTools

### Authentication Issues  
1. Verify `authDomain` configuration
2. Check authentication flow in network requests
3. Ensure backend supports expected auth endpoints
4. Test authentication in standalone client

### Client Injection Issues
1. Check for JavaScript errors in browser console
2. Verify client files are properly bundled
3. Check Content Security Policy on target pages
4. Test injection on different page types (HTML, PDF)

### Permissions Issues
1. Verify extension manifest permissions
2. Check for restricted protocols (chrome://, file://)
3. Ensure file access is enabled if needed
4. Check for site-specific blocking

## Contributing

1. Make changes to TypeScript source in `src/`
2. Run `make watch` for development
3. Test changes in Chrome with loaded extension
4. Run `make test` to verify tests pass
5. Update documentation as needed
