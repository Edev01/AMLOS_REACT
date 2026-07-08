import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2, Users, ClipboardList, UserCheck, BookOpen, Star, Mail, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import { paperCheckerService } from '../api/services/paperCheckerService';
import { getSubjects } from '../api/services/curriculumService';

// ── Tabs ──────────────────────────────────────────────────────────
type Tab = 'checkers' | 'submissions';

// Helper: extract most readable error message from axios error
const extractError = (e: any): string => {
  const data = e?.response?.data;
  if (!data) return e?.message || 'An unknown error occurred';
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  // Field-level errors (DRF style)
  const parts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) parts.push(`${key}: ${(val as string[]).join(', ')}`);
    else if (typeof val === 'string') parts.push(`${key}: ${val}`);
  }
  return parts.join(' | ') || 'Failed. Please try again.';
};

// ── Create Modal ──────────────────────────────────────────────────
const CreateCheckerModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ username: '', first_name: '', last_name: '', password: '', email: '', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');

  const mutation = useMutation({
    mutationFn: () => paperCheckerService.createChecker(form),
    onSuccess: () => { toast.success('Paper checker created!'); onCreated(); onClose(); },
    onError: (e: any) => {
      const msg = extractError(e);
      setApiError(msg);
      toast.error(msg);
    },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserCheck size={18} /> Add Paper Checker</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setApiError(''); mutation.mutate(); }} className="p-6 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 font-medium">{apiError}</p>
            </div>
          )}
          {/* First Name + Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">First Name</label>
              <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="First name" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Name</label>
              <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Last name" />
            </div>
          </div>
          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Username <span className="text-red-400">*</span></label>
            <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              required
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="e.g. checker1@amlos.com" />
          </div>
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Email" />
          </div>
          {/* Password with eye toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-11 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Password" />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Phone" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />} Create
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Assign Modal ───────────────────────────────────────────────────
const AssignModal: React.FC<{ checker: any; onClose: () => void }> = ({ checker, onClose }) => {
  const [subjectId, setSubjectId] = useState('');
  const [studentIds, setStudentIds] = useState('');
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects-list'], queryFn: getSubjects });

  const mutation = useMutation({
    mutationFn: () => paperCheckerService.assignToChecker(checker.id, {
      subject_id: Number(subjectId),
      student_ids: studentIds.split(',').map(s => {
        const val = s.trim();
        const num = Number(val);
        return isNaN(num) ? val : num;
      }).filter(Boolean),
    }),
    onSuccess: () => { toast.success('Assigned successfully!'); onClose(); },
    onError: (e: any) => {
      const msg = extractError(e);
      toast.error(msg);
    },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><BookOpen size={18} /> Assign Subject & Students</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
            <p className="text-xs text-violet-600 font-semibold">Checker: {[checker.first_name, checker.last_name].filter(Boolean).join(' ') || checker.email}</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Subject</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition">
              <option value="">Select Subject</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name} {s.grade ? `(Grade ${s.grade})` : ''}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Student IDs (comma-separated)</label>
            <input value={studentIds} onChange={e => setStudentIds(e.target.value)}
              placeholder="e.g. 5, 12, 18"
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition" />
            <p className="text-xs text-gray-400 mt-1">Enter half, quarter, full, or specific student IDs</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={mutation.isPending || !subjectId} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />} Assign
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Grade Modal ────────────────────────────────────────────────────
const GradeModal: React.FC<{ submission: any; onClose: () => void; onGraded: () => void }> = ({ submission, onClose, onGraded }) => {
  const [score, setScore] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const mutation = useMutation({
    mutationFn: () => paperCheckerService.gradeSubmission(submission.id, { score: Number(score), total_marks: Number(totalMarks) }),
    onSuccess: () => { toast.success('Submission graded!'); onGraded(); onClose(); },
    onError: (e: any) => {
      const msg = extractError(e);
      toast.error(msg);
    },
  });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Star size={18} /> Grade Submission</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
          {/* Permission notice */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              Note: Grading is typically performed by the assigned Paper Checker. Admin grading may be restricted by the backend.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-emerald-700 font-semibold">Student: {submission.student_name || submission.student_email || `ID: ${submission.student_id || submission.id}`}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Assessment: {submission.assessment_title || submission.title || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Score</label>
              <input type="number" value={score} onChange={e => setScore(e.target.value)} placeholder="e.g. 85"
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Marks</label>
              <input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} placeholder="100"
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={mutation.isPending || !score} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />} Submit Grade
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────
const PaperCheckerManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('checkers');
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [gradeTarget, setGradeTarget] = useState<any>(null);

  const checkersQuery = useQuery({
    queryKey: ['paper-checkers'],
    queryFn: paperCheckerService.listCheckers,
  });

  const submissionsQuery = useQuery({
    queryKey: ['checker-submissions'],
    queryFn: paperCheckerService.listSubmissions,
    enabled: tab === 'submissions',
  });

  const checkers = checkersQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];

  const statusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    const s = status.toLowerCase();
    if (s === 'graded' || s === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'submitted' || s === 'pending') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <DashboardLayout activePage="paper-checkers">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-slate-100">Paper Checker Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create paper checkers, assign subjects & students, and grade submissions</p>
      </div>

      {/* Tabs + Action */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
          {([['checkers', 'Paper Checkers', <UserCheck size={15} />], ['submissions', 'Submissions', <ClipboardList size={15} />]] as const).map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'}`}>
              {icon}{label}
            </button>
          ))}
        </div>
        {tab === 'checkers' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:from-blue-700 hover:to-indigo-700 shadow-md transition">
            <Plus size={16} /> Add Paper Checker
          </button>
        )}
      </div>

      {/* ── Checkers Tab ── */}
      {tab === 'checkers' && (
        <>
          {checkersQuery.isLoading ? (
            <div className="flex items-center justify-center h-48 gap-3 text-slate-500">
              <Loader2 className="animate-spin text-blue-600" size={24} /><span>Loading paper checkers...</span>
            </div>
          ) : checkers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <UserCheck size={40} className="text-slate-300" />
              <p className="font-semibold">No paper checkers yet</p>
              <button onClick={() => setShowCreate(true)} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus size={14} /> Create one</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {checkers.map((checker: any) => (
                <motion.div key={checker.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {checker.profile_image ? (
                        <img src={checker.profile_image} alt="avatar"
                          className="w-12 h-12 rounded-xl object-cover shadow-md" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {(checker.email || 'C')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-slate-100">
                          {[checker.first_name, checker.last_name].filter(Boolean).join(' ') || checker.email?.split('@')[0] || 'Checker'}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={11} />{checker.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full">Checker</span>
                      <span className="text-[10px] text-gray-400">ID #{checker.id}</span>
                    </div>
                  </div>
                  {checker.phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3"><Phone size={12} />{checker.phone}</p>
                  )}
                  {(checker.assigned_subject || checker.subject) && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                      <p className="text-xs text-violet-700 font-semibold flex items-center gap-1.5">
                        <BookOpen size={12} /> Subject: {(checker.assigned_subject?.name || checker.subject?.name || checker.assigned_subject || checker.subject)}
                      </p>
                    </div>
                  )}
                  <button onClick={() => setAssignTarget(checker)}
                    className="w-full mt-2 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition flex items-center justify-center gap-1.5">
                    <Users size={13} /> Assign Subject & Students
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Submissions Tab ── */}
      {tab === 'submissions' && (
        <>
          {submissionsQuery.isLoading ? (
            <div className="flex items-center justify-center h-48 gap-3 text-slate-500">
              <Loader2 className="animate-spin text-blue-600" size={24} /><span>Loading submissions...</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <ClipboardList size={40} className="text-slate-300" />
              <p className="font-semibold">No submissions found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <th className="px-6 py-4 text-left text-sm font-semibold">Student</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Assessment</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Score</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Submitted At</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {submissions.map((sub: any, i: number) => (
                      <motion.tr key={sub.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{sub.student_name || sub.student_email || `Student #${sub.student_id || sub.id}`}</p>
                          {sub.student_email && <p className="text-xs text-gray-400">{sub.student_email}</p>}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-slate-300">{sub.assessment_title || sub.title || 'N/A'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColor(sub.status)}`}>
                            {sub.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-slate-200">
                          {sub.score != null ? `${sub.score}${sub.total_marks ? `/${sub.total_marks}` : ''}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => setGradeTarget(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition">
                            <Star size={12} /> Grade
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showCreate && <CreateCheckerModal onClose={() => setShowCreate(false)} onCreated={() => queryClient.invalidateQueries({ queryKey: ['paper-checkers'] })} />}
      </AnimatePresence>
      <AnimatePresence>
        {assignTarget && <AssignModal checker={assignTarget} onClose={() => setAssignTarget(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {gradeTarget && <GradeModal submission={gradeTarget} onClose={() => setGradeTarget(null)} onGraded={() => queryClient.invalidateQueries({ queryKey: ['checker-submissions'] })} />}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default PaperCheckerManagement;
