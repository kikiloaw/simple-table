# Changelog

All notable changes to SimpleTable will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-03

### Added
- **Exposed Methods**: `fetchData()` and `clearCache()` are now exposed via `defineExpose`, allowing parent components to trigger refreshes and clear cache programmatically.
- **Events**: Added `fetched` event which emits the raw API response, enabling deep inspection/debugging or side-effects based on data load.
- **Client-Side Grouping Example**: Added robust support for using `before-render` to transform flat API data into grouped data with headers on the client side.

### Fixed
- **Group Header Colspan**: Ensure group header rows correctly span all columns.
- **Group Header Styling**: Ensure `_groupTitleClass` is correctly applied to the header cell.

## [1.0.6] - 2026-01-02

### Fixed
- **Sticky Column Logic**: Fixed inverted background striping on fixed columns.
- **Sticky Column Scrolling**: Switched table to `border-separate` mode to ensure sticky column borders don't vanish during scrolling.
- **Flexible Fixed Columns**: Restored logic where the last column sticks to the right, and all other fixed columns stick to the left.
- **Auto-Sizing**: Switched to `table-auto` so fixed columns (like Actions) automatically expand to fit their buttons without needing explicit widths.

### Changed
- **Sticky Column Visuals**: Added distinct `border-stone-300` and subtle shadow to fixed columns for better separation ("embossed" look).
- **Documentation**: Added warnings that `width` must be explicitly set for `fixed` columns to work correctly.

## [1.0.5] - 2026-01-02

### Changed
- **Visual Refresh**: Updated default styling for a professional, sharp look
- **Design Defaults**:
  - **Bold Headers**: Table headers are now `font-bold` for better readability
  - **Stone Palette**: Default colors updated to `bg-stone-100` (even rows) and `hover:bg-stone-200` (hover)
  - **Row Borders**: Added explicit `border-stone-300` bottom borders to rows
  - **Sharp Corners**: Removed rounded corners from table container, inputs, and selects ('corder dont make it round')

## [1.0.4] - 2026-01-01

### Added
- **Advanced Cell Rendering Guide**: Expanded documentation for custom slots
  - Added guide for conditional styling (e.g. status badges)
  - Added patterns for handling Group Headers (`!row._isGroupHeader`)
  - Added examples for rendering lists/tags within cells

## [1.0.3] - 2025-12-30

### Added
- **Row Height Control**: New `rowHeight` prop for precise vertical sizing
  - Set exact pixel height for all table rows (e.g., `:row-height="50"`)
  - Defaults to `38px` (compact and readable)
  - Automatically adjusts cell padding based on height
  - Works on header rows, data rows, and group headers
- **Static Data Documentation**: Comprehensive guide for client-side usage
  - Added new "Using Predefined/Static Data" section to README
  - Clear examples for setup, props, and common pitfalls
  - Best practices for performance and reactivity
- **Improved Compact Layout**: Tighter default spacing
  - Reduced default cell padding to `p-2` (8px)
  - Reduced default header height to `38px`

  - Added guide for conditional conditional styling (e.g. status badges)
  - Added patterns for handling Group Headers (`!row._isGroupHeader`)
  - Added examples for rendering lists/tags within cells

### Fixed
- **Table Row Height Styling**: Fixed styling conflict where `min-height` on cells was ignored
  - Moved height application to `TableRow` (`<tr>`) elements for reliable CSS behavior
  - Fixed conflict between column width styles and height styles
- **Page Size Reactivity**: Fixed issue where initial page size didn't match options

## [1.0.2] - 2025-12-30

### Added
- **Auto-Numbering for Columns**: Display sequential row numbers
  - Add `autonumber: true` to column definition
  - Displays 1, 2, 3... for each data row
  - Skips group headers automatically
  - Pagination-aware (page 2 shows 11, 12, 13... with 10 per page)
  - Perfect for sequential numbering regardless of actual IDs
  
- **Native Group Headers Support**: Full-width group header rows
  - Use `_isGroupHeader: true` flag in row data
  - Renders as single cell +with `colspan` spanning all columns
  - Seamless integration with row striping
  - Perfect for organizing data by category, date, status, etc.
  
- **`beforeRender` Callback**: Transform data before rendering
  - Accepts function: `(rows: any[]) => any[]`
  - Perfect for data transformation, formatting, or adding computed properties
  - Ideal for programmatically inserting group headers
  - Works with both server-side and client-side data
  - Called after filtering, sorting, and pagination

### Fixed
- **Row Striping**: Corrected alternating row colors to work with all row types
  - Group headers now properly participate in row striping
  - Visual continuity maintained across headers and data rows
  - No more duplicate colors for consecutive rows

## [1.0.1] - 2025-12-29

### Changed
- **Query Parameters Behavior**: Removed automatic refetch on `queryParams` change
  - Prevents multiple API calls when setting multiple filters
  - Developers now manually call `tableRef.value?.refresh()` when ready
  - Performance improvement for forms with many filters

### Fixed
- Reduced unnecessary API calls in multi-filter scenarios

## [1.0.0] - 2025-12-29

### Added
- **Initial Release** of SimpleTable
- Server-side and client-side data support with auto-detection
- **Native HTML Elements** - No heavy UI library dependencies
- **Premium Tailwind Styling** with customizable row colors
- **Smart Pagination** with numbered page buttons and ellipsis
- **Advanced Sorting** with custom sort keys for relationships
- **Search & Filtering** with debounced input
- **Query Parameters** for advanced filtering and multi-tenancy
- **Response Caching** to reduce redundant API calls
  - Cache based on page, search, sort, per_page, and queryParams
  - Manual cache clearing via `clearCache()` method
  - Automatic cache hits for previously visited pages
- **DataTables Protocol Support** for backward compatibility
  - Works with existing DataTables backends
  - Compatible with Yajra DataTables package
  - Automatic request/response transformation
- **Export Functionality** with hooks for CSV/Excel/PDF
- **Custom Slots** for actions and cell rendering
- **Sticky Columns** for always-visible actions
- **TypeScript Support** with full type declarations
- **Responsive Design** - Mobile-first with adaptive UI
- **Comprehensive Documentation** with examples and troubleshooting

### Features
- **Lightweight Architecture**: Uses native `<select>`, `<input>`, `<button>` elements
- **Framework Agnostic**: Minimal dependencies for maximum portability
- **Debounced Search**: Optimized search with @vueuse/core
- **Inertia Integration**: Built-in router support for Laravel + Inertia apps
- **Flexible Data Modes**: Auto, server-side, or client-side pagination
- **Custom Sort Keys**: Map display keys to different backend columns

### Dependencies
- Vue 3 (peer dependency)
- Tailwind CSS (peer dependency)
- @vueuse/core (peer dependency)
- @inertiajs/vue3 (peer dependency)
