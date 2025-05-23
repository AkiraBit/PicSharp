import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';
import { FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { DataTableFacetedFilterProps } from './data-table-faceted-filter';
import { DataTableToolbar } from './data-table-toolbar';
import { isNumber } from 'radash';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  searchBy?: string;
  filters?: DataTableFacetedFilterProps<TData, TValue>[];
  defaultColumnVisibility?: VisibilityState;
  defaultSorting?: SortingState;
  data: TData[];
  manualPagination?: boolean;
  scrollable?: boolean;
  maxHeight?: number | string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchBy,
  filters,
  manualPagination = false,
  defaultColumnVisibility,
  defaultSorting,
  scrollable = false,
  maxHeight = 300,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    defaultColumnVisibility || {},
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting || []);

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: manualPagination
        ? undefined
        : {
            pageSize: 500,
            pageIndex: 0,
          },
    },

    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className='space-y-4'>
      <DataTableToolbar table={table} searchBy={searchBy} filters={filters} />
      <div
        className={`rounded-md border ${scrollable ? 'overflow-y-auto' : ''}`}
        style={{
          maxHeight: isNumber(maxHeight) ? `${maxHeight}px` : maxHeight,
        }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='dark:hover:bg-neutral-700/30'>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='dark:hover:bg-neutral-700/30'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  <div className='flex flex-col items-center justify-center'>
                    <FileText className='text-muted-foreground mb-2 h-10 w-10' />
                    <p className='text-muted-foreground text-sm'>No results found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
