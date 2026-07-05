import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'framer-motion';

const ComingSoon: React.FC<{ title: string }> = ({ title }) => {
  return (
    <DashboardLayout activePage={title.toLowerCase().replace(' ', '-')}>
      <div className="flex h-[80vh] flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-50 border border-indigo-100 shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="h-12 w-12 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22v-5m-4 5v-3m8 3v-4M4 10h16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          </svg>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-gray-500 max-w-md mx-auto"
        >
          This module is currently under active development. We are working hard to bring you powerful new features soon.
        </motion.p>
      </div>
    </DashboardLayout>
  );
};

export default ComingSoon;
