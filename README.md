# 📊 SimpleTable

> A lightweight, dependency-light DataTable component for Vue 3 with Tailwind CSS. Built for simplicity, performance, and maximum compatibility.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ Why SimpleTable?

- **🪶 Lightweight**: Uses native HTML elements (`<select>`, `<input>`, `<button>`)
- **🎨 Beautiful**: Premium Tailwind CSS styling out of the box
- **⚡ Fast**: Client-side response caching to minimize API calls
- **🔄 Flexible**: Works with Laravel, DataTables, or any REST API
- **📱 Responsive**: Mobile-first design with smart pagination
- **🎯 Type-Safe**: Full TypeScript support with autocomplete
- **🔌 Zero Dependencies**: No Radix, no Headless UI, just Vue + Tailwind

---

## 📦 Installation

### Option 1: NPM Package

```bash
npm install @kikiloaw/simple-table
```

### Option 2: Local Copy

```bash
cp -r path/to/SimpleTable /your-project/src/components/
```

---

## 🚀 Quick Start

### 1. Import the Component

```vue
<script setup>
import { ref } from 'vue'
import SimpleTable from '@kikiloaw/simple-table'

const columns = [
  { key: 'id', label: 'ID', sortable: true, width: '80px' },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status', width: '120px' }
]
</script>

<template>
  <SimpleTable 
    fetch-url="/api/users" 
    :columns="columns" 
    searchable
  />
</template>
```

### 2. Backend Setup (Laravel)

```php
public function getData(Request $request)
{
    $query = User::query();
    
    // Handle search
    if ($search = $request->input('search')) {
        $query->where('name', 'like', "%{$search}%");
    }
    
    // Handle sorting
    if ($sort = $request->input('sort')) {
        $query->orderBy($sort, $request->input('order', 'asc'));
    }
    
    return response()->json($query->paginate($request->input('per_page', 10)));
}
```

**That's it!** You now have a fully functional data table! 🎉

---

## 📖 Table of Contents

