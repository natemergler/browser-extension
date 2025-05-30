# RabbitTrail Extension Implementation Todo

## Critical Path (Priority 1)

### 1. Backend Badge API Implementation
**Status:** 🔴 Required for basic functionality
**Endpoint:** `GET /api/badge?uri={encoded_url}`
**Response:** `{"total": number}`

**Details:**
- This is the first and most critical API to implement
- Extension calls this frequently to show annotation counts
- URL is automatically encoded and normalized (fragments removed)
- Must support CORS from extension origin

### 2. Test Extension with Backend
**Status:** 🔴 Ready to test once badge API is implemented

**Steps:**
1. Start RabbitTrail backend on `localhost:5000`
2. Implement `/api/badge` endpoint  
3. Load extension in Chrome (`chrome://extensions/`)
4. Visit a webpage and verify badge shows annotation count

## Phase 2: Core Functionality

### 3. Authentication Integration
**Status:** 🟡 Needed for full functionality

**Requirements:**
- Backend must be compatible with Hypothesis authentication flow
- Client handles auth automatically, backend needs to support expected endpoints
- Test login/logout functionality

### 4. Annotation CRUD APIs  
**Status:** 🟡 Analyze client network requests to determine exact requirements

**Approach:**
1. Load extension with network monitoring enabled
2. Perform annotation operations (create, edit, delete)
3. Document actual API requests made by client
4. Implement matching backend endpoints

## Phase 3: Optimization & Polish

### 5. Configuration Updates
**Status:** 🟢 Easy once backend is stable

- Update `settings/chrome-prod.json` for production backend
- Update `settings/chrome-staging.json` for staging backend  
- Test with different backend configurations

### 6. Error Handling Review
**Status:** 🟢 Optional improvements

- Review Hypothesis-specific error patterns in `src/background/errors.ts`
- Customize error messages for RabbitTrail
- Test error scenarios with backend

## Implementation Notes

### Extension is Ready
✅ VitalSource/LMS code removed  
✅ Configured for localhost:5000  
✅ Build system working  
✅ Client bundled and ready  
✅ Documentation complete  

### Key Files Already Configured
- `settings/chrome-dev.json` - Points to localhost:5000
- `src/background/uri-info.ts` - Badge API communication ready
- `src/background/sidebar-injector.ts` - Client injection ready
- `Makefile` - Build commands work

### Next Steps
1. **Focus on backend badge API first** - this enables basic testing
2. **Test extension behavior** - load in Chrome and verify badge updates
3. **Monitor network requests** - determine what other APIs are needed
4. **Implement remaining APIs** based on actual client requirements

## URL Fragment Support (Already Implemented)

The extension already supports these direct link patterns:
- `#annotations:ID` - Navigate to specific annotation
- `#annotations:query:QUERY` - Search annotations  
- `#annotations:group:ID` - Group annotations

## Client Implementation Notes

### Bundled Client Details
- **Source:** `hypothesis` npm package
- **Build:** Copied from `node_modules/hypothesis/build/` to `build/client/`
- **Configuration:** Injected via extension settings
- **Authentication:** Handled by client, not extension

### API Discovery Process
To determine exact API requirements:
1. Run `make watch` to build with monitoring
2. Load extension in Chrome
3. Open DevTools Network tab
4. Create/edit annotations and monitor requests
5. Document request/response formats
6. Implement matching backend endpoints

## Hypothesis-Specific Features to Review

### Error Handling (`src/background/errors.ts`)
- Contains patterns for detecting blocked sites
- May need customization for RabbitTrail domains
- Review ignore patterns and user messages

### Direct Link Processing (`src/background/direct-link-query.ts`) 
- Parses annotation URLs for deep linking
- Should work as-is but test with RabbitTrail URLs

### Tab State Management (`src/background/tab-state.ts`)
- Tracks annotation counts per tab
- Updates badge when counts change
- Should work with RabbitTrail badge API

## Testing Strategy

### Manual Testing Workflow
1. Start RabbitTrail backend
2. Load extension in Chrome
3. Visit test webpage
4. Verify badge shows count (requires badge API)
5. Click extension icon to activate
6. Test annotation creation (requires auth + CRUD APIs)
7. Verify annotations persist (requires backend storage)

### Automated Testing
- Run `make test` to verify existing functionality
- Extension tests mock Chrome APIs and HTTP requests
- Add new tests for RabbitTrail-specific behavior as needed

## Documentation Status

✅ **README.md** - Clean setup instructions  
✅ **DEVELOPMENT.md** - Technical details and API requirements  
✅ **todo.md** - This file, focused on next steps  
✅ **oldreadme.md** - Original documentation preserved
