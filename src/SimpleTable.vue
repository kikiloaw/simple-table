<script setup lang="ts" generic="T">
import { computed, ref, watch, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/table'



import { useDebounceFn } from '@vueuse/core'

/**
 * Props definition
 */
interface Props {
  data?: any[] | Record<string, any> // Array for client-side, Object (Paginator) for server-side
  columns: {
    key: string
    label: string
    sortable?: boolean | string // true for default (use key), string for custom backend column name
    class?: string
    fixed?: boolean // 'left' or 'right' could be added later, assuming 'right' for actions usually
    width?: string
    autonumber?: boolean // If true, display auto-incremented row numbers instead of data
  }[]
  mode?: 'auto' | 'server' | 'client'
  protocol?: 'laravel' | 'datatables' // API request/response format
  searchable?: boolean
  perPage?: number
  pageSizes?: any[] // number[] or { label: string, value: number }[]
  fetchUrl?: string
  
  // Callbacks
  beforeRender?: (rows: any[]) => any[] // Transform data before rendering
  
  // Cache Props
  enableCache?: boolean // If true, cache responses by page/search/sort to avoid redundant requests
  
  // Additional Query Parameters
  queryParams?: Record<string, any> // Additional parameters to send with every request (e.g., filters, user context)
  
  // Style Props
  rowHeight?: number // Table row height in pixels (default: 38)
  oddRowColor?: string  // Tailwind color class, e.g. 'bg-white'
  evenRowColor?: string // Tailwind color class, e.g. 'bg-gray-50'
  hoverColor?: string   // Tailwind color class for hover, e.g. 'hover:bg-gray-100'. If passed, we'll try to apply group-hover for fixed cols.
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  columns: () => [],
  mode: 'auto',
  protocol: 'laravel',
  searchable: true,
  enableCache: false,
  queryParams: () => ({}),
  perPage: 10,
  pageSizes: () => [10, 20, 30, 50, 100],
  rowHeight: 38,
  oddRowColor: 'bg-white',
  evenRowColor: 'bg-gray-50',
  hoverColor: 'hover:bg-gray-100'
})



// ...

// -- Computed: Page Sizes Normalization --
const normalizedPageSizes = computed(() => {
    if (!props.pageSizes || props.pageSizes.length === 0) return []
    
    // Check first item type
    const first = props.pageSizes[0]
    
    // If simple numbers [10, 20]
    if (typeof first === 'number' || typeof first === 'string') {
        return props.pageSizes.map(v => ({ label: String(v), value: String(v) }))
    }
    
    // If objects [{ label: 'All', value: 999 }, { label: '20', value: 20 }]
    if (typeof first === 'object' && 'label' in first && 'value' in first) {
        return props.pageSizes.map(v => ({ label: v.label, value: String(v.value) }))
    }
    
    // Fallback?
    return []
})

// -- Computed: Row height-based sizing --
const densityConfig = computed(() => {
  const height = props.rowHeight || 38
  
  // Calculate padding based on height
  // For 38px height: use p-2 (8px)
  // For 48px height: use p-3 (12px)  
  // For 56px+ height: use p-4 (16px)
  let cellPadding = 'p-2'
  let headerPadding = 'px-2'
  let groupHeaderPadding = 'py-1'
  
  if (height >= 56) {
    cellPadding = 'p-4'
    headerPadding = 'px-4'
    groupHeaderPadding = 'py-2'
  } else if (height >= 44) {
    cellPadding = 'p-3'
    headerPadding = 'px-3'
    groupHeaderPadding = 'py-1.5'
  }
  
  return {
    cellPadding,
    cellHeight: `${height}px`,
    headerHeight: `h-[${height}px]`,
    headerPadding,
    groupHeaderPadding
  }
})



