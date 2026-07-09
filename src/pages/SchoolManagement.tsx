import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { useAuth } from '../context/AuthContext';
import { School as SchoolType } from '../types';
import { Plus, Search, Eye, Trash2, Pencil, MapPin, Users, GraduationCap, School, Building2, Mail, X, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../components/Skeleton';

const icons = ['🏫', '🎓', '🌿', '📚', '🏛️', '🎒'];
const bgs = ['bg-blue-100', 'bg-green-100', 'bg-amber-100', 'bg-pink-100', 'bg-purple-100', 'bg-teal-100'];
const SCHOOLS_PAGE_SIZE = 10;

interface SchoolsPage {
  schools: SchoolType[];
  isForbidden: boolean;
  isServerPaginated: boolean;
  nextPage?: number;
  totalCount?: number;
}

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

const normalizeSchool = (raw: any): SchoolType => {
  if (!raw || typeof raw !== 'object') return raw;
  const flat = flattenObject(raw);
  const principalKnownKeys = [
    'principal_name', 'admin_name', 'username', 'user.username',
    'admin.username', 'contact_name', 'name', 'full_name',
    'first_name', 'profile.name', 'user.name', 'admin.name',
    'owner', 'created_by',
  ];
  const principal =
    principalKnownKeys.map((k) => flat[k]).find((v) => typeof v === 'string' && v.length > 0 && v !== raw.school_name)
    ?? Object.entries(flat).find(([k, v]) => {
      if (typeof v !== 'string' || v.length < 2 || v === raw.school_name || EMAIL_RE_STRICT.test(v) || /^\d+$/.test(v)) return false;
      const lK = k.toLowerCase();
      return !['id','email','address','website','status','password','phone','city','state','zip','registration','established','count','created','updated'].some(x => lK.includes(x));
    })?.[1];
  const emailKnownKeys = ['email','school_email','contact_email','admin_email','user.email','admin.email','contact.email','principal.email','profile.email','owner.email'];
  const emailFromKeys = emailKnownKeys.map((k) => flat[k]).find((v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v));
  const emailFromDeepScan = Object.values(flat).find((v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v)) as string | undefined;
  const addressEmail = typeof raw.address === 'string' ? raw.address.match(EMAIL_RE_LOOSE)?.[0] : undefined;
  // Pull registration number from all common backend field names
  const regNumber =
    raw.registration_number ||
    raw.registration_id ||
    raw.reg_no ||
    raw.reg_number ||
    flat['registration_number'] ||
    flat['reg_id'] ||
    '';
  return { ...raw, principal_name: principal, email: emailFromKeys || emailFromDeepScan || addressEmail, registration_number: regNumber };
};

const getNumber = (...values: any[]): number | undefined => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
};

const parseSchoolsResponse = (payload: any, currentPage: number) => {
  let rawList: any[] = [];
  let meta: any = null;

  if (Array.isArray(payload)) {
    rawList = payload;
  } else if (Array.isArray(payload?.results)) {
    rawList = payload.results;
    meta = payload;
  } else if (Array.isArray(payload?.data?.results)) {
    rawList = payload.data.results;
    meta = payload.data;
  } else if (Array.isArray(payload?.data?.schools)) {
    rawList = payload.data.schools;
    meta = payload.data;
  } else if (Array.isArray(payload?.schools)) {
    rawList = payload.schools;
    meta = payload;
  } else if (Array.isArray(payload?.data)) {
    rawList = payload.data;
    meta = payload;
  }

  const hasPaginationMeta = Boolean(
    meta &&
      ('next' in meta ||
        'previous' in meta ||
        'count' in meta ||
        'total' in meta ||
        'total_count' in meta ||
        'total_pages' in meta ||
        'last_page' in meta)
  );
  const isServerPaginated = hasPaginationMeta && rawList.length <= SCHOOLS_PAGE_SIZE;
  const total = getNumber(meta?.count, meta?.total, meta?.total_count);

  if (!isServerPaginated) {
    return {
      rawList,
      isServerPaginated: false,
      nextPage: undefined,
      totalCount: rawList.length,
      totalPages: 1,
    };
  }

  const explicitNextPage = getNumber(meta.next_page, meta.nextPage);
  const totalPages = getNumber(meta.total_pages, meta.last_page) || Math.ceil((total || 0) / SCHOOLS_PAGE_SIZE) || 1;
  let nextPage = explicitNextPage;

  if (!nextPage && meta.next) nextPage = currentPage + 1;
  if (!nextPage && totalPages && currentPage < totalPages) nextPage = currentPage + 1;
  if (!nextPage && (total || 0) && currentPage * SCHOOLS_PAGE_SIZE < (total || 0)) nextPage = currentPage + 1;

  return { rawList, isServerPaginated: true, nextPage, totalCount: total, totalPages };
};

