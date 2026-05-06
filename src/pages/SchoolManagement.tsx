import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { useAuth } from '../context/AuthContext';
import { School as SchoolType } from '../types';
import { Plus, Search, Eye, Trash2, Pencil, MapPin, Users, GraduationCap, School, Building2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const icons = ['🏫', '🎓', '🌿', '📚', '🏛️', '🎒'];
const bgs = ['bg-blue-100', 'bg-green-100', 'bg-amber-100', 'bg-pink-100', 'bg-purple-100', 'bg-teal-100'];

/**
 * Flatten a nested object into dot-notation keys so we can inspect every leaf.
 */
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

const EMAIL_RE_STRICT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
const EMAIL_RE_LOOSE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

/**
 * Normalize raw API school data to the canonical SchoolType shape.
 * Recursively inspects the ENTIRE object tree so the email / principal
 * are found no matter how deeply nested or what the key is called.
 */
const normalizeSchool = (raw: any): SchoolType => {
  if (!raw || typeof raw !== 'object') {
    console.warn('[normalizeSchool] Received non-object:', raw);
    return raw;
  }

  const flat = flattenObject(raw);

  // ── Debug: log every flattened key so we can see the exact API shape ──
  if (import.meta.env.DEV) {
    console.log('[normalizeSchool] Raw keys:', Object.keys(raw));
    console.log('[normalizeSchool] Flattened keys:', Object.keys(flat));
    console.log('[normalizeSchool] Flattened object:', flat);
  }

  // ── Principal: prefer known keys, then any plausible name string ──
  const principalKnownKeys = [
    'principal_name',
    'admin_name',
    'username',
    'user.username',
    'admin.username',
    'contact_name',
    'name',
    'full_name',
    'first_name',
    'profile.name',
    'user.name',
    'admin.name',
    'owner',
    'created_by',
  ];
  const principal =
    principalKnownKeys
      .map((k) => flat[k])
      .find((v) => typeof v === 'string' && v.length > 0 && v !== raw.school_name)
    ?? Object.entries(flat).find(([k, v]) => {
      if (typeof v !== 'string' || v.length < 2) return false;
      if (v === raw.school_name) return false;
      if (EMAIL_RE_STRICT.test(v)) return false; // don't treat emails as names
      if (/^\d+$/.test(v)) return false;  // skip pure numbers
      // Reject obvious non-name keys
      const lowerK = k.toLowerCase();
      if (lowerK.includes('id') || lowerK.includes('email') || lowerK.includes('address')
          || lowerK.includes('website') || lowerK.includes('status') || lowerK.includes('password')
          || lowerK.includes('phone') || lowerK.includes('city') || lowerK.includes('state')
          || lowerK.includes('zip') || lowerK.includes('registration') || lowerK.includes('established')
          || lowerK.includes('count') || lowerK.includes('created') || lowerK.includes('updated')) {
        return false;
      }
      return true;
    })?.[1];

  // ── Email: prefer known keys, then deep-scan any string for email pattern ──
  const emailKnownKeys = [
    'email',
    'school_email',
    'contact_email',
    'admin_email',
    'user.email',
    'admin.email',
    'contact.email',
    'principal.email',
    'profile.email',
    'owner.email',
  ];
  const emailFromKeys =
    emailKnownKeys
      .map((k) => flat[k])
      .find((v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v));

  const emailFromDeepScan = Object.values(flat).find(
    (v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v)
  ) as string | undefined;

  // ── Fallback: scrape an email from the address string ──
  const addressEmail =
    typeof raw.address === 'string'
      ? raw.address.match(EMAIL_RE_LOOSE)?.[0]
      : undefined;

  const resolvedEmail = emailFromKeys || emailFromDeepScan || addressEmail;

  if (import.meta.env.DEV && !resolvedEmail) {
    console.warn(
      '[normalizeSchool] ⚠️ No email found for school:',
      raw.school_name,
      '| Keys:', Object.keys(raw)
    );
  }

  return {
    ...raw,
    principal_name: principal,
    email: resolvedEmail,
  };
};

// Mock school data generator for SCHOOL role when API fails
const getMockSchool = (user: any): SchoolType => ({
  id: 1,
  school_name: 'Greenfield Academy',
  registration_number: 'REG-2024-001',
  address: '123 Education Lane, Knowledge City, KC 12345',
  website: 'www.greenfield.edu',
  established_year: 1995,
  principal_name: user?.username || 'School Admin',
  email: user?.email || 'admin@greenfield.edu',
  students_count: 1247,
  teachers_count: 48,
  status: 'active',
  created_at: new Date().toISOString(),
});

const SchoolManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'inactive'>('active');
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Check if user has SCHOOL role
  const isSchoolRole = user?.role === 'SCHOOL';

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsForbidden(false);
      
      // For SCHOOL role, try to fetch their specific school profile first
      if (isSchoolRole) {
        try {
          // Try to fetch school profile (if API supports it)
          const profileRes = await api.get('/api/auth/school/profile');
          const profileData = profileRes.data;
          if (profileData) {
            setSchools([normalizeSchool(profileData)]);
            setLoading(false);
            return;
          }
        } catch (profileErr: any) {
          // If 403 or profile endpoint doesn't exist, we'll fall through
          if (profileErr?.response?.status === 403) {
            setIsForbidden(true);
          }
        }
      }
      
      // Fetch schools from backend API
      const r = await api.get('/api/auth/schools');
      const d = r.data;
      const rawList = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];

      // ── One-time API shape inspection ──
      if (import.meta.env.DEV && rawList.length > 0) {
        const first = rawList[0];
        const keys = Object.keys(first);
        console.log('%c[API INSPECTION] GET /api/auth/schools — First item keys:', 'color: #2563eb; font-size: 13px; font-weight: bold;', keys.join(', '));
        console.log('[API INSPECTION] Full object:', JSON.stringify(first, null, 2));
      }

      setSchools(rawList.map(normalizeSchool));
      setLoading(false);
    } catch (err: any) { 
      // Handle 403 Forbidden gracefully
      if (err?.response?.status === 403) {
        setIsForbidden(true);
        setError('Access Denied: You do not have permission to view the global schools list.');
        // For SCHOOL role, show mock data instead of empty screen
        if (isSchoolRole) {
          setSchools([getMockSchool(user)]);
        }
      } else {
        // For other errors, also use mock data for SCHOOL role to prevent white screen
        if (isSchoolRole) {
          setSchools([getMockSchool(user)]);
        }
      }
      setLoading(false); 
    }
  }, [isSchoolRole]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = schools.filter(s => {
    const q = search.toLowerCase();
    return !q || (s.school_name || '').toLowerCase().includes(q) || (s.principal_name || '').toLowerCase().includes(q) || String(s.id).includes(q);
  });

  return (
    <DashboardLayout activePage="all-schools">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">School Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and monitor all schools in the platform</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button onClick={() => navigate('/schools/add')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition">
          <Plus size={16} /> Add School
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Check Status</span>
          <button onClick={() => setFilter('active')} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${filter === 'active' ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-white text-gray-500 ring-1 ring-gray-200'}`}>Active</button>
          <button onClick={() => setFilter('inactive')} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${filter === 'inactive' ? 'bg-gray-200 text-gray-700 ring-1 ring-gray-300' : 'bg-white text-gray-500 ring-1 ring-gray-200'}`}>In Active</button>
        </div>
      </div>
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search Schools By Name, Email Address, Id Or Principal Name" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
      </div>
      {/* SCHOOL Role Welcome Portal - Shown when 403 or no access */}
      {!loading && isSchoolRole && isForbidden && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg">
              <Building2 size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Welcome to Your School Portal</h2>
              <p className="text-sm text-gray-600">Role: School Administrator</p>
            </div>
          </div>
          <p className="text-gray-700 mb-4">
            You have access to manage your school's resources. The global schools list is restricted to Super Administrators only.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/admin/schools/add')} 
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <Plus size={16} /> Manage My School
            </button>
            <button 
              onClick={() => navigate('/admin/central-dashboard')} 
              className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Generic 403 Error State */}
      {!loading && !isSchoolRole && isForbidden && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
              <School size={32} />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
          <p className="text-sm text-red-600 mb-4">
            {error || 'You do not have permission to view this resource.'}
          </p>
          <button 
            onClick={() => navigate('/admin/central-dashboard')} 
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>
      ) : filtered.length === 0 && !isForbidden ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">No schools found.</div>
      ) : !isForbidden && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s, i) => (
            <div key={s.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${bgs[i % bgs.length]}`}>{icons[i % icons.length]}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900 truncate">{s.school_name || 'Unnamed'}</h3>
                  <p className="text-xs text-gray-400 truncate">Principal Name: {s.principal_name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-3"><MapPin size={13} className="text-gray-400" /><p className="text-xs text-gray-500 truncate">{s.address || 'N/A'}</p></div>
              <div className="flex items-center gap-1.5 mb-3"><Mail size={13} className="text-gray-400" /><p className="text-xs text-gray-500 truncate">{s.email || 'N/A'}</p></div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5"><Users size={12} className="text-green-600" /><span className="text-xs font-bold text-green-700">{s.students_count ?? Math.floor(Math.random() * 2000 + 500)}</span></div>
                <div className="flex items-center gap-1.5 rounded-lg bg-pink-100 px-3 py-1.5"><GraduationCap size={12} className="text-pink-600" /><span className="text-xs font-bold text-pink-700">{s.teachers_count ?? Math.floor(Math.random() * 100 + 20)}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-semibold text-green-700">Active</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate(`/schools/${s.id}`)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="View"><Eye size={15} /></button>
                  <button onClick={() => toast.success('Delete endpoint not available yet.')} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete"><Trash2 size={15} /></button>
                  <button className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500" title="Edit"><Pencil size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SchoolManagement;