// <template>
// ...
/*
      <div class="flex items-center gap-2 ml-auto">
          <!-- Mini Export Buttons -->
          <Button 
            v-if="exportable || enableCsv" 
            variant="outline" 
            size="icon" 
            class="h-8 w-8"
            title="Export CSV"
            @click="handleExport('csv')"
         >
            <FileText class="h-4 w-4 text-green-600" />
         </Button>
         <Button 
            v-if="exportable || enableExcel" 
            variant="outline" 
            size="icon" 
            class="h-8 w-8"
            title="Export Excel"
            @click="handleExport('excel')"
         >
            <Sheet class="h-4 w-4 text-emerald-600" />
         </Button>
         <Button 
            v-if="exportable || enablePdf" 
            variant="outline" 
            size="icon" 
            class="h-8 w-8"
            title="Export PDF"
            @click="handleExport('pdf')"
         >
             <!-- Using Download icon for PDF or maybe FileText? Let's use Download for generic or find a PDF-like icon. FileText is close. -->
            <FileText class="h-4 w-4 text-red-600" />
         </Button>
         <slot name="actions" />
      </div>
*/

const emit = defineEmits(['update:search', 'update:sort', 'page-change', 'fetched'])

// -- State --
const searchQuery = ref('')
const sortColumn = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const isLoading = ref(false)

const currentPerPage = ref(props.perPage)
const drawCounter = ref(1) // For DataTables protocol


// -- Cache System --
const responseCache = ref<Map<string, any>>(new Map())

function getCacheKey(): string {
    // Create a unique key based on current state
    return JSON.stringify({
        page: currentPage.value,
        perPage: currentPerPage.value,
        search: searchQuery.value,
        sort: sortColumn.value,
        order: sortDirection.value,
        queryParams: props.queryParams
    })
}

function clearCache() {
    responseCache.value.clear()
}

// Internal data state to handle both props updates and ajax updates
const internalData = ref(props.data)

watch(() => props.data, (newVal) => {
    internalData.value = newVal
}, { deep: true })

// -- Computed: Mode Detection --
const isServerSide = computed(() => {
  if (props.mode === 'server') return true
  if (props.mode === 'client') return false
  if (props.fetchUrl) return true
  
  // Auto detect
  const d = internalData.value as any
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    if ('current_page' in d) return true
    if (d.meta && 'current_page' in d.meta) return true
  }
  return false
})

// -- Helper Data Accessors --
const serverMeta = computed(() => {
    if (!isServerSide.value) return null
    const d = internalData.value as any
    // Handle standard Laravel Paginator or Resource Collection
    const meta = d.meta || d
    return {
        current_page: meta.current_page ?? 1,
        last_page: meta.last_page ?? 1,
        per_page: meta.per_page ?? currentPerPage.value,
        from: meta.from ?? 0,
        to: meta.to ?? 0,
        total: meta.total ?? 0,
        links: meta.links ?? []
    }
})

// -- Computed: Data Normalization --
const tableData = computed(() => {
  let result: any[] = []
  
  if (isServerSide.value) {
    const d = internalData.value as any
    result = d.data || []
  } else {
    // Client Side Processing
    let items = [...(internalData.value as any[])]

    // 1. Filter
    if (searchQuery.value) {
      const lowerQuery = searchQuery.value.toLowerCase()
      items = items.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(lowerQuery)
        )
      )
    }

    // 2. Sort
    if (sortColumn.value) {
      items.sort((a, b) => {
        const valA = a[sortColumn.value]
        const valB = b[sortColumn.value]
        if (valA === valB) return 0
        const comparison = valA > valB ? 1 : -1
        return sortDirection.value === 'asc' ? comparison : -comparison
      })
    }

    // 3. Paginate
    const start = (currentPage.value - 1) * currentPerPage.value
    const end = start + currentPerPage.value
    result = items.slice(start, end)
  }
  
  // Apply beforeRender callback if provided
  if (props.beforeRender && typeof props.beforeRender === 'function') {
    const transformed = props.beforeRender(result)
    // Ensure callback returns an array
    if (Array.isArray(transformed)) {
      result = transformed
    }
  }
  
  return result
})

const totalPages = computed(() => {
  if (isServerSide.value) {
    return serverMeta.value?.last_page || 1
  }
  let filtered = (internalData.value as any[])
   if (searchQuery.value) {
      const lowerQuery = searchQuery.value.toLowerCase()
      filtered = filtered.filter((item) =>
      Object.values(item).some((val) =>
          String(val).toLowerCase().includes(lowerQuery)
      )
      )
  }
  return Math.ceil(filtered.length / currentPerPage.value) || 1
})

