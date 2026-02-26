# Specification

## Summary
**Goal:** Fix the unauthorized error that prevents authenticated Internet Identity users from starting a chunked PDF upload.

**Planned changes:**
- Fix the backend `startUpload` handler to accept any non-anonymous principal instead of applying an overly restrictive identity check.
- Ensure the frontend actor used for upload calls is constructed with the authenticated identity (not anonymous) when the user is logged in via Internet Identity.

**User-visible outcome:** A logged-in Internet Identity user can upload a PDF end-to-end (startUpload → uploadChunk → finalizeUpload) without receiving an "Unauthorized" error. Anonymous callers are still rejected.
