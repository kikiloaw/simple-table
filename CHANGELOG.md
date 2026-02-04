# Changelog

All notable changes to SimpleTable will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.21] - 2026-02-05

### Fixed
- **Row State Persistence**: Fixed a bug where toggle states (and other component states) would persist incorrectly on specific rows after data updates.
  - Added new `rowKey` prop (default: `'id'`) to uniquely identify rows.
  - Supports dot notation for nested keys (e.g., `'user.id'` or `'3.id'`).
  - Updated `v-for` loop to use `rowKey` for the `:key` binding, ensuring Vue re-renders rows correctly when data changes.

## [1.1.20] - 2026-01-11

### Changed
- **Reverted Naming**: Renamed `reload()` back to `refresh()` to maintain backward compatibility.
    - `refresh()`: **Hard Reset** (Page 1 + Clear Cache + Refetch). Use this for resetting the table (e.g. filter changes).
    - `clearCache()`: **Refresh Current Page**. Use this for reloading the current page without jumping to page 1.
    - `reload()`: Removed (use `refresh()` instead).

## [1.1.19] - 2026-01-11

### Changed
- **API Redesign**:
    - `reload()`: Now behaves as a **Hard Reset**. It resets to **Page 1**, clears the cache (if enabled), and fetches fresh data.
    - `clearCache()`: Now behaves as **Refresh Current Page**. Calling `clearCache('current')` or `clearCache('all')` will clear the respective cache AND automatically trigger a re-fetch of the current page.

### Removed
- Removed `refresh()` method (replaced by `reload()`).

## [1.1.18] - 2026-01-11

### Added
- **`reload()` Method**: Added a new exposed method to reload the **current page** while forcing a cache clear. Use this after deleting or updating rows to refresh data without jumping back to page 1.

### Fixed
- **Refresh Cache Clearing**: The `refresh()` method now automatically clears the cache for Page 1 before fetching, ensuring you always get fresh data when resetting the table.

## [1.1.17] - 2026-01-11

### Fixed
- **Refresh Reactivity**: Updated `refresh()` to use `await nextTick()` before fetching data.
  - This guarantees that any changes to `query-params` or other props triggered immediately before calling `refresh()` (like in parent component events) are fully propagated and available during the fetch call.
  - Fixes issues where the table would reload with old parameters when a filter change and refresh were triggered simultaneously.

## [1.1.16] - 2026-01-11

### Changed
- **`@fetched` Payload**: The `@fetched` event now emits the **raw** response from the server before any internal transformation.
  - Previously, `protocol="datatables"` would emit the transformed Laravel-style object, causing data loss for custom backend fields.
  - Now, you receive exactly what your backend sent (e.g., `{ draw, recordsTotal, data, myCustomField }`).

## [1.1.15] - 2026-01-11

### Changed
- **Production Ready**: Removed all temporary console debug logs (`[SimpleTable] Fetching Data`, `DataTables Protocol - Columns`, etc.) added in previous versions for debugging protocol issues. Package is now clean for production use.
- **Protocol Stability**: Confirmed full stability of the `protocol="datatables"` implementation with strict DataTables backends (Yajra).

## [1.1.14] - 2026-01-11

### Fixed
- **Strict DataTables Protocol Support**: Updated `protocol="datatables"` to include the full `columns[...]` definition loop in the request payload.
  - This is required for backend libraries (like `yajra/laravel-datatables`) that rely on `columns[i][name]` to map the `order[0][column]` index to a database column.
  - Fixes "500 Internal Server Error" when using DataTables backends that expect strict column definitions.

## [1.1.13] - 2026-01-11

### Fixed
- **Query Parameter Cleanup**: Added defensive coding to `fetchData` to explicitly remove `page` and `per_page` query parameters when using `protocol="datatables"`. This prevents legacy/default pagination parameters from leaking into the request if they are present in the base `fetchUrl` or query params.
- **Debug Logging**: Added initialization logging (`SimpleTable 1.1.13 Initialized`) to help developers verify they are running the correct version of the package.

## [1.1.12] - 2026-01-11

### Fixed
- **Inertia Protocol Support**: Added full support for `protocol="datatables"` when using Inertia-based server-side pagination (without `fetch-url`). Now correctly sends `draw`, `start`, `length`, `search[value]` and `order` params via `router.visit` when enabled.
- **Debug Logging**: Added console logging to `fetchData` to assist in debugging protocol and payload issues.

## [1.1.11] - 2026-01-11

### Fixed
- **Lifecycle Error**: Fixed `onMounted` warning ("called when there is no active component instance") by moving `useWindowSize()` call from `computed` property to top-level `setup`. This ensures the composable's lifecycle hooks are registered correctly during the synchronous setup phase.

## [1.1.10] - 2026-01-11

### Added
- **Granular Cache Clearing**: Updated `clearCache()` to accept a scope argument:
  - `clearCache('all')` (default): Clears the entire cache.
  - `clearCache('current')`: Clears only the cache for the **current active page/state**. Use this when editing a row to refresh the current view while keeping other pages cached.

