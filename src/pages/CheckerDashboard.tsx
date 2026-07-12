import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paperCheckerService } from '../api/services/paperCheckerService';
import { Loader2, LogOut, CheckCircle, Clock, BookOpen, Star, AlertCircle, X, ChevronDown, Lock, UserCheck, Camera, User } from 'lucide-react';
import toast from 'react-hot-toast';

export const CheckerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [gradeTarget, setGradeTarget] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = [
    user?.first_name || (user as any)?.profile?.first_name, 
    user?.last_name || (user as any)?.profile?.last_name
  ].filter(Boolean).join(' ') 
    || (user as any)?.name 
    || (user as any)?.profile?.name
    || (user as any)?.full_name 
    || (user?.username && !user.username.includes('@') ? user.username : null)
    || user?.email?.split('@')[0] 
    || 'Paper Checker';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch only this checker's submissions
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['checker-dashboard-data'],
    queryFn: paperCheckerService.getCheckerDashboard,
  });

  let assignments: any[] = [];
  if (Array.isArray(dashboardData)) {
    assignments = dashboardData;
  } else if (Array.isArray(dashboardData?.data?.assignments)) {
    assignments = dashboardData.data.assignments;
  } else if (Array.isArray(dashboardData?.assignments)) {
    assignments = dashboardData.assignments;
  } else if (Array.isArray(dashboardData?.data)) {
    assignments = dashboardData.data;
  }

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
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={mutation.isPending || !score} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {mutation.isPending && <Loader2 size={14} className="animate-spin" />} Submit Grade
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  // ── Edit Profile Modal ────────────────────────────────────────────────────
  const EditProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [form, setForm] = useState({ 
      first_name: user?.first_name || (user as any)?.profile?.first_name || '', 
      last_name: user?.last_name || (user as any)?.profile?.last_name || '', 
      password: '', // Password optional on update
      phone: user?.phone || (user as any)?.profile?.phone || '' 
    });
    
    // Image state
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.profile_image || (user as any)?.profile?.profile_image || null);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image must be less than 5MB.');
          return;
        }
        setIsUploadingImage(true);
        try {
          // Dynamic import of userService for Checker Dashboard
          const { userService } = await import('../api/services/userService');
          const res = await userService.uploadImage(file);
          const url = res?.data?.url || res?.url || res?.image_url || res?.file_url || res?.path || res?.profile_image;
          if (url) {
            setProfileImageUrl(url);
            toast.success('Image uploaded successfully!');
          } else {
            toast.error('Upload succeeded but no URL returned.');
          }
        } catch {
          toast.error('Failed to upload image.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    };

    const mutation = useMutation({
      mutationFn: () => {
        const payload: any = { ...form };
        if (!payload.password) delete payload.password;
        if (profileImageUrl !== (user?.profile_image || (user as any)?.profile?.profile_image)) {
          payload.profile_image = profileImageUrl;
        }
        // Use user.checker_id or user.id assuming backend matches it.
        const checkerId = (user as any)?.checker_id || user?.id;
        return paperCheckerService.updateChecker(checkerId, payload);
      },
      onSuccess: () => { 
        toast.success('Profile updated successfully! Please re-login to see all changes.'); 
        onClose(); 
      },
      onError: (e: any) => {
        toast.error(e?.response?.data?.message || 'Failed to update profile');
      },
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><User size={18} /> Edit Profile</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"><X size={18} /></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
            
            <div className="flex flex-col items-center justify-center mb-2">
              <div className="relative group">
                {profileImageUrl ? (
                  <div className="relative">
                    <img src={profileImageUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover border-2 border-blue-200 shadow-sm" />
                    <button type="button" onClick={() => setProfileImageUrl(null)} className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200">
                    {isUploadingImage ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                    <input type="file" accept="image/*" onChange={handleImageSelect} disabled={isUploadingImage} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Optional Profile Photo</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">First Name</label>
                <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-400 outline-none" placeholder="First name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Last Name</label>
                <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-400 outline-none" placeholder="Last name" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-400 outline-none" placeholder="Phone" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">New Password <span className="normal-case">(optional)</span></label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-blue-400 outline-none" placeholder="Leave blank to keep current" autoComplete="new-password" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {mutation.isPending && <Loader2 size={14} className="animate-spin" />} Update Profile
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
              {(displayName[0] || 'C').toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Checker Portal</h1>
              <p className="text-xs text-slate-500 font-medium">Welcome, {displayName}</p>
            </div>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
              className="flex items-center gap-3 p-1.5 pr-3 rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm transition"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {(displayName[0] || 'C').toUpperCase()}
              </div>
              <div className="hidden sm:block text-left max-w-[120px]">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button onClick={() => { setIsDropdownOpen(false); setShowEditProfile(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-xl transition">
                    <UserCheck size={16} /> Edit Profile
                  </button>
                  <button onClick={() => { setIsDropdownOpen(false); logout(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl transition">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
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

        {/* Assignments List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><BookOpen size={18} /></div>
             <h2 className="text-lg font-bold text-slate-900">My Assigned Tasks</h2>
          </div>
          {isLoadingDashboard ? (
             <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
          ) : assignments.length === 0 ? (
             <div className="p-8 text-center text-slate-500 font-medium">No subjects or students assigned to you yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-slate-50/50">
              {assignments.map((assignment: any, index: number) => (
                <div key={assignment.assignment_id || assignment.id || index} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-800 text-lg">
                      {assignment.subject?.name || assignment.subject_name || assignment.subject || 'Assigned Subject'}
                      {assignment.subject?.grade && <span className="text-sm font-normal text-slate-500 ml-1">(Grade {assignment.subject.grade})</span>}
                    </h3>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">{assignment.portion || 'Full'} Portion</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 flex items-start gap-2">
                       <span className="font-semibold text-slate-700 whitespace-nowrap">Students:</span>
                       <span className="break-words">
                         {Array.isArray(assignment.students) && assignment.students.length > 0
                           ? assignment.students.map((s: any) => `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || s.id).join(', ')
                           : (Array.isArray(assignment.student_ids) 
                               ? (assignment.student_ids.length > 0 ? assignment.student_ids.join(', ') : 'All Students') 
                               : (assignment.student_ids || 'All Students'))}
                       </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      <AnimatePresence>
        {gradeTarget && <GradeModal submission={gradeTarget} onClose={() => setGradeTarget(null)} />}
        {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      </AnimatePresence>
    </div>
  );
};
export default CheckerDashboard;
