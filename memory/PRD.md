# Legenddary - AI-Powered eBook Creation Platform

## Original Problem Statement
Build a comprehensive, all-in-one AI-powered eBook creation platform that guides users from first draft to publication, including AI writing help, design tools, import/export, publishing support, and monetization.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor) + Python
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth/Security**: JWT access + refresh tokens, rate limiting, CORS, logging middleware
- **Payments**: Stripe subscription endpoints
- **AI**: GPT-based writing features and AI utilities

## User Personas
- Authors and writers
- Self-publishers
- Content creators
- Small publishing houses

## Core Requirements (Static)
1. Rich Text Editor with formatting and section support
2. AI Writing Assistant (content, footnotes, style)
3. Cover Designer
4. Signature Studio
5. Image Finder (Unsplash/Pexels)
6. Export (PDF, EPUB, print-ready PDF)
7. Publishing Guide
8. Marketing Tips
9. Project Management Dashboard
10. Import workflows (docx/url/smart paste/batch)

## What's Been Implemented

### 2026-01-31 (Earlier milestone)
- ✅ Landing/auth/dashboard/editor core flow
- ✅ Book and chapter CRUD
- ✅ AI assistant + image finder + cover + signature
- ✅ Export center (PDF/EPUB + print-ready options)
- ✅ Royalty calculator, templates, publishing + marketing pages
- ✅ Security hardening and Stripe subscription scaffolding

### 2026-02-27 (Current fork continuation)
- ✅ **P0 fix**: stabilized auth token handling in `AuthContext.jsx` with axios request/response interceptors and automatic refresh retry on 401.
- ✅ **Create Book regression resolved** and verified through UI + backend testing.
- ✅ Fixed backend route registration issue by moving `app.include_router(api_router)` to the end of `server.py`, restoring all late-defined import endpoints.
- ✅ Completed Import Center integration path:
  - Batch `.docx` import
  - URL import
  - Smart paste cleanup + structure detection
  - Drag-and-drop section reordering UI
  - Add imported sections to new or existing books
  - Google Drive shared-link import support (public links)
- ✅ Added `/import` route in app routing and Dashboard nav entry.
- ✅ Added/expanded `data-testid` coverage for critical Import Center interactions.
- ✅ Accessibility improvement: Create Book dialog now includes description.

## Current Status
- **P0 functional blocker fixed**: users can create books again.
- Import features are now wired end-to-end and tested.
- OAuth-based private Google Drive access is not yet enabled (public-link workflow is implemented).

## Prioritized Backlog

### P0 (Critical)
- [x] Fix Create Book 401/auth regression
- [x] Ensure import endpoints are reachable (no 404 from router ordering)

### P1 (Important)
- [ ] Google Drive OAuth full integration (private files; requires Google client credentials)
- [ ] MOBI export
- [ ] Refactor oversized files (`backend/server.py`, `frontend/pages/BookEditor.jsx`)
- [ ] Improve Import Center UX for mobile tab overflow and remove prompt-based title input with modal form

### P2 (Future)
- [ ] Real-time collaboration + inline comments
- [ ] Folders/collections + tags/search
- [ ] Character/location database + outline mode
- [ ] Full data export (JSON backup)

## Next Action Items
1. Implement Google Drive OAuth connect/callback flow (after credentials are provided).
2. Add MOBI export path in export API and frontend.
3. Start modular refactor of `server.py` into routers and split BookEditor logic into hooks/components.