- [Core Concepts](#-core-concepts)
- [Props Reference](#-props-reference)
- [Column Configuration](#-column-configuration)
- [Features](#-features)
  - [Custom Sort Keys](#custom-sort-keys)
  - [Advanced Filtering](#advanced-filtering-query-parameters)
  - [Response Caching](#response-caching)
  - [Custom Actions](#custom-actions-and-slots)
  - [Cell Customization](#custom-cell-rendering)
- [DataTables Compatibility](#-datatables-compatibility)
- [Backend Integration](#-backend-integration)
- [Styling](#-styling-customization)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Core Concepts

### Data Modes

SimpleTable supports three data modes:

| Mode | When to Use | Example |
|------|-------------|---------|
| **`auto`** (default) | Auto-detect based on data structure | Recommended for most cases |
| **`server`** | Force server-side pagination | Large datasets (10,000+ rows) |
| **`client`** | Force client-side pagination | Small static datasets (<1,000 rows) |

### Protocol Formats

| Protocol | When to Use | Backend Library |
|----------|-------------|-----------------|
| **`laravel`** (default) | New projects, standard Laravel apps | Native Laravel pagination |
| **`datatables`** | Legacy projects, existing DataTables | Yajra DataTables |

---

## 📋 Props Reference

### Essential Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | Array | **Required** | Column definitions ([see below](#-column-configuration)) |
| `fetchUrl` | String | `null` | API endpoint for server-side data |
| `data` | Array/Object | `[]` | Static data or Laravel Paginator object |

### Behavior Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | String | `'auto'` | Data mode: `'auto'`, `'server'`, or `'client'` |
| `protocol` | String | `'laravel'` | API format: `'laravel'` or `'datatables'` |
| `searchable` | Boolean | `true` | Enable search input |
| `enableCache` | Boolean | `false` | Cache API responses |

### Pagination Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `perPage` | Number | `10` | Default rows per page |
| `pageSizes` | Array | `[10,20,30,50,100]` | Page size dropdown options |


### Advanced Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `queryParams` | Object | `{}` | Additional parameters for every request |
| `oddRowColor` | String | `'bg-background'` | Tailwind class for odd rows |
| `evenRowColor` | String | `'bg-background'` | Tailwind class for even rows |
| `hoverColor` | String | `'hover:bg-muted/50'` | Tailwind class for row hover |

---

## 🏗️ Column Configuration

### Basic Column

```javascript
{
  key: 'name',           // Required: Property key from data
  label: 'Name',         // Required: Column header text
  sortable: true,        // Optional: Enable sorting
  width: '200px',        // Optional: Fixed column width
  fixed: true,           // Optional: Sticky column (useful for actions)
  class: 'text-center'   // Optional: Additional CSS classes
}
```

### Sortable Options

| Value | Behavior | Example |
|-------|----------|---------|
| `false` | Not sortable | `sortable: false` (default) |
| `true` | Sortable using `key` | `{ key: 'name', sortable: true }` |
| `'column_name'` | Sort by custom column | `{ key: 'user.name', sortable: 'user_id' }` |

### Complete Example

```javascript
const columns = [
  // Simple sortable column
  { 
    key: 'id', 
    label: 'ID', 
    sortable: true, 
    width: '80px' 
  },
  
  // Custom sort key (for relationships)
  { 
    key: 'department.name',      // Display: department name
    label: 'Department', 
    sortable: 'department_id'    // Sort by: department_id
  },
  
  // Non-sortable column
  { 
    key: 'email', 
    label: 'Email' 
  },
  
  // Auto-numbering (row numbers instead of data)
  {
    key: 'id',
    label: '#',
    autonumber: true,
    width: '80px'
  },
  
  // Sticky actions column (always visible)
  { 
    key: 'actions', 
    label: 'Actions', 
    fixed: true,
    width: '120px'
  }
]
```

#### 💡 **When to Use Custom Sort Keys**

Use custom sort keys when:
- Displaying relationship data (e.g., `user.department.name`)
- Sorting by foreign keys instead of displayed values
- Your database column name differs from the display key

---

## 🎨 Features

### Auto-Numbering

**Display sequential row numbers instead of actual data:**

```vue
const columns = [
  { 
    key: 'id', 
    label: '#', 
    autonumber: true,
    width: '80px'
  },
  // ... other columns
]
```

**Features:**
- ✅ Displays 1, 2, 3, 4... for each data row
- ✅ Skips group headers (only counts data rows)
- ✅ Pagination-aware: Page 2 shows 11, 12, 13... (with 10 per page)
- ✅ Overrides actual column data
- ✅ Works with both server-side and client-side modes

**Example:**
```
┌────┬──────────────────┬─────────┐
│ #  │ Name             │ Status  │
├────┼──────────────────┼─────────┤
│ ACTIVE USERS                    │ ← Header (not counted)
│ 1  │ John Doe         │ Active  │
│ 2  │ Jane Smith       │ Active  │
├────┴──────────────────┴─────────┤
│ INACTIVE USERS                  │ ← Header (not counted)
│ 3  │ Bob Johnson      │ Inactive│
```

**Perfect for:**
- Sequential numbering regardless of actual IDs
- User-friendly row references
- Tables with group headers
- Paginated lists with continuous numbering

---

### Custom Sort Keys

**Problem:** You want to display `department.name` but sort by `department_id`.

**Solution:**

```vue
<script setup>
const columns = [
  { 
    key: 'department.name',      // What users see
    label: 'Department', 
    sortable: 'department_id'    // What backend sorts by
  }
]
</script>

<template>
  <SimpleTable :columns="columns" fetch-url="/api/users" />
</template>
```

**Backend receives:** `?sort=department_id&order=asc`

---

### Advanced Filtering (Query Parameters)

**Use Case:** Add filters like status, department, date range, etc.

**Performance:** Query parameters are sent with every request but **do NOT auto-refetch**. This prevents unnecessary API calls when you have multiple filters. Call `refresh()` manually when ready.

```vue
<script setup>
import { ref } from 'vue'

const tableRef = ref()
const filters = ref({
  status: 'active',
  department_id: 5,
  year: 2025
})

function applyFilters() {
  // After setting all filters, manually refresh
  tableRef.value?.refresh()
}
</script>

<template>
  <!-- Your filter UI -->
  <div class="mb-4 flex gap-4">
    <select v-model="filters.status">
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    
    <select v-model="filters.department_id">
      <option :value="1">IT</option>
      <option :value="5">HR</option>
    </select>
    
    <button @click="applyFilters" class="btn">Apply Filters</button>
  </div>

  <!-- Table with filters -->
  <SimpleTable 
    ref="tableRef"
    fetch-url="/api/users"
    :columns="columns"
    :query-params="filters"
  />
</template>
```

**Important:** Query parameters are **NOT automatically watched**. This prevents multiple API calls when you have many filters. Call `tableRef.value?.refresh()` manually when you want to refetch.

**API Request:**
```
GET /api/users?page=1&per_page=10&status=active&department_id=5&year=2025
```

**Backend:**
```php
public function getData(Request $request)
{
    $query = User::query();
    
    // Your custom filters
    if ($status = $request->input('status')) {
        $query->where('status', $status);
    }
    
    if ($deptId = $request->input('department_id')) {
        $query->where('department_id', $deptId);
    }
    
    return response()->json($query->paginate($request->per_page));
}
```

---

### Response Caching

**Benefit:** Reduce API calls when users navigate back to previously viewed pages.

```vue
<SimpleTable 
  fetch-url="/api/users"
  :columns="columns"
  enable-cache  <!-- 👈 Add this -->
/>
```

**How it works:**
1. User goes to Page 1 → API call made, response cached
2. User goes to Page 2 → API call made, response cached
3. User goes back to Page 1 → **No API call** (uses cache)

**Clear cache after data changes:**

```vue
<script setup>
const tableRef = ref()

function handleCreate() {
  // After creating/updating data
  tableRef.value?.clearCache()
  tableRef.value?.refresh()
}
</script>

<template>
  <SimpleTable ref="tableRef" enable-cache />
</template>
```

#### ✅ **When to Enable Caching**

- ✅ Reference data (countries, departments, etc.)
- ✅ Historical data that doesn't change
- ✅ User wants to revisit previous pages

#### ❌ **When NOT to Enable Caching**

- ❌ Real-time dashboards
- ❌ Frequently updated data
- ❌ Collaborative editing interfaces

---

### Custom Actions and Slots

**Add custom buttons to the toolbar with access to table data:**

```vue
<script setup>
import { Download, Printer, Trash } from 'lucide-vue-next'

const handleExport = (type, rows) => {
  console.log(`Exporting ${rows.length} rows as ${type}`)
  
  if (type === 'csv') {
    const csv = rows.map(row => 
      `${row.id},${row.name},${row.email}`
    ).join('\n')
    
    downloadCSV(csv, 'export.csv')
  }
}

const handleBulkDelete = (rows) => {
  const ids = rows.map(r => r.id)
  if (confirm(`Delete ${ids.length} items?`)) {
    axios.delete('/api/bulk-delete', { data: { ids } })
  }
}

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
</script>

<template>
  <SimpleTable :columns="columns" fetch-url="/api/users">
    <template #actions="{ rows, columns }">
      <Button @click="handleExport('csv', rows)">
        <Download class="mr-2 h-4 w-4" />
        Export ({{ rows.length }})
      </Button>
      
      <Button @click="handleExport('excel', rows)">
        <Download class="mr-2 h-4 w-4" />
        Excel
      </Button>
      
      <Button @click="handleBulkDelete(rows)" variant="destructive">
        <Trash class="mr-2 h-4 w-4" />
        Bulk Delete
      </Button>
    </template>
  </SimpleTable>
</template>
```

**Slot Props:**
- **`rows`**: Currently visible table data (array of objects)
- **`columns`**: Column definitions (array of column config)

**Use Cases:**
- ✅ Custom export buttons (CSV, Excel, PDF)
- ✅ Bulk actions (delete, update, approve)
- ✅ Print functionality
- ✅ Custom filters or search
- ✅ Integration with third-party libraries


---

### Group Headers

**Organize your table data with full-width group headers:**

```vue
<script setup>
const addGroupHeaders = (rows) => {
  // Sort by category first
  const sorted = [...rows].sort((a, b) => 
    (a.category || '').localeCompare(b.category || '')
  )
  
  const result = []
  let currentCategory = null
  
  sorted.forEach(row => {
    const category = row.category || 'Uncategorized'
    
    // When category changes, add a header row
    if (category !== currentCategory) {
      result.push({
        _isGroupHeader: true,      // Special flag
        _groupTitle: category,      // Header text
        // Add empty values for all columns
        ...Object.fromEntries(
          Object.keys(row).map(key => [key, ''])
        )
      })
      currentCategory = category
    }
    
    result.push(row)
  })
  
  return result
}
</script>

<template>
  <SimpleTable 
    :columns="columns"
    :before-render="addGroupHeaders"
    odd-row-color="bg-gray-50"
    even-row-color="bg-white"
    fetch-url="/api/data"
  />
</template>
```

**Result:**
```
┌────────────────────────────────────────┐
│ CATEGORY A                             │  ← Full-width header
├─────┬──────────┬──────────┬────────────┤
│ 1   │ Item 1   │ $100     │ Active     │
│ 2   │ Item 2   │ $200     │ Active     │
├─────┴──────────┴──────────┴────────────┤
│ CATEGORY B                             │  ← Full-width header
├─────┬──────────┬──────────┬────────────┤
│ 3   │ Item 3   │ $150     │ Inactive   │
```

**How It Works:**
1. Use `beforeRender` callback to transform data
2. Insert rows with `_isGroupHeader: true` flag
3. Component renders these as full-width cells with `colspan`
4. Striping continues correctly across all rows

**Grouping Examples:**

```vue
// Group by first letter
const groupByLetter = (rows) => {
  const sorted = [...rows].sort((a, b) => 
    a.name.localeCompare(b.name)
  )
  
  const result = []
  let currentLetter = null
  
  sorted.forEach(row => {
    const letter = row.name.charAt(0).toUpperCase()
    
    if (letter !== currentLetter) {
      result.push({
        _isGroupHeader: true,
        _groupTitle: letter,
      })
      currentLetter = letter
    }
    
    result.push(row)
  })
  
  return result
}

// Group by date range
const groupByDate = (rows) => {
  const sorted = [...rows].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  )
  
  const result = []
  let currentMonth = null
  
  sorted.forEach(row => {
    const month = new Date(row.created_at).toLocaleDateString('en', { 
      year: 'numeric', 
      month: 'long' 
    })
    
    if (month !== currentMonth) {
      result.push({
        _isGroupHeader: true,
        _groupTitle: month,
      })
      currentMonth = month
    }
    
    result.push(row)
  })
  
  return result
}

// Group by status
const groupByStatus = (rows) => {
  const active = rows.filter(r => r.is_active)
  const inactive = rows.filter(r => !r.is_active)
  
  return [
    { _isGroupHeader: true, _groupTitle: 'Active Items' },
    ...active,
    { _isGroupHeader: true, _groupTitle: 'Inactive Items' },
    ...inactive
  ]
}
```

**Styling Group Headers:**

The component applies these classes to group header rows:
- `border-b border-gray-200` - Bottom border
- Font styling via the inner div
- Row striping colors (odd-row-color / even-row-color)

You can customize by overriding row colors:
```vue
<SimpleTable 
  :before-render="addGroupHeaders"
  odd-row-color="bg-blue-50"
  even-row-color="bg-white"
/>
```

---

### Data Transformation (beforeRender)

**Transform data before it's rendered in the table:**

```vue
<script setup>
import dayjs from 'dayjs'

const transformData = (rows) => {
  return rows.map(row => ({
    ...row,
    // Add computed properties
    full_name: `${row.first_name} ${row.last_name}`,
    
    // Format dates
    created_at_formatted: dayjs(row.created_at).format('MMM D, YYYY'),
    
    // Add status badge classes
    status_class: row.status === 'active' ? 'text-green-600' : 'text-red-600',
    
    // Transform arrays
    tags_joined: row.tags?.join(', ') || 'No tags',
    
    // Add custom logic
    is_urgent: row.priority > 8,
    days_since_created: dayjs().diff(dayjs(row.created_at), 'days')
  }))
}
</script>

<template>
  <SimpleTable 
    :columns="columns" 
    fetch-url="/api/users"
    :before-render="transformData"
  />
</template>
```

**When to Use:**
- ✅ Format dates, numbers, or currencies
- ✅ Combine multiple fields into one
- ✅ Add computed properties
- ✅ Transform nested objects to flat properties
- ✅ Add CSS classes based on data
- ✅ Filter unwanted rows (return modified array)

**Example - Adding Full Names:**
```vue
<script setup>
const columns = [
  { key: 'full_name', label: 'Name' },  // Not in API response
  { key: 'email', label: 'Email' },
  { key: 'created_at_formatted', label: 'Joined' }
]

const beforeRender = (rows) => {
  return rows.map(row => ({
    ...row,
    full_name: `${row.first_name} ${row.last_name}`,
    created_at_formatted: new Date(row.created_at).toLocaleDateString()
  }))
}
</script>

<template>
  <SimpleTable 
    :columns="columns" 
    :before-render="beforeRender"
    fetch-url="/api/users" 
  />
</template>
```

**Execution Order:**
1. Data fetched from API
2. Filtering & Searching (client-side only)
3. Sorting (client-side only)
4. Pagination (client-side only)
5. **`beforeRender` called** ← Your transformation here
6. Rows rendered in table

---

### Custom Cell Rendering

**Customize how data is displayed in specific columns:**

```vue
<SimpleTable :columns="columns" fetch-url="/api/users">
  <!-- Custom status badge -->
  <template #cell-status="{ row }">
    <span 
      :class="row.status === 'active' ? 'badge-success' : 'badge-danger'"
    >
      {{ row.status }}
    </span>
  </template>
  
  <!-- Custom actions column -->
  <template #cell-actions="{ row }">
    <button @click="edit(row)" class="btn-sm">Edit</button>
    <button @click="delete(row)" class="btn-sm btn-danger">Delete</button>
  </template>
</SimpleTable>
```

**Slot Naming:** `#cell-{columnKey}`

---

## 🔄 DataTables Compatibility

**Migrating from jQuery DataTables?** SimpleTable has full backward compatibility!

### Quick Migration

**Before (jQuery DataTables):**
```javascript
$('#myTable').DataTable({
    serverSide: true,
    ajax: '/api/users'
});
```

**After (SimpleTable):**
```vue
<SimpleTable 
  fetch-url="/api/users"
  :columns="columns"
  protocol="datatables"  <!-- 👈 This is the magic! -->
/>
```

**No backend changes required!** ✅

### Request Format

**SimpleTable sends:**
```
GET /api/users?start=0&length=10&draw=1&search[value]=john&order[0][column]=1&order[0][dir]=asc
```

| Parameter | Description | Example |
|-----------|-------------|---------|
| `start` | Record offset | `0`, `10`, `20` |
| `length` | Records per page | `10`, `25`, `50` |
| `draw` | Request counter | `1`, `2`, `3` |
| `search[value]` | Search query | `john`, `admin` |
| `order[0][column]` | Column index to sort | `0`, `1`, `2` |
| `order[0][dir]` | Sort direction | `asc`, `desc` |

### Response Format

**Your backend should return:**

```json
{
  "draw": 1,
  "recordsTotal": 100,
  "recordsFiltered": 50,
  "data": [
    { "id": 1, "name": "John", "email": "john@example.com" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `draw` | Echo back the request's draw parameter |
| `recordsTotal` | Total records before filtering |
| `recordsFiltered` | Total records after filtering/search |
| `data` | Array of data objects |

### Backend Implementation

#### With Yajra DataTables (Recommended)

```php
use Yajra\DataTables\Facades\DataTables;

public function getData(Request $request)
{
    return DataTables::of(User::query())->make(true);
}
```

#### Manual Implementation

```php
public function getData(Request $request)
{
    $query = User::query();
    $recordsTotal = $query->count();
    
    // Apply search
    if ($search = $request->input('search.value')) {
        $query->where('name', 'like', "%{$search}%");
    }
    
    $recordsFiltered = $query->count();
    
    // Apply sorting
    if ($columnIndex = $request->input('order.0.column')) {
        $columns = ['id', 'name', 'email', 'created_at'];
        $column = $columns[$columnIndex] ?? 'id';
        $dir = $request->input('order.0.dir', 'asc');
        $query->orderBy($column, $dir);
    }
    
    // Paginate
    $start = $request->input('start', 0);
    $length = $request->input('length', 10);
    $data = $query->skip($start)->take($length)->get();
    
    return response()->json([
        'draw' => (int) $request->input('draw'),
        'recordsTotal' => $recordsTotal,
        'recordsFiltered' => $recordsFiltered,
        'data' => $data
    ]);
}
```

---

## 🔌 Backend Integration

### Laravel (Standard Pagination)

```php
public function getData(Request $request)
{
    $query = User::query();
    
    // 1. Search
    if ($search = $request->input('search')) {
        $query->where('name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
    }
    
    // 2. Sort
    if ($sort = $request->input('sort')) {
        $query->orderBy($sort, $request->input('order', 'asc'));
    }
    
    // 3. Paginate
    return response()->json($query->paginate($request->input('per_page', 10)));
}
```

### Expected Response

```json
{
  "current_page": 1,
  "data": [...],
  "last_page": 10,
  "per_page": 10,
  "total": 100,
  "from": 1,
  "to": 10
}
```

---

## 🎨 Styling Customization

### Row Colors

```vue
<SimpleTable 
  odd-row-color="bg-white"
  even-row-color="bg-gray-50"
  hover-color="hover:bg-blue-50"
/>
```

### Tailwind Configuration

Ensure your `tailwind.config.js` includes these colors:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        }
      }
    }
  }
}
```

Or define CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}
```

---

## 🐛 Troubleshooting

### Data Not Loading

**Check:**
1. ✅ Is `fetch-url` correct?
2. ✅ Does backend return the right format?
3. ✅ Open Network tab - any errors?
4. ✅ CORS enabled on backend?

### Sorting Not Working

**For Laravel:**
```vue
<SimpleTable :columns="columns" />
<!-- Make sure sortable is set correctly -->
```

**For DataTables:**
```vue
<SimpleTable protocol="datatables" :columns="columns" />
<!-- Column index must match backend expectations -->
```

### Pagination Numbers Not Showing

Check your browser console for errors. The pagination feature requires the updated package (v1.0.3+).

### Cache Not Clearing

```vue
<script setup>
const table = ref()

// Manually clear cache
table.value?.clearCache()
table.value?.refresh()
</script>

<template>
  <SimpleTable ref="table" enable-cache />
</template>
```

---

## 📝 Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@update:search` | `string` | Emitted when search query changes |
| `@update:sort` | `{ column, direction }` | Emitted when sort changes |
| `@page-change` | `number` | Emitted when page changes |
| `@export` | `{ format, data }` | Emitted when export is triggered |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Ghandi Galila**

---

## 🌟 Support

If you find this package helpful, please give it a ⭐ on GitHub!

---

**Made with ❤️ for the Vue community**
