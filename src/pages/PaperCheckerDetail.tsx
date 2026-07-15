import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, User, Mail, Phone, Users, Shield, Loader2, AlertCircle, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { paperCheckerService } from '../api/services/paperCheckerService';
import DashboardLayout from '../components/DashboardLayout';

// ── Edit Assignment Modal ──────────────────────────────────────────
const EditAssignmentModal: React.FC<{
  checkerId: number | string;
  assignment: any;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ checkerId, assignment, onClose, onUpdated }) => {
  const [portion, setPortion] = useState(assignment.portion || 'full');
  
  const initialStudentIds = useMemo(() => {
    if (Array.isArray(assignment.students)) {
      return assignment.students.map((s: any) => typeof s === 'object' ? s.id : s).join(', ');
    } else if (Array.isArray(assignment.student_ids)) {
      return assignment.student_ids.join(', ');
    } else if (assignment.student_ids) {
      return assignment.student_ids;
    }
    return '';
  }, [assignment]);

  const [studentIds, setStudentIds] = useState(initialStudentIds);

  const mutation = useMutation({
    mutationFn: () => paperCheckerService.updateAssignment(checkerId, assignment.id || assignment.subject?.id || assignment.subject_id, {
      portion,
      student_ids: studentIds ? studentIds.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n)) : [],
    }),
    onSuccess: () => {
      toast.success('Assignment updated successfully!');
      onUpdated();
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Failed to update assignment';
      toast.error(msg);
    },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><BookOpen size={18} /> Edit Assignment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Portion</label>
            <select value={portion} onChange={e => setPortion(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition">
              <option value="full">Full</option>
              <option value="half">Half</option>
              <option value="quarter">Quarter</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Student IDs (optional)</label>
            <input value={studentIds} onChange={e => setStudentIds(e.target.value)}
              placeholder="e.g. 10, 15"
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition" />
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">Enter specific student IDs separated by commas</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-655 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Delete Assignment Modal ────────────────────────────────────────
const DeleteAssignmentModal: React.FC<{
  checkerId: number | string;
  assignment: any;
  onClose: () => void;
  onDeleted: () => void;
}> = ({ checkerId, assignment, onClose, onDeleted }) => {
  const mutation = useMutation({
    mutationFn: () => paperCheckerService.deleteAssignment(checkerId, assignment.id || assignment.subject?.id || assignment.subject_id),
    onSuccess: () => {
      toast.success('Assignment deleted successfully!');
      onDeleted();
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Failed to delete assignment';
      toast.error(msg);
    },
  });

  const subjectName = assignment.subject?.name || assignment.subject_name || assignment.subject || 'Subject';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-700 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-655 dark:text-red-400 mb-2">
            <Trash2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Delete Assignment</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Are you sure you want to remove the assignment for <span className="font-semibold text-gray-700 dark:text-slate-300">"{subjectName}"</span>? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 pt-5 mt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">Cancel</button>
          <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />} Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PaperCheckerDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checker, setChecker] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Fetch all checkers and find this specific one
  // Alternatively, we could fetch by ID if an endpoint existed, but list API is safe.
  const { data: checkers = [], isLoading, error } = useQuery({
    queryKey: ['paper-checkers'],
    queryFn: paperCheckerService.listCheckers,
    initialData: () => {
      try {
        const cached = sessionStorage.getItem('paper_checkers');
        return cached ? JSON.parse(cached) : undefined;
      } catch {
        return undefined;
      }
    }
  });

  useEffect(() => {
    if (checkers.length > 0) {
      const found = checkers.find((c: any) => String(c.id) === String(id));
      if (found) setChecker(found);
    }
  }, [checkers, id]);

  const assignments = Array.isArray(checker?.assignments || checker?.assigned_subjects)
    ? (checker.assignments || checker.assigned_subjects)
    : (checker?.assigned_subject || checker?.subject ? [
        {
          subject: checker.assigned_subject || checker.subject,
          portion: checker.portion || 'FULL',
          students: checker.assigned_students || checker.students,
          student_ids: checker.assigned_student_ids || checker.student_ids
        }
      ] : []);

  if (isLoading) {
    return (
      <DashboardLayout activePage="paper-checkers">
        <div className="flex items-center justify-center h-[60vh] gap-3 text-slate-500">
          <Loader2 className="animate-spin text-blue-600" size={24} /><span>Loading checker details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || (!isLoading && !checker)) {
    return (
      <DashboardLayout activePage="paper-checkers">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertCircle size={48} className="text-red-400" />
          <h2 className="text-xl font-bold text-gray-900">Checker Not Found</h2>
          <button onClick={() => navigate('/admin/paper-checkers')} className="text-blue-600 hover:underline">Go Back</button>
        </div>
      </DashboardLayout>
    );
  }

  const name = [checker.first_name, checker.last_name].filter(Boolean).join(' ') || checker.email?.split('@')[0] || 'Unknown Checker';

  return (
    <DashboardLayout activePage="paper-checkers">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/paper-checkers')} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-slate-100 flex items-center gap-3">
              {name}
              <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">Paper Checker</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed view of assignments and profile</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8 flex flex-col items-center">
            <div className="w-28 h-28 rounded-full bg-white p-1.5 border-2 border-blue-50 shadow-sm mb-5">
              {checker.profile_image ? (
                <img src={checker.profile_image} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-4xl shadow-inner">
                  {(checker.email || 'C')[0].toUpperCase()}
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 text-center">{name}</h2>
            <p className="text-sm text-gray-400 mb-6 font-medium">ID #{checker.id}</p>
            
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 shrink-0"><Mail size={16} /></div>
                <span className="text-gray-700 font-medium truncate">{checker.email || 'N/A'}</span>
              </div>
              {checker.phone && (
                <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 shrink-0"><Phone size={16} /></div>
                  <span className="text-gray-700 font-medium">{checker.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500 shrink-0"><Shield size={16} /></div>
                <span className="text-blue-700 font-medium">Paper Checker</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Assignments Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Assigned Subjects & Portions</h2>
                <p className="text-xs text-gray-500 font-medium">Total assignments: {assignments.length}</p>
              </div>
            </div>
            
            <div className="p-6">
              {assignments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
                  <h3 className="text-gray-700 font-bold mb-1">No assignments</h3>
                  <p className="text-sm text-gray-500">This paper checker has no subjects assigned yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assignments.map((assignment: any, idx: number) => {
                    const subjectName = assignment.subject?.name || assignment.subject_name || assignment.subject || 'Unknown Subject';
                    const portion = assignment.portion || 'FULL';
                    
                    let studentsList = 'All Students';
                    if (Array.isArray(assignment.students) && assignment.students.length > 0) {
                      studentsList = assignment.students.map((s: any) => typeof s === 'object' ? (`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || s.id) : s).join(', ');
                    } else if (Array.isArray(assignment.student_ids) && assignment.student_ids.length > 0) {
                      studentsList = assignment.student_ids.join(', ');
                    } else if (assignment.student_ids) {
                      studentsList = assignment.student_ids;
                    }

                    return (
                      <div key={idx} className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-gray-800 text-lg">{subjectName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase">{portion} PORTION</span>
                            <button onClick={() => setEditTarget(assignment)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Edit Assignment"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget(assignment)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete Assignment"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5"><Users size={14} className="text-gray-500" /> Assigned Students:</span>
                          <span className="text-gray-600 block leading-relaxed">{studentsList}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editTarget && (
          <EditAssignmentModal
            checkerId={id!}
            assignment={editTarget}
            onClose={() => setEditTarget(null)}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ['paper-checkers'] })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteAssignmentModal
            checkerId={id!}
            assignment={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={() => queryClient.invalidateQueries({ queryKey: ['paper-checkers'] })}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default PaperCheckerDetail;
