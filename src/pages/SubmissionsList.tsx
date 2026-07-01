import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import { assessmentService } from '../api/services/assessmentService';
import { useAuth } from '../context/AuthContext';
import {
  FileText, CheckCircle, Clock, Search, X, ChevronLeft, ChevronRight,
  Download, Eye, Award, BookOpen, AlertCircle, Loader2, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types matching backend response ──
interface SubmissionQuestion {
  id: number;
  question_id: string;
  subject: string;
  chapter: string;
  question_type: 'MCQ' | 'SHORT' | 'LONG';
  cognitive_level: string;
  category: string;
  question_text: string;
  question_image_url: string | null;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_option: string | null;
  short_explanation: string | null;
  answer_text: string | null;
  answer_image_url: string | null;
  marks: number;
  time_allowed_minutes: number;
  difficulty_level: string;
  tags: string;
}

interface SubmissionData {
  id: number;
  student: number;
  assessment_model: number;
  assessment_title: string;
  assessment_type: string;
  score: number;
  total_marks: number;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
  submission_file: string | null;
  questions: SubmissionQuestion[];
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getDuration = (start: string, end: string | null) => {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'MCQ': return 'bg-blue-100 text-blue-700';
    case 'SHORT': return 'bg-amber-100 text-amber-700';
    case 'LONG': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getDifficultyColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'easy': return 'bg-emerald-100 text-emerald-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getAssessmentTypeBadge = (type: string) => {
  const labels: Record<string, { label: string; color: string }> = {
    CHAPTER_WISE: { label: 'Chapter Wise', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    QUARTER: { label: 'Quarter', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    HALF: { label: 'Half', color: 'bg-violet-50 text-violet-600 border-violet-200' },
    THIRD_QUARTER: { label: 'Three Quarter', color: 'bg-purple-50 text-purple-600 border-purple-200' },
    FULL_BOOK: { label: 'Full Book', color: 'bg-pink-50 text-pink-600 border-pink-200' },
  };
  const info = labels[type] || { label: type, color: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${info.color}`}>
      {info.label}
    </span>
  );
};

const SubmissionsList: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Grade modal state
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null);
  const [score, setScore] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState<number | ''>('');

  // Detail view state
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', page],
    queryFn: () => assessmentService.listSubmissions(page),
  });

  const gradeMutation = useMutation({
    mutationFn: async (payload: { score: number; total_marks: number }) => {
      await assessmentService.gradeSubmission(selectedSubmission!.id, payload);
    },
    onSuccess: () => {
      toast.success('Submission graded successfully!');
      setIsGradeModalOpen(false);
      setSelectedSubmission(null);
      setScore('');
      setTotalMarks('');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to grade submission');
    }
  });

  const handleOpenGradeModal = (submission: SubmissionData) => {
    setSelectedSubmission(submission);
    setScore(submission.score ?? '');
    setTotalMarks(submission.total_marks ?? '');
    setIsGradeModalOpen(true);
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (score === '' || totalMarks === '') {
      toast.error('Score and total marks are required.');
      return;
    }
    gradeMutation.mutate({ score: Number(score), total_marks: Number(totalMarks) });
  };

  // Normalize the API response
  const rawData = data as any;
  const submissions: SubmissionData[] = rawData?.results ?? rawData?.data?.results ?? (Array.isArray(rawData) ? rawData : []);
  const totalCount = rawData?.count ?? rawData?.data?.count ?? 0;
  const hasNext = !!(rawData?.next ?? rawData?.data?.next);
  const hasPrev = !!(rawData?.previous ?? rawData?.data?.previous);

  // Client-side filtering
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = !searchQuery ||
      sub.assessment_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(sub.student).includes(searchQuery) ||
      String(sub.id).includes(searchQuery);
    const matchesType = !typeFilter || sub.assessment_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats
  const completedCount = submissions.filter(s => s.is_completed).length;
  const gradedCount = submissions.filter(s => s.score > 0).length;
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + (s.total_marks > 0 ? (s.score / s.total_marks) * 100 : 0), 0) / submissions.length)
    : 0;

  return (
    <DashboardLayout activePage="submissions">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
            <p className="text-sm text-gray-500">View and manage student assessment submissions.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Total Submissions</p>
                <p className="text-xl font-bold text-slate-900">{totalCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Completed</p>
                <p className="text-xl font-bold text-slate-900">{completedCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Award size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Graded</p>
                <p className="text-xl font-bold text-slate-900">{gradedCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <BookOpen size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Avg Score</p>
                <p className="text-xl font-bold text-slate-900">{avgScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by assessment title, student ID..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Types</option>
            <option value="CHAPTER_WISE">Chapter Wise</option>
            <option value="QUARTER">Quarter</option>
            <option value="HALF">Half</option>
            <option value="THIRD_QUARTER">Three Quarter</option>
            <option value="FULL_BOOK">Full Book</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-slate-400">Loading submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                <FileText size={28} className="text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-700">No submissions found</p>
              <p className="text-sm text-slate-400 max-w-xs">
                Student submissions will appear here once students complete their assessments via the mobile app.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider">Student ID</th>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider">Assessment</th>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-center">Type</th>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-center">Score</th>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-center">Questions</th>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-center">Status</th>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-center">Submitted</th>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSubmissions.map((sub) => {
                      const percentage = sub.total_marks > 0 ? Math.round((sub.score / sub.total_marks) * 100) : 0;
                      const isGraded = sub.score > 0;
                      return (
                        <tr key={sub.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                #{sub.student}
                              </div>
                              <span className="text-sm font-semibold text-slate-700">Student {sub.student}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-semibold text-slate-900 max-w-[200px] truncate" title={sub.assessment_title}>
                              {sub.assessment_title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Model #{sub.assessment_model}</p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {getAssessmentTypeBadge(sub.assessment_type)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-sm font-bold ${isGraded ? (percentage >= 60 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-400'}`}>
                                {sub.score} / {sub.total_marks}
                              </span>
                              {isGraded && (
                                <span className={`text-[10px] font-semibold ${percentage >= 60 ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {percentage}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-sm font-semibold text-slate-700">{sub.questions?.length ?? 0}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                              sub.is_completed
                                ? isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {sub.is_completed
                                ? isGraded ? <><CheckCircle size={13} /> Graded</> : <><Clock size={13} /> Pending Grade</>
                                : <><AlertCircle size={13} /> In Progress</>
                              }
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <p className="text-xs text-slate-500">{formatDate(sub.completed_at)}</p>
                            <p className="text-[10px] text-slate-400">{getDuration(sub.started_at, sub.completed_at)}</p>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingSubmission(sub)}
                                title="View Details"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Eye size={16} />
                              </button>
                              {sub.submission_file && (
                                <a
                                  href={sub.submission_file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download File"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                  <Download size={16} />
                                </a>
                              )}
                              {(user?.role === 'TEACHER' || user?.role === 'SCHOOL' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                <button
                                  onClick={() => handleOpenGradeModal(sub)}
                                  title="Grade"
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                                >
                                  <Award size={14} /> Grade
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <p className="text-sm text-slate-500">
                  Showing page <span className="font-semibold text-slate-700">{page}</span> of {Math.ceil(totalCount / 10) || 1}
                  {' '}• <span className="font-semibold text-slate-700">{totalCount}</span> total
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!hasPrev}
                    className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNext}
                    className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ────── Grade Modal ────── */}
      <AnimatePresence>
        {isGradeModalOpen && selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Grade Submission</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedSubmission.assessment_title}</p>
                </div>
                <button onClick={() => setIsGradeModalOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleGradeSubmit} className="p-6 space-y-5">
                <div className="flex gap-4 rounded-xl bg-blue-50/50 border border-blue-100 p-4">
                  <div className="flex-1 text-center">
                    <p className="text-[11px] font-semibold text-blue-500 mb-0.5">Student</p>
                    <p className="text-sm font-bold text-slate-800">#{selectedSubmission.student}</p>
                  </div>
                  <div className="w-px bg-blue-200" />
                  <div className="flex-1 text-center">
                    <p className="text-[11px] font-semibold text-blue-500 mb-0.5">Questions</p>
                    <p className="text-sm font-bold text-slate-800">{selectedSubmission.questions?.length ?? 0}</p>
                  </div>
                  <div className="w-px bg-blue-200" />
                  <div className="flex-1 text-center">
                    <p className="text-[11px] font-semibold text-blue-500 mb-0.5">Current</p>
                    <p className="text-sm font-bold text-slate-800">{selectedSubmission.score}/{selectedSubmission.total_marks}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Score</label>
                  <input
                    type="number"
                    value={score}
                    onChange={e => setScore(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 85"
                    min={0}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={e => setTotalMarks(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 100"
                    min={0}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGradeModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={gradeMutation.isPending}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {gradeMutation.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Saving...</> : 'Save Grade'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ────── Detail View Modal ────── */}
      <AnimatePresence>
        {viewingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Detail Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{viewingSubmission.assessment_title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getAssessmentTypeBadge(viewingSubmission.assessment_type)}
                    <span className="text-xs text-slate-400">Submission #{viewingSubmission.id}</span>
                    <span className="text-xs text-slate-400">• Student #{viewingSubmission.student}</span>
                  </div>
                </div>
                <button onClick={() => setViewingSubmission(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Detail Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Score</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{viewingSubmission.score} / {viewingSubmission.total_marks}</p>
                    {viewingSubmission.total_marks > 0 && (
                      <p className={`text-xs font-semibold mt-0.5 ${
                        (viewingSubmission.score / viewingSubmission.total_marks) * 100 >= 60 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {Math.round((viewingSubmission.score / viewingSubmission.total_marks) * 100)}%
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Questions</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{viewingSubmission.questions?.length ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Duration</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{getDuration(viewingSubmission.started_at, viewingSubmission.completed_at)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Status</p>
                    <p className={`text-sm font-bold mt-2 ${viewingSubmission.is_completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {viewingSubmission.is_completed ? 'Completed' : 'In Progress'}
                    </p>
                  </div>
                </div>

                {/* Submission File */}
                {viewingSubmission.submission_file && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <FileText size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Submitted File</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[300px]">{viewingSubmission.submission_file.split('/').pop()}</p>
                      </div>
                    </div>
                    <a
                      href={viewingSubmission.submission_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink size={14} /> Open File
                    </a>
                  </div>
                )}

                {/* Questions */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Questions ({viewingSubmission.questions?.length ?? 0})</h4>
                  <div className="space-y-3">
                    {(viewingSubmission.questions ?? []).map((q, idx) => (
                      <div key={q.id} className="rounded-xl border border-slate-100 bg-white p-4 hover:border-slate-200 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">{idx + 1}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getTypeColor(q.question_type)}`}>{q.question_type}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getDifficultyColor(q.difficulty_level)}`}>{q.difficulty_level}</span>
                            <span className="text-[10px] text-slate-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{q.time_allowed_minutes}min</span>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed">{q.question_text}</p>

                        {/* MCQ Options */}
                        {q.question_type === 'MCQ' && (
                          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {['A', 'B', 'C', 'D'].map(opt => {
                              const text = q[`option_${opt.toLowerCase()}` as keyof SubmissionQuestion] as string;
                              if (!text) return null;
                              const isCorrect = q.correct_option === opt;
                              return (
                                <div key={opt} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                                  isCorrect ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 border border-slate-100 text-slate-600'
                                }`}>
                                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                  }`}>{opt}</span>
                                  {text}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Answer / Explanation */}
                        {(q.answer_text || q.short_explanation) && (
                          <div className="mt-3 rounded-lg bg-blue-50/50 border border-blue-100 p-3">
                            {q.answer_text && (
                              <p className="text-xs text-slate-700"><span className="font-semibold text-blue-600">Answer:</span> {q.answer_text}</p>
                            )}
                            {q.short_explanation && (
                              <p className="text-xs text-slate-600 mt-1"><span className="font-semibold text-blue-600">Explanation:</span> {q.short_explanation}</p>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        {q.tags && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.tags.split(',').map(tag => (
                              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detail Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 flex-shrink-0 bg-slate-50/50">
                <p className="text-xs text-slate-400">
                  Started: {formatDate(viewingSubmission.started_at)} • Completed: {formatDate(viewingSubmission.completed_at)}
                </p>
                <div className="flex gap-2">
                  {(user?.role === 'TEACHER' || user?.role === 'SCHOOL' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => { setViewingSubmission(null); handleOpenGradeModal(viewingSubmission); }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition"
                    >
                      <Award size={14} /> Grade
                    </button>
                  )}
                  <button
                    onClick={() => setViewingSubmission(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SubmissionsList;
