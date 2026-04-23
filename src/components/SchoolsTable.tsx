import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export interface SchoolRow {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

interface SchoolsTableProps {
  schools: SchoolRow[];
  isLoading: boolean;
  error: string;
  onDelete?: (school: SchoolRow) => void;
  onEdit?: (school: SchoolRow) => void;
}

const SchoolsTable: React.FC<SchoolsTableProps> = ({ schools, isLoading, error, onDelete, onEdit }) => {
  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading schools...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  if (schools.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No schools found.</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">School Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created Date</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {schools.map((school) => (
              <tr key={school.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">{school.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{school.location}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{school.createdAt}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(school)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Edit ${school.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(school)}
                      className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete ${school.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SchoolsTable;
