# Changelog

All notable changes to SimpleTable will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Renders as single cell with `colspan` spanning all columns
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
