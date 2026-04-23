import React from 'react';
interface Column<T> { header: string; accessor: keyof T | ((item: T) => React.ReactNode); }
interface TableProps<T> { data: T[]; columns: Column<T>[]; keyExtractor: (item: T) => string | number; }

function Table<T>({ data, columns, keyExtractor }: TableProps<T>) {
  if (data.length === 0) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No data available</div>;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="border-t border-slate-100 hover:bg-slate-50">
              {columns.map((col, idx) => (
                <td key={idx} className="px-6 py-4 text-sm text-slate-700">
                  {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as unknown as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default Table;
