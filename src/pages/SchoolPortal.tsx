import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { Student } from '../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SchoolPortal: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username:'', password:'', email:'', roll_number:'', grade:'', gpa:'' });
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    try { setLoading(true); const r = await api.get('/api/auth/students'); setStudents(Array.isArray(r.data)?r.data:r.data?.results??r.data?.data??[]); }
    catch { setStudents([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username||!form.password||!form.email) { toast.error('Fill required fields.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/auth/students/create', {
        username: form.username, password: form.password, email: form.email,
        roll_number: form.roll_number, grade: form.grade, gpa: parseFloat(form.gpa)||0,
      });
      toast.success('Student created!');
      setShowCreate(false);
      setForm({ username:'',password:'',email:'',roll_number:'',grade:'',gpa:'' });
      fetchStudents();
    } catch { /* interceptor */ }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string|number) => {
    try { await api.delete(`/api/auth/students/${id}/delete`); toast.success('Student deleted.'); fetchStudents(); }
    catch { /* interceptor */ }
  };

  return (
    <DashboardLayout activePage="dashboard">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Students</h1><p className="text-sm text-gray-500 mt-1">Manage enrolled students</p></div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition">
          <Plus size={16}/> Register Student
        </button>
      </div>

      {/* Create form overlay */}
      {showCreate && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Register New Student</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[['Username','username'],['Password','password'],['Email','email'],['Roll Number','roll_number'],['Grade','grade'],['GPA','gpa']].map(([l,k]) => (
              <div key={k}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{l}</label>
                <input type={k==='password'?'password':'text'} value={(form as any)[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"/>
              </div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting?'Saving...':'Register'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Students table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"/></div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">No students found.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID','Username','Email','Roll No','Grade','GPA','Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-700">{s.id}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{s.username||s.name||'—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.email||'—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.roll_number||'—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.grade||s.class||'—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.gpa??'—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={15}/></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};
export default SchoolPortal;