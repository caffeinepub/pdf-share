# Specification

## Summary
**Goal:** Redo the PDF upload and retrieval integration using a reliable chunked approach on both the backend and frontend.

**Planned changes:**
- Rewrite backend PDF storage in `main.mo` to split PDFs into 500 KB chunks stored in stable memory, with functions: `startUpload`, `uploadChunk`, `finalizeUpload`, `getPdfChunks`, `getPdfChunk`, `listPdfs`, `deletePdf`, and `renamePdf`
- Rewrite `UploadPage.tsx` to split PDF files into 500 KB chunks, upload sequentially with retry logic (up to 3 retries per chunk), show a chunk progress bar (e.g. "3 of 7 chunks uploaded"), and display descriptive error messages with retry option
- Rewrite `ViewerPage.tsx` to fetch chunk count, sequentially retrieve each chunk, reassemble into a Blob, and render in an iframe, with a loading progress indicator and error handling
- Update `useQueries.ts` to expose hooks for chunked upload (`startUpload`, `uploadChunk`, `finalizeUpload`) and chunked retrieval (`getPdfChunks`, `getPdfChunk`), while keeping dashboard list, delete, and rename hooks functional

**User-visible outcome:** Users can successfully upload PDFs of any size (including those larger than 2 MB) with visible chunk progress, and previously uploaded PDFs load and render correctly in the viewer.
