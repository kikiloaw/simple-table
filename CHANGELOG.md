# Changelog

All notable changes to SimpleTable will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