const paginationMeta = computed(() => {
    if (isServerSide.value) {
        return serverMeta.value || { from: 0, to: 0, total: 0 }
    }
    // Client side meta
    let filtered = (internalData.value as any[])
     if (searchQuery.value) {
        const lowerQuery = searchQuery.value.toLowerCase()
        filtered = filtered.filter((item) =>
        Object.values(item).some((val) =>
            String(val).toLowerCase().includes(lowerQuery)
        )
        )
    }
    const total = filtered.length;
    const from = total === 0 ? 0 : (currentPage.value - 1) * currentPerPage.value + 1
    const to = Math.min(from + currentPerPage.value - 1, total)

    return { from, to, total }
})

// -- Computed: Page Numbers for Pagination --
const pageNumbers = computed(() => {
    const current = isServerSide.value ? (serverMeta.value?.current_page || 1) : currentPage.value
    const total = totalPages.value
    const delta = 2 // Number of pages to show on each side of current page
    const pages: (number | string)[] = []
    
    // Always show first page
    pages.push(1)
    
    // Calculate range around current page
    const rangeStart = Math.max(2, current - delta)
    const rangeEnd = Math.min(total - 1, current + delta)
    
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
        pages.push('...')
    }
    
    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i)
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < total - 1) {
        pages.push('...')
    }
    
    // Always show last page if there's more than one page
    if (total > 1) {
        pages.push(total)
    }
    
    return pages
})

// -- Methods --

async function fetchData(params: any = {}) {
    if (props.fetchUrl) {
        // Check cache first if enabled
        const cacheKey = getCacheKey()
        if (props.enableCache && responseCache.value.has(cacheKey)) {
            // Use cached data
            internalData.value = responseCache.value.get(cacheKey)
            return
        }
        
        isLoading.value = true
        try {
            // Construct Query Parameters
            const url = new URL(props.fetchUrl, window.location.origin)
            
            if (props.protocol === 'datatables') {
                // DataTables format
                const start = (currentPage.value - 1) * currentPerPage.value
                url.searchParams.append('start', String(start))
                url.searchParams.append('length', String(currentPerPage.value))
                url.searchParams.append('draw', String(drawCounter.value))
                
                if (searchQuery.value) {
                    url.searchParams.append('search[value]', searchQuery.value)
                }
                
                if (sortColumn.value) {
                    // Find column index
                    const columnIndex = props.columns.findIndex(col => {
                        const sortKey = typeof col.sortable === 'string' ? col.sortable : col.key
                        return sortKey === sortColumn.value
                    })
                    
                    if (columnIndex !== -1) {
                        url.searchParams.append('order[0][column]', String(columnIndex))
                        url.searchParams.append('order[0][dir]', sortDirection.value)
                    }
                }
            } else {
                // Laravel format (default)
                url.searchParams.append('page', String(currentPage.value))
                url.searchParams.append('per_page', String(currentPerPage.value))
                
                if (searchQuery.value) {
                    url.searchParams.append('search', searchQuery.value)
                }
                if (sortColumn.value) {
                    url.searchParams.append('sort', sortColumn.value)
                    url.searchParams.append('order', sortDirection.value)
                }
            }

            // Add custom query params from prop
            if (props.queryParams) {
                Object.keys(props.queryParams).forEach(key => {
                    const value = props.queryParams![key]
                    if (value !== null && value !== undefined) {
                        url.searchParams.append(key, String(value))
                    }
                })
            }

            // Merge passed params (these override queryParams if there's a conflict)
            Object.keys(params).forEach(key => {
                 url.searchParams.set(key, String(params[key]))
            })

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            let data = await response.json()
            
            // Transform DataTables response to internal format
            if (props.protocol === 'datatables') {
                // DataTables response: { draw, recordsTotal, recordsFiltered, data }
                // Transform to Laravel format internally
                const totalRecords = data.recordsFiltered || data.recordsTotal || 0
                const totalPages = Math.ceil(totalRecords / currentPerPage.value)
                
                data = {
                    data: data.data || [],
                    current_page: currentPage.value,
                    last_page: totalPages,
                    per_page: currentPerPage.value,
                    total: data.recordsFiltered || 0,
                    from: totalRecords > 0 ? ((currentPage.value - 1) * currentPerPage.value) + 1 : 0,
                    to: Math.min(currentPage.value * currentPerPage.value, totalRecords)
                }
                
                // Increment draw counter for next request
                drawCounter.value++
            }
            
            internalData.value = data
            emit('fetched', data)
            
            // Store in cache if enabled
            if (props.enableCache) {
                responseCache.value.set(cacheKey, data)
            }
        } catch (error) {
            console.error('Failed to fetch table data', error)
        } finally {
            isLoading.value = false
        }
    } else if (isServerSide.value) {
         router.visit(window.location.pathname, {
            data: { 
                page: params.page ?? currentPage.value,
                per_page: currentPerPage.value,
                search: params.search ?? searchQuery.value,
                sort: params.sort ?? sortColumn.value,
                order: params.order ?? sortDirection.value,
                ...(props.queryParams || {})
            },
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => isLoading.value = true,
            onFinish: () => isLoading.value = false
        })
    }
}

