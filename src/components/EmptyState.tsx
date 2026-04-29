import React from 'react';
import { motion } from 'framer-motion';
import { Search, School, FolderOpen, FileX, Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  type?: 'search' | 'schools' | 'data' | 'files' | 'generic';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const emptyStateConfig = {
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters',
    gradient: 'from-slate-400 to-slate-500',
  },
  schools: {
    icon: School,
    title: 'No schools yet',
    description: 'Get started by adding your first school to the platform',
    gradient: 'from-accent-blue to-accent-indigo',
    actionLabel: 'Add School',
  },
  data: {
    icon: FolderOpen,
    title: 'No data available',
    description: 'There is no data to display at the moment',
    gradient: 'from-amber-400 to-orange-500',
  },
  files: {
    icon: FileX,
    title: 'No files found',
    description: 'Upload files to see them here',
    gradient: 'from-rose-400 to-pink-500',
  },
  generic: {
    icon: Inbox,
    title: 'Nothing here yet',
    description: 'This section is waiting for content',
    gradient: 'from-emerald-400 to-teal-500',
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {/* 3D-style Icon Container */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative mb-6"
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-20 blur-2xl rounded-full scale-150`} />
        
        {/* Icon background */}
        <div className={`relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-lg`}>
          <Icon size={36} className="text-white" strokeWidth={1.5} />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white/80 shadow-sm" />
        <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-slate-200/80" />
      </motion.div>

      {/* Text content */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-lg font-semibold text-slate-800 mb-2"
      >
        {displayTitle}
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-slate-500 max-w-xs mb-6"
      >
        {displayDescription}
      </motion.p>

      {/* Action button */}
      {(displayActionLabel || onAction) && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 transition-colors shadow-soft hover:shadow-soft-lg"
        >
          <Plus size={16} />
          {displayActionLabel || 'Get Started'}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;
