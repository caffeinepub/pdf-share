# Specification

## Summary
**Goal:** Add a public "/feed" page that aggregates all uploaded PDFs from every account into a single browsable list.

**Planned changes:**
- Create a new `FeedPage` component at the `/feed` route displaying all PDFs from all users, fetched via the existing `listPdfs()` hook, sorted newest-first
- Each entry shows the PDF title, uploader principal (truncated), upload date, and an "Open" button linking to `/view/<shareId>`
- Page is publicly accessible without authentication and styled to match the existing dark navy and amber theme
- Register the `/feed` route in `App.tsx` as a public, unauthenticated route
- Add a "Feed" navigation link in `Header.tsx` with active-route highlighting, alongside existing nav links

**User-visible outcome:** Any visitor can navigate to `/feed` to browse all uploaded PDFs from all accounts and open any PDF directly from that page.
