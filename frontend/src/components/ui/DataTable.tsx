import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { TableSkeleton } from './Skeleton'
import { cn } from '@/lib/utils'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  isLoading?: boolean
  pageSize?: number
  emptyMessage?: string
  /** When provided, each row becomes clickable (and keyboard-activatable) and invokes this. */
  onRowClick?: (row: T) => void
}

export default function DataTable<T>({
  data,
  columns,
  isLoading = false,
  pageSize = 10,
  emptyMessage = 'No data found.',
  onRowClick,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  })

  if (isLoading) {
    return <TableSkeleton rows={pageSize > 5 ? 5 : pageSize} cols={columns.length} />
  }

  if (!data.length) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-8 text-center text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-left">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                        {...(header.column.getCanSort() ? {
                          role: 'button' as const,
                          tabIndex: 0,
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              header.column.getToggleSortingHandler()?.(e)
                            }
                          },
                          'aria-sort': header.column.getIsSorted() === 'asc' ? 'ascending' as const : header.column.getIsSorted() === 'desc' ? 'descending' as const : 'none' as const,
                        } : {})}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                {...(onRowClick
                  ? {
                      role: 'button' as const,
                      tabIndex: 0,
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row.original)
                        }
                      },
                    }
                  : {})}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-700/30',
                  onRowClick &&
                    'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-3 dark:text-gray-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            {' '}-{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length
            )}
            {' '}of {data.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-4 py-2.5 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-4 py-2.5 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
