import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { useAuth } from '../context/AuthContext';
import { CreateSchoolPayload } from '../types';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

const AddSchool: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    school_name: '', username: '', email: '', password: '',
    phone: '', website: '', address: '', city: '', state: '', zip: '',
    registration_number: '', established_year: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_name || !form.username || !form.email || !form.password || !form.address) {
      toast.error('Please fill all required fields.'); return;
    }
    setSubmitting(true);
    try {
      // Build payload for backend API
      const payload: CreateSchoolPayload = {
        username: form.username,
        password: form.password,
        email: form.email,
        school_name: form.school_name,
        registration_number: form.registration_number || `REG-${Date.now()}`,
        address: [form.address, form.city, form.state, form.zip].filter(Boolean).join(', '),
        website: form.website,
        established_year: Number(form.established_year) || new Date().getFullYear(),
      };

      // POST to backend API
      const response = await api.post('/api/auth/school/create', payload);
      
      toast.success('School created successfully!');
      
      // Super Admin redirect to central dashboard, others to schools list
      if (isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.access_level === 'SUPER') {
        navigate('/admin/schools');
      } else {
        navigate('/schools');
      }
    } catch (err) {
      console.error('Error creating school:', err);
      // Error toast handled by API interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => setForm({ school_name:'',username:'',email:'',password:'',phone:'',website:'',address:'',city:'',state:'',zip:'',registration_number:'',established_year:'' });

  const field = (label: string, key: string, placeholder: string, type='text', required=true) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );

  return (
    <DashboardLayout activePage="add-school">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New School</h1>
        <p className="text-sm text-gray-500 mt-1">Register a new school to the platform</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        {/* Logo upload */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">School Logo</h2>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-10 px-4">
            <Upload size={32} className="text-gray-400 mb-3"/>
            <p className="text-sm text-gray-500">Drop your files to upload PNG, JPG up to 2MB</p>
            <button type="button" className="mt-3 rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition">Select files</button>
          </div>
        </div>

        {/* Form fields grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {field('School Name', 'school_name', 'Greenfield Academy')}
          {field('Admin Name', 'username', 'Sameer Khan')}
          {field('Email Address', 'email', 'sameergmail.com', 'email')}
          {field('Password', 'password', '••••••••', 'password')}
          {field('Phone Number', 'phone', '+92 134345 34', 'tel')}
          {field('Website', 'website', 'www.school.com', 'url')}
          {field('Address', 'address', 'Full address')}
          {field('City', 'city', 'City name')}
          {field('State', 'state', 'State name')}
          {field('Zip Code', 'zip', 'Zip code', 'text', false)}
          {field('Registration Number', 'registration_number', 'REG-2024-001', 'text', false)}
          {field('Established Year', 'established_year', '1995', 'number', false)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => navigate('/schools')} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition">cancel</button>
          <button type="button" onClick={handleReset} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition">reset</button>
          <button type="submit" disabled={submitting} className="rounded-full bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 transition">
            {submitting ? 'Saving...' : 'save'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};
export default AddSchool;
