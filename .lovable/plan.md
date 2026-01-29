
# PDF Image & Layout Settings Enhancement

## Overview
Add new PDF export settings to control:
1. **Photo scaling** - Adjustable size for journal entry images
2. **Photo columns** - Display 1-4 photos per row (default: 2)
3. **Order details columns** - 1 or 2 column layout for order details

## Database Changes

Add 3 new columns to the `settings` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `pdf_photo_scale` | integer | 100 | Photo scaling percentage (50-150%) |
| `pdf_photo_columns` | integer | 2 | Photos per row (1-4) |
| `pdf_order_details_columns` | integer | 2 | Order details columns (1 or 2) |

## Implementation

### 1. Settings Panel Updates (`src/components/SettingsPanel.tsx`)

Add three new controls in the "PDF Export Layout" section:

**Photo Scale Slider:**
- Range: 50% to 150%
- Default: 100%
- Shows percentage value

**Photo Columns Selector:**
- Options: 1, 2, 3, or 4 columns
- Default: 2 (current behavior)

**Order Details Columns Selector:**
- Options: 1 or 2 columns
- Default: 2

### 2. PDF Export Updates (`src/utils/pdfExport.ts`)

**PDFLayoutSettings interface:**
Add new properties:
- `photoScale?: number` (50-150)
- `photoColumns?: number` (1-4)
- `orderDetailsColumns?: number` (1-2)

**Photo rendering logic in `generateNativePDFFromOrder`:**
- Calculate image width based on columns: `contentWidth / columns`
- Track horizontal position for side-by-side placement
- Apply scale factor to image dimensions
- Only add line break after filling a row (not after each image)

**Order details table:**
- Conditionally use 1 or 2 columns based on setting
- Adjust `grid-template-columns` in HTML output for print exports

### 3. Data Flow

```text
Settings Panel
     │
     ▼
┌─────────────────┐
│ Supabase DB     │
│ (settings table)│
└────────┬────────┘
         │
         ▼
   fetchSettings()
         │
         ▼
┌─────────────────────┐
│ pdfSettings state   │
│ - photoScale        │
│ - photoColumns      │
│ - orderDetailsColumns│
└─────────┬───────────┘
          │
          ▼
   generatePDFBlob()
          │
          ▼
   generateNativePDFFromOrder()
```

---

## Technical Details

### Photo Rendering Logic

Current behavior (single column, line break after each):
```
[Photo 1]
[Photo 2]
[Photo 3]
```

New behavior with 2 columns:
```
[Photo 1] [Photo 2]
[Photo 3]
```

**Implementation approach:**
1. Calculate column width: `(contentWidth - gutter) / numColumns`
2. Track `photoIndex` for each journal entry
3. Calculate X position: `margin + (colIndex * (colWidth + gutter))`
4. Only increment Y and reset X after row is complete
5. Apply scale factor: `imgWidth *= (scale / 100)`

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/SettingsPanel.tsx` | Add 3 new setting controls, update fetchSettings/state |
| `src/utils/pdfExport.ts` | Update PDFLayoutSettings interface, modify photo/details rendering |
| Database migration | Add 3 columns to `settings` table |

### Settings UI Components

**Photo Scale:**
```
Photo Scale: 100%
[─────────●─────────] 50% ←→ 150%
```

**Photo Columns:**
```
Photos per Row: [2 ▼]
├ 1 column
├ 2 columns (side by side)
├ 3 columns
└ 4 columns
```

**Order Details Columns:**
```
Order Details Layout: [2 columns ▼]
├ 1 column (stacked)
└ 2 columns (side by side)
```
