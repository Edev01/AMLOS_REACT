import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paperCheckerService } from '../api/services/paperCheckerService';
import { Loader2, LogOut, CheckCircle, Clock, BookOpen, Star, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const CheckerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [gradeTarget, setGradeTarget] = useState<any>(null);

  // Fetch only this checker's submissions
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: paperCheckerService.listSubmissions,
  });

  const pendingSubmissions = submissions.filter((s: any) => s.status !== 'GRADED');
  const gradedSubmissions = submissions.filter((s: any) => s.status === 'GRADED');

  const GradeModal: React.FC<{ submission: any; onClose: () => void }> = ({ submission, onClose }) => {
    const [score, setScore] = useState('');
    const [totalMarks, setTotalMarks] = useState('100');
    
    const mutation = useMutation({
      mutationFn: () => paperCheckerService.gradeSubmission(submission.id, { 
        score: Number(score), 
        total_marks: Number(totalMarks) 
      }),
      onSuccess: () => { 
        toast.success('Submission graded successfully!'); 
        queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
        onClose(); 
      },
      onError: (e: any) => {
        toast.error(e?.response?.data?.message || 'Failed to submit grade');
      },
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h3 className="font-bold flex items-center gap-2"><Star size={18} /> Grade Submission</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition"><X size={18}/></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Student: {submission.student_name || submission.student_email || `ID #${submission.student_id}`}</p>
              <p className="text-xs text-slate-500 mt-1">Assessment: {submission.assessment_title || submission.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Score Given</label>
                <input type="number" required value={score} onChange={e => setScore(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="e.g. 85" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Marks</label>
                <input type="number" required value={totalMarks} onChange={e => setTotalMarks(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={mutation.isPending || !score} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />} Submit Grade
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Inter']">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
              {(user?.email || 'C')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Checker Portal</h1>
              <p className="text-xs text-slate-500 font-medium">Welcome, {user?.username || user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><BookOpen size={24} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Submissions</p>
              <h2 className="text-2xl font-bold text-slate-900">{submissions.length}</h2>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500"><Clock size={24} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Pending Review</p>
              <h2 className="text-2xl font-bold text-slate-900">{pendingSubmissions.length}</h2>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><CheckCircle size={24} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Graded</p>
              <h2 className="text-2xl font-bold text-slate-900">{gradedSubmissions.length}</h2>
            </div>
          </motion.div>
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Assigned Submissions</h2>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-48 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={24} /> Loading tasks...
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-48 text-slate-400 gap-2">
              <AlertCircle size={32} className="text-slate-300" />
              <p className="font-semibold">No submissions assigned yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Assessment</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Score</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{sub.student_name || sub.student_email || 'Student'}</p>
                        <p className="text-xs text-slate-500">ID: {sub.student_id || sub.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {sub.assessment_title || sub.title || 'Untitled Assessment'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {sub.status === 'GRADED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                            <CheckCircle size={12} /> Graded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                        {sub.score !== undefined && sub.score !== null ? `${sub.score} / ${sub.total_marks || 100}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setGradeTarget(sub)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            sub.status === 'GRADED' 
                              ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'
                          }`}
                        >
                          {sub.status === 'GRADED' ? 'Edit Grade' : 'Evaluate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {gradeTarget && <GradeModal submission={gradeTarget} onClose={() => setGradeTarget(null)} />}
    </div>
  );
};
export default CheckerDashboard;