// ...



// ... 

// -- Template for Pagination --
/*
    <div class="flex items-center justify-between px-2">
      <!-- Left side: Meta + Page Size -->
      <div class="flex items-center gap-6">
          <div class="text-sm text-muted-foreground">
              Showing {{ paginationMeta.from }} to {{ paginationMeta.to }} of {{ paginationMeta.total }} results
          </div>
          <div class="flex items-center space-x-2">
            <p class="text-sm font-medium hidden sm:block">Rows per page</p>
            <Select 
                :model-value="String(currentPerPage)" 
                @update:model-value="handlePageSizeChange"
            >
            <SelectTrigger class="h-8 w-[70px]">
                <SelectValue :placeholder="String(currentPerPage)" />
            </SelectTrigger>
            <SelectContent side="top">
                <SelectItem 
                    v-for="pageSize in pageSizes" 
                    :key="pageSize" 
                    :value="String(pageSize)"
                >
                {{ pageSize }}
                </SelectItem>
            </SelectContent>
            </Select>
          </div>
      </div>
      
      <!-- Right side: Nav Buttons -->
      <div class="flex items-center space-x-2">
        ... buttons ...
      </div>
    </div>
*/

// -- Actions --

const debouncedSearch = useDebounceFn((value: string) => {
   if (isServerSide.value) {
    if (!props.fetchUrl) {
         // Reset page for Inertia
         // We do this manually here because fetchData logic is slightly different
         fetchData({ search: value, page: 1 })
    } else {
        currentPage.value = 1
        fetchData()
    }
   } else {
     currentPage.value = 1
   }
   emit('update:search', value)
}, 300)

watch(searchQuery, (val) => {
    debouncedSearch(val)
})

function handleSort(col: any) {
  // Determine the actual column to sort by
  // If sortable is a string, use it; otherwise use the column key
  const sortKey = typeof col.sortable === 'string' ? col.sortable : col.key
  
  if (sortColumn.value === sortKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = sortKey
    sortDirection.value = 'asc'
  }

  if (isServerSide.value) {
    fetchData({ sort: sortColumn.value, order: sortDirection.value })
  }

  emit('update:sort', { column: sortColumn.value, direction: sortDirection.value })
}

function handlePageSizeChange(size: any) {
    currentPerPage.value = Number(size)
    currentPage.value = 1
    fetchData()
}

// Helper for header content alignment (justify for flex)
function getHeaderJustifyClass(col: any) {
    if (col.align === 'center') return 'justify-center'
    if (col.align === 'right') return 'justify-end'
    return 'justify-start'
}

// Get row class with simple alternating stripes (all rows)
function getRowClass(row: any, idx: number) {
  // Alternate: index 0 = white, index 1 = gray, index 2 = white, etc.
  const isOdd = idx % 2 === 0  // Changed: even index = odd color (white)
  return [
    { [props.oddRowColor]: isOdd, [props.evenRowColor]: !isOdd },
    row._isGroupHeader ? '' : props.hoverColor  // No hover on headers
  ]
}

