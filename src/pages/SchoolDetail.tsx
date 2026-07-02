import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { School as SchoolType } from '../types';
import { ArrowLeft, Users, GraduationCap, Search, ChevronLeft, ChevronRight, Lock, Save, MapPin, Phone, Building, Calendar, Mail, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
const EMAIL_RE_STRICT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
const EMAIL_RE_LOOSE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val, newKey));
    } else {
      acc[newKey] = val;
    }
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Normalize raw API school data to the canonical SchoolType shape.
 * Mirrors the helper in SchoolManagement.tsx for consistency.
 */
const normalizeSchool = (raw: any): SchoolType => {
  if (!raw || typeof raw !== 'object') return raw;

  const flat = flattenObject(raw);

  const principalKnownKeys = [
    'principal_name','admin_name','username','user.username','admin.username',
    'contact_name','name','full_name','first_name','profile.name','user.name',
    'admin.name','owner','created_by',
  ];
  const principal =
    principalKnownKeys.map((k) => flat[k]).find((v) => typeof v === 'string' && v.length > 0 && v !== raw.school_name)
    ?? Object.entries(flat).find(([k, v]) => {
      if (typeof v !== 'string' || v.length < 2) return false;
      if (v === raw.school_name || EMAIL_RE_STRICT.test(v) || /^\d+$/.test(v)) return false;
      const lowerK = k.toLowerCase();
      if (lowerK.includes('id') || lowerK.includes('email') || lowerK.includes('address')
          || lowerK.includes('website') || lowerK.includes('status') || lowerK.includes('password')
          || lowerK.includes('phone') || lowerK.includes('city') || lowerK.includes('state')
          || lowerK.includes('zip') || lowerK.includes('registration') || lowerK.includes('established')
          || lowerK.includes('count') || lowerK.includes('created') || lowerK.includes('updated')) return false;
      return true;
    })?.[1];

  const emailKnownKeys = [
    'email','school_email','contact_email','admin_email','user.email',
    'admin.email','contact.email','principal.email','profile.email','owner.email',
  ];
  const emailFromKeys = emailKnownKeys.map((k) => flat[k]).find((v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v));
  const emailFromDeepScan = Object.values(flat).find((v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v)) as string | undefined;
  const addressEmail = typeof raw.address === 'string' ? raw.address.match(EMAIL_RE_LOOSE)?.[0] : undefined;

  return {
    ...raw,
    principal_name: principal,
    email: emailFromKeys || emailFromDeepScan || addressEmail,
  };
};

const getStudentName = (student: any) => {
  const firstName = student.first_name || student.student_name || student.user?.first_name || student.user?.username || 'Unnamed';
  const lastName = student.last_name || student.user?.last_name || '';
  return `${firstName} ${lastName}`.trim();
};

const getStudentEmail = (student: any) => student.email || student.user?.email || 'N/A';
const getStudentGrade = (student: any) => student.grade || student.class_name || 'N/A';
const getStudentStatus = (student: any) => student.status || student.user?.status || 'active';

const SchoolDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [studentSearch, setStudentSearch] = useState('');
  const routeSchool = (location.state as { school?: SchoolType } | null)?.school;
  const routeSchoolForCurrentId =
    routeSchool && String(routeSchool.id) === id ? normalizeSchool(routeSchool) : undefined;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const sUser: any = school?.user;
      const sAdmin: any = school?.admin;
      const targetUserId = school?.user_id || sUser?.id || (typeof sUser === 'number' ? sUser : null) || (typeof sUser === 'string' ? parseInt(sUser) : null) || school?.admin_id || sAdmin?.id || (typeof sAdmin === 'number' ? sAdmin : null) || id;
      const response = await api.post('/api/auth/reset-password-by-role', {
        user_id: targetUserId,
        new_password: data.password,
        role: 'SCHOOL'
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('School password updated successfully! ✅');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.response?.data?.error
        || 'Failed to update password. Please ask the backend developer to create a /change-password endpoint for schools.';
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
    updateMutation.mutate({ password: newPassword });
  };

  const { data: queriedSchool } = useQuery<SchoolType | null>({
    queryKey: ['school-detail', id],
    queryFn: async ({ signal }) => {
      if (!id) return null;
      if (routeSchoolForCurrentId) return routeSchoolForCurrentId;

      const response = await api.get('/api/auth/schools', { signal });
      const rawList = Array.isArray(response.data)
        ? response.data
        : response.data?.results ?? response.data?.data ?? [];
      const found = rawList.find((s: any) => String(s.id) === id);

      return found ? normalizeSchool(found) : null;
    },
    enabled: Boolean(id),
    initialData: routeSchoolForCurrentId,
    staleTime: 5 * 60 * 1000,
  });
  const school = routeSchoolForCurrentId ?? queriedSchool;

  const { data: students = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ['school-students', id],
    queryFn: async ({ signal }) => {
      if (!id) return [];
      try {
        const response = await api.get(`/api/auth/schools/${id}/students`, { signal });
        const data = response.data?.data?.students
          ?? response.data?.students
          ?? response.data?.data
          ?? response.data
          ?? [];
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) return list;
      } catch {
        // fallthrough to general endpoint
      }
      // Fallback: fetch all students and filter by this school
      try {
        const fallback = await api.get('/api/auth/students', { signal });
        const d = fallback.data;
        const all = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
        return all.filter((s: any) => String(s.school_id ?? s.school ?? s.school?.id ?? '') === String(id));
      } catch {
        return [];
      }
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  const teachers = useMemo(() => {
    if (school?.teachers && Array.isArray(school.teachers)) {
      return school.teachers;
    }
    return [];
  }, [school]);

  const stats = [
    { label:'Total Students', value: students.length, change:'', icon:<Users size={20}/>, bg:'bg-blue-100', ic:'text-blue-600' },
    { label:'Total Teachers', value: teachers.length, change:'', icon:<GraduationCap size={20}/>, bg:'bg-green-100', ic:'text-green-600' },
  ];

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) => {
      const values = [
        getStudentName(student),
        getStudentEmail(student),
        getStudentGrade(student),
        getStudentStatus(student),
        student.roll_number,
        student.student_id,
      ];

      return values.some((value) => String(value ?? '').toLowerCase().includes(query));
    });
  }, [students, studentSearch]);

  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 10;

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch]);

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
  const paginatedStudents = filteredStudents.slice((studentPage - 1) * studentsPerPage, studentPage * studentsPerPage);

  return (
    <DashboardLayout activePage="all-schools">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/schools')}
          className="rounded-lg p-2 hover:bg-gray-100 transition"
          aria-label="Back to all schools"
          title="Back to all schools"
        >
          <ArrowLeft size={20}/>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 overflow-hidden text-2xl">
            {school?.profile_image ? (
              <img src={`${school.profile_image}?v=1`} alt={school.school_name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '🏫'; }} />
            ) : '🏫'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school?.school_name || 'School Detail'}</h1>
            <p className="text-xs text-gray-500">Principal: {school?.principal_name || 'N/A'} · {school?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="stat-card flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.bg}`}><span className={s.ic}>{s.icon}</span></div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-gray-400">{s.label}</p>
                <span className="text-[11px] font-semibold text-green-500">{s.change}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* School Information & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* School Info */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Building size={20} className="text-blue-500" />
            School Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">School Name</p>
              <p className="text-sm font-semibold text-gray-900">{school?.school_name || school?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Principal / Admin</p>
              <p className="text-sm font-semibold text-gray-900">{school?.principal_name || school?.admin_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Email Address</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Mail size={14} className="text-gray-400" />
                {school?.email || school?.contact_email || 'N/A'}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Phone Number</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Phone size={14} className="text-gray-400" />
                {school?.phone || school?.phone_number || school?.contact_phone || 'N/A'}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Full Address</p>
              <div className="flex items-start gap-2 text-sm font-semibold text-gray-900">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <span>
                  {school?.address || 'N/A'}
                  {(school?.city || school?.state || school?.zip) && (
                    <span className="block text-xs text-gray-500 font-normal mt-0.5">
                      {[school?.city, school?.state, school?.zip].filter(Boolean).join(', ')}
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Registration No.</p>
              <p className="text-sm font-semibold text-gray-900">{school?.registration_number || school?.registration_id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                String(school?.status || '').toLowerCase() === 'active'
                  ? 'bg-green-100 text-green-700' 
                  : String(school?.status || '').toLowerCase() === 'inactive'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {school?.status || 'Unknown'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Joined Date</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Calendar size={14} className="text-gray-400" />
                {school?.created_at ? new Date(school.created_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Lock size={20} className="text-amber-500" />
            Security
          </h2>
          <p className="text-xs text-gray-500 mb-6">Update the password for the school's admin account.</p>

          <form onSubmit={handlePasswordChange} className="space-y-4 flex-1 flex flex-col">
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
            <div className="mt-auto pt-4">
              <button
                type="submit"
                disabled={updateMutation.isPending || !newPassword || !confirmPassword}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {updateMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Enrolled Students</h2>
            <p className="text-xs text-gray-500 mt-1">List of all students currently enrolled in this school.</p>
          </div>
          <div className="relative w-full lg:max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search students by name, email, grade..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No students found for this school.
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No students match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Student Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Email</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Grade</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedStudents.map((student, idx) => (
                  <tr key={student.id || idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-4 px-6 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                          {(getStudentName(student)[0] || 'U').toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {getStudentName(student)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 text-center">
                      {getStudentEmail(student)}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 text-center">
                      {getStudentGrade(student)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        getStudentStatus(student) === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {getStudentStatus(student).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Enrolled Teachers</h2>
            <p className="text-xs text-gray-500 mt-1">List of all teachers currently assigned to this school.</p>
          </div>
        </div>

        {teachers.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No teachers found for this school.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Teacher Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Email</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Subject</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachers.map((teacher: any, idx: number) => {
                  const tName = teacher.first_name || teacher.teacher_name || teacher.user?.first_name || teacher.user?.username || teacher.username || 'Unnamed';
                  const tLast = teacher.last_name || teacher.user?.last_name || '';
                  const fullName = `${tName} ${tLast}`.trim();
                  const tEmail = teacher.email || teacher.user?.email || 'N/A';
                  const tSubject = teacher.subject || teacher.subject_name || teacher.specialization || 'N/A';
                  const tStatus = teacher.status || teacher.user?.status || 'active';
                  return (
                    <tr key={teacher.id || idx} className="hover:bg-green-50/50 transition-colors">
                      <td className="py-4 px-6 text-left">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-sm">
                            {(fullName[0] || 'T').toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{fullName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 text-center">{tEmail}</td>
                      <td className="py-4 px-6 text-sm text-gray-500 text-center">{tSubject}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          tStatus === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {tStatus.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default SchoolDetail;
