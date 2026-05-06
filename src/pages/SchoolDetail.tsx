import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { School as SchoolType } from '../types';
import { ArrowLeft, Users, GraduationCap, ClipboardList, BookOpen } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';

const enrollData = [
  { month:'Jan', v:600 },{ month:'Feb', v:700 },{ month:'Mar', v:680 },
  { month:'Apr', v:750 },{ month:'May', v:820 },{ month:'Jun', v:1050 },
];
const perfData = [
  { name:'Good', value:70, color:'#3b82f6' },
  { name:'Excellent', value:35, color:'#06d6a0' },
  { name:'Below Average', value:70, color:'#ef4444' },
  { name:'Average', value:18, color:'#f59e0b' },
];
const subjData = [
  { s:'Mathematics',v:75 },{ s:'Science',v:82 },{ s:'English',v:68 },
  { s:'History',v:60 },{ s:'Geography',v:72 },{ s:'Computer',v:65 },
];
const activity = [
  { action:'New student enrolled', who:'Emma Thompson', time:'10 minutes ago', c:'#06d6a0' },
  { action:'Quiz completed', who:'Dr. Michael Chen · Mathematics', time:'25 minutes ago', c:'#3b82f6' },
  { action:'Material uploaded', who:'Sarah Wilson · Science', time:'1 hour ago', c:'#f59e0b' },
  { action:'Teacher joined', who:'James Parker', time:'3 hours ago', c:'#8b5cf6' },
];

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

  useEffect(() => {
    api.get('/api/auth/schools').then(r => {
      const rawList = Array.isArray(r.data) ? r.data : r.data?.results ?? r.data?.data ?? [];
      if (import.meta.env.DEV && rawList.length > 0) {
        console.log('%c[SchoolDetail] First raw school shape:', 'color: #2563eb; font-weight: bold;', Object.keys(rawList[0]));
      }
      const found = rawList.find((s: any) => String(s.id) === id);
      if (found) setSchool(normalizeSchool(found));
    }).catch(() => {});
  }, [id]);

  const stats = [
    { label:'Total Students', value:'1,234', change:'+10.5%', icon:<Users size={20}/>, bg:'bg-blue-100', ic:'text-blue-600' },
    { label:'Total Teachers', value:'56', change:'+8.5%', icon:<GraduationCap size={20}/>, bg:'bg-green-100', ic:'text-green-600' },
    { label:'Total Quizzes', value:'1,293', change:'+5.5%', icon:<ClipboardList size={20}/>, bg:'bg-pink-100', ic:'text-pink-600' },
    { label:'Active Classes', value:'28', change:'+5.5%', icon:<BookOpen size={20}/>, bg:'bg-purple-100', ic:'text-purple-600' },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Student Enrollment Trend</h2>
          <p className="text-xs text-gray-400 mb-4">Monthly enrollment growth</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={enrollData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{fontSize:12,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:12,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}}/>
              <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2.5} dot={{r:4,fill:'#3b82f6',strokeWidth:2,stroke:'#fff'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Quiz Performance</h2>
          <p className="text-xs text-gray-400 mb-4">Performance distribution</p>
          <div className="flex items-center gap-4">
            <div className="space-y-3">
              {perfData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:d.color}}/>
                  <div><p className="text-xs text-gray-500">{d.name}</p><p className="text-sm font-bold text-gray-900">{d.value}%</p></div>
                </div>
              ))}
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart><Pie data={perfData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                  {perfData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                </Pie></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Subject Performance</h2>
          <p className="text-xs text-gray-400 mb-4">Average scores by subject</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="s" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50}/>
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} domain={[0,100]}/>
              <Tooltip contentStyle={{borderRadius:12,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}}/>
              <Bar dataKey="v" fill="#3b82f6" radius={[6,6,0,0]} barSize={32}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          <p className="text-xs text-gray-400 mb-4">Latest platform actions</p>
          <div className="space-y-4">
            {activity.map((a,i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:a.c}}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{a.action}</p>
                  <p className="text-xs text-gray-400">{a.who} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
export default SchoolDetail;