## [1.1.9] - 2026-01-11

### Documentation
- **Method Clarity**: Updated the "Exposed Methods" section in README to explicitly state that:
  - `clearCache()` clears the **entire** cache and does **not** auto-refetch.
  - `refresh()` resets to Page 1.
  - `fetchData()` allows refreshing the current page.

## [1.1.8] - 2026-01-11

### Documentation
- **Updated Styling Guide**: Added `paginationColor` to the Props Reference in README, explaining how to set a custom active page color via hex code.

## [1.1.7] - 2026-01-11

### Added
- **Custom Pagination Color**: New `paginationColor` prop (hex string) allows users to customize the background and border color of the active page button.
  - Example: `:pagination-color="'#ec4899'"` for pink pagination buttons.
  - Defaults to `#2563eb` (Tailwind Blue 600) if not provided.

## [1.1.6] - 2026-01-11

### Fixed
- **Responsive Pagination**: 
    - **Smart Mobile Logic**: Implemented `useWindowSize` to detect mobile (<640px) and extra-small (<550px) screens. Automatically reduces pagination range (`delta`) to prevents buttons from overflowing off-screen.
    - **Compact Padding**: Reduced horizontal padding on pagination buttons (`px-2`) for mobile devices to save maximize available space.
- **Protocol Compatibility**: Enhanced documentation to clarify that `SimpleTable` automatically adapts to most backend JSON formats (including DataTables-style) without needing explicit `protocol="datatables"` configuration, thanks to the robust meta polyfill.

## [1.1.5] - 2026-01-11

### Fixed
- **Pagination Logic & Meta**:
    - **String Concatenation Fix**: Fixed a critical bug where string-based page numbers were causing infinite ranges and arithmetic errors (e.g., "1" + 1 = "11"). Now strictly casting all page calculations to integers.
    - **Meta Polyfill**: Added client-side calculation for `from` and `to` values. This ensures "Showing X to Y" displays correctly even if the backend (e.g., DataTables) doesn't return these specific fields.
- **Visual Styling**:
    - **Active Page Color**: Implemented inline styles (`style="background-color: ... !important"`) for the active page button. This guarantees the selected page is blue and visible, overriding any global framework conflicts (Flowbite, etc.).
    - **Responsive Layout**: Added `flex-wrap` to the pagination container to effectively handle overflow on smaller screens.

## [1.1.4] - 2026-01-11

### Fixed
- **Flowbite & Tailwind Integration**:
    - **Toolbar**: Switched to a robust `flex-wrap` layout to handle all screen sizes and global CSS conflicts (like Flowbite).
    - **Search Input**: Implemented inline styles (`padding-left: 2.5rem !important`) to guaranteed search icon spacing.
    - **Rows Dropdown**: Reverted to native browser controls to eliminate "double arrow" glitches.
- **Visual Consistency**: Replaced all Shadcn-specific classes (`muted`, `accent`) with standard Tailwind gray scales for better standalone support.
- **Dependencies**: Added `clsx` and `tailwind-merge` as direct dependencies.
- **Alignment**: Fixed vertical centering of icons and inputs.

## [1.1.3] - 2026-01-11

### Fixed
- **Toolbar Alignment**: Fixed issue where search and page size controls were centered on mobile or some CSS frameworks. Now forced to left-align on mobile (`items-start`) and center-align vertically on desktop (`sm:items-center`).

## [1.1.2] - 2026-01-11

### Fixed
- **Dependency Resolution**: Fixed `Failed to resolve import "@/lib/utils"` error by replacing alias imports with relative paths in internal components.
- **Dependencies**: Added `clsx` and `tailwind-merge` as direct dependencies to ensure the `cn` utility works out of the box without requiring the consumer to alias paths.
- **Internal Structure**: Included `src/lib/utils.js` within the package to avoid external dependency on the consuming project's file structure.

## [1.1.1] - 2026-01-07
 
 ### Fixed
 - **Column Alignment**: Fixed issue where `align` property was being ignored on non-fixed columns.
 - **Header Alignment**: Headers now correctly respect the `align` property (left, center, right) using flexbox controls.
 - **Fixed Column Padding**: Added explicit padding (`!pr-6`) to boundary fixed columns to prevent text from overlapping the shadow.
 - **Fixed Column Shadow**: Improved shadow positioning (`right: 0`) to avoid double-border visual glitches.
 
 ### Changed
 - **Pagination UX**: Eliminated "blinking" empty table between page loads. Now retains current data with a loading overlay until new data arrives.
 
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
- **Inertia Integration**: Built-in router support for Laravel + Inertia apps

### Dependencies
- Vue 3 (peer dependency)
- Tailwind CSS (peer dependency)
- @vueuse/core (peer dependency)
- @inertiajs/vue3 (peer dependency)
