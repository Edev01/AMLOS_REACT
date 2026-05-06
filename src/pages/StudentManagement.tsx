import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { studentService } from '../api/services/studentService';
import { useAuth } from '../context/AuthContext';
import { Student as StudentType, UpdateStudentPayload } from '../types';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

const icons = ['🎓', '📚', '🌟', '🏆', '📖', '🎯'];
const bgs = ['bg-blue-100', 'bg-green-100', 'bg-amber-100', 'bg-pink-100', 'bg-purple-100', 'bg-teal-100'];

const normalizeStudent = (raw: any): StudentType => {
  if (!raw || typeof raw !== 'object') return raw;
  const firstName = raw.first_name ?? raw.firstName ?? '';
  const lastName = raw.last_name ?? raw.lastName ?? '';
  const fullName = raw.full_name ?? raw.name ?? (firstName || lastName ? `${firstName} ${lastName}`.trim() : undefined) ?? raw.username ?? 'Unnamed';
  return {
    ...raw,
    full_name: fullName,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    email: raw.email ?? raw.school_email ?? raw.contact_email ?? undefined,
    dob: raw.dob ?? raw.date_of_birth ?? raw.birth_date ?? raw.enrollment_date ?? undefined,
    class_grade: raw.class_grade ?? raw.grade ?? raw.class ?? undefined,
    section: raw.section ?? undefined,
    guardian_name: raw.guardian_name ?? raw.parent_name ?? raw.guardian ?? undefined,
    guardian_contact: raw.guardian_phone ?? raw.guardian_contact ?? raw.parent_contact ?? raw.phone ?? undefined,
    guardian_phone: raw.guardian_phone ?? undefined,
    student_id: raw.student_id ?? raw.roll_number ?? raw.id ?? undefined,
  };
};

const StudentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant } = useAuth();
  const [students, setStudents] = useState<StudentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isForbidden, setIsForbidden] = useState(false);

  // Edit modal state
  const [editingStudent, setEditingStudent] = useState<StudentType | null>(null);
  const [editForm, setEditForm] = useState<Partial<UpdateStudentPayload>>({});
  const [editSaving, setEditSaving] = useState(false);

  const schoolId = tenant.schoolId || user?.school_id;
  const tenantId = tenant.campusId || user?.campus_id;

  // Determine correct route prefix for navigation
  const routePrefix = tenantId ? `/campus/${tenantId}` : '/school';

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    setIsForbidden(false);

    try {
      if (!schoolId) {
        setError('No school ID found in your session. Please log in again.');
        setLoading(false);
        return;
      }

      const rawList = await studentService.getStudents();
      setStudents(rawList.map(normalizeStudent));
      setLoading(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setIsForbidden(true);
        setError('Access Denied: You do not have permission to view students for this school.');
        toast.error('Permission Denied: You cannot access students from another school.', {
          duration: 5000,
          id: 'student-forbidden',
        });
      } else {
        setError('Failed to load students. Please try again.');
      }
      setLoading(false);
    }
  }, [schoolId]);

  const handleDelete = useCallback(async (student: StudentType) => {
    if (!window.confirm(`Delete student "${student.full_name || 'this student'}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await studentService.deleteStudent(student.id);
      toast.success('Student deleted successfully.');
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch {
      toast.error('Failed to delete student. Please try again.');
    }
  }, []);

  const openEdit = useCallback((student: StudentType) => {
    setEditingStudent(student);
    setEditForm({
      student_id: student.id,
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      grade: student.class_grade || student.grade || '',
      section: student.section || '',
      roll_number: student.roll_number || student.student_id || '',
      state: student.state || '',
      guardian_name: student.guardian_name || student.parent_name || '',
      guardian_phone: student.guardian_phone || student.guardian_contact || student.parent_contact || '',
      guardian_email: student.guardian_email || student.email || '',
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditingStudent(null);
    setEditForm({});
    setEditSaving(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingStudent) return;
    setEditSaving(true);
    try {
      const payload: UpdateStudentPayload = {
        student_id: editingStudent.id,
        ...editForm,
      };
      await studentService.updateStudent(payload);
      toast.success('Student updated successfully.');
      closeEdit();
      fetchStudents();
    } catch {
      toast.error('Failed to update student. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }, [editingStudent, editForm, fetchStudents, closeEdit]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      (s.full_name?.toLowerCase().includes(q)) ||
      (s.email?.toLowerCase().includes(q)) ||
      (s.class_grade?.toLowerCase().includes(q)) ||
      (s.student_id?.toString().toLowerCase().includes(q)) ||
      (s.guardian_name?.toLowerCase().includes(q))
    );
  }, [students, search]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading students…</p>
        </div>
      </div>
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
    <div className="min-h-screen bg-gray-50/50 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate(routePrefix + '/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #0f2057 0%, #1e40af 100%)' }}
            >
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
              <p className="text-sm text-gray-500">
                {filtered.length} student{filtered.length !== 1 ? 's' : ''} enrolled
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(routePrefix + '/students/add')}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
              boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.45)',
            }}
          >
            <Plus size={16} />
            Add New Student
          </motion.button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, class, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300 shadow-sm"
          />
        </div>
      </motion.div>

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
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${bgs[i % bgs.length]}`}>
                {icons[i % icons.length]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-gray-900 truncate">{s.full_name || 'Unnamed'}</h3>
                <p className="text-xs text-gray-400 truncate">
                  ID: {s.student_id || 'N/A'} · {s.class_grade || 'N/A'} {s.section ? `(${s.section})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <Mail size={13} className="text-gray-400" />
              <p className="text-xs text-gray-500 truncate">{s.email || 'N/A'}</p>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <Phone size={13} className="text-gray-400" />
              <p className="text-xs text-gray-500 truncate">{s.guardian_contact || 'N/A'}</p>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <Users size={13} className="text-gray-400" />
              <p className="text-xs text-gray-500 truncate">
                {s.guardian_name || 'N/A'} {s.guardian_relation ? `· ${s.guardian_relation}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5">
                <BookOpen size={12} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700">{s.class_grade || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5">
                <Hash size={12} className="text-green-600" />
                <span className="text-xs font-bold text-green-700">{s.section || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-700">Active</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toast.success('View detail coming soon.')}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="View"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => openEdit(s)}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No students found</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            {search.trim()
              ? 'No students match your search. Try different keywords.'
              : 'There are no students enrolled yet. Add your first student to get started.'}
          </p>
          {!search.trim() && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(routePrefix + '/students/add')}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
                boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.45)',
              }}
            >
              <Plus size={16} />
              Add New Student
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingStudent}
        onClose={closeEdit}
        title={editingStudent ? `Edit: ${editingStudent.full_name || 'Student'}` : 'Edit Student'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
              <input
                type="text"
                value={editForm.first_name || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
              <input
                type="text"
                value={editForm.last_name || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Grade</label>
              <input
                type="text"
                value={editForm.grade || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Grade 10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Section</label>
              <input
                type="text"
                value={editForm.section || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. A"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Roll Number</label>
            <input
              type="text"
              value={editForm.roll_number || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, roll_number: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. ROLL-2024-001"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
            <input
              type="text"
              value={editForm.state || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. Punjab"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Guardian Name</label>
            <input
              type="text"
              value={editForm.guardian_name || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, guardian_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Parent / Guardian full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Guardian Phone</label>
              <input
                type="tel"
                value={editForm.guardian_phone || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, guardian_phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="+92 300 1234567"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Guardian Email</label>
              <input
                type="email"
                value={editForm.guardian_email || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, guardian_email: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="guardian@email.com"
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
    </div>
  );
};

export default StudentManagement;
