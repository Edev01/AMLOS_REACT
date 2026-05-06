import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import { Subject, Chapter, SLO } from '../types';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, BookOpen, Calculator, FlaskConical, Globe, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const steps = [
  { n: 1, title: 'Planner Basic Info', sub: 'Set basic details' },
  { n: 2, title: 'Select Subjects', sub: 'Choose subjects' },
  { n: 3, title: 'Chapters & SLOs', sub: 'Select SLOs' },
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

const GRADES = [
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' },
];

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

  // Step & Form
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    plan_name: '',
    exam_type: '',
    start_date: '',
    end_date: '',
    min_study_time_daily: '30',
    max_study_time_daily: '120',
    grade: '',
  });

  // Subjects
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Chapters (fetched per subject)
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<number, Chapter[]>>({});
  const [chaptersLoading, setChaptersLoading] = useState<Record<number, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());

  // SLOs (fetched per chapter)
  const [slosByChapter, setSlosByChapter] = useState<Record<number, SLO[]>>({});
  const [slosLoading, setSlosLoading] = useState<Record<number, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [selectedSloIds, setSelectedSloIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Fetch all subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const r = await api.get('/api/curriculum/subjects');
        const d = r.data;
        const fetchedSubjects = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
        setAllSubjects(fetchedSubjects);
      } catch {
        setAllSubjects([]);
        toast.error('Failed to load subjects. Please try again.');
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  // Filter subjects by selected grade
  const filteredSubjects = React.useMemo(() => {
    if (!form.grade) return [];
    return allSubjects.filter(s => s.grade === form.grade);
  }, [allSubjects, form.grade]);

  // Fetch chapters for a subject
  const fetchChapters = async (subjectId: number) => {
    if (chaptersBySubject[subjectId]) return;
    try {
      setChaptersLoading(prev => ({ ...prev, [subjectId]: true }));
      const r = await api.get(`/api/curriculum/chapters?subject_id=${subjectId}`);
      const d = r.data;
      const fetchedChapters = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
      setChaptersBySubject(prev => ({ ...prev, [subjectId]: fetchedChapters }));
    } catch {
      setChaptersBySubject(prev => ({ ...prev, [subjectId]: [] }));
      toast.error(`Failed to load chapters for subject ${subjectId}`);
    } finally {
      setChaptersLoading(prev => ({ ...prev, [subjectId]: false }));
    }
  };

  // Fetch SLOs for a chapter
  const fetchSlos = async (chapterId: number) => {
    if (slosByChapter[chapterId]) return;
    try {
      setSlosLoading(prev => ({ ...prev, [chapterId]: true }));
      const r = await api.get(`/api/curriculum/slos?chapter_id=${chapterId}`);
      const d = r.data;
      const fetchedSlos = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
      setSlosByChapter(prev => ({ ...prev, [chapterId]: fetchedSlos }));
    } catch {
      setSlosByChapter(prev => ({ ...prev, [chapterId]: [] }));
      toast.error(`Failed to load SLOs for chapter ${chapterId}`);
    } finally {
      setSlosLoading(prev => ({ ...prev, [chapterId]: false }));
    }
  };

  const toggleSubjectExpand = (subjectId: number) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
        fetchChapters(subjectId);
      }
      return next;
    });
  };

  const toggleChapterExpand = (chapterId: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
        fetchSlos(chapterId);
      }
      return next;
    });
  };

  const toggleSlo = (sloId: number) => {
    setSelectedSloIds(prev =>
      prev.includes(sloId)
        ? prev.filter(id => id !== sloId)
        : [...prev, sloId]
    );
  };

  const toggleSubject = (id: number) => {
    setSelectedSubjects(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const setFormField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

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
    if (selectedSloIds.length === 0) {
      toast.error('Please select at least one SLO.');
      return;
    }

    setSubmitting(true);

    // Build payload matching API contract: /api/study-plans/create
    const payload = {
      slo_ids: selectedSloIds,
      start_date: form.start_date,
      end_date: form.end_date,
      min_study_time_daily: parseInt(form.min_study_time_daily) || 30,
      max_study_time_daily: parseInt(form.max_study_time_daily) || 120,
      plan_type: 'CUSTOM',
    };

    try {
      await api.post('/api/study-plans/create', payload);
      toast.success('Study plan created successfully!');

      let destination = '/planners';
      if (isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
        destination = '/admin/planners';
      } else if (user?.role === 'SCHOOL_ADMIN' || user?.role === 'CAMPUS_ADMIN') {
        destination = `/campus/${tenant?.campusId}/planners`;
      } else if (user?.role === 'SCHOOL') {
        destination = '/school/planners';
      }

      navigate(destination);
    } catch (err: any) {
      console.error('Error creating study plan:', err);
      toast.error('Failed to create study plan. Please try again.');
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
        onChange={e => setFormField(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );

  // Safe navigation
  const nextStep = () => {
    if (step === 1) {
      if (!form.plan_name || !form.grade || !form.start_date || !form.end_date) {
        toast.error('Please fill all required fields');
        return;
      }
    }
    if (step === 2 && selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    if (step === 3 && selectedSloIds.length === 0) {
      toast.error('Please select at least one SLO');
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Safe render check
  if (!allSubjects || !Array.isArray(allSubjects)) {
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
                  Grade <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.grade || ''}
                  onChange={e => setFormField('grade', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select Grade</option>
                  {(GRADES || []).map(g => (
                    <option key={g?.value || ''} value={g?.value || ''}>{g?.label || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Exam Type
                </label>
                <select
                  value={form.exam_type || ''}
                  onChange={e => setFormField('exam_type', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select Exam Type</option>
                  {(EXAM_TYPES || []).map(et => (
                    <option key={et?.value || ''} value={et?.value || ''}>{et?.label || ''}</option>
                  ))}
                </select>
              </div>
              {field('Start Date', 'start_date', '', 'date')}
              {field('End Date', 'end_date', '', 'date')}
              {field('Min Study Time Daily (min)', 'min_study_time_daily', '30', 'number')}
              {field('Max Study Time Daily (min)', 'max_study_time_daily', '120', 'number')}
            </div>
          </div>
        )}

        {/* Step 2: Select Subjects */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Select Subjects</h2>
            <p className="text-sm text-gray-500 mb-6">
              Grade {form.grade ? `${form.grade}th` : ''} — Selected: {selectedSubjects?.length || 0} subjects
            </p>
            {subjectsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-blue-500 mr-2" size={24} />
                <span className="text-sm text-gray-500">Loading subjects...</span>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <EmptyState
                type="data"
                title="No subjects found"
                description={`No subjects are available for Grade ${form.grade || 'selected'}. Please create subjects first.`}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(filteredSubjects || []).map((s: Subject) => (
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

        {/* Step 3: Chapters & SLOs */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Select Chapters & SLOs</h2>
            <p className="text-sm text-gray-500 mb-6">
              Selected: {selectedSloIds?.length || 0} SLOs
            </p>
            <div className="space-y-4">
              {(selectedSubjects || []).map(subjectId => {
                const subject = (allSubjects || []).find((s: Subject) => s?.id === subjectId);
                const chapters = chaptersBySubject[subjectId] || [];
                const isSubjectExpanded = expandedSubjects.has(subjectId);
                const isChaptersLoading = chaptersLoading[subjectId];

                if (!subject) return null;

                return (
                  <div key={subjectId} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSubjectExpand(subjectId)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getSubjectIcon(subject.name || '')}
                        <span className="font-semibold text-gray-900">{subject.name || ''}</span>
                        <span className="text-xs text-gray-500">
                          {isChaptersLoading ? 'Loading...' : `(${chapters?.length || 0} chapters)`}
                        </span>
                      </div>
                      {isChaptersLoading ? (
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                      ) : (
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 transition-transform ${isSubjectExpanded ? 'rotate-180' : ''}`}
                        />
                      )}
                    </button>

                    {isSubjectExpanded && (
                      <div className="p-4 bg-white space-y-3">
                        {(chapters || []).length === 0 ? (
                          <p className="text-sm text-gray-400">No chapters available for this subject</p>
                        ) : (
                          chapters.map((chapter: Chapter) => {
                            const isChapterExpanded = expandedChapters.has(chapter.id);
                            const slos = slosByChapter[chapter.id] || [];
                            const isSlosLoading = slosLoading[chapter.id];

                            return (
                              <div key={chapter.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleChapterExpand(chapter.id)}
                                  className="w-full flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100 transition-colors"
                                >
                                  <span className="text-sm font-medium text-gray-700">{chapter.name || ''}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">
                                      {isSlosLoading ? 'Loading...' : `${slos.length} SLOs`}
                                    </span>
                                    {isSlosLoading ? (
                                      <Loader2 size={14} className="animate-spin text-blue-500" />
                                    ) : (
                                      <ChevronDown
                                        size={14}
                                        className={`text-gray-400 transition-transform ${isChapterExpanded ? 'rotate-180' : ''}`}
                                      />
                                    )}
                                  </div>
                                </button>

                                {isChapterExpanded && (
                                  <div className="p-3 bg-white">
                                    {slos.length === 0 ? (
                                      <p className="text-xs text-gray-400">No SLOs available for this chapter</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {slos.map((slo: SLO) => (
                                          <label
                                            key={slo.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedSloIds.includes(slo.id)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-100 hover:border-blue-200'
                                              }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={selectedSloIds.includes(slo.id)}
                                              onChange={() => toggleSlo(slo.id)}
                                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{slo.slo_text || ''}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
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
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Grade</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(GRADES || []).find(g => g?.value === form.grade)?.label || form.grade || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Exam Type</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(EXAM_TYPES || []).find(et => et?.value === form.exam_type)?.label || form.exam_type || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Study Time</p>
                  <p className="text-sm font-semibold text-gray-900">{form.min_study_time_daily || '30'} - {form.max_study_time_daily || '120'} min/day</p>
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
                    const sub = (allSubjects || []).find((s: Subject) => s?.id === id);
                    return sub ? (
                      <span key={id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                        {sub.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Selected SLOs</p>
                <p className="text-sm font-semibold text-gray-900">{(selectedSloIds?.length || 0)} SLOs</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(selectedSloIds || []).map(sloId => (
                    <span key={sloId} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">
                      SLO #{sloId}
                    </span>
                  ))}
                </div>
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
