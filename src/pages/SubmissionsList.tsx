import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import { assessmentService } from '../api/services/assessmentService';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle, Clock, Search, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const SubmissionsList: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [score, setScore] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState<number | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', page],
    queryFn: () => assessmentService.listSubmissions(page),
  });

  const gradeMutation = useMutation({
    mutationFn: async (payload: { score: number; total_marks: number }) => {
      await assessmentService.gradeSubmission(selectedSubmission.id, payload);
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

  const handleOpenGradeModal = (submission: any) => {
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

  const submissions = Array.isArray(data) ? data : (data as any)?.results ?? (data as any)?.data ?? [];

  return (
    <DashboardLayout activePage="submissions">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
            <p className="text-sm text-gray-500">View and manage student assessment submissions.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No submissions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assessment</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Score</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                    {user?.role === 'TEACHER' && (
                      <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-semibold text-gray-900">
                        {sub.student?.user?.first_name || 'Student'} {sub.student?.user?.last_name || ''}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {sub.assessment?.title || 'Assessment'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {sub.score !== null && sub.total_marks !== null ? (
                          <span className="font-semibold text-gray-900">{sub.score} / {sub.total_marks}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          sub.status === 'graded' || sub.score !== null ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {sub.status === 'graded' || sub.score !== null ? <CheckCircle size={14} /> : <Clock size={14} />}
                          {sub.status === 'graded' || sub.score !== null ? 'Graded' : 'Pending'}
                        </span>
                      </td>
                      {user?.role === 'TEACHER' && (
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleOpenGradeModal(sub)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            Grade
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Grade Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Grade Submission</h3>
              <button onClick={() => setIsGradeModalOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Score</label>
                <input
                  type="number"
                  value={score}
                  onChange={e => setScore(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 85"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Total Marks</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={e => setTotalMarks(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 100"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={gradeMutation.isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SubmissionsList;
