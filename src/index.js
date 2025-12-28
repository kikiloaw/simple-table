// Main entry point for SimpleTable package
import SimpleTable from './SimpleTable.vue'
import Table from './components/table/Table.vue'
import TableBody from './components/table/TableBody.vue'
import TableCell from './components/table/TableCell.vue'
import TableHead from './components/table/TableHead.vue'
import TableHeader from './components/table/TableHeader.vue'
import TableRow from './components/table/TableRow.vue'

// Export the main component
export default SimpleTable

// Named exports for flexibility
export {
    SimpleTable,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
}

// Vue plugin install function
export function install(app) {
    app.component('SimpleTable', SimpleTable)
    app.component('Table', Table)
    app.component('TableBody', TableBody)
    app.component('TableCell', TableCell)
    app.component('TableHead', TableHead)
    app.component('TableHeader', TableHeader)
    app.component('TableRow', TableRow)
}
