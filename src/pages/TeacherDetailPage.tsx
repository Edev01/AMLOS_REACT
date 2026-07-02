import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import * as teacherService from '../api/services/teacherService';
import * as studentService from '../api/services/studentService';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Phone, BookOpen, GraduationCap, MapPin, Calendar, Clock, DollarSign, Users, X, Check, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../api/services/api';

const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: teacher, isLoading, error } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => teacherService.getTeacherById(id!),
    enabled: !!id,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentService.getStudents(),
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const tUser: any = teacher?.user;
      const targetUserId = teacher?.user_id || tUser?.id || (typeof tUser === 'number' ? tUser : null) || (typeof tUser === 'string' ? parseInt(tUser) : null) || id;
      const response = await api.post('/api/auth/reset-password-by-role', {
        user_id: targetUserId,
        new_password: data.password,
        role: 'TEACHER'
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Teacher password updated successfully! ✅');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.response?.data?.error || 'Failed to update password.';
      toast.error(msg);
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    updatePasswordMutation.mutate({ password: newPassword });
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      await teacherService.assignStudentsToTeacher(id!, selectedStudents);
    },
    onSuccess: () => {
      toast.success('Students assigned successfully!');
      setIsAssignModalOpen(false);
      setSelectedStudents([]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to assign students');
    }
  });

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout activePage="all-teachers">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !teacher) {
    return (
      <DashboardLayout activePage="all-teachers">
        <div className="flex h-[50vh] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-red-100 p-4">
            <Clock size={32} className="text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Teacher Not Found</h2>
          <p className="mb-6 text-gray-500">The teacher you're looking for doesn't exist or there was an error.</p>
          <button onClick={() => navigate('/school/teachers')} className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700">
            Back to Teachers
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="all-teachers">
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/school/teachers')} className="flex items-center justify-center rounded-xl bg-white p-2.5 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Profile</h1>
              <p className="text-sm text-gray-500">View detailed information about the teacher</p>
            </div>
          </div>
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Users size={18} />
            Assign Students
          </button>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="px-8 pb-8">
            <div className="relative -mt-16 mb-6 flex items-end justify-between">
              <div className="flex items-end gap-6">
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-gray-100">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                    {teacher.profile_image ? (
                      <img src={teacher.profile_image} alt={teacher.first_name} className="h-full w-full object-cover" />
                    ) : (
                      <GraduationCap size={40} className="text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-gray-900">{teacher.first_name} {teacher.last_name}</h2>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                  </div>
                  <p className="text-lg font-medium text-gray-600">
                    {teacher.qualification ? `${teacher.qualification} · ` : ''}{teacher.subject || 'Teacher'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {/* Professional Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">Professional Details</h3>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Subject</p>
                      <p className="font-semibold text-gray-900">{teacher.subject || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Qualification</p>
                      <p className="font-semibold text-gray-900">{teacher.qualification || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Experience</p>
                      <p className="font-semibold text-gray-900">{teacher.experience_years ? `${teacher.experience_years} Years` : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Salary</p>
                      <p className="font-semibold text-gray-900">{teacher.salary ? `PKR ${teacher.salary}` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">Contact Information</h3>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <Mail size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium text-gray-500">Email Address</p>
                      <p className="font-semibold text-gray-900 truncate">{teacher.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Phone Number</p>
                      <p className="font-semibold text-gray-900">{teacher.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Date of Birth</p>
                      <p className="font-semibold text-gray-900">{teacher.date_of_birth || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">N/A</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col mt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Lock size={20} className="text-amber-500" />
                Security
              </h2>
              <p className="text-xs text-gray-500 mb-6">Update the password for this teacher's account.</p>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
                >
                  {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Students Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Assign Students</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {students.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No students available in this school.</div>
              ) : (
                students.map((student: any) => {
                  const studentName = student.first_name || student.user?.first_name || 'Unnamed';
                  const isSelected = selectedStudents.includes(student.id);
                  
                  return (
                    <div 
                      key={student.id} 
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{studentName} {student.last_name || student.user?.last_name || ''}</p>
                        <p className="text-sm text-gray-500">{student.email || student.user?.email || 'N/A'} • Grade: {student.grade || 'N/A'}</p>
                      </div>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-gray-100 p-6 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending || selectedStudents.length === 0}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assignMutation.isPending ? 'Assigning...' : `Assign ${selectedStudents.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherDetail;