const getMockSchool = (user: any): SchoolType => ({
  id: 1, school_name: 'Greenfield Academy', registration_number: 'REG-2024-001',
  address: '123 Education Lane, Knowledge City, KC 12345', website: 'www.greenfield.edu',
  established_year: 1995, principal_name: user?.username || 'School Admin',
  email: user?.email || 'admin@greenfield.edu', students_count: 1247, teachers_count: 48,
  status: 'active', created_at: new Date().toISOString(),
});

/* ─── Edit Modal ─────────────────────────────────────────────────── */
interface EditModalProps {
  school: SchoolType;
  onClose: () => void;
  onSave: (id: number, data: Record<string, any>) => void;
  isSaving: boolean;
}

const EditSchoolModal: React.FC<EditModalProps> = ({ school, onClose, onSave, isSaving }) => {
  // Safe helper to extract flat primitive string if reg_id is returned as an object
  const getRegIdString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val.reg_id || val.registration_id || val.id || '';
    }
    return String(val);
  };

  const [editFormData, setEditFormData] = useState({
    school_name: school.school_name || '',
    principal_name: school.principal_name || '',
    email: school.email || '',
    address: school.address || '',
    website: school.website || '',
    phone: (school as any).phone || (school as any).phone_number || '',
  });

  const handleChange = (e: React.ChangeEvent<any>) => {
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Send all filled fields (not just changed ones, to avoid missing fields issue)
    const payload: Record<string, any> = {};
    Object.entries(editFormData).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        payload[key] = val;
      }
    });
    if (Object.keys(payload).length === 0) {
      toast.error('No changes detected.');
      return;
    }
    onSave(Number(school.id), payload);
  };

  const fields = [
    { name: 'school_name', label: 'School Name' },
    { name: 'principal_name', label: 'Principal Name' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone' },
    { name: 'address', label: 'Address' },
    { name: 'website', label: 'Website' },

  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Pencil size={18} className="text-white" />
            <h2 className="text-lg font-bold text-white">Edit School</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Registration ID — read-only, sourced from school.registration_number or registration_id */}
          <div title="Can't update registration">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block cursor-help">Registration Number</label>
            <input
              type="text"
              value={school.registration_number || (school as any).registration_id || getRegIdString((school as any).reg_id) || ''}
              readOnly
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-600 outline-none cursor-not-allowed"
              placeholder="Registration Number"
              title="Can't update registration"
            />
          </div>
          {fields.map(f => (
              <div key={f.name}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{f.label}</label>
                <input
                  name={f.name}
                  type={f.type || 'text'}
                  value={(editFormData as any)[f.name]}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
          ))}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

/* ─── Delete Confirmation Modal ──────────────────────────────────── */
interface DeleteModalProps {
  school: SchoolType;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteConfirmModal: React.FC<DeleteModalProps> = ({ school, onClose, onConfirm, isDeleting }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete School</h3>
        <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-bold text-gray-800 mb-4">"{school.school_name}"?</p>
        <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

/* ─── Main Component ─────────────────────────────────────────────── */
const SchoolManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'inactive'>('active');
  const [editingSchool, setEditingSchool] = useState<SchoolType | null>(null);
  const [deletingSchool, setDeletingSchool] = useState<SchoolType | null>(null);
  const [page, setPage] = useState(1);

  const isSchoolRole = user?.role === 'SCHOOL';
  const trimmedSearch = search.trim();

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [trimmedSearch, filter]);

  const {
    data: queryData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['schools', isSchoolRole, trimmedSearch, page],
    queryFn: async () => {
      let isForbidden = false;

      if (isSchoolRole) {
        try {
          const profileRes = await api.get('/api/auth/school/profile');
          if (profileRes.data) {
            return {
              schools: [normalizeSchool(profileRes.data)],
              isForbidden: false,
              isServerPaginated: false,
              totalCount: 1,
            };
          }
        } catch (err: any) {
          if (err?.response?.status === 403) isForbidden = true;
        }
      }

      try {
        const response = await api.get('/api/auth/schools', {
          params: {
            page,
            page_size: SCHOOLS_PAGE_SIZE,
            limit: SCHOOLS_PAGE_SIZE,
            offset: (page - 1) * SCHOOLS_PAGE_SIZE,
            search: trimmedSearch || undefined,
            q: trimmedSearch || undefined,
          },
        });
        const parsed = parseSchoolsResponse(response.data, page);

        return {
          schools: parsed.rawList.map(normalizeSchool),
          isForbidden: false,
          isServerPaginated: parsed.isServerPaginated,
          nextPage: parsed.nextPage,
          totalCount: parsed.totalCount,
          totalPages: parsed.totalPages,
        };
      } catch (err: any) {
        if (err?.response?.status === 403) isForbidden = true;
        else throw err;
      }

      if (isSchoolRole && isForbidden) {
        return {
          schools: [getMockSchool(user)],
          isForbidden,
          isServerPaginated: false,
          totalCount: 1,
        };
      }
      if (isForbidden) {
        return {
          schools: [],
          isForbidden: true,
          isServerPaginated: false,
          totalCount: 0,
        };
      }

      return {
        schools: [],
        isForbidden: false,
        isServerPaginated: false,
        totalCount: 0,
        totalPages: 1,
      };
    },
  });

  // ─── Per-school student counts via /api/auth/schools/{id}/students ───
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const fetchedSchoolIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const schools = queryData?.schools || [];
    if (!schools || schools.length === 0) return;
    const toFetch = schools.filter((s: any) => s.id && !fetchedSchoolIds.current.has(String(s.id)));
    if (toFetch.length === 0) return;

    toFetch.forEach((s: any) => {
      const sid = String(s.id);
      fetchedSchoolIds.current.add(sid);
      api.get(`/api/auth/schools/${sid}/students`)
        .then((res) => {
          const d = res.data;
          const list = d?.data?.students ?? d?.students ?? d?.data ?? (Array.isArray(d) ? d : []);
          const count = Array.isArray(list) ? list.length : 0;
          setStudentCounts((prev) => ({ ...prev, [sid]: count }));
        })
        .catch(() => {
          setStudentCounts((prev) => ({ ...prev, [sid]: 0 }));
        });
    });
  }, [queryData?.schools]);

  const getStudentCount = useCallback((school: any): number => {
    const sid = String(school?.id ?? '');
    if (studentCounts[sid] !== undefined) return studentCounts[sid];
    return school?.students_count ?? school?.student_count ?? school?.total_students ?? 0;
  }, [studentCounts]);

  // Teachers: admin can't fetch per-school yet, use school object fields
  const getTeacherCount = useCallback((school: any): number => {
    if (Array.isArray(school?.teachers)) return school.teachers.length;
    return school?.teachers_count ?? school?.teacher_count ?? school?.total_teachers ?? 0;
  }, []);

  // ─── Delete Mutation ──────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      await api.delete(`/api/auth/schools/${schoolId}/delete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School deleted successfully! 🗑️');
      setDeletingSchool(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to delete school.';
      toast.error(msg);
    },
  });

  // ─── Update Mutation ──────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      await api.patch(`/api/auth/schools/${id}/update`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School updated successfully! ✅');
      setEditingSchool(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update school.';
      toast.error(msg);
    },
  });

  const schools = queryData?.schools || [];
  const isForbidden = queryData?.isForbidden || false;
  const isServerPaginated = queryData?.isServerPaginated || false;
  const totalPages = queryData?.totalPages || 1;
  const loading = isLoading;

  const filtered = schools.filter((s: SchoolType) => {
    const q = search.toLowerCase();
    return !q || (s.school_name || '').toLowerCase().includes(q) || (s.principal_name || '').toLowerCase().includes(q) || String(s.id).includes(q);
  });
  
  // If not server paginated, do client pagination
  const visibleSchools = isServerPaginated ? filtered : filtered.slice((page - 1) * SCHOOLS_PAGE_SIZE, page * SCHOOLS_PAGE_SIZE);
  const actualTotalPages = isServerPaginated ? totalPages : Math.ceil(filtered.length / SCHOOLS_PAGE_SIZE);

  return (
    <DashboardLayout activePage="all-schools">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">School Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and monitor all schools in the platform</p>
      </div>
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search Schools By Name, Email Address, Id Or Principal Name" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
      </div>

      {/* SCHOOL Role Welcome Portal */}
      {!loading && isSchoolRole && isForbidden && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg"><Building2 size={28} /></div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Welcome to Your School Portal</h2>
              <p className="text-sm text-gray-600">Role: School Administrator</p>
            </div>
          </div>
          <p className="text-gray-700 mb-4">You have access to manage your school's resources. The global schools list is restricted to Super Administrators only.</p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/admin/schools/add')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"><Plus size={16} /> Manage My School</button>
            <button onClick={() => navigate('/admin/central-dashboard')} className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition">Go to Dashboard</button>
          </div>
        </div>
      )}

      {/* Generic 403 Error State */}
      {!loading && !isSchoolRole && isForbidden && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="flex justify-center mb-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500"><School size={32} /></div></div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
          <p className="text-sm text-red-600 mb-4">You do not have permission to view this resource.</p>
          <button onClick={() => navigate('/admin/central-dashboard')} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition">Go to Dashboard</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 && !isForbidden ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">No schools found.</div>
      ) : !isForbidden && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleSchools.map((s, i) => (
              <div key={s.id} onClick={() => navigate(`/admin/schools/${s.id}`, { state: { school: s } })} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex h-11 w-11 shrink-0 overflow-hidden items-center justify-center rounded-xl text-xl ${!s.profile_image ? bgs[i % bgs.length] : 'bg-gray-100'}`}>
                    {s.profile_image ? (
                      <img src={`${s.profile_image}?v=1`} alt={s.school_name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = icons[i % icons.length]; }} />
                    ) : icons[i % icons.length]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-gray-900 truncate">{s.school_name || 'Unnamed'}</h3>
                    <p className="text-xs text-gray-400 truncate">Principal Name: {s.principal_name || 'N/A'}</p>
                    <p className="text-xs font-semibold text-blue-500 truncate mt-0.5">{s.registration_number || s.registration_id ? `Reg No: ${s.registration_number || s.registration_id}` : 'Reg No: N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-2"><MapPin size={13} className="text-gray-400" /><p className="text-xs text-gray-500 truncate">{s.address || 'N/A'}</p></div>
                <div className="flex items-center gap-1.5 mb-3"><Mail size={13} className="text-gray-400" /><p className="text-xs text-gray-500 truncate">{s.email || 'N/A'}</p></div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5"><Users size={12} className="text-green-600" /><span className="text-xs font-bold text-green-700">{getStudentCount(s)}</span><span className="text-[10px] text-green-600">Students</span></div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-pink-100 px-3 py-1.5"><GraduationCap size={12} className="text-pink-600" /><span className="text-xs font-bold text-pink-700">{getTeacherCount(s)}</span><span className="text-[10px] text-pink-600">Teachers</span></div>
                </div>
                {(s.created_at) && (
                  <div className="text-[10px] text-gray-400 mb-2">
                    Joined: {new Date(s.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                )}
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/schools/${s.id}`, { state: { school: s } }); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition" title="View"><Eye size={15} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingSchool(s); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition" title="Delete"><Trash2 size={15} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingSchool(s); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition" title="Edit"><Pencil size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {actualTotalPages > 0 && (
            <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
              <div className="flex items-center text-sm text-gray-500">
                Page <span className="font-semibold text-gray-900 mx-1">{page}</span> of <span className="font-semibold text-gray-900 mx-1">{actualTotalPages}</span>

              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} className="mr-1" /> Previous
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: actualTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === actualTotalPages || Math.abs(p - page) <= 1)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-gray-400">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${
                            page === p
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(actualTotalPages, p + 1))}
                  disabled={page === actualTotalPages}
                  className="flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}
          
          {isFetching && !isLoading && (
            <div className="fixed bottom-4 right-4 bg-white rounded-full p-3 shadow-lg border border-gray-100 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          )}
        </>
      )}

      {/* ─── Modals ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editingSchool && (
          <EditSchoolModal
            school={editingSchool}
            onClose={() => setEditingSchool(null)}
            onSave={(id, data) => updateMutation.mutate({ id, data })}
            isSaving={updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingSchool && (
          <DeleteConfirmModal
            school={deletingSchool}
            onClose={() => setDeletingSchool(null)}
            onConfirm={() => deleteMutation.mutate(Number(deletingSchool.id))}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SchoolManagement;
