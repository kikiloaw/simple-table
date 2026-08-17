<script setup lang="ts" generic="T">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { router } from '@inertiajs/vue3'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/table'

import { useDebounceFn, useWindowSize } from '@vueuse/core'

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
    fixed?: boolean | 'left' | 'right'
    width?: string
    align?: 'left' | 'center' | 'right'
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
  
  // Style & Dark Mode Props
  rowHeight?: number // Table row height in pixels (default: 38)
  oddRowColor?: string  // Tailwind color class, e.g. 'bg-white dark:bg-stone-900'
  evenRowColor?: string // Tailwind color class, e.g. 'bg-gray-50 dark:bg-stone-800/40'
  hoverColor?: string   // Tailwind color class for hover, e.g. 'hover:bg-gray-100 dark:hover:bg-stone-800'. If passed, we'll try to apply group-hover for fixed cols.
  paginationColor?: string // Hex color for active pagination button (default: #2563eb)
  rowKey?: string // Unique key for row identification (default: 'id')
  darkMode?: boolean | 'auto' | string // Controls dark mode behavior (true = force dark mode, false = light mode, string = custom class)
  darkModeClass?: string // Custom class to apply for dark mode (default: 'dark')
  darkModeBypass?: boolean | string // Bypass global root dark mode setting or pass custom dark class directly
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
  paginationColor: '#2563eb',
  rowKey: 'id',
  darkModeClass: 'dark'
})

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
    return JSON.stringify({
        page: currentPage.value,
        perPage: currentPerPage.value,
        search: searchQuery.value,
        sort: sortColumn.value,
        order: sortDirection.value,
        queryParams: props.queryParams
    })
}

async function clearCache(scope: 'all' | 'current' = 'all') {
    if (scope === 'current') {
        const key = getCacheKey()
        responseCache.value.delete(key)
    } else {
        responseCache.value.clear()
    }
    
    if (props.fetchUrl) {
        await fetchData()
    }
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
  
  const d = internalData.value as any
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    if ('current_page' in d) return true
    if (d.meta && 'current_page' in d.meta) return true
  }
  return false
})

// -- Computed: Page Sizes Normalization --
const normalizedPageSizes = computed(() => {
    if (!props.pageSizes || props.pageSizes.length === 0) return []
    
    const first = props.pageSizes[0]
    if (typeof first === 'number' || typeof first === 'string') {
        return props.pageSizes.map(v => ({ label: String(v), value: String(v) }))
    }
    
    if (typeof first === 'object' && 'label' in first && 'value' in first) {
        return props.pageSizes.map(v => ({ label: v.label, value: String(v.value) }))
    }
    
    return []
})

// -- Computed: Row height-based sizing --
const densityConfig = computed(() => {
  const height = props.rowHeight || 38
  
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

// -- Computed: Dark Mode Container Classes --
const rootContainerClasses = computed(() => {
  const classes: string[] = ['space-y-4 w-full']
  const targetDark = props.darkModeBypass ?? props.darkMode

  if (targetDark === true) {
    classes.push(props.darkModeClass || 'dark')
  } else if (typeof targetDark === 'string' && targetDark !== 'false' && targetDark !== 'auto') {
    classes.push(targetDark)
    if (targetDark !== 'dark' && targetDark !== props.darkModeClass) {
      classes.push('dark')
    }
  }

  return classes.join(' ')
})

// -- Helper Data Accessors --
const serverMeta = computed(() => {
    if (!isServerSide.value) return null
    const d = internalData.value as any
    const meta = d.meta || d
    
    const page = meta.current_page ?? 1
    const pPage = meta.per_page ?? currentPerPage.value
    const total = meta.total ?? 0
    const dataCount = Array.isArray(d.data) ? d.data.length : 0
    
    const calculatedFrom = total === 0 ? 0 : ((page - 1) * pPage) + 1
    const calculatedTo = total === 0 ? 0 : Math.min(calculatedFrom + dataCount - 1, total)

    return {
        current_page: page,
        last_page: meta.last_page ?? 1,
        per_page: pPage,
        from: meta.from ?? calculatedFrom,
        to: meta.to ?? calculatedTo,
        total: total,
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
  
  if (props.beforeRender && typeof props.beforeRender === 'function') {
    const transformed = props.beforeRender(result)
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
    let filtered = (internalData.value as any[])
    if (searchQuery.value) {
        const lowerQuery = searchQuery.value.toLowerCase()
        filtered = filtered.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(lowerQuery)
            )
        )
    }
    const total = filtered.length
    const from = total === 0 ? 0 : (currentPage.value - 1) * currentPerPage.value + 1
    const to = Math.min(from + currentPerPage.value - 1, total)

    return { from, to, total }
})

// -- Computed: Page Numbers for Pagination --
const { width } = useWindowSize()

const pageNumbers = computed(() => {
    const isMobile = width.value < 640
    const isExtraSmall = width.value < 550
    
    const current = Number(isServerSide.value ? (serverMeta.value?.current_page || 1) : currentPage.value)
    const total = Number(totalPages.value)
    const delta = isExtraSmall ? 0 : (isMobile ? 1 : 2)
    
    const pages: (number | string)[] = []
    
    pages.push(1)
    
    const rangeStart = Math.max(2, current - delta)
    const rangeEnd = Math.min(total - 1, current + delta)
    
    if (rangeStart > 2) {
        pages.push('...')
    }
    
    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i)
    }
    
    if (rangeEnd < total - 1) {
        pages.push('...')
    }
    
    if (total > 1) {
        pages.push(total)
    }
    
    return pages
})