// Get row number for auto-numbering (excluding group headers)
function getRowNumber(idx: number): number {
  // Count only data rows before this index
  let dataRowCount = 0
  for (let i = 0; i <= idx; i++) {
    if (!tableData.value[i]?._isGroupHeader) {
      dataRowCount++
    }
  }
  
  // Add offset for pagination
  if (isServerSide.value) {
    const currentPage = serverMeta.value?.current_page || 1
    const perPage = serverMeta.value?.per_page || currentPerPage.value
    const offset = (currentPage - 1) * perPage
    return offset + dataRowCount
  }
  
  // Client-side: just return the count
  return dataRowCount
}

function handlePageChange(page: number) {
  if (page < 1 || page > totalPages.value) return
  
  currentPage.value = page

  if (isServerSide.value) {
      fetchData({ page: page })
  }
  
  emit('page-change', page)
}

function refresh() {
    currentPage.value = 1
    fetchData()
}

onMounted(() => {
    if (props.fetchUrl) {
        fetchData()
    }
})

defineExpose({
    refresh,
    fetchData,
    clearCache
})


// -- Helper Functions --

function isColFixed(col: any) {
  return !!col.fixed
}

// Calculate left offset dynamically
function getStickyLeftOffset(index: number) {
    let offset = 0
    for (let i = 0; i < index; i++) {
        const col = props.columns[i]
        // Only consider left-fixed columns
        const isRightFixed = (col.fixed && i === props.columns.length - 1)
        
        if (col.fixed && !isRightFixed) {
            let w = 100 // Default width
            if (col.width) {
                 if (typeof col.width === 'string') {
                    // Extract number from "80px", "100", etc.
                    const match = col.width.match(/^(\d+(\.\d+)?)/)
                    if (match) w = parseFloat(match[1])
                 } else if (typeof col.width === 'number') {
                    w = col.width
                 }
            }
            offset += w
        }
    }
    return offset
}

// -- Helper Styles --
function getCellClass(col: any, index: number, totalCols: number, rowIndex: number = -1) {
    let classes = ''
    
    // Base classes
    
    // Add text alignment (default: left)
    const alignClass = col.align === 'center' ? ' text-center' : col.align === 'right' ? ' text-right' : ' text-left'
    classes += alignClass
    
    if (col.fixed) {
        // Sticky logic
        let stickyClass = ' whitespace-nowrap'
        
        // Check if this is the LAST left-fixed column
        // It is the last left-fixed if:
        // 1. It is NOT the last column (which is right-fixed)
        // 2. The NEXT column is NOT fixed OR is the last column (right-fixed)
        const isRightFixed = index === totalCols - 1
        
        if (isRightFixed) {
             // Last Column -> Right Sticky (shadow on LEFT side)
             stickyClass = ' sticky right-0 z-50 fixed-column-boundary-left'
        } else {
            // Left Sticky - must have high z-index to stay on top of scrolling content
            // Apply consistent shadow and border to all left-fixed columns (shadow on RIGHT side)
            stickyClass = ' sticky z-50'
        }

        // Determine background
        // Sticky cells need opaque bg.
        let bgClass = '' 
        
        if (rowIndex !== -1) {
            // Body Row
            const isOdd = rowIndex % 2 === 0
            // Use custom class if provided, otherwise use row colors
            if (col.class) {
                bgClass = col.class
            } else {
                bgClass = isOdd ? (props.oddRowColor || 'bg-white') : (props.evenRowColor || 'bg-gray-50')
            }
            
            // Should also match hover
            if (props.hoverColor) {
               const hoverParts = props.hoverColor.split(':')
               if (hoverParts.length > 1) {
                   bgClass += ` group-hover:${hoverParts[1]}`
                   if (hoverParts.length > 2) {
                       bgClass = bgClass + ':' + hoverParts.slice(2).join(':')
                   }
               }
            }
        } else {
            // Header Row - use custom class if provided, otherwise default to white
            bgClass = col.class || 'bg-white' // Must be opaque
        }
        
        // Check if this is the last left-fixed column (boundary)
        const nextCol = props.columns[index + 1]
        const isLastLeftFixed = nextCol && !nextCol.fixed
        
        if (isLastLeftFixed) {
            classes += ' fixed-column-boundary-right !pr-6'
        }
        
        classes += stickyClass + ' ' + bgClass + ' !bg-opacity-100'
    } else {
        // Non-fixed column - just add custom class if provided
        if (col.class) {
            classes += ' ' + col.class
        }
    }
    return classes
}

