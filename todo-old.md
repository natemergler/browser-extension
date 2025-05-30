# RabbitTrail Browser Extension - Local Backend Todo

## Analysis Progress  
- [x] Analyze core extension files
- [x] Analyze API integration points  
- [x] Analyze client bundling and injection
- [x] Analyze badge/annotation counting
- [x] Analyze authentication flow
- [x] Analyze direct link handling
- [x] Check build system and dependencies
- [x] Identify files to remove/modify
- [x] Document API requirements
- [x] Document configuration changes needed

## Analysis Complete! ✅

**Summary**: This Hypothesis browser extension is well-architected and can easily be adapted for your local RabbitTrail backend. The main work is implementing the HTTP APIs it expects, starting with the badge endpoint for annotation counts.

## Extension Architecture Analysis

### Core Components
1. **Background Script** (`src/background/extension.ts`) - Main orchestrator
   - Manages tab state and lifecycle
   - Handles browser action clicks
   - Coordinates sidebar injection/removal
   - Sets up event listeners for tab changes

2. **Sidebar Injector** (`src/background/sidebar-injector.ts`) - Client deployment
   - Injects Hypothesis client into web pages
   - Handles special cases (PDFs, VitalSource, file:// URLs)
   - Configures client with extension-specific settings

3. **Tab State Manager** (`src/background/tab-state.ts`) - State tracking
   - Tracks extension state per tab (active/inactive/errored)
   - Manages annotation count cache with debouncing
   - Handles badge display logic

4. **Browser Action** (`src/background/browser-action.ts`) - UI controller
   - Updates toolbar icon and badge
   - Shows annotation counts
   - Displays build type indicators (DEV/STG)

### Client Bundling System
- **Client is pre-bundled** from `node_modules/hypothesis` package
- **Build process** copies client to `build/client/` directory
- **Asset URLs** use `chrome-extension://{id}/client/` scheme
- **Templates** generate `app.html`, `notebook.html`, `profile.html`

### Badge/Annotation Counting System
- **Debounced requests** (1-3 second delays) to prevent API spam
- **Caching** with 3-second expiration
- **URL normalization** removes fragments, blocks certain sites
- **Error handling** for blocked protocols/hostnames

### Authentication Flow Analysis
- **No direct authentication** in extension - it's handled by the client
- **Credentials**: Requests use `credentials: 'include'` for session cookies
- **OAuth Config**: `oauthClientId` setting passed to client but no OAuth flow in extension
- **Auth Domain**: Used by client for authentication redirects
- **Session Management**: Extension assumes user is authenticated through client

### Direct Link Handling Analysis  
- **Fragment Parsing** (`src/background/direct-link-query.ts`): 
  - `#annotations:ID` - Shows specific annotation
  - `#annotations:query:QUERY` - Filtered search
  - `#annotations:group:ID` - Shows group annotations
- **Auto-Activation**: Direct links trigger automatic sidebar injection
- **URL Normalization**: HTTP/HTTPS and fragments ignored in comparisons
- **Bouncer Integration**: `bouncerUrl` handles short link redirects

### Badge API Deep Dive
- **Endpoint**: `GET /api/badge?uri={encoded_url}`
- **Request Headers**: `credentials: 'include'`
- **Response Format**: `{"total": number}`
- **URL Processing**:
  - Normalizes URLs (removes fragments, adds trailing slash)
  - Blocks certain protocols and hostnames
  - URL-encodes parameters properly
- **Caching**: 3-second cache with debounced requests
- **Error Handling**: Sets count to 0 on API failures

### Build System Analysis
- **Main Build Tool**: Makefile orchestrates everything
- **Module Bundling**: 
  - Rollup bundles TypeScript background scripts → `build/extension.bundle.js`
  - Client comes from `hypothesis` npm package dependency
- **Template Processing**: Mustache templates for manifest and HTML files
- **Key Dependencies**:
  - `hypothesis` package: Pre-built Hypothesis client
  - Rollup + Babel: TypeScript/JavaScript processing
  - Mustache: Template rendering
- **Build Targets**:
  - `make build`: Full extension build
  - `make dev`: Watch mode development
  - Chrome/Firefox variants via different settings files

### File Structure Deep Dive
**Essential Core Files:**
- `src/background/extension.ts` - Main orchestrator
- `src/background/sidebar-injector.ts` - Client injection
- `src/background/tab-state.ts` - State management
- `src/background/uri-info.ts` - Badge API communication
- `src/manifest.json.mustache` - Extension manifest template

**Client Integration:**
- `node_modules/hypothesis/build/*` → `build/client/build/`
- Templates generate `app.html`, `notebook.html`, `profile.html`
- `tools/render-boot-template.js` customizes client URLs

**Settings Configuration:**
- `settings/*.json` files configure API endpoints per environment
- `tools/template-context-app.js` processes settings into client config

---

## Required API Endpoints for Local Backend

### 1. Badge API (Critical)
```
GET /api/badge?uri={encoded_url}
Headers: credentials: include
Response: {"total": number}
```
**Purpose**: Returns annotation count for browser icon badge
**Usage**: Called frequently with debouncing/caching
**URL Processing**: Normalizes URLs, blocks certain domains

### 2. Service Endpoints
```
GET /welcome
```
**Purpose**: First-run onboarding page shown after installation
**Content**: HTML page for new users

### 3. Client Asset Endpoints  
```
GET /client/app.html
GET /client/notebook.html  
GET /client/profile.html
GET /client/build/* (JS, CSS, assets)
```
**Purpose**: Hypothesis client applications (currently bundled in extension)
**Note**: You can continue using bundled client or serve your own

### 4. Authentication (Handled by Client)
- OAuth flows and session management
- User login/logout endpoints
- Session cookie validation

### 5. Core Annotation APIs (For Client)
```
GET /api/annotations?uri={url}        # Get annotations for URL
POST /api/annotations                 # Create annotation
PUT /api/annotations/{id}             # Update annotation  
DELETE /api/annotations/{id}          # Delete annotation
GET /api/search?q={query}             # Search annotations
```

### 6. Direct Link Support
```
GET /api/annotations/{id}             # Get specific annotation
GET /api/groups/{id}                  # Get group info
```
**Purpose**: Support #annotations:ID, #annotations:group:ID fragments

---

## Files to Remove/Modify for Local Backend

### Files You Can Remove Entirely
**Hypothesis-Specific Services:**
- `tools/chrome-webstore-refresh-token` - Chrome store deployment
- `tools/deploy` - Deployment scripts
- `tools/update-client` - Client update automation
- Coverage/CI configs if not needed

**External Service Integration:**
- Sentry error reporting code (optional)
- Update check mechanisms (optional)
- Uninstall survey URL (optional)

### Files to Modify for Local Backend

**Settings Configuration:**
- `settings/chrome-dev.json` ✓ (already points to localhost)
- `settings/chrome-prod.json` - Point to your production backend
- `settings/chrome-staging.json` - Point to your staging backend

**Build Configuration:**
- `package.json` - Can remove Hypothesis-specific dependencies
- `Makefile` - May simplify client update mechanisms

**Optional Features to Remove:**
- **VitalSource Support**: Complex textbook platform integration
  - `src/background/sidebar-injector.ts` (VitalSource-specific code)
  - Reduces complexity significantly
- **PDF.js Integration**: If you don't need PDF annotation
  - `src/vendor/pdfjs/*` directory
  - PDF detection/injection code
- **Help Pages**: Hypothesis-specific error handling
  - `src/help/*` directory  
  - `src/background/help-page.ts`

### Features to Keep
**Core Functionality:**
- Extension lifecycle management
- Tab state tracking  
- Sidebar injection system
- Browser action (icon) management
- Badge/annotation counting
- Direct link handling
- Basic error handling

**Client Integration:**
- Keep bundled client or serve your own
- Configuration injection system
- Asset URL management

---

## Implementation Steps

### Phase 1: Basic Backend (Start Here)
- [ ] Implement badge API endpoint (`GET /api/badge`)
- [ ] Create welcome page (`GET /welcome`)  
- [ ] Test with existing bundled client
- [ ] Verify annotation counting works

### Phase 2: Remove Unnecessary Features
- [ ] Remove VitalSource support (simplify codebase)
- [ ] Remove PDF.js if not needed
- [ ] Remove help pages and Hypothesis-specific error handling
- [ ] Clean up unused dependencies

### Phase 3: Custom Client (Optional)
- [ ] Build your own annotation interface
- [ ] Serve client assets from your backend
- [ ] Modify client configuration as needed

### Phase 4: Production Deployment
- [ ] Update production settings files
- [ ] Set up authentication system
- [ ] Implement full annotation CRUD APIs
- [ ] Add search and filtering capabilities

---

## Configuration Changes Needed

### Update Settings Files
Point all environment configs to your backend:
```json
{
  "apiUrl": "https://your-backend.com/api/",
  "authDomain": "your-backend.com", 
  "serviceUrl": "https://your-backend.com/",
  "bouncerUrl": "https://your-backend.com/"  // If you implement URL shortening
}
```

### Simplify Extension Manifest
Remove Hypothesis-specific permissions and URLs:
- Update `externally_connectable` matches
- Remove unused permissions
- Update extension name/description

### Client Configuration
If serving your own client:
- Modify `tools/template-context-app.js`
- Update asset root URLs
- Configure API endpoints and authentication

---

## Key Takeaways

1. **Start Simple**: Implement badge API first, use bundled client
2. **Keep Core Features**: Tab management, injection system, direct links
3. **Remove Complexity**: VitalSource, advanced PDF support, help system
4. **Client is Optional**: Bundled client works fine, can replace later
5. **Focus on Backend**: Most work is building annotation storage/retrieval APIs

The extension is well-architected to work with different backends - you mainly need to implement the HTTP APIs it expects!
