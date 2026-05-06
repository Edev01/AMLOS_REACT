import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import { Subject } from '../types';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, BookOpen, Calculator, FlaskConical, Globe } from 'lucide-react';

const steps = [
  { n: 1, title: 'Planner Basic Info', sub: 'Set basic details' },
  { n: 2, title: 'Select Subjects', sub: 'Choose subjects' },
  { n: 3, title: 'Chapters & Topics', sub: 'Select topics' },
  { n: 4, title: 'Planner Preview', sub: 'Review & publish' },
];

// Static exam types - could be fetched from API if needed
const EXAM_TYPES = [
  { value: 'midterm', label: 'Midterm Examination' },
  { value: 'final', label: 'Final Examination' },
  { value: 'entrance', label: 'Entrance Test' },
  { value: 'quiz', label: 'Quiz Assessment' },
  { value: 'mock', label: 'Mock Test' },
];

// Mock chapters for each subject - will be replaced with API data when available
const MOCK_CHAPTERS: Record<number, { id: number; name: string; topics: string[] }[]> = {
  1: [ // Math
    { id: 101, name: 'Algebra Basics', topics: ['Linear Equations', 'Quadratic Equations', 'Polynomials'] },
    { id: 102, name: 'Geometry', topics: ['Triangles', 'Circles', 'Coordinate Geometry'] },
    { id: 103, name: 'Calculus', topics: ['Limits', 'Derivatives', 'Integrals'] },
  ],
  2: [ // Physics
    { id: 201, name: 'Mechanics', topics: ['Motion', 'Forces', 'Energy'] },
    { id: 202, name: 'Thermodynamics', topics: ['Heat', 'Temperature', 'Laws'] },
    { id: 203, name: 'Optics', topics: ['Reflection', 'Refraction', 'Lenses'] },
  ],
  3: [ // Chemistry
    { id: 301, name: 'Organic Chemistry', topics: ['Hydrocarbons', 'Functional Groups', 'Reactions'] },
    { id: 302, name: 'Inorganic Chemistry', topics: ['Periodic Table', 'Chemical Bonding', 'Acids'] },
  ],
  4: [ // Biology
    { id: 401, name: 'Zoology', topics: ['Animal Kingdom', 'Human Physiology', 'Genetics'] },
    { id: 402, name: 'Botany', topics: ['Plant Kingdom', 'Photosynthesis', 'Reproduction'] },
  ],
  5: [ // English
    { id: 501, name: 'Grammar', topics: ['Tenses', 'Active Passive', 'Direct Indirect'] },
    { id: 502, name: 'Literature', topics: ['Poetry', 'Prose', 'Drama'] },
  ],
  6: [ // History
    { id: 601, name: 'Ancient History', topics: ['Indus Valley', 'Mesopotamia', 'Egypt'] },
    { id: 602, name: 'Modern History', topics: ['World Wars', 'Independence', 'Cold War'] },
  ],
};

// Subject icon mapping with fallback
const getSubjectIcon = (name: string) => {
  const icons: Record<string, React.ReactNode> = {
    'Mathematics': <Calculator size={24} className="text-blue-500" />,
    'Physics': <FlaskConical size={24} className="text-purple-500" />,
    'Chemistry': <FlaskConical size={24} className="text-emerald-500" />,
    'Biology': <BookOpen size={24} className="text-rose-500" />,
    'English': <BookOpen size={24} className="text-amber-500" />,
    'History': <Globe size={24} className="text-cyan-500" />,
  };
  return icons[name] || <BookOpen size={24} className="text-gray-400" />;
};

