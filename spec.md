# Specification

## Summary
**Goal:** Fix the "Open" button on the public gallery page so that clicking it correctly navigates to the PDF viewer and displays the PDF.

**Planned changes:**
- Investigate and fix the "Open" button in `GalleryPage.tsx` so it correctly navigates to `/view/<shareId>` for each PDF card
- Ensure `shareId` is properly available in each gallery card's data and passed to the navigation/href call
- Verify `ViewerPage.tsx` correctly extracts the `shareId` route parameter and initiates the chunked PDF retrieval flow
- Fix any issues with the chunked fetch sequence (getPdfChunks → getPdfChunk → reassemble → iframe render) when arriving from the gallery
- Show a loading progress indicator while chunks are being fetched
- Show an error message if PDF retrieval fails instead of a blank or broken page

**User-visible outcome:** Users can click "Open" on any PDF card in the gallery and be taken to the viewer page where the PDF loads and displays correctly.
