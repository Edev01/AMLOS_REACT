import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  Hash,
  Shield,
  Phone,
  Users,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  ChevronLeft,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { useAuth } from '../context/AuthContext';
import { IStudentData } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─── Exported type alias ───────────────────────────────────────────────────
export type { IStudentData as AddStudentFormValues } from '../types';

type FormValues = IStudentData;

// ─── Step definitions ────────────────────────────────────────────────────────
const steps = [
  { id: 1, label: 'Basic Info', icon: <User size={16} /> },
  { id: 2, label: 'Academic', icon: <BookOpen size={16} /> },
  { id: 3, label: 'Guardian', icon: <Shield size={16} /> },
  { id: 4, label: 'Account', icon: <Lock size={16} /> },
];

const stepFieldNames: (keyof FormValues)[][] = [
  ['fullName', 'email', 'dob'],
  ['classGrade', 'section'],
  ['guardianName', 'guardianContact', 'guardianRelation'],
  ['username', 'password', 'studentId'],
];

// ─── Per-step validation schemas ────────────────────────────────────────────
const stepSchemas = [
  Yup.object({
    fullName: Yup.string().trim().required('Full name is required'),
    email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
    dob: Yup.string().required('Date of birth is required'),
  }),
  Yup.object({
    classGrade: Yup.string().trim().required('Class / grade is required'),
    section: Yup.string().trim().required('Section is required'),
  }),
  Yup.object({
    guardianName: Yup.string().trim().required('Guardian name is required'),
    guardianContact: Yup.string().trim().required('Guardian contact is required'),
    guardianRelation: Yup.string().trim().required('Relation is required'),
  }),
  Yup.object({
    username: Yup.string().trim().required('Username is required'),
    password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
    studentId: Yup.string().trim().required('Student ID is required'),
  }),
];

// ─── Initial values ─────────────────────────────────────────────────────────
const initialValues: FormValues = {
  fullName: '',
  email: '',
  dob: '',
  classGrade: '',
  section: '',
  guardianName: '',
  guardianContact: '',
  guardianRelation: '',
  username: '',
  password: '',
  studentId: '',
};

// ─── Field configs per step ─────────────────────────────────────────────────
interface FieldConfig {
  name: keyof FormValues;
  label: string;
  placeholder: string;
  type?: string;
  icon: React.ReactNode;
  required?: boolean;
  options?: string[];
}

