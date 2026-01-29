

## Fix Bulk Export: PDF Margins + ZIP Download

### Problem Summary
1. **Missing PDF Margins**: The bulk export doesn't pass PDF layout settings (pageMargin, font, colors) to the export function - text goes to page edges
2. **Only One File Downloads**: Opening 18 print windows gets blocked by browsers - need to bundle all PDFs into a single ZIP download

---

### Solution Overview

Create a proper bulk export that:
1. Fetches all PDF settings from the database (including margins, fonts, colors)
2. Generates each order's PDF as a blob instead of opening print dialogs
3. Bundles all PDFs into a ZIP file using JSZip (already installed)
4. Downloads the ZIP in one click

---

### Technical Implementation

#### 1. Add New PDF Generation Function
Add a new function `generatePDFBlob()` to `src/utils/pdfExport.ts` that:
- Takes the same parameters as `exportMultipleEntriesToPDF`
- Generates the HTML with proper margins (using the passed layoutSettings)
- Uses jsPDF library (already installed) to convert HTML to PDF blob
- Returns the PDF blob for ZIP bundling

#### 2. Update Bulk Export Handler
Modify `handleBulkExportJournals()` in `src/components/OrderList.tsx`:
- Fetch complete PDF settings from database (including `pdf_page_margin`, `pdf_primary_color`, `pdf_font_family`, etc.)
- Show a loading toast while processing
- Generate PDF blobs for each selected order
- Use JSZip to bundle all PDFs
- Download as a single ZIP file named `journal-exports-{timestamp}.zip`

#### 3. Files to Modify

**`src/utils/pdfExport.ts`**
- Add `generatePDFBlob()` function that returns a Blob instead of opening print window
- Reuse existing HTML generation logic
- Ensure proper page margins are applied using `@page { margin: Xmm; }`

**`src/components/OrderList.tsx`**
- Import JSZip
- Update settings fetch to include all PDF layout fields
- Replace loop of `exportMultipleEntriesToPDF` calls with:
  - Generate blobs for each order
  - Add each blob to ZIP with filename like `{order-title}-journal.pdf`
  - Trigger ZIP download

---

### Expected User Experience

1. Select 18 orders → Click "Export Journals"
2. See loading toast: "Generating PDFs..."
3. Single ZIP file downloads: `journal-exports-2026-01-29.zip`
4. ZIP contains 18 PDFs, each with proper margins and formatting

