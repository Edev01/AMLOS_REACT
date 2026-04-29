import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, MapPin, Calendar, Building2, MoreHorizontal } from 'lucide-react';
import EmptyState from './EmptyState';
import { TableSkeleton } from './Skeleton';

export interface SchoolRow {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  status?: 'active' | 'pending' | 'inactive';
  students?: number;
  teachers?: number;
}

interface SchoolsTableProps {
  schools: SchoolRow[];
  isLoading: boolean;
  error: string;
  onDelete?: (school: SchoolRow) => void;
  onEdit?: (school: SchoolRow) => void;
}

// Status Badge Component with Glow
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    active: { 
      label: 'Active', 
      class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
      dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
    },
    pending: { 
      label: 'Pending', 
      class: 'bg-amber-50 text-amber-700 border-amber-200',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.3)]',
      dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
    },
    inactive: { 
      label: 'Inactive', 
      class: 'bg-slate-50 text-slate-600 border-slate-200',
      glow: '',
      dot: 'bg-slate-400'
    },
  };

  const cfg = config[status as keyof typeof config] || config.inactive;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.class} ${cfg.glow}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// Table Row Component
const TableRow: React.FC<{ 
  school: SchoolRow; 
  index: number;
  onEdit?: (school: SchoolRow) => void;
  onDelete?: (school: SchoolRow) => void;
}> = ({ school, index, onEdit, onDelete }) => {
  // Generate random status for demo
  const statuses: ('active' | 'pending' | 'inactive')[] = ['active', 'active', 'active', 'pending', 'inactive'];
  const status = school.status || statuses[index % statuses.length];
  
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group hover:bg-slate-50/80 transition-colors duration-200"
    >
      {/* School Name with Avatar */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-indigo text-white shadow-sm group-hover:shadow-glow-blue transition-shadow">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-800 group-hover:text-accent-blue transition-colors">
              {school.name}
            </p>
            <p className="text-xs text-slate-400">ID: {school.id.slice(0, 8)}</p>
          </div>
        </div>
      </td>

      {/* Location */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin size={14} className="text-slate-400" />
          <span>{school.location}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <StatusBadge status={status} />
      </td>

      {/* Stats */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
              <span className="text-xs font-semibold text-emerald-600">S</span>
            </div>
            <span className="text-slate-600">{school.students || Math.floor(Math.random() * 500 + 100)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-accent-purple/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-accent-purple">T</span>
            </div>
            <span className="text-slate-600">{school.teachers || Math.floor(Math.random() * 50 + 10)}</span>
          </div>
        </div>
      </td>

      {/* Created Date */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={14} />
          <span>{school.createdAt}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onEdit?.(school)}
            className="rounded-lg p-2 text-slate-500 hover:bg-accent-blue/10 hover:text-accent-blue transition-colors"
            aria-label={`Edit ${school.name}`}
          >
            <Pencil size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onDelete?.(school)}
            className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
            aria-label={`Delete ${school.name}`}
          >
            <Trash2 size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <MoreHorizontal size={16} />
          </motion.button>
        </div>
      </td>
    </motion.tr>
  );
};

const SchoolsTable: React.FC<SchoolsTableProps> = ({ schools, isLoading, error, onDelete, onEdit }) => {
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-sm p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <span className="text-rose-500 text-lg">!</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-800">Error loading schools</p>
            <p className="text-xs text-rose-600">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (schools.length === 0) {
    return (
      <EmptyState 
        type="schools" 
        onAction={() => window.location.href = '/schools/add'}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">School</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stats</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {schools.map((school, index) => (
              <TableRow 
                key={school.id} 
                school={school} 
                index={index}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-navy-800">{schools.length}</span> schools
        </p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 hover:bg-slate-50 rounded-lg transition-colors">
            Previous
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 hover:bg-slate-50 rounded-lg transition-colors">
            Next
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SchoolsTable;
