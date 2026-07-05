import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherService } from '../api/services/teacherService';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Teacher as TeacherType, UpdateTeacherPayload } from '../types';
import Modal from '../components/Modal';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Pencil,
  Mail,
  Phone,
  Users,
  GraduationCap,
  BookOpen,
  Hash,
  ChevronLeft,
  AlertCircle,
  Save,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';

const icons = ['🎓', '📚', '🌟', '🏆', '📖', '🎯'];
const bgs = ['bg-blue-100', 'bg-green-100', 'bg-amber-100', 'bg-pink-100', 'bg-purple-100', 'bg-teal-100'];

const normalizeteacher = (raw: any): TeacherType => {
  if (!raw || typeof raw !== 'object') return raw;
  const firstName = raw.first_name ?? raw.firstName ?? '';
  const lastName = raw.last_name ?? raw.lastName ?? '';
  const fullName = raw.full_name ?? raw.name ?? (firstName || lastName ? `${firstName} ${lastName}`.trim() : undefined) ?? raw.username ?? 'Unnamed';
  return {
    ...raw,
    full_name: fullName,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    email: raw.email ?? undefined,
    dob: raw.dob ?? raw.date_of_birth ?? raw.birth_date ?? raw.enrollment_date ?? undefined,
    subject: raw.subject ?? undefined,
    qualification: raw.qualification ?? undefined,
    experience_years: raw.experience_years ?? undefined,
    salary: raw.salary ?? undefined,
    phone: raw.phone ?? undefined,
    teacher_id: raw.teacher_id ?? raw.id ?? undefined,
  };
};

const TeacherManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant } = useAuth();
  const queryClient = useQueryClient();
  const [teachers, setteachers] = useState<TeacherType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [isForbidden, setIsForbidden] = useState(false);

  // Edit modal state
  const [editingteacher, setEditingteacher] = useState<TeacherType | null>(null);
  const [editForm, setEditForm] = useState<Partial<UpdateTeacherPayload> & { academic_year?: string }>({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete modal state
  const [deletingteacher, setDeletingteacher] = useState<TeacherType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const schoolId = tenant.schoolId || user?.school_id;
  const tenantId = tenant.campusId || user?.campus_id;

  // Determine correct route prefix for navigation
  const routePrefix = tenantId ? `/campus/${tenantId}` : '/school';

  const fetchteachers = useCallback(async () => {
    setLoading(true);
    setError('');
    setIsForbidden(false);

    try {
      if (!schoolId) {
        setError('No school ID found in your session. Please log in again.');
        setLoading(false);
        return;
      }

      const rawList = await teacherService.getTeachers();
      setteachers(rawList.map(normalizeteacher));
      setLoading(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setIsForbidden(true);
        setError('Access Denied: You do not have permission to view teachers for this school.');
        toast.error('Permission Denied: You cannot access teachers from another school.', {
          duration: 5000,
          id: 'teacher-forbidden',
        });
      } else {
        setError('Failed to load teachers. Please try again.');
      }
      setLoading(false);
    }
  }, [schoolId]);

  const handleDelete = useCallback(async () => {
    if (!deletingteacher) return;
    setIsDeleting(true);
    try {
      await teacherService.deleteTeacher(deletingteacher.id);
      toast.success('Teacher deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setteachers((prev) => prev.filter((s) => s.id !== deletingteacher.id));
      setDeletingteacher(null);
    } catch (error: any) {
      console.error('[teacher Delete Error]:', error.response?.data || error.message || error);
      toast.error(error.response?.data?.message || 'Failed to delete teacher. Please check permissions and try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingteacher, queryClient]);

  const openEdit = useCallback((teacher: TeacherType) => {
    setEditingteacher(teacher);
    setEditForm({
      teacher_id: teacher.id,
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      subject: teacher.subject || '',
      qualification: teacher.qualification || '',
      experience_years: teacher.experience_years || '',
      salary: teacher.salary || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditingteacher(null);
    setEditForm({});
    setEditSaving(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingteacher) return;
    setEditSaving(true);
    try {
      const finalizedteacherPayload = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        subject: editForm.subject,
        qualification: editForm.qualification,
        experience_years: editForm.experience_years,
        salary: editForm.salary,
      };

      await teacherService.updateTeacher(editingteacher.id, finalizedteacherPayload);
      toast.success('teacher updated successfully.');
      
      // Explicitly fire data invalidate command
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      
      closeEdit();
      fetchteachers();
    } catch (error: any) {
      console.error('[teacher Update Error]:', error.response?.data || error.message || error);
      toast.error(error.response?.data?.message || 'Failed to update teacher. Please check the validation details.');
    } finally {
      setEditSaving(false);
    }
  }, [editingteacher, editForm, fetchteachers, closeEdit, queryClient]);

  useEffect(() => { fetchteachers(); }, [fetchteachers]);

  const filtered = useMemo(() => {
    if (filter === 'All') return teachers;
    return teachers.filter((s) => s.subject === filter || s.subject?.includes(filter));
  }, [teachers, filter]);

  if (loading) {
    return (
      <DashboardLayout activePage="all-teachers">
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-sm text-gray-500 font-medium">Loading teachers…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isForbidden) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate(routePrefix + '/dashboard')}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout activePage="all-teachers">
      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full sm:max-w-xs rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm"
        >
          <option value="All">All Subjects</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Biology">Biology</option>
          <option value="English">English</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2"
        >
          <AlertCircle size={18} />
          {error}
        </motion.div>
      )}

      {/* Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            onClick={() => navigate(`/school/teachers/${s.id}`)}
            className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`flex h-11 w-11 shrink-0 overflow-hidden items-center justify-center rounded-xl text-xl ${!s.profile_image ? bgs[i % bgs.length] : 'bg-gray-100'}`}>
                {s.profile_image ? (
                  <img 
                    src={`${s.profile_image}?v=1`} 
                    alt={s.full_name} 
                    className="h-full w-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      // Fallback icon could be injected here, but to keep it simple, we hide the broken image
                      // and show a default background.
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="flex items-center justify-center w-full h-full ${bgs[i % bgs.length]}">${icons[i % icons.length]}</span>`;
                    }}
                  />
                ) : (
                  icons[i % icons.length]
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-gray-900 truncate">{s.full_name || 'Unnamed'}</h3>
                <p className="text-xs text-gray-400 truncate">
                  {s.qualification ? `${s.qualification} · ` : ''}{s.experience_years ? `${s.experience_years} yrs exp` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <Mail size={13} className="text-gray-400" />
              <p className="text-xs text-gray-500 truncate">{s.email || 'N/A'}</p>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <Phone size={13} className="text-gray-400" />
              <p className="text-xs text-gray-500 truncate">{s.phone || 'N/A'}</p>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <Users size={13} className="text-gray-400" />
              <p className="text-xs text-gray-500 truncate">
                PKR {s.salary || 'N/A'}
              </p>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5">
                <BookOpen size={12} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700">{s.subject || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-gray-50">
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/school/teachers/${s.id}`); }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="View"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletingteacher(s); }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <GraduationCap size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No teachers found</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            {filter !== 'All'
              ? 'No teachers match your filter. Try different grades.'
              : 'There are no teachers enrolled yet. Add your first teacher to get started.'}
          </p>

        </motion.div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingteacher}
        onClose={closeEdit}
        title={editingteacher ? `Edit: ${editingteacher.full_name || 'teacher'}` : 'Edit teacher'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
              <input
                type="text"
                value={editForm.first_name || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, first_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
              <input
                type="text"
                value={editForm.last_name || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, last_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
              <input
                type="text"
                value={editForm.subject || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, subject: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Qualification</label>
              <input
                type="text"
                value={editForm.qualification || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, qualification: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. M.Sc Physics"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Experience (Years)</label>
              <input
                type="number"
                value={editForm.experience_years || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, experience_years: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Salary</label>
              <input
                type="number"
                value={editForm.salary || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, salary: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. 50000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="+92 300 1234567"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="teacher@school.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeEdit}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)' }}
            >
              <Save size={14} />
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingteacher && (
          <Modal
            isOpen={!!deletingteacher}
            onClose={() => setDeletingteacher(null)}
            title="Delete Teacher"
          >
            <div className="flex flex-col items-center text-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete</p>
              <p className="text-sm font-bold text-gray-800 mb-4">"{deletingteacher.full_name || 'this teacher'}"?</p>
              <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setDeletingteacher(null)} 
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 size={14} className="animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default TeacherManagement;