// -- Methods --

async function fetchData(params: any = {}) {
    if (props.fetchUrl) {
        const cacheKey = getCacheKey()
        if (props.enableCache && responseCache.value.has(cacheKey)) {
            internalData.value = responseCache.value.get(cacheKey)
            return
        }
        
        isLoading.value = true

        try {
            const url = new URL(props.fetchUrl, window.location.origin)
            
            if (props.protocol === 'datatables') {
                const start = (currentPage.value - 1) * currentPerPage.value
                url.searchParams.append('start', String(start))
                url.searchParams.append('length', String(currentPerPage.value))
                url.searchParams.append('draw', String(drawCounter.value))
                
                url.searchParams.delete('page')
                url.searchParams.delete('per_page')
                
                props.columns.forEach((col, index) => {
                    const colName = typeof col.sortable === 'string' ? col.sortable : col.key
                    const isSortable = !!col.sortable
                    const isSearchable = true
                    
                    url.searchParams.append(`columns[${index}][data]`, col.key)
                    url.searchParams.append(`columns[${index}][name]`, colName)
                    url.searchParams.append(`columns[${index}][searchable]`, String(isSearchable))
                    url.searchParams.append(`columns[${index}][orderable]`, String(isSortable))
                    url.searchParams.append(`columns[${index}][search][value]`, '') 
                    url.searchParams.append(`columns[${index}][search][regex]`, 'false')
                })

                url.searchParams.append('search[value]', searchQuery.value || '')
                url.searchParams.append('search[regex]', 'false')

                if (sortColumn.value) {
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

            if (props.queryParams) {
                Object.keys(props.queryParams).forEach(key => {
                    const value = props.queryParams![key]
                    if (value !== null && value !== undefined) {
                        url.searchParams.append(key, String(value))
                    }
                })
            }

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
            
            emit('fetched', data)
            
            if (props.protocol === 'datatables') {
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
                
                drawCounter.value++
            }
            
            internalData.value = data
            
            if (props.enableCache) {
                responseCache.value.set(cacheKey, data)
            }
        } catch (error) {
            console.error('Failed to fetch table data', error)
        } finally {
            isLoading.value = false
        }
    } else if (isServerSide.value) {
        let data: any = {}

        if (props.protocol === 'datatables') {
            const start = params.page 
                ? (params.page - 1) * currentPerPage.value 
                : (currentPage.value - 1) * currentPerPage.value
                
            data = {
                draw: drawCounter.value,
                start: start,
                length: currentPerPage.value,
                'search[value]': params.search ?? searchQuery.value ?? '',
                ...props.queryParams
            }

            if (params.sort || sortColumn.value) {
                const colKey = params.sort ?? sortColumn.value
                const colDir = params.order ?? sortDirection.value
                
                const columnIndex = props.columns.findIndex(col => {
                    const sortKey = typeof col.sortable === 'string' ? col.sortable : col.key
                    return sortKey === colKey
                })
                
                if (columnIndex !== -1) {
                    data['order[0][column]'] = columnIndex
                    data['order[0][dir]'] = colDir
                }
            }
            
            drawCounter.value++
        } else {
            data = { 
                page: params.page ?? currentPage.value,
                per_page: currentPerPage.value,
                search: params.search ?? searchQuery.value,
                sort: params.sort ?? sortColumn.value,
                order: params.order ?? sortDirection.value,
                ...(props.queryParams || {})
            }
        }

        router.visit(window.location.pathname, {
            data,
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => isLoading.value = true,
            onFinish: () => isLoading.value = false
        })
    }
}

// -- Actions --

const debouncedSearch = useDebounceFn((value: string) => {
   if (isServerSide.value) {
    if (!props.fetchUrl) {
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

function getHeaderJustifyClass(col: any) {
    if (col.align === 'center') return 'justify-center'
    if (col.align === 'right') return 'justify-end'
    return 'justify-start'
}

function getRowClass(row: any, idx: number) {
  const isOdd = idx % 2 === 0
  
  const isDefaultOdd = !props.oddRowColor || props.oddRowColor.includes('bg-white')
  const isDefaultEven = !props.evenRowColor || props.evenRowColor.includes('bg-gray-50')
  const isDefaultHover = !props.hoverColor || props.hoverColor.includes('hover:bg-gray-100')

  const classes: any[] = []

  if (isOdd) {
    if (isDefaultOdd) {
      classes.push('st-row-odd')
    } else {
      classes.push(props.oddRowColor)
    }
  } else {
    if (isDefaultEven) {
      classes.push('st-row-even')
    } else {
      classes.push(props.evenRowColor)
    }
  }

  if (!row._isGroupHeader) {
    if (isDefaultHover) {
      classes.push('st-row-hover')
    } else {
      classes.push(props.hoverColor)
    }
  }

  return classes
}

function getRowNumber(idx: number): number {
  let dataRowCount = 0
  for (let i = 0; i <= idx; i++) {
    if (!tableData.value[i]?._isGroupHeader) {
      dataRowCount++
    }
  }
  
  if (isServerSide.value) {
    const currentPage = serverMeta.value?.current_page || 1
    const perPage = serverMeta.value?.per_page || currentPerPage.value
    const offset = (currentPage - 1) * perPage
    return offset + dataRowCount
  }
  
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

async function refresh() {
    currentPage.value = 1
    await nextTick()
    
    if (props.enableCache) {
        clearCache('current')
        return
    }
    
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

// -- Helper Functions for Sticky / Fixed Columns --

function isColFixed(col: any): boolean {
  return Boolean(col && col.fixed)
}

function getColFixedDirection(col: any, index: number, columns: any[]): 'left' | 'right' | null {
  if (!col || !col.fixed) return null
  if (col.fixed === 'left') return 'left'
  if (col.fixed === 'right') return 'right'

  const isTrailingFixed = columns.slice(index).every(c => Boolean(c && c.fixed))
  if (isTrailingFixed) return 'right'

  const isLeadingFixed = columns.slice(0, index + 1).every(c => Boolean(c && c.fixed))
  if (isLeadingFixed) return 'left'

  return index >= columns.length / 2 ? 'right' : 'left'
}

function getColumnWidthNumber(col: any): number {
  if (col && col.width) {
    if (typeof col.width === 'number') return col.width
    if (typeof col.width === 'string') {
      const match = col.width.match(/^(\d+(\.\d+)?)/)
      if (match) return parseFloat(match[1])
    }
  }
  if (col && col.autonumber) {
    return 50
  }
  return 100
}

function getStickyLeftOffset(index: number) {
    let offset = 0
    for (let i = 0; i < index; i++) {
        const col = props.columns[i]
        if (getColFixedDirection(col, i, props.columns) === 'left') {
            offset += getColumnWidthNumber(col)
        }
    }
    return offset
}

function getStickyRightOffset(index: number) {
    let offset = 0
    for (let i = index + 1; i < props.columns.length; i++) {
        const col = props.columns[i]
        if (getColFixedDirection(col, i, props.columns) === 'right') {
            offset += getColumnWidthNumber(col)
        }
    }
    return offset
}

function getDeepValue(obj: any, path: string) {
    if (!path) return undefined
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj)
}

// -- Helper Styles --
function getCellClass(col: any, index: number, totalCols: number, rowIndex: number = -1) {
    let classes = ''
    
    const alignClass = col.align === 'center' ? ' text-center' : col.align === 'right' ? ' text-right' : ' text-left'
    classes += alignClass
    
    const dir = getColFixedDirection(col, index, props.columns)

    if (dir) {
        const zIndexClass = rowIndex === -1 ? 'z-40' : 'z-30'
        let stickyClass = ` whitespace-nowrap sticky ${zIndexClass} st-sticky-cell`
        
        if (dir === 'right') {
            const isFirstRightFixed = index === 0 || getColFixedDirection(props.columns[index - 1], index - 1, props.columns) !== 'right'
            if (isFirstRightFixed) {
                stickyClass += ' fixed-column-boundary-left'
            }
        } else if (dir === 'left') {
            const isLastLeftFixed = index === totalCols - 1 || getColFixedDirection(props.columns[index + 1], index + 1, props.columns) !== 'left'
            if (isLastLeftFixed) {
                stickyClass += ' fixed-column-boundary-right'
            }
        }

        let bgClass = '' 
        
        if (rowIndex !== -1) {
            const isOdd = rowIndex % 2 === 0
            if (col.class) {
                bgClass = col.class
            } else {
                bgClass = isOdd 
                    ? (props.oddRowColor && !props.oddRowColor.includes('bg-white') ? props.oddRowColor : 'st-row-odd') 
                    : (props.evenRowColor && !props.evenRowColor.includes('bg-gray-50') ? props.evenRowColor : 'st-row-even')
            }
            
            if (props.hoverColor && !props.hoverColor.includes('hover:bg-gray-100')) {
               const hoverClasses = props.hoverColor.split(' ')
               hoverClasses.forEach((cls) => {
                   if (cls.includes('hover:')) {
                       bgClass += ' ' + cls.replace('hover:', 'group-hover:')
                   }
               })
            }
        } else {
            bgClass = col.class || 'st-head st-sticky-head'
        }
        
        classes += stickyClass + ' ' + bgClass
    } else {
        if (col.class) {
            classes += ' ' + col.class
        }
    }
    return classes
}

function getCellStyle(col: any, index: number, totalCols: number) {
    const style: any = {}
    
    if (col.width) {
        const w = typeof col.width === 'number' ? `${col.width}px` : col.width
        style.width = w
        style.minWidth = w
        style.maxWidth = w
    } else if (col.fixed) {
        const defaultW = col.autonumber ? '50px' : '100px'
        style.width = defaultW
        style.minWidth = defaultW
    }

    const dir = getColFixedDirection(col, index, props.columns)
    if (dir === 'left') {
        const left = getStickyLeftOffset(index)
        style.left = `${left}px`
        style.position = 'sticky'
    } else if (dir === 'right') {
        const right = getStickyRightOffset(index)
        style.right = `${right}px`
        style.position = 'sticky'
    }
    
    return style
}

</script>

<template>
  <div :class="rootContainerClasses" class="st-container">
    <!-- Toolbar -->
    <div v-if="searchable" class="flex flex-wrap items-center justify-between gap-4 w-full st-toolbar">
      
        <!-- Left Group: Rows + Search -->
        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
            
            <!-- Rows per page -->
            <div class="flex items-center gap-2 shrink-0">
                <div class="relative h-10 w-[70px]">
                    <select 
                        :value="currentPerPage" 
                        @change="(e: any) => handlePageSizeChange(e.target.value)"
                        class="h-full w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer st-select"
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
            <div class="relative flex-1 max-w-sm min-w-[200px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="left: 0.875rem !important" class="absolute top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none st-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    style="padding-left: 2.75rem !important"
                    placeholder="Search..."
                    class="flex h-10 w-full rounded-md border !pr-3 py-2 text-sm placeholder:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 st-input"
                />
            </div>
      </div>
      
      <!-- Actions Slot -->
      <div class="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
         <slot name="actions" :rows="tableData" :columns="columns" />
      </div>
    </div>

    <!-- Table -->
    <div class="border relative rounded-md overflow-hidden st-card">
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
                class="flex items-center space-x-2 cursor-pointer select-none w-full"
                :class="getHeaderJustifyClass(col)"
                @click="handleSort(col)"
              >
                <div>{{ col.label }}</div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 opacity-50 flex-shrink-0 st-icon"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
              </div>
              <div v-else class="w-full flex" :class="getHeaderJustifyClass(col)">{{ col.label }}</div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading && tableData.length === 0">
             <TableRow>
                <TableCell :colspan="columns.length" class="h-24 text-center st-text-muted">
                    <div class="flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 animate-spin st-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    </div>
                </TableCell>
             </TableRow>
          </template>
          <template v-else-if="tableData.length">
            <TableRow 
                v-for="(row, idx) in tableData" 
                :key="getDeepValue(row, props.rowKey) ?? idx"
                class="group"
                :class="getRowClass(row, idx)"
                :style="{ height: densityConfig.cellHeight }"
            >
              <!-- Group Header Row: Single cell spanning all columns -->
              <template v-if="row._isGroupHeader">
                <TableCell :colspan="columns.length" class="border-b">
                  <div :class="[
                    'px-2', 
                    densityConfig.groupHeaderPadding, 
                    'font-semibold text-sm uppercase tracking-wide',
                    row._groupTitleClass || 'st-text-muted'
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
            <TableCell :colspan="columns.length" class="h-24 text-center st-text-muted">
              No results.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
      
      <!-- Loading Overlay -->
      <div v-if="isLoading && tableData.length > 0" class="absolute inset-0 flex items-center justify-center z-[60] st-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 animate-spin text-blue-600 st-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between flex-wrap gap-4 px-2 py-2">
        <div class="text-sm st-text-muted">
            Showing {{ paginationMeta.from }} to {{ paginationMeta.to }} of {{ paginationMeta.total }} results
        </div>
      <div class="flex items-center space-x-1">
        <!-- Previous Button -->
        <button
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border h-9 px-2 sm:px-3 st-btn"
          :disabled="(isServerSide ? Number(serverMeta?.current_page) === 1 : currentPage === 1)"
          @click="handlePageChange(isServerSide ? (Number(serverMeta?.current_page || 1)) - 1 : currentPage - 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
          <span class="ml-1 hidden sm:inline">Previous</span>
        </button>
        
        <!-- Page Number Buttons -->
        <template v-for="(page, index) in pageNumbers" :key="index">
          <!-- Ellipsis -->
          <span 
            v-if="page === '...'" 
            class="inline-flex items-center justify-center h-9 px-2 sm:px-3 text-sm st-text-muted"
          >
            ...
          </span>
          
          <!-- Page Number Button -->
          <button
            v-else
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border h-9 min-w-[36px] px-2 sm:px-3 st-btn"
            :class="[
              (isServerSide ? Number(serverMeta?.current_page) === page : currentPage === page)
                ? 'hover:bg-blue-700'
                : 'st-btn'
            ]"
            :style="(isServerSide ? Number(serverMeta?.current_page) === page : currentPage === page) ? `background-color: ${props.paginationColor || '#2563eb'} !important; color: white !important; border-color: ${props.paginationColor || '#2563eb'} !important;` : ''"
            @click="handlePageChange(page as number)"
          >
            {{ page }}
          </button>
        </template>
        
        <!-- Next Button -->
        <button
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border h-9 px-2 sm:px-3 st-btn"
          :disabled="(isServerSide ? Number(serverMeta?.current_page) === Number(serverMeta?.last_page) : currentPage === totalPages)"
          @click="handlePageChange(isServerSide ? (Number(serverMeta?.current_page || 1)) + 1 : currentPage + 1)"
        >
          <span class="mr-1 hidden sm:inline">Next</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style>
/* Base Light Theme */
.st-card {
  background-color: var(--card, #ffffff);
  border-color: var(--border, #e2e8f0);
  color: var(--card-foreground, var(--foreground, #0f172a));
}

.st-select,
.st-input {
  background-color: var(--background, #ffffff);
  color: var(--foreground, #0f172a);
  border-color: var(--input, var(--border, #e2e8f0));
}

.st-select option {
  background-color: var(--card, #ffffff);
  color: var(--foreground, #0f172a);
}

.st-head {
  background-color: var(--card, #ffffff);
  color: var(--muted-foreground, #64748b);
  border-color: var(--border, #e2e8f0);
}

.st-row-odd {
  background-color: var(--card, #ffffff);
  color: var(--foreground, #0f172a);
}

.st-row-even {
  background-color: var(--muted, #f8fafc);
  color: var(--foreground, #0f172a);
}

.st-row-hover:hover {
  background-color: var(--accent, #f1f5f9);
}

/* Sticky Column Opaque Backgrounds (Light Theme) */
.st-sticky-cell,
.st-sticky-head {
  background-color: var(--card, #ffffff);
  background-clip: padding-box;
}

th.st-sticky-cell,
.st-head.st-sticky-head {
  background-color: var(--card, #ffffff);
}

td.st-sticky-cell.st-row-even,
tr.st-row-even td.st-sticky-cell {
  background-color: var(--muted, #f8fafc);
}

td.st-sticky-cell.st-row-odd,
tr.st-row-odd td.st-sticky-cell {
  background-color: var(--card, #ffffff);
}

.group:hover td.st-sticky-cell,
tr:hover td.st-sticky-cell {
  background-color: var(--accent, #f1f5f9);
}

.st-cell {
  border-color: var(--border, #e2e8f0);
  color: var(--foreground, #0f172a);
}

.st-text-muted {
  color: var(--muted-foreground, #64748b);
}

.st-icon {
  color: var(--muted-foreground, #64748b);
}

.st-btn {
  background-color: var(--card, #ffffff);
  color: var(--foreground, #0f172a);
  border-color: var(--input, var(--border, #e2e8f0));
}

.st-btn:hover:not(:disabled) {
  background-color: var(--accent, #f1f5f9);
  color: var(--accent-foreground, #0f172a);
}

.st-overlay {
  background-color: rgba(255, 255, 255, 0.6);
}

/* Universal Dark Theme Overrides */
html.dark .st-card,
body.dark .st-card,
.dark .st-card,
.dark.st-card,
[data-theme='dark'] .st-card,
.dark-theme .st-card {
  background-color: var(--card, var(--color-card, #1e293b)) !important;
  border-color: var(--border, var(--color-border, #334155)) !important;
  color: var(--card-foreground, var(--foreground, #f8fafc)) !important;
}

html.dark .st-select,
body.dark .st-select,
.dark .st-select,
.dark.st-select,
html.dark .st-input,
body.dark .st-input,
.dark .st-input,
.dark.st-input,
[data-theme='dark'] .st-select,
[data-theme='dark'] .st-input,
.dark-theme .st-select,
.dark-theme .st-input {
  background-color: var(--background, var(--card, #0f172a)) !important;
  color: var(--foreground, #f8fafc) !important;
  border-color: var(--input, var(--border, #334155)) !important;
}

html.dark .st-select option,
body.dark .st-select option,
.dark .st-select option,
.dark.st-select option,
[data-theme='dark'] .st-select option {
  background-color: var(--card, #1e293b) !important;
  color: var(--foreground, #f8fafc) !important;
}

html.dark .st-text-muted,
body.dark .st-text-muted,
.dark .st-text-muted,
.dark.st-text-muted,
[data-theme='dark'] .st-text-muted {
  color: var(--muted-foreground, #94a3b8) !important;
}

html.dark .st-icon,
body.dark .st-icon,
.dark .st-icon,
.dark.st-icon,
[data-theme='dark'] .st-icon {
  color: var(--muted-foreground, #94a3b8) !important;
}

html.dark .st-head,
body.dark .st-head,
.dark .st-head,
.dark.st-head,
[data-theme='dark'] .st-head {
  background-color: var(--card, #1e293b) !important;
  color: var(--muted-foreground, #94a3b8) !important;
  border-color: var(--border, #334155) !important;
}

html.dark .st-row-odd,
body.dark .st-row-odd,
.dark .st-row-odd,
.dark.st-row-odd,
[data-theme='dark'] .st-row-odd,
.dark-theme .st-row-odd {
  background-color: var(--card, #1e293b) !important;
  color: var(--foreground, #f8fafc) !important;
}

html.dark .st-row-even,
body.dark .st-row-even,
.dark .st-row-even,
.dark.st-row-even,
[data-theme='dark'] .st-row-even,
.dark-theme .st-row-even {
  background-color: var(--muted, #182234) !important;
  color: var(--foreground, #f8fafc) !important;
}

html.dark .st-row-hover:hover,
body.dark .st-row-hover:hover,
.dark .st-row-hover:hover,
.dark.st-row-hover:hover,
[data-theme='dark'] .st-row-hover:hover,
.dark-theme .st-row-hover:hover {
  background-color: var(--accent, #334155) !important;
}

/* Sticky Column Opaque Backgrounds (Dark Theme) */
html.dark .st-sticky-cell,
body.dark .st-sticky-cell,
.dark .st-sticky-cell,
.dark.st-sticky-cell,
[data-theme='dark'] .st-sticky-cell,
html.dark .st-sticky-head,
body.dark .st-sticky-head,
.dark .st-sticky-head,
[data-theme='dark'] .st-sticky-head {
  background-color: var(--card, #1e293b) !important;
  background-clip: padding-box;
}

html.dark th.st-sticky-cell,
body.dark th.st-sticky-cell,
.dark th.st-sticky-cell,
[data-theme='dark'] th.st-sticky-cell {
  background-color: var(--card, #1e293b) !important;
}

html.dark td.st-sticky-cell.st-row-odd,
body.dark td.st-sticky-cell.st-row-odd,
.dark td.st-sticky-cell.st-row-odd,
[data-theme='dark'] td.st-sticky-cell.st-row-odd,
html.dark tr.st-row-odd td.st-sticky-cell,
body.dark tr.st-row-odd td.st-sticky-cell,
.dark tr.st-row-odd td.st-sticky-cell,
[data-theme='dark'] tr.st-row-odd td.st-sticky-cell {
  background-color: var(--card, #1e293b) !important;
}

html.dark td.st-sticky-cell.st-row-even,
body.dark td.st-sticky-cell.st-row-even,
.dark td.st-sticky-cell.st-row-even,
[data-theme='dark'] td.st-sticky-cell.st-row-even,
html.dark tr.st-row-even td.st-sticky-cell,
body.dark tr.st-row-even td.st-sticky-cell,
.dark tr.st-row-even td.st-sticky-cell,
[data-theme='dark'] tr.st-row-even td.st-sticky-cell {
  background-color: var(--muted, #182234) !important;
}

html.dark .group:hover td.st-sticky-cell,
html.dark tr:hover td.st-sticky-cell,
body.dark .group:hover td.st-sticky-cell,
body.dark tr:hover td.st-sticky-cell,
.dark .group:hover td.st-sticky-cell,
.dark tr:hover td.st-sticky-cell,
[data-theme='dark'] .group:hover td.st-sticky-cell,
[data-theme='dark'] tr:hover td.st-sticky-cell {
  background-color: var(--accent, #334155) !important;
}

html.dark .st-cell,
body.dark .st-cell,
.dark .st-cell,
.dark.st-cell,
[data-theme='dark'] .st-cell,
.dark-theme .st-cell {
  border-color: var(--border, #334155) !important;
  color: var(--foreground, #f8fafc) !important;
}

html.dark .st-btn,
body.dark .st-btn,
.dark .st-btn,
.dark.st-btn,
[data-theme='dark'] .st-btn,
.dark-theme .st-btn {
  background-color: var(--card, #1e293b) !important;
  color: var(--foreground, #f8fafc) !important;
  border-color: var(--input, var(--border, #334155)) !important;
}

html.dark .st-btn:hover:not(:disabled),
body.dark .st-btn:hover:not(:disabled),
.dark .st-btn:hover:not(:disabled),
.dark.st-btn:hover:not(:disabled),
[data-theme='dark'] .st-btn:hover:not(:disabled) {
  background-color: var(--accent, #334155) !important;
  color: var(--foreground, #ffffff) !important;
}

html.dark .st-overlay,
body.dark .st-overlay,
.dark .st-overlay,
.dark.st-overlay,
[data-theme='dark'] .st-overlay {
  background-color: rgba(15, 23, 42, 0.6) !important;
}
</style>

<style scoped>
/* Fixed column boundary separator (DataTables approach) */
.fixed-column-boundary-right::after {
  content: "";
  position: absolute;
  top: 0;
  right: -10px;
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
