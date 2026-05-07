import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import { getChaptersBySubject } from '../api/services/studentService';
import { Subject, Chapter, SLO } from '../types';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, BookOpen, Calculator, FlaskConical, Globe, Loader2, ChevronDown, Calendar, RefreshCw, LayoutList, SlidersHorizontal, CheckCircle2 } from 'lucide-react';

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
  { value: '9', label: '9th' },
  { value: '10', label: '10th' },
  { value: '11', label: '11th' },
  { value: '12', label: '12th' },
];

const STUDY_MODES = [
  { value: 'PARALLEL', label: 'Parallel (All subjects together)' },
  { value: 'SEQUENTIAL', label: 'Sequential (One subject at a time)' },
  { value: 'CUSTOM', label: 'Custom (Weekly schedule)' },
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    mode: 'PARALLEL',
  });

  // Subjects
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Chapters (fetched per subject)
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<number, Chapter[]>>({});
  const [chaptersLoading, setChaptersLoading] = useState<Record<number, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());

  const [selectedSloIds, setSelectedSloIds] = useState<number[]>([]);

  // Track which chapters are expanded to show their SLOs
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // Mode-specific state
  // SEQUENTIAL: ordered list of selected subject IDs
  const [subjectOrder, setSubjectOrder] = useState<number[]>([]);
  // CUSTOM: day -> selected subject IDs
  const [customPattern, setCustomPattern] = useState<Record<string, number[]>>({});

  const [submitting, setSubmitting] = useState(false);

  // Fetch all subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        console.log('Current Selected Grade:', form.grade);
        const r = await api.get('/api/curriculum/subjects');
        const d = r.data;
        console.log('Fetched Subjects raw response:', d);
        const fetchedSubjects = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
        console.log('Extracted subjects array:', fetchedSubjects);
        console.log('Subject grades found:', fetchedSubjects.map((s: any) => ({ id: s.id, name: s.name, grade: s.grade })));
        setAllSubjects(fetchedSubjects);
      } catch (err: any) {
        console.error('Failed to fetch subjects:', err);
        console.error('Subject fetch error response:', err.response?.data);
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
    const result = allSubjects.filter(s => s.grade === form.grade);
    console.log(`Grade filter: form.grade="${form.grade}", allSubjects=${allSubjects.length}, filtered=${result.length}`);
    console.log('Matching subjects:', result.map(s => ({ id: s.id, name: s.name, grade: s.grade })));
    return result;
  }, [allSubjects, form.grade]);

  // Step 3 global loading state
  const [step3Loading, setStep3Loading] = useState(false);

  // Auto-fetch chapters for all selected subjects when entering Step 3
  useEffect(() => {
    if (step !== 3 || selectedSubjects.length === 0) return;

    const loadChapters = async () => {
      const subjectsNeedingFetch = selectedSubjects.filter(
        id => !chaptersBySubject[id] && !chaptersLoading[id]
      );
      if (subjectsNeedingFetch.length === 0) {
        // Even if already fetched, auto-expand all subjects so SLOs are visible
        setExpandedSubjects(new Set(selectedSubjects));
        return;
      }

      setStep3Loading(true);
      for (const subjectId of subjectsNeedingFetch) {
        setChaptersLoading(prev => ({ ...prev, [subjectId]: true }));
        try {
          const fetchedChapters = await getChaptersBySubject(subjectId);
          console.log(`[Step3] Subject ${subjectId} chapters:`, fetchedChapters);
          // Log nested SLOs for debugging
          fetchedChapters.forEach((ch: any) => {
            console.log(`  -> Chapter "${ch.name}" has ${(ch.slos || []).length} SLOs:`, ch.slos);
          });
          setChaptersBySubject(prev => ({ ...prev, [subjectId]: fetchedChapters }));
        } catch (err) {
          console.error(`[Step3] Failed to load chapters for subject ${subjectId}:`, err);
          setChaptersBySubject(prev => ({ ...prev, [subjectId]: [] }));
          toast.error(`Failed to load chapters for subject ${subjectId}`);
        } finally {
          setChaptersLoading(prev => ({ ...prev, [subjectId]: false }));
        }
      }
      // Auto-expand all subjects so chapters & SLOs are visible immediately
      setExpandedSubjects(new Set(selectedSubjects));
      setStep3Loading(false);
    };

    loadChapters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedSubjects.join(',')]);

  const toggleSubjectExpand = (subjectId: number) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
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

  const toggleSelectAllSlos = (sloIds: number[]) => {
    const allSelected = sloIds.every(id => selectedSloIds.includes(id));
    if (allSelected) {
      setSelectedSloIds(prev => prev.filter(id => !sloIds.includes(id)));
    } else {
      setSelectedSloIds(prev => Array.from(new Set([...prev, ...sloIds])));
    }
  };

  const toggleChapterExpand = (chapterId: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const toggleSubject = (id: number) => {
    setSelectedSubjects(prev => {
      const next = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id];
      // Sync subject order for sequential mode: maintain order, remove deselected
      setSubjectOrder(so => {
        const filtered = so.filter(sid => next.includes(sid));
        const added = next.filter(sid => !so.includes(sid));
        return [...filtered, ...added];
      });
      // Sync custom pattern: remove deselected subjects from all days
      setCustomPattern(cp => {
        const nextCp: Record<string, number[]> = {};
        for (const [day, subjects] of Object.entries(cp)) {
          const filtered = subjects.filter(sid => next.includes(sid));
          if (filtered.length > 0) nextCp[day] = filtered;
        }
        return nextCp;
      });
      return next;
    });
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const setFormField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // SEQUENTIAL mode helpers
  const moveSubjectOrder = (index: number, direction: 'up' | 'down') => {
    setSubjectOrder(prev => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

  // CUSTOM mode helpers
  const toggleCustomPattern = (day: string, subjectId: number) => {
    setCustomPattern(prev => {
      const daySubjects = prev[day] || [];
      const next = daySubjects.includes(subjectId)
        ? daySubjects.filter(id => id !== subjectId)
        : [...daySubjects, subjectId];
      if (next.length === 0) {
        const { [day]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [day]: next };
    });
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
    if (selectedSloIds.length === 0) {
      toast.error('Please select at least one SLO.');
      return;
    }

    setSubmitting(true);

    // Helper to map subject ID -> name
    const getSubjectName = (id: number) => allSubjects.find(s => s.id === id)?.name || '';

    // Build payload matching API contract: /api/study-plans/create
    // CRITICAL: slo_ids must be integer array, study times must be numbers
    // No school_id — planner should be globally visible to all schools
    const basePayload = {
      title: form.plan_name,
      plan_name: form.plan_name,
      grade: form.grade,
      slo_ids: selectedSloIds.map(id => Number(id)),
      start_date: form.start_date,
      end_date: form.end_date,
      min_study_time_daily: Number(form.min_study_time_daily) || 30,
      max_study_time_daily: Number(form.max_study_time_daily) || 120,
      plan_type: (isSuperAdmin || user?.role === 'SUPER_ADMIN') ? 'RECOMMENDED' : 'CUSTOM',
    };

    // Mode-specific payload extension
    let payload: any = { ...basePayload, mode: form.mode };

    if (form.mode === 'SEQUENTIAL') {
      payload = {
        ...payload,
        subject_order: subjectOrder.map(id => getSubjectName(id)).filter(Boolean),
      };
    } else if (form.mode === 'CUSTOM') {
      const custom_pattern: Record<string, string[]> = {};
      for (const [day, subjectIds] of Object.entries(customPattern)) {
        const names = subjectIds.map(id => getSubjectName(id)).filter(Boolean);
        if (names.length > 0) custom_pattern[day] = names;
      }
      payload = { ...payload, custom_pattern };
    }

    console.log('Final Submission Payload:', payload);
    console.log('Submission Payload (formatted):', JSON.stringify(payload, null, 2));
    console.log('slo_ids type check:', typeof payload.slo_ids[0], 'values:', payload.slo_ids);
    console.log('study_time type check:', typeof payload.min_study_time_daily, typeof payload.max_study_time_daily);

    try {
      const response = await api.post('/api/study-plans/create', payload);
      console.log('Create Plan Response:', response.data);
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
      console.error('Server Error Detail:', err.response?.data);
      console.error('Server Error Status:', err.response?.status);
      console.error('Server Error Config:', err.config?.url, err.config?.method);
      const serverMsg = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.error;
      toast.error(serverMsg || 'Failed to create study plan. Please try again.');
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
    if (step === 2 && form.mode === 'SEQUENTIAL' && subjectOrder.length === 0) {
      toast.error('Please arrange the subject order for sequential mode');
      return;
    }
    if (step === 2 && form.mode === 'CUSTOM') {
      const hasAnyDay = Object.values(customPattern).some(arr => arr.length > 0);
      if (!hasAnyDay) {
        toast.error('Please assign at least one subject to a day in the weekly schedule');
        return;
      }
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
              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Study Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {STUDY_MODES.map(m => {
                    const isActive = form.mode === m.value;
                    const icon = m.value === 'PARALLEL' ? <RefreshCw size={22} /> :
                                 m.value === 'SEQUENTIAL' ? <LayoutList size={22} /> :
                                 <SlidersHorizontal size={22} />;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setFormField('mode', m.value)}
                        className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                          {icon}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>
                            {m.label.split('(')[0].trim()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            {m.value === 'PARALLEL' && 'Mix subjects evenly every day. Best for consistency.'}
                            {m.value === 'SEQUENTIAL' && 'Finish whole subjects before moving to the next.'}
                            {m.value === 'CUSTOM' && 'Assign subjects to specific days of the week.'}
                          </p>
                        </div>
                        {isActive && (
                          <div className="absolute top-3 right-3 text-blue-500">
                            <CheckCircle2 size={18} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {isSuperAdmin && (
                  <p className="text-xs text-amber-600 mt-2">
                    <span className="font-semibold">Super Admin:</span> This plan will be created as <span className="font-bold">RECOMMENDED</span> and visible globally to all schools.
                  </p>
                )}
              </div>
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

            {/* Mode-specific configuration panels */}
            {selectedSubjects.length > 0 && form.mode === 'SEQUENTIAL' && (
              <div className="mt-8 border border-blue-200 rounded-xl bg-blue-50/50 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-600" />
                  Subject Order (Sequential)
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Arrange the order in which subjects will be studied. Use arrows to reorder.
                </p>
                <div className="space-y-2">
                  {subjectOrder.map((subjectId, index) => {
                    const sub = allSubjects.find(s => s.id === subjectId);
                    if (!sub) return null;
                    return (
                      <div
                        key={subjectId}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          {getSubjectIcon(sub.name || '')}
                          <span className="text-sm font-medium text-gray-800">{sub.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSubjectOrder(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition"
                            title="Move up"
                          >
                            <ArrowLeft size={14} className="rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSubjectOrder(index, 'down')}
                            disabled={index === subjectOrder.length - 1}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition"
                            title="Move down"
                          >
                            <ArrowRight size={14} className="rotate-90" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedSubjects.length > 0 && form.mode === 'CUSTOM' && (
              <div className="mt-8 border border-purple-200 rounded-xl bg-purple-50/50 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar size={16} className="text-purple-600" />
                  Weekly Schedule (Custom)
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Assign subjects to specific days of the week.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {WEEK_DAYS.map(day => {
                    const daySubjects = customPattern[day] || [];
                    return (
                      <div key={day} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">{day}</h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {selectedSubjects.map(subjectId => {
                            const sub = allSubjects.find(s => s.id === subjectId);
                            if (!sub) return null;
                            const isChecked = daySubjects.includes(subjectId);
                            return (
                              <label
                                key={`${day}-${subjectId}`}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all text-xs ${isChecked ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50 text-gray-600'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCustomPattern(day, subjectId)}
                                  className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                />
                                <span className="truncate">{sub.name}</span>
                              </label>
                            );
                          })}
                          {selectedSubjects.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No subjects selected</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
            {step3Loading && (
              <div className="flex items-center justify-center h-32 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 mb-6">
                <Loader2 className="animate-spin text-blue-500 mr-2" size={24} />
                <span className="text-sm text-gray-500">Loading chapters & SLOs...</span>
              </div>
            )}
            {/* Chapters list per subject */}
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
                            const chapterSlos = chapter.slos || [];
                            const sloCount = chapterSlos.length;
                            const selectedCount = chapterSlos.filter((s: SLO) => selectedSloIds.includes(s.id)).length;

                            return (
                              <div key={chapter.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleChapterExpand(chapter.id)}
                                  className="w-full flex items-center justify-between p-3 bg-gray-50/80 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-800">{chapter.name || ''}</span>
                                    <span className="text-xs text-gray-500">
                                      {sloCount === 0 ? 'No SLOs' : `${selectedCount}/${sloCount} SLO${sloCount > 1 ? 's' : ''} selected`}
                                    </span>
                                  </div>
                                  {sloCount > 0 && (
                                    <ChevronDown
                                      size={16}
                                      className={`text-gray-400 transition-transform ${isChapterExpanded ? 'rotate-180' : ''}`}
                                    />
                                  )}
                                </button>

                                {isChapterExpanded && sloCount > 0 && (
                                  <div className="p-3 bg-white space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs text-blue-600 cursor-pointer hover:text-blue-700 mb-1">
                                      <input
                                        type="checkbox"
                                        checked={chapterSlos.every((s: SLO) => selectedSloIds.includes(s.id))}
                                        onChange={() => toggleSelectAllSlos(chapterSlos.map((s: SLO) => s.id))}
                                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                      />
                                      Select All
                                    </label>
                                    {chapterSlos.map((slo: SLO) => (
                                      <label
                                        key={slo.id}
                                        className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all ${selectedSloIds.includes(slo.id)
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
                                        <span className="text-sm text-gray-700">{slo.slo_text || slo.name || ''}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {isChapterExpanded && sloCount === 0 && (
                                  <div className="p-3 bg-amber-50 text-xs text-amber-700">
                                    No SLOs available for this chapter.
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
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Plan Type</p>
                  <p className="text-sm font-semibold text-gray-900">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      (isSuperAdmin || user?.role === 'SUPER_ADMIN') ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {(isSuperAdmin || user?.role === 'SUPER_ADMIN') ? 'RECOMMENDED (Global)' : 'CUSTOM'}
                    </span>
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
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Study Mode</p>
                <p className="text-sm font-semibold text-gray-900">
                  {(STUDY_MODES || []).find(m => m.value === form.mode)?.label || form.mode}
                </p>
                {form.mode === 'SEQUENTIAL' && subjectOrder.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {subjectOrder.map((id, i) => {
                      const sub = allSubjects.find(s => s.id === id);
                      return sub ? (
                        <div key={id} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">{i + 1}</span>
                          {sub.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                {form.mode === 'CUSTOM' && Object.keys(customPattern).length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(customPattern).map(([day, ids]) => (
                      <div key={day} className="bg-purple-50 rounded-md p-2">
                        <p className="text-[10px] font-bold text-purple-700 uppercase">{day}</p>
                        <p className="text-xs text-gray-600">
                          {ids.map(id => allSubjects.find(s => s.id === id)?.name).filter(Boolean).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
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
