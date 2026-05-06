import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  School,
  User,
  Mail,
  Lock,
  Phone,
  Globe,
  MapPin,
  Building2,
  Hash,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { useAuth } from '../context/AuthContext';
import { ISchoolData, CreateSchoolPayload } from '../types';
import { ENDPOINTS } from '../config/api.config';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─── Exported Interfaces ────────────────────────────────────────────────────

/**
 * Re-export ISchoolData as the form values type for this component.
 * The canonical definition lives in src/types/index.ts.
 * STRICT: principalName maps to backend `username`. Do NOT use adminName.
 */
export type { ISchoolData as AddSchoolFormValues } from '../types';

export interface SchoolLogoFile {
  file: File;
  preview: string;
}

// Internal alias for use within this file
type FormValues = ISchoolData;

// ─── Validation Schema ──────────────────────────────────────────────────────

const validationSchema = Yup.object<FormValues>({
  schoolName: Yup.string().trim().required('School name is required'),
  principalName: Yup.string().trim().required('Principal name is required'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  phone: Yup.string().trim().required('Phone number is required'),
  website: Yup.string().trim().url('Enter a valid URL (e.g. https://school.com)').optional(),
  address: Yup.string().trim().required('Address is required'),
  city: Yup.string().trim().required('City is required'),
  state: Yup.string().trim().required('State is required'),
  zipCode: Yup.string().trim().optional(),
  registrationNumber: Yup.string().trim().optional(),
  establishedYear: Yup.string()
    .matches(/^\d{4}$/, 'Must be a valid 4-digit year')
    .optional(),
});

// ─── Initial Values ─────────────────────────────────────────────────────────

const initialValues: FormValues = {
  schoolName: '',
  principalName: '',
  email: '',
  password: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  registrationNumber: '',
  establishedYear: '',
};

// ─── Field Config ────────────────────────────────────────────────────────────

interface FieldConfig {
  name: keyof FormValues;
  label: string;
  placeholder: string;
  type?: string;
  icon: React.ReactNode;
  required?: boolean;
}

const fieldGroups: { title: string; fields: FieldConfig[] }[] = [
  {
    title: 'School Identity',
    fields: [
      { name: 'schoolName',     label: 'School Name',     placeholder: 'Greenfield Academy',   icon: <School size={16} />,   required: true  },
      { name: 'principalName',  label: 'Principal Name',  placeholder: 'Dr. Sameer Khan',       icon: <User size={16} />,     required: true  },
      { name: 'email',          label: 'Email Address',   placeholder: 'admin@school.edu',      icon: <Mail size={16} />,     required: true, type: 'email'    },
    ],
  },
  {
    title: 'Security',
    fields: [
      { name: 'password', label: 'Password', placeholder: '••••••••', icon: <Lock size={16} />, required: true, type: 'password' },
    ],
  },
  {
    title: 'Contact & Web',
    fields: [
      { name: 'phone',   label: 'Phone Number', placeholder: '+92 300 1234567',     icon: <Phone size={16} />,  required: true, type: 'tel' },
      { name: 'website', label: 'Website',       placeholder: 'https://school.com',  icon: <Globe size={16} />              },
      { name: 'address', label: 'Address',       placeholder: '123 Main Street',     icon: <MapPin size={16} />, required: true },
    ],
  },
  {
    title: 'Location',
    fields: [
      { name: 'city',    label: 'City',      placeholder: 'Karachi',   icon: <Building2 size={16} />, required: true },
      { name: 'state',   label: 'State',     placeholder: 'Sindh',     icon: <MapPin size={16} />,    required: true },
      { name: 'zipCode', label: 'Zip Code',  placeholder: '75500',     icon: <Hash size={16} />                      },
    ],
  },
  {
    title: 'Official Info',
    fields: [
      { name: 'registrationNumber', label: 'Registration Number', placeholder: 'REG-2024-001', icon: <Hash size={16} />     },
      { name: 'establishedYear',    label: 'Established Year',    placeholder: '1995',         icon: <Calendar size={16} /> },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const AddSchool: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [logoFile, setLogoFile] = useState<SchoolLogoFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Logo Upload Handlers ─────────────────────────────────────────────────

  const processFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG or JPG files are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must not exceed 2MB.');
      return;
    }
    const preview = URL.createObjectURL(file);
    setLogoFile({ file, preview });
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const removeLogo = () => {
    if (logoFile) URL.revokeObjectURL(logoFile.preview);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Formik Setup ─────────────────────────────────────────────────────────

  const formik = useFormik<FormValues>({
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      console.log('[AddSchool] 📝 Submitting ISchoolData:', values);

      try {
        // ── Full 1:1 schema mapping — all 13 keys, strict types ──
        interface SchoolCreatePayload {
          school_name:         string;
          username:            string;
          principal_name:      string;   // sent alongside username for redundancy
          email:               string;
          password:            string;
          phone_number:        string;
          website:             string;
          address:             string;
          city:                string;
          state:               string;
          zip_code:            number;   // backend expects integer
          registration_number: string;
          established_year:    number;   // backend expects integer
        }

        const payload: SchoolCreatePayload = {
          school_name:         values.schoolName,
          username:            values.principalName,
          principal_name:      values.principalName,             // redundancy
          email:               values.email,
          password:            values.password,
          phone_number:        values.phone,
          website:             values.website || '',
          address:             values.address,
          city:                values.city,
          state:               values.state,
          zip_code:            parseInt(values.zipCode, 10) || 0,
          registration_number: values.registrationNumber || `REG-${Date.now()}`,
          established_year:    parseInt(values.establishedYear, 10) || new Date().getFullYear(),
        };

        console.log('SENDING_TO_BACKEND:', payload);
        const response = await api.post('/api/auth/school/create', payload);
        console.log('[AddSchool] ✅ Response:', response.status, response.data);

        toast.success(`"${values.schoolName}" created successfully! 🎉`);
        navigate('/admin/schools/all');

      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const data   = err.response?.data;

          // ── Full diagnostic dump — read this to find the EXACT failing field ──
          console.error(`[AddSchool] ❌ ${status} from /api/auth/school/create`);
          console.error('URL    :', err.config?.baseURL, err.config?.url);
          console.error('STATUS :', status);
          console.error('DATA   :', JSON.stringify(data, null, 2));
          console.dir(data);   // expandable object — check for errors / fields keys

          // Extract most-specific message from DRF / custom response
          const d = data as Record<string, unknown> | undefined;
          const detail =
            (typeof d?.detail    === 'string' && d.detail)    ||
            (typeof d?.message   === 'string' && d.message)   ||
            (typeof d?.non_field_errors === 'string' && d.non_field_errors) ||
            (Array.isArray(d?.non_field_errors) && (d.non_field_errors as string[]).join(', ')) ||
            Object.entries(d ?? {})
              .filter(([k]) => k !== 'success' && k !== 'code' && k !== 'data')
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`)
              .join(' | ') ||
            'School creation failed — see console for details.';

          toast.error(detail, { duration: 6000 });
        } else {
          console.error('[AddSchool] ❌ Unexpected error:', err);
        }
      }
    },
  });

  const handleCancel = () => {
    if (isSuperAdmin || user?.role === 'SUPER_ADMIN') {
      navigate('/admin/schools');
    } else {
      navigate('/schools');
    }
  };

  // ── Field Error Helper ───────────────────────────────────────────────────

  const fieldError = (name: keyof FormValues) =>
    formik.touched[name] && formik.errors[name] ? formik.errors[name] : undefined;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout activePage="add-school">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0f2057 0%, #1e40af 100%)' }}
          >
            <School size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Global School Management</h1>
            <p className="text-sm text-gray-500">Register a new school to the AMLOS platform</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 h-1 w-full rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.round(
                (Object.keys(formik.values).filter(
                  (k) => formik.values[k as keyof FormValues]
                ).length /
                  Object.keys(initialValues).length) *
                  100
              )}%`,
            }}
            transition={{ duration: 0.6 }}
            className="h-1 rounded-full"
            style={{ background: 'linear-gradient(90deg, #1e40af, #3b82f6)' }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {Object.keys(formik.values).filter(
            (k) => formik.values[k as keyof FormValues]
          ).length}{' '}
          / {Object.keys(initialValues).length} fields filled
        </p>
      </motion.div>

      <form onSubmit={formik.handleSubmit} noValidate>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
        >
          {/* ── Logo Upload Zone ──────────────────────────────────────── */}
          <div
            className="px-6 lg:px-8 pt-8 pb-6"
            style={{ background: 'linear-gradient(135deg, #0f2057 0%, #1a3a8a 60%, #1e40af 100%)' }}
          >
            <h2 className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-4">
              School Logo
            </h2>

            <AnimatePresence mode="wait">
              {logoFile ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4"
                >
                  <img
                    src={logoFile.preview}
                    alt="School logo preview"
                    className="h-16 w-16 rounded-xl object-cover border border-white/30"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{logoFile.file.name}</p>
                    <p className="text-xs text-blue-200 mt-0.5">
                      {(logoFile.file.size / 1024).toFixed(1)} KB
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span className="text-xs text-emerald-300">Ready to upload</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    aria-label="Remove logo"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 px-4 cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-300 bg-white/20'
                      : 'border-white/25 bg-white/10 hover:bg-white/15 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 mb-3">
                    {isDragging ? (
                      <ImageIcon size={24} className="text-blue-200" />
                    ) : (
                      <Upload size={24} className="text-blue-200" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-white">
                    {isDragging ? 'Drop your file here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-xs text-blue-300 mt-1">PNG, JPG — max 2 MB</p>
                  <button
                    type="button"
                    className="mt-4 rounded-lg border border-white/30 bg-white/15 px-5 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
                  >
                    Select File
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={onFileChange}
              className="hidden"
              id="school-logo-upload"
            />
          </div>

          {/* ── Form Fields ───────────────────────────────────────────── */}
          <div className="px-6 lg:px-8 py-8 space-y-8">
            {fieldGroups.map((group, gi) => (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * (gi + 1) }}
              >
                {/* Section heading */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="h-px flex-1"
                    style={{ background: 'linear-gradient(90deg, #e2e8f0 0%, transparent 100%)' }}
                  />
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
                    style={{ background: '#eff6ff', color: '#1d4ed8' }}
                  >
                    {group.title}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, #e2e8f0 100%)' }}
                  />
                </div>

                {/* 3-column grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.fields.map((f) => {
                    const err = fieldError(f.name);
                    const touched = formik.touched[f.name];
                    const hasValue = !!formik.values[f.name];

                    return (
                      <div key={f.name} className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`field-${f.name}`}
                          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {f.label}
                          {f.required && (
                            <span className="ml-1 text-blue-500">*</span>
                          )}
                        </label>

                        <div className="relative">
                          {/* Icon */}
                          <div
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors"
                            style={{ color: err ? '#ef4444' : hasValue ? '#1d4ed8' : '#94a3b8' }}
                          >
                            {f.icon}
                          </div>

                          {f.name === 'state' ? (
                            <select
                              id={`field-${f.name}`}
                              name={f.name}
                              value={formik.values[f.name]}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm text-gray-800 outline-none transition-all duration-200 ${
                                err
                                  ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                  : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white hover:border-gray-300'
                              } ${!formik.values[f.name] ? 'text-gray-300' : ''}`}
                            >
                              <option value="" disabled hidden>{f.placeholder}</option>
                              <option value="Sindh">Sindh</option>
                              <option value="Punjab">Punjab</option>
                              <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                              <option value="Balochistan">Balochistan</option>
                              <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                              <option value="Azad Kashmir">Azad Kashmir</option>
                            </select>
                          ) : (
                            <input
                              id={`field-${f.name}`}
                              name={f.name}
                              type={f.name === 'password' ? (showPassword ? 'text' : 'password') : (f.type || 'text')}
                              value={formik.values[f.name]}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              placeholder={f.placeholder}
                              autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                              className={`w-full rounded-xl border pl-10 ${f.name === 'password' ? 'pr-12' : 'pr-10'} py-2.5 text-sm text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-300 ${
                                err
                                  ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                  : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white hover:border-gray-300'
                              }`}
                            />
                          )}

                          {f.name === 'password' && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}

                          {/* Status icon */}
                          {touched && f.name !== 'state' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {err ? (
                                <AlertCircle size={15} className="text-red-400" />
                              ) : hasValue ? (
                                <CheckCircle2 size={15} className="text-emerald-400" />
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Error message */}
                        <AnimatePresence>
                          {err && (
                            <motion.p
                              key="err"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="text-xs text-red-500 flex items-center gap-1"
                            >
                              <AlertCircle size={11} />
                              {err}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Action Bar ────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 lg:px-8 py-5 border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { formik.resetForm(); removeLogo(); }}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              >
                Reset
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={formik.isSubmitting}
              whileHover={{ scale: formik.isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: formik.isSubmitting ? 1 : 0.98 }}
              className="relative w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: formik.isSubmitting
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
                boxShadow: formik.isSubmitting
                  ? 'none'
                  : '0 8px 20px -4px rgba(37, 99, 235, 0.45)',
              }}
            >
              {formik.isSubmitting ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Save School
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </form>
    </DashboardLayout>
  );
};

export default AddSchool;
