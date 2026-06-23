import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCog, Shield, Loader2, AlertTriangle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { userService } from '../api/services/userService';

const AVAILABLE_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'SCHOOL_ADMIN',
  'CAMPUS_ADMIN',
  'SCHOOL',
  'TEACHER',
  'STUDENT',
];

const RoleManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  // Simple debounce for search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: () => userService.searchUsers(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number | string; role: string }) => 
      userService.updateUserRole(userId, { role }),
    onSuccess: () => {
      toast.success('User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to update user role');
    }
  });

  const handleUpdateClick = (user: any) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'STUDENT');
  };

  const handleConfirmUpdate = () => {
    if (!selectedUser) return;
    updateRoleMutation.mutate({
      userId: selectedUser.id || selectedUser._id,
      role: selectedRole
    });
  };

  // Extract users array from response
  let usersList: any[] = [];
  if (Array.isArray(usersData)) {
    usersList = usersData;
  } else if (usersData?.results && Array.isArray(usersData.results)) {
    usersList = usersData.results;
  } else if (usersData?.data && Array.isArray(usersData.data)) {
    usersList = usersData.data;
  }

  return (
    <DashboardLayout activePage="role-management">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="mt-1 text-sm text-slate-500">Search for users and manage their access roles.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {debouncedSearch.length < 2 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
                <Search size={28} />
              </div>
              <p className="font-medium text-slate-700">Type at least 2 characters to search</p>
              <p className="text-sm mt-1">Search via names or emails to find users.</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center p-12 text-blue-600">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span className="font-medium">Searching users...</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <UserCog size={28} />
              </div>
              <p className="font-medium text-slate-700">No users found</p>
              <p className="text-sm mt-1">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Current Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usersList.map((user) => (
                  <tr key={user.id || user._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-blue-700 font-bold">
                          {(user.first_name?.[0] || user.username?.[0] || user.name?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.first_name} {user.last_name} {user.name ? `(${user.name})` : ''}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Mail size={12} /> {user.email || user.username || 'No email provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                        <Shield size={12} />
                        {user.role || 'NONE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleUpdateClick(user)}
                        className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                      >
                        <UserCog size={14} /> Change Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedUser && (
          <Modal
            isOpen={!!selectedUser}
            onClose={() => !updateRoleMutation.isPending && setSelectedUser(null)}
            title="Change User Role"
          >
            <div className="p-2">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                <div className="h-10 w-10 shrink-0 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600 font-bold border border-slate-200">
                  {(selectedUser.first_name?.[0] || selectedUser.username?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                  <p className="text-xs text-slate-500">{selectedUser.email || selectedUser.username}</p>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <label className="block text-sm font-semibold text-slate-700">Assign New Role</label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {AVAILABLE_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setSelectedUser(null)}
                  disabled={updateRoleMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpdate}
                  disabled={updateRoleMutation.isPending || selectedRole === selectedUser.role}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateRoleMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Update'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default RoleManagement;