function getCellStyle(col: any, index: number, totalCols: number) {
    const style: any = {}
    
    if (col.width) {
        style.width = col.width
        style.minWidth = col.width
        style.maxWidth = col.width
    } else if (col.fixed) {
        style.width = '100px' // Default fixed width if not processing
        style.minWidth = '100px'
    }

    if (col.fixed) {
        // Handle Left vs Right
        if (index !== totalCols - 1) {
            // Left Sticky: Calculate directly
            const left = getStickyLeftOffset(index)
            style.left = `${left}px`
            
            // Only add separator to the LAST left-fixed column (the boundary)
            const nextCol = props.columns[index + 1]
            const isLastLeftFixed = nextCol && !nextCol.fixed
            
            if (isLastLeftFixed) {
                // Add position relative so the ::after pseudo-element works
                style.position = 'sticky' // Already sticky, but make it explicit
            }
        } else {
            // Right sticky - will use CSS class for border
        }
        // Right sticky is handled by CSS class right-0
    }
    
    return style
}

</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div v-if="searchable" class="flex flex-wrap items-center justify-between gap-4 w-full">
      
        <!-- Left Group: Rows + Search -->
        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
            
            <!-- Rows per page -->
            <div class="flex items-center gap-2 shrink-0">
                <span class="text-sm text-gray-500 whitespace-nowrap">Rows</span>
                <div class="relative h-10 w-[70px]">
                    <select 
                        :value="currentPerPage" 
                        @change="(e: any) => handlePageSizeChange(e.target.value)"
                        class="h-full w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                        <option 
                            v-for="pageSize in normalizedPageSizes" 
                            :key="pageSize.value" 
                            :value="pageSize.value"
                        >
                        {{ pageSize.label }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Search Input -->
            <div class="relative flex-1 min-w-[200px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    style="padding-left: 2.5rem !important"
                    placeholder="Search..."
                    class="flex h-10 w-full rounded-md border border-gray-300 bg-white !pr-3 !pl-10 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
      </div>
      
      <!-- Actions Slot -->
      <div class="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
         <slot name="actions" :rows="tableData" :columns="columns" />
      </div>
    </div>

    <!-- Table -->
    <div class="border bg-white relative">
      <div class="overflow-x-auto">
        <!-- We add min-w-full to Table to ensure it stretches -->
        <Table class="min-w-full table-auto"> 
        <TableHeader>
          <TableRow :style="{ height: densityConfig.cellHeight }">
            <TableHead
              v-for="(col, idx) in columns"
              :key="col.key"
              :class="getCellClass(col, idx, columns.length)"
              :style="getCellStyle(col, idx, columns.length)"
              :height="densityConfig.headerHeight"
              :padding="densityConfig.headerPadding"
            >
              <div
                v-if="col.sortable"
                class="flex items-center space-x-2 cursor-pointer select-none hover:text-gray-900 w-full"
                :class="getHeaderJustifyClass(col)"
                @click="handleSort(col)"
              >
                <div>{{ col.label }}</div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 opacity-50 flex-shrink-0"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
              </div>
              <div v-else class="w-full flex" :class="getHeaderJustifyClass(col)">{{ col.label }}</div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading && tableData.length === 0">
             <TableRow>
                <TableCell :colspan="columns.length" class="h-24 text-center">
                    <div class="flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 animate-spin text-gray-500"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    </div>
                </TableCell>
             </TableRow>
          </template>
          <template v-else-if="tableData.length">
            <TableRow 
                v-for="(row, idx) in tableData" 
                :key="idx"
                class="group"
                :class="getRowClass(row, idx)"
                :style="{ height: densityConfig.cellHeight }"
            >
              <!-- Group Header Row: Single cell spanning all columns -->
              <template v-if="row._isGroupHeader">
                <TableCell :colspan="columns.length" class="border-b border-gray-200">
                  <div :class="[
                    'px-2', 
                    densityConfig.groupHeaderPadding, 
                    'font-semibold text-sm uppercase tracking-wide',
                    row._groupTitleClass || 'text-gray-700'
                  ]">
                    {{ row._groupTitle }}
                  </div>
                </TableCell>
              </template>
              
              <!-- Regular Data Row: Individual cells -->
              <template v-else>
                <TableCell
                  v-for="(col, cIdx) in columns"
                  :key="col.key"
                  :class="getCellClass(col, cIdx, columns.length, idx)"
                  :style="getCellStyle(col, cIdx, columns.length)"
                  :padding="densityConfig.cellPadding"
                  :height="densityConfig.cellHeight"
                >
                  <!-- Auto-numbering or custom cell rendering -->
                   <div>
                      <template v-if="col.autonumber">
                        {{ getRowNumber(idx) }}
                      </template>
                      <template v-else>
                        <slot :name="`cell-${col.key}`" :row="row">
                        {{ row[col.key] }}
                        </slot>
                      </template>
                   </div>
                </TableCell>
              </template>
            </TableRow>
          </template>
          <TableRow v-else :style="{ height: densityConfig.cellHeight }">
            <TableCell :colspan="columns.length" class="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
      
      <!-- Loading Overlay -->
      <div v-if="isLoading && tableData.length > 0" class="absolute inset-0 bg-white/50 flex items-center justify-center z-[60]">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 animate-spin text-blue-600"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between px-2">
        <div class="text-sm text-gray-500">
            Showing {{ paginationMeta.from }} to {{ paginationMeta.to }} of {{ paginationMeta.total }} results
        </div>
      <div class="flex items-center space-x-1">
        <!-- Previous Button -->
        <button
          class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-100 hover:text-gray-900 h-9 px-3"
          :disabled="(isServerSide ? serverMeta?.current_page === 1 : currentPage === 1)"
          @click="handlePageChange(isServerSide ? (serverMeta?.current_page || 1) - 1 : currentPage - 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
          <span class="ml-1 hidden sm:inline">Previous</span>
        </button>
        
        <!-- Page Number Buttons -->
        <template v-for="(page, index) in pageNumbers" :key="index">
          <!-- Ellipsis -->
          <span 
            v-if="page === '...'" 
            class="inline-flex items-center justify-center h-9 px-3 text-sm text-gray-500"
          >
            ...
          </span>
          
          <!-- Page Number Button -->
          <button
            v-else
            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border h-9 min-w-[36px] px-3"
            :class="[
              (isServerSide ? serverMeta?.current_page === page : currentPage === page)
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'border-gray-300 bg-white hover:bg-gray-100 hover:text-gray-900'
            ]"
            @click="handlePageChange(page as number)"
          >
            {{ page }}
          </button>
        </template>
        
        <!-- Next Button -->
        <button
          class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-100 hover:text-gray-900 h-9 px-3"
          :disabled="(isServerSide ? serverMeta?.current_page === serverMeta?.last_page : currentPage === totalPages)"
          @click="handlePageChange(isServerSide ? (serverMeta?.current_page || 1) + 1 : currentPage + 1)"
        >
          <span class="mr-1 hidden sm:inline">Next</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fixed column boundary separator (DataTables approach) */
.fixed-column-boundary-right::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 10px;
  box-shadow: rgba(0, 0, 0, 0.2) 6px 0px 4px -4px inset;
  pointer-events: none;
}

.fixed-column-boundary-left::before {
  content: "";
  position: absolute;
  top: 0;
  left: -10px;
  bottom: 0;
  width: 10px;
  box-shadow: rgba(0, 0, 0, 0.2) -6px 0px 4px -4px inset;
  pointer-events: none;
}
</style>
