import { DefineComponent } from 'vue'

export interface SimpleTableColumn {
  key: string
  label: string
  sortable?: boolean | string
  class?: string
  fixed?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  autonumber?: boolean
}

export interface SimpleTableProps {
  data?: any[] | Record<string, any>
  columns: SimpleTableColumn[]
  mode?: 'auto' | 'server' | 'client'
  protocol?: 'laravel' | 'datatables'
  searchable?: boolean
  perPage?: number
  pageSizes?: any[]
  fetchUrl?: string
  beforeRender?: (rows: any[]) => any[]
  enableCache?: boolean
  queryParams?: Record<string, any>
  rowHeight?: number
  oddRowColor?: string
  evenRowColor?: string
  hoverColor?: string
  paginationColor?: string
  rowKey?: string
  darkMode?: boolean | 'auto' | string
  darkModeClass?: string
  darkModeBypass?: boolean | string
}

declare const SimpleTable: DefineComponent<SimpleTableProps, {}, any>
declare const Table: DefineComponent<{}, {}, any>
declare const TableBody: DefineComponent<{}, {}, any>
declare const TableCell: DefineComponent<{}, {}, any>
declare const TableHead: DefineComponent<{}, {}, any>
declare const TableHeader: DefineComponent<{}, {}, any>
declare const TableRow: DefineComponent<{}, {}, any>

export default SimpleTable
export {
  SimpleTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
}