const stepFields: FieldConfig[][] = [
  [
    { name: 'fullName', label: 'Full Name', placeholder: 'Muhammad Ali Khan', icon: <User size={16} />, required: true },
    { name: 'email', label: 'Email Address', placeholder: 'student@school.edu', icon: <Mail size={16} />, required: true, type: 'email' },
    { name: 'dob', label: 'Date of Birth', placeholder: '', icon: <Calendar size={16} />, required: true, type: 'date' },
  ],
  [
    { name: 'classGrade', label: 'Class / Grade', placeholder: 'Select grade', icon: <BookOpen size={16} />, required: true, options: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
    { name: 'section', label: 'Section', placeholder: 'Select section', icon: <Hash size={16} />, required: true, options: ['A', 'B', 'C', 'D'] },
  ],
  [
    { name: 'guardianName', label: 'Guardian Name', placeholder: 'Parent / Guardian full name', icon: <Users size={16} />, required: true },
    { name: 'guardianContact', label: 'Guardian Contact', placeholder: '+92 300 1234567', icon: <Phone size={16} />, required: true, type: 'tel' },
    { name: 'guardianRelation', label: 'Relation', placeholder: 'Father / Mother / Guardian', icon: <Shield size={16} />, required: true },
  ],
  [
    { name: 'username', label: 'Username', placeholder: 'student_username', icon: <User size={16} />, required: true },
    { name: 'password', label: 'Password', placeholder: '••••••••', icon: <Lock size={16} />, required: true, type: 'password' },
    { name: 'studentId', label: 'Student ID', placeholder: 'STU-2024-001', icon: <GraduationCap size={16} />, required: true },
  ],
];

// ─── Component ──────────────────────────────────────────────────────────────
const AddStudent: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  // Resolve schoolId from auth context (multi-tenant) with multiple fallbacks
  const schoolId =
    tenant.schoolId ||
    user?.school_id ||
    localStorage.getItem('school_id') ||
    user?.campus_id ||
    tenant.campusId ||
    localStorage.getItem('campus_id') ||
    undefined;

  useEffect(() => {
    console.log('[AddStudent] schoolId resolution:', {
      tenantSchoolId: tenant.schoolId,
      userSchoolId: user?.school_id,
      localStorageSchoolId: localStorage.getItem('school_id'),
      userCampusId: user?.campus_id,
      tenantCampusId: tenant.campusId,
      localStorageCampusId: localStorage.getItem('campus_id'),
      resolved: schoolId,
    });
  }, [tenant.schoolId, user?.school_id, user?.campus_id, tenant.campusId, schoolId]);

  const formik = useFormik<FormValues>({
    initialValues,
    validationSchema: stepSchemas[currentStep - 1],
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: async (values) => {
      if (!schoolId) {
        toast.error('School ID not found in your session. Please log in again.');
        return;
      }

      try {
        const payload = {
          full_name: values.fullName,
          email: values.email,
          dob: values.dob,
          class_grade: values.classGrade,
          section: values.section,
          guardian_name: values.guardianName,
          guardian_contact: values.guardianContact,
          guardian_relation: values.guardianRelation,
          username: values.username,
          password: values.password,
          student_id: values.studentId,
        };

        const response = await api.post(`/api/auth/schools/${schoolId}/students`, payload);
        console.log('[AddStudent] ✅ Response:', response.status, response.data);
        toast.success(`Student "${values.fullName}" enrolled successfully! 🎉`);
        navigate(backPath);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const data = err.response?.data;
          console.error(`[AddStudent] ❌ ${status}:`, JSON.stringify(data, null, 2));
          const d = data as Record<string, unknown> | undefined;
          const detail =
            (typeof d?.detail === 'string' && d.detail) ||
            (typeof d?.message === 'string' && d.message) ||
            (Array.isArray(d?.non_field_errors) && (d.non_field_errors as string[]).join(', ')) ||
            Object.entries(d ?? {})
              .filter(([k]) => k !== 'success' && k !== 'code' && k !== 'data')
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`)
              .join(' | ') ||
            'Student creation failed — see console for details.';
          toast.error(detail, { duration: 6000 });
        } else {
          console.error('[AddStudent] ❌ Unexpected error:', err);
          toast.error('An unexpected error occurred.');
        }
      }
    },
  });

  // ── Step navigation ───────────────────────────────────────────────────────
  const handleNext = async () => {
    const schema = stepSchemas[currentStep - 1];
    try {
      await schema.validate(formik.values, { abortEarly: false });
      formik.setErrors({});
      setCurrentStep((s) => Math.min(s + 1, steps.length));
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        err.inner.forEach((e) => {
          if (e.path) {
            newErrors[e.path] = e.message;
            formik.setFieldTouched(e.path, true, false);
          }
        });
        formik.setErrors(newErrors);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const fieldError = (name: keyof FormValues) =>
    formik.touched[name] && formik.errors[name] ? formik.errors[name] : undefined;

  const isLastStep = currentStep === steps.length;

  // ── Stepper render ──────────────────────────────────────────────────────
  const renderStepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isActive = i + 1 === currentStep;
          const isCompleted = i + 1 < currentStep;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className="flex flex-col items-center">
                <motion.div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : isCompleted
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {isCompleted ? <CheckCircle2 size={18} /> : step.id}
                </motion.div>
                <span
                  className={`mt-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                    isActive ? 'text-blue-700' : isCompleted ? 'text-blue-500' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="mx-3 flex-1">
                  <div className={`h-1 rounded-full transition-colors ${isCompleted ? 'bg-blue-400' : 'bg-gray-200'}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Render current step fields ────────────────────────────────────────────
  const renderStepFields = () => {
    const fields = stepFields[currentStep - 1];
    return (
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {fields.map((f) => {
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
                {f.required && <span className="ml-1 text-blue-500">*</span>}
              </label>

              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: err ? '#ef4444' : hasValue ? '#1d4ed8' : '#94a3b8' }}
                >
                  {f.icon}
                </div>

                {f.options ? (
                  <>
                    <select
                      id={`field-${f.name}`}
                      name={f.name}
                      value={formik.values[f.name]}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm text-gray-800 outline-none transition-all duration-200 appearance-none ${
                        err
                          ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white hover:border-gray-300'
                      }`}
                    >
                      <option value="" disabled>{f.placeholder}</option>
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown size={15} className="text-gray-400" />
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      id={`field-${f.name}`}
                      name={f.name}
                      type={f.name === 'password' ? (showPassword ? 'text' : 'password') : f.type || 'text'}
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

                    {touched && f.name !== 'password' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {err ? (
                          <AlertCircle size={15} className="text-red-400" />
                        ) : hasValue ? (
                          <CheckCircle2 size={15} className="text-emerald-400" />
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>

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
      </motion.div>
    );
  };

  // ── Determine back navigation path ──────────────────────────────────────
  const tenantId = tenant.campusId || user?.campus_id;
  const backPath = tenantId
    ? `/campus/${tenantId}/students`
    : '/school/students';

  return (
    <DashboardLayout activePage="add-student">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        {/* Back link */}
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Back to Students
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0f2057 0%, #1e40af 100%)' }}
          >
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enroll New Student</h1>
            <p className="text-sm text-gray-500">Complete the 4-step form to register a new student</p>
          </div>
        </div>
      </motion.div>

      {/* No-school-id warning */}
      {!schoolId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} />
            <span className="font-semibold">No school ID found in your session.</span>
          </div>
          <p className="mb-3">Student enrollment requires a valid school context. Please log out and sign in again so the system can capture your school identifier.</p>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
          >
            <LogOut size={14} />
            Log Out & Re-authenticate
          </button>
        </motion.div>
      )}

      <form onSubmit={formik.handleSubmit} noValidate>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
        >
          {/* ── Header banner ─────────────────────────────────────────────── */}
          <div
            className="px-6 lg:px-8 pt-8 pb-6"
            style={{ background: 'linear-gradient(135deg, #0f2057 0%, #1a3a8a 60%, #1e40af 100%)' }}
          >
            <h2 className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-4">
              Step {currentStep} of {steps.length} — {steps[currentStep - 1].label}
            </h2>
            {renderStepper()}
          </div>

          {/* ── Form fields ───────────────────────────────────────────────── */}
          <div className="px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              {renderStepFields()}
            </AnimatePresence>
          </div>

          {/* ── Action bar ────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 lg:px-8 py-5 border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => { formik.resetForm(); setCurrentStep(1); }}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center gap-3">
              {!isLastStep && (
                <motion.button
                  type="button"
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
                    boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.45)',
                  }}
                >
                  Next
                  <ArrowRight size={16} />
                </motion.button>
              )}

              {isLastStep && (
                <motion.button
                  type="submit"
                  disabled={formik.isSubmitting || !schoolId}
                  whileHover={{ scale: formik.isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: formik.isSubmitting ? 1 : 0.98 }}
                  className="relative flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
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
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Save Student
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </form>
    </DashboardLayout>
  );
};

export default AddStudent;
