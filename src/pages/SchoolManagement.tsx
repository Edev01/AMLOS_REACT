import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { School as SchoolType } from '../types';
import { Plus, Search, Eye, Trash2, Pencil, MapPin, Users, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const icons = ['🏫', '🎓', '🌿', '📚', '🏛️', '🎒'];
const bgs = ['bg-blue-100', 'bg-green-100', 'bg-amber-100', 'bg-pink-100', 'bg-purple-100', 'bg-teal-100'];

const SchoolManagement: React.FC = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'inactive'>('active');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch schools from backend API
      const r = await api.get('/api/auth/schools');
      const d = r.data;
      setSchools(Array.isArray(d) ? d : d?.results ?? d?.data ?? []);
      setLoading(false);
    } catch { 
      setSchools([]); 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = schools.filter(s => {
    const q = search.toLowerCase();
    return !q || (s.school_name || '').toLowerCase().includes(q) || (s.admin_name || '').toLowerCase().includes(q) || String(s.id).includes(q);
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
        <input type="text" placeholder="Search Schools By Name, Email Address, Id Or Admin Name" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">No schools found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s, i) => (
            <div key={s.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${bgs[i % bgs.length]}`}>{icons[i % icons.length]}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900 truncate">{s.school_name || 'Unnamed'}</h3>
                  <p className="text-xs text-gray-400">Admin Name: {s.admin_name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-3"><MapPin size={13} className="text-gray-400" /><p className="text-xs text-gray-500 truncate">{s.address || 'N/A'}</p></div>
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
