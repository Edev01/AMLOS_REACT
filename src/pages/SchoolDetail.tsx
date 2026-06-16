import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { School as SchoolType } from '../types';
import { ArrowLeft, Users, GraduationCap, ClipboardList, BookOpen } from 'lucide-react';
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

const SchoolDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<SchoolType|null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch School Data
    api.get('/api/auth/schools').then(r => {
      const rawList = Array.isArray(r.data) ? r.data : r.data?.results ?? r.data?.data ?? [];
      const found = rawList.find((s: any) => String(s.id) === id);
      if (found) setSchool(normalizeSchool(found));
    }).catch(() => {});

    // Fetch Students Data for this school
    api.get(`/api/auth/schools/${id}/students`).then(res => {
      const data = res.data?.data?.students ?? res.data?.students ?? res.data?.data ?? res.data ?? [];
      setStudents(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => {
      setStudents([]);
      setLoading(false);
    });
  }, [id]);

  const stats = [
    { label:'Total Students', value: students.length, change:'', icon:<Users size={20}/>, bg:'bg-blue-100', ic:'text-blue-600' },
    { label:'Total Teachers', value:'--', change:'', icon:<GraduationCap size={20}/>, bg:'bg-green-100', ic:'text-green-600' },
    { label:'Total Quizzes', value:'--', change:'', icon:<ClipboardList size={20}/>, bg:'bg-pink-100', ic:'text-pink-600' },
    { label:'Active Classes', value:'--', change:'', icon:<BookOpen size={20}/>, bg:'bg-purple-100', ic:'text-purple-600' },
  ];

  return (
    <DashboardLayout activePage="all-schools">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/schools')} className="rounded-lg p-2 hover:bg-gray-100 transition"><ArrowLeft size={20}/></button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">🏫</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school?.school_name || 'School Detail'}</h1>
            <p className="text-xs text-gray-500">Principal: {school?.principal_name || 'N/A'} · {school?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Enrolled Students</h2>
            <p className="text-xs text-gray-500 mt-1">List of all students currently enrolled in this school.</p>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((student, idx) => (
                  <tr key={student.id || idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                          {((student.first_name || student.student_name || student.user?.first_name || student.user?.username || 'U')[0]).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {student.first_name || student.student_name || student.user?.first_name || student.user?.username || 'Unnamed'} {student.last_name || student.user?.last_name || ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {student.email || student.user?.email || 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {student.grade || student.class_name || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        (student.status || student.user?.status) === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {(student.status || student.user?.status || 'active').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default SchoolDetail;