const CreatePlanner: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant, isSuperAdmin } = useAuth();
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Fetch subjects from backend on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const r = await api.get('/api/curriculum/subjects');
        const d = r.data;
        const fetchedSubjects = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
        setSubjects(fetchedSubjects);
      } catch {
        // Fallback to empty array if API fails
        setSubjects([]);
        toast.error('Failed to load subjects. Please try again.');
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjects();
  }, []);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    plan_name: '',
    exam_type: '',
    duration: '',
    start_date: '',
    end_date: '',
    daily_limit: '120',
    description: '',
  });

  // Safe form setter
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Safe subject toggle
  const toggleSubject = (id: number) => {
    setSelectedSubjects(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  // Safe chapter toggle
  const toggleChapter = (id: number) => {
    setSelectedChapters(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  // Calculate total topics from selected chapters
  const calculateTotalTopics = (): number => {
    let total = 0;
    (selectedSubjects || []).forEach(subjectId => {
      const chapters = MOCK_CHAPTERS?.[subjectId] || [];
      chapters.forEach(chapter => {
        if (selectedChapters.includes(chapter.id)) {
          total += chapter.topics?.length || 0;
        }
      });
    });
    return total;
  };

  // Submit handler - POST to backend API
  const handleSubmit = async () => {
    if (!form.plan_name || !form.start_date || !form.end_date) {
      toast.error('Please fill required fields.');
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject.');
      return;
    }

    setSubmitting(true);

    // Build payload for backend
    const payload = {
      planner_name: form.plan_name,
      plan_name: form.plan_name,
      exam_type: form.exam_type,
      duration: form.duration,
      duration_weeks: parseInt(form.duration) || 12,
      start_date: form.start_date,
      end_date: form.end_date,
      daily_limit_minutes: parseInt(form.daily_limit) || 120,
      description: form.description,
      subjects: selectedSubjects,
      chapters: selectedChapters,
      status: 'active',
      school_id: tenant?.schoolId || user?.school_id || localStorage.getItem('school_id') || undefined,
    };

    try {
      // POST to backend API
      await api.post('/api/study-plans', payload);

      toast.success('Planner created successfully!');

      // Determine destination path based on role to avoid 403 Unauthorized redirects
      let destination = '/planners';
      if (isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
        destination = '/admin/planners';
      } else if (user?.role === 'SCHOOL_ADMIN' || user?.role === 'CAMPUS_ADMIN' || ((user?.role as string) === 'ADMIN' && tenant?.campusId)) {
        destination = `/campus/${tenant?.campusId || localStorage.getItem('campus_id')}/planners`;
      } else if (user?.role === 'SCHOOL') {
        destination = '/school/planners';
      }

      console.log(`Redirecting to: ${destination}`);
      navigate(destination);
    } catch (err: any) {
      console.error('Error creating planner:', err);
      if (err?.response?.status === 403) {
        console.error(`403 Access Denied on POST /api/study-plans. Details:`, err?.response?.data);
      }
      toast.error('Failed to create planner. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Safe field renderer
  const field = (label: string, key: string, placeholder: string, type = 'text', required = true) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={(form as any)[key] || ''}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );

  // Safe navigation
  const nextStep = () => {
    if (step === 1 && (!form.plan_name || !form.exam_type)) {
      toast.error('Please fill in required fields');
      return;
    }
    if (step === 2 && selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Safe render check
  if (!subjects || !Array.isArray(subjects)) {
    return (
      <DashboardLayout activePage="create-planner">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading planner data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="create-planner">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Planner</h1>
        <p className="text-sm text-gray-500 mt-1">Design a comprehensive study planner for your students</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
        {/* Step indicator - Safe map with fallback */}
        <div className="flex items-center justify-between mb-10 max-w-3xl mx-auto">
          {(steps || []).map((s, i) => (
            <React.Fragment key={s?.n || i}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${step >= (s?.n || 0) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {step > (s?.n || 0) ? <Check size={16} /> : (s?.n || i + 1)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{s?.title || ''}</p>
                  <p className="text-[10px] text-gray-400">{s?.sub || ''}</p>
                </div>
              </div>
              {i < (steps?.length || 0) - 1 && (
                <div className={`hidden sm:block flex-1 h-0.5 mx-3 transition-colors ${step > (s?.n || 0) ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Planner Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {field('Planner Name', 'plan_name', 'Jee Main 2024 Preparation')}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Exam Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.exam_type || ''}
                  onChange={e => set('exam_type', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select Exam Type</option>
                  {(EXAM_TYPES || []).map(et => (
                    <option key={et?.value || ''} value={et?.value || ''}>{et?.label || ''}</option>
                  ))}
                </select>
              </div>
              {field('Duration (weeks)', 'duration', 'e.g. 12 Weeks')}
              {field('Start Date', 'start_date', '', 'date')}
              {field('End Date', 'end_date', '', 'date')}
              {field('Daily Study Limit (minutes)', 'daily_limit', '120', 'number')}
            </div>
          </div>
        )}

        {/* Step 2: Select Subjects - Safe map with fallback */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Select Subjects</h2>
            <p className="text-sm text-gray-500 mb-6">
              Selected: {selectedSubjects?.length || 0} subjects
            </p>
            {(!subjects || subjects.length === 0) ? (
              <p className="text-gray-500 text-sm p-4 bg-gray-50 rounded-lg">
                No subjects available. Please check mock data.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(subjects || []).map(s => (
                  <button
                    key={s?.id || Math.random()}
                    type="button"
                    onClick={() => s?.id && toggleSubject(s.id)}
                    className={`rounded-xl border p-4 text-left transition-all duration-200 ${selectedSubjects?.includes(s?.id || 0)
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {getSubjectIcon(s?.name || '')}
                      <p className="font-semibold text-gray-900">{s?.name || 'Unknown'}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{s?.description || `Grade ${s?.grade || 'N/A'}`}</p>
                    {selectedSubjects?.includes(s?.id || 0) && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Check size={12} /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Chapters & Topics */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Select Chapters & Topics</h2>
            <p className="text-sm text-gray-500 mb-6">
              Selected: {selectedChapters?.length || 0} chapters
            </p>
            <div className="space-y-4">
              {(selectedSubjects || []).map(subjectId => {
                const subject = (subjects || []).find(s => s?.id === subjectId);
                const chapters = MOCK_CHAPTERS?.[subjectId] || [];
                const isExpanded = expandedSubject === subjectId;

                if (!subject) return null;

                return (
                  <div key={subjectId} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSubject(isExpanded ? null : subjectId)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getSubjectIcon(subject.name || '')}
                        <span className="font-semibold text-gray-900">{subject.name || ''}</span>
                        <span className="text-xs text-gray-500">
                          ({chapters?.length || 0} chapters)
                        </span>
                      </div>
                      <ArrowRight
                        size={16}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-white">
                        {(chapters || []).length === 0 ? (
                          <p className="text-sm text-gray-400">No chapters available for this subject</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(chapters || []).map(chapter => (
                              <button
                                key={chapter?.id || Math.random()}
                                onClick={() => chapter?.id && toggleChapter(chapter.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedChapters?.includes(chapter?.id || 0)
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300'
                                  }`}
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedChapters?.includes(chapter?.id || 0)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-gray-300'
                                  }`}>
                                  {selectedChapters?.includes(chapter?.id || 0) && (
                                    <Check size={12} className="text-white" />
                                  )}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{chapter?.name || ''}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Planner Preview</h2>
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Planner Name</p>
                  <p className="text-sm font-semibold text-gray-900">{form.plan_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Exam Type</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(EXAM_TYPES || []).find(et => et?.value === form.exam_type)?.label || form.exam_type || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                  <p className="text-sm font-semibold text-gray-900">{form.duration || '—'} weeks</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Daily Limit</p>
                  <p className="text-sm font-semibold text-gray-900">{form.daily_limit || '120'} minutes</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                  <p className="text-sm font-semibold text-gray-900">{form.start_date || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">End Date</p>
                  <p className="text-sm font-semibold text-gray-900">{form.end_date || '—'}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Selected Subjects</p>
                <p className="text-sm font-semibold text-gray-900">{(selectedSubjects?.length || 0)} subjects</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(selectedSubjects || []).map(id => {
                    const sub = (subjects || []).find(s => s?.id === id);
                    return sub ? (
                      <span key={id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                        {sub.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Selected Chapters</p>
                <p className="text-sm font-semibold text-gray-900">{(selectedChapters?.length || 0)} chapters</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-300 transition"
          >
            <ArrowLeft size={16} /> Previous
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {submitting ? 'Creating...' : 'Create Planner'} <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatePlanner;
