import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import api from '../api/services/api';
import { Chapter, Subject } from '../types';
import {
  assessmentService,
  AssessmentTemplate,
  AssessmentTemplatePayload,
  AssessmentType,
} from '../api/services/assessmentService';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  Layers3,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Shuffle,
  Trash2,
  X,
  AlertTriangle,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type AssessmentView = 'dashboard' | 'templates' | 'create-template' | 'generated' | 'submissions';

interface AssessmentManagementProps {
  view?: AssessmentView;
}

interface AssessmentFormState {
  title: string;
  grade: string;
  subject: string;
  assessment_type: AssessmentType;
  chapter_ids: string[];
  cognitive_levels: string[];
  categories: string[];
  mcq_count: string;
  short_count: string;
  long_count: string;
}

interface CurriculumChapter extends Chapter {
  subject_name?: string;
  subject_grade?: string;
}

const LOCAL_TEMPLATES_KEY = 'amlos_assessment_templates';

const DEFAULT_CLASSES = ['9', '10', '11', '12', 'CSS', 'MDCAT', 'ECAT'];

const ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string; ratio: number }> = [
  { value: 'CHAPTER_WISE', label: 'Chapter Wise', ratio: 0 },
  { value: 'QUARTER', label: 'Quarter', ratio: 0.25 },
  { value: 'HALF', label: 'Half', ratio: 0.5 },
  { value: 'THIRD_QUARTER', label: 'Third Quarter', ratio: 0.75 },
  { value: 'FULL_BOOK', label: 'Full Book', ratio: 1 },
];

const COGNITIVE_LEVELS = ['Knowledge', 'Understanding', 'Application'];
const QUESTION_CATEGORIES = ['Conceptual', 'Past Paper', 'Book Exercise', 'Additional Question'];

const emptyForm: AssessmentFormState = {
  title: '',
  grade: '',
  subject: '',
  assessment_type: 'CHAPTER_WISE',
  chapter_ids: [],
  cognitive_levels: ['Knowledge', 'Understanding'],
  categories: ['Conceptual'],
  mcq_count: '3',
  short_count: '2',
  long_count: '0',
};

const extractList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.subjects)) return payload.data.subjects;
  if (Array.isArray(payload?.data?.chapters)) return payload.data.chapters;
  if (Array.isArray(payload?.data?.models)) return payload.data.models;
  if (Array.isArray(payload?.data?.templates)) return payload.data.templates;
  if (Array.isArray(payload?.subjects)) return payload.subjects;
  if (Array.isArray(payload?.chapters)) return payload.chapters;
  if (Array.isArray(payload?.models)) return payload.models;
  if (Array.isArray(payload?.templates)) return payload.templates;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const extractNamedList = (payload: any, keys: string[]): any[] => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  return [];
};

const readLocalTemplates = (): AssessmentTemplate[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalTemplates = (templates: AssessmentTemplate[]) => {
  localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(templates));
};

const toIdValue = (value: string | number): string | number => {
  const numeric = Number(value);
  return value !== '' && Number.isFinite(numeric) ? numeric : value;
};

const getEntityId = (entity: any): string => String(entity?.id ?? entity?.pk ?? entity?.value ?? entity ?? '');
const getSubjectName = (subject: any): string => subject?.name ?? subject?.title ?? subject?.subject_name ?? 'Untitled Subject';
const getSubjectGrade = (subject: any): string => String(subject?.grade ?? subject?.class_name ?? subject?.class ?? '');
const getChapterName = (chapter: any): string => chapter?.name ?? chapter?.title ?? chapter?.chapter_name ?? 'Untitled Chapter';
const getChapterSubjectId = (chapter: any): string => String(chapter?.subject?.id ?? chapter?.subject ?? chapter?.subject_id ?? '');

const normalizeGrade = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/^class\s*/i, '')
    .replace(/^grade\s*/i, '');

const matchesSearchQuery = (query: string, values: unknown[]) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
};

const formatAssessmentType = (type?: string) =>
  ASSESSMENT_TYPES.find((item) => item.value === type)?.label ?? String(type ?? 'N/A').replace(/_/g, ' ');

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const normalizeTemplate = (
  template: any,
  fallback: Partial<AssessmentTemplatePayload & AssessmentTemplate> = {}
): AssessmentTemplate => {
  const subject = template?.subject;
  const chapters = Array.isArray(template?.chapters) ? template.chapters : fallback.chapters ?? [];
  const chapterIds =
    template?.chapter_ids ??
    template?.chapters_ids ??
    chapters.map((chapter: any) => chapter?.id).filter(Boolean) ??
    fallback.chapter_ids ??
    [];

  return {
    ...fallback,
    ...template,
    id: template?.id ?? template?.model_id ?? fallback.id,
    title: template?.title ?? template?.name ?? fallback.title,
    assessment_type: template?.assessment_type ?? fallback.assessment_type,
    grade: String(template?.grade ?? fallback.grade ?? ''),
    subject: subject?.id ?? template?.subject_id ?? subject ?? fallback.subject,
    subject_name:
      template?.subject_name ??
      template?.subject_title ??
      subject?.name ??
      subject?.title ??
      fallback.subject_name,
    chapters,
    chapter_ids: Array.isArray(chapterIds) ? chapterIds : [],
    cognitive_levels: Array.isArray(template?.cognitive_levels)
      ? template.cognitive_levels
      : fallback.cognitive_levels ?? [],
    categories: Array.isArray(template?.categories) ? template.categories : fallback.categories ?? [],
    total_questions: Number(template?.total_questions ?? fallback.total_questions ?? 0),
    mcq_count: Number(template?.mcq_count ?? fallback.mcq_count ?? 0),
    short_count: Number(template?.short_count ?? fallback.short_count ?? 0),
    long_count: Number(template?.long_count ?? fallback.long_count ?? 0),
    status: template?.status ?? fallback.status ?? 'Template',
    created_at: template?.created_at ?? fallback.created_at,
    updated_at: template?.updated_at ?? fallback.updated_at,
  };
};

const mergeById = <T extends { id?: number | string }>(items: T[]) => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    const key = String(item.id ?? JSON.stringify(item));
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
};

const toggleValue = (items: string[], value: string) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const fetchSubjects = async (): Promise<Subject[]> => {
  const response = await api.get('/api/curriculum/subjects');
  return extractList(response.data) as Subject[];
};

const fetchChaptersBySubject = async (subjectId: string): Promise<CurriculumChapter[]> => {
  const response = await api.get(`/api/curriculum/chapters/${subjectId}`);
  return extractList(response.data) as CurriculumChapter[];
};

const SectionHeader: React.FC<{
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
    {action}
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: string;
}> = ({ label, value, icon, tone }) => (
  <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-soft">
    <div className="mb-4 flex items-center justify-between">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assessment</span>
    </div>
    <p className="text-xs font-semibold text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-navy-800">{value}</p>
  </div>
);

const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}> = ({ children, onClick, type = 'button', disabled }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:shadow-soft-lg disabled:cursor-not-allowed disabled:opacity-60"
  >
    {children}
  </button>
);

const SecondaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
}> = ({ children, onClick, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
  >
    {children}
  </button>
);

const fieldClass =
  'mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100';

const selectClass =
  'mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400';

const FieldLabel: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    {children}
  </label>
);

const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`relative ${className}`}>
    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
    />
  </div>
);

const FormCard: React.FC<{
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}> = ({ eyebrow, title, subtitle, icon, children, footer }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
  >
    <div
      className="px-6 py-6 lg:px-8"
      style={{ background: 'linear-gradient(135deg, #0f2057 0%, #1a3a8a 60%, #1e40af 100%)' }}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-blue-100">{subtitle}</p>
        </div>
      </div>
    </div>
    <div className="px-6 py-7 lg:px-8">{children}</div>
    <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      {footer}
    </div>
  </motion.div>
);

const IconButton: React.FC<{
  title: string;
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'blue' | 'red' | 'slate';
}> = ({ title, children, onClick, tone = 'slate' }) => {
  const classes =
    tone === 'red'
      ? 'text-red-500 hover:bg-red-50'
      : tone === 'blue'
        ? 'text-blue-600 hover:bg-blue-50'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600';

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition ${classes}`}
    >
      {children}
    </button>
  );
};

const AssessmentManagement: React.FC<AssessmentManagementProps> = ({ view = 'dashboard' }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AssessmentFormState>(emptyForm);
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null);
  const [loadedEditId, setLoadedEditId] = useState<string | null>(null);
  const [localTemplates, setLocalTemplates] = useState<AssessmentTemplate[]>(() =>
    readLocalTemplates().map((item) => normalizeTemplate(item))
  );

  // Delete modal state
  const [deletingTemplate, setDeletingTemplate] = useState<AssessmentTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Submissions state
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [gradingScore, setGradingScore] = useState('');
  const [gradingTotal, setGradingTotal] = useState('');

  // Handwritten upload state
  const [uploadingModelId, setUploadingModelId] = useState<string | number | null>(null);
  const [handwrittenFile, setHandwrittenFile] = useState<File | null>(null);

  const metadataQuery = useQuery({
    queryKey: ['assessments', 'metadata'],
    queryFn: assessmentService.getMetadata,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const subjectsQuery = useQuery({
    queryKey: ['assessments', 'curriculum-subjects'],
    queryFn: fetchSubjects,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const templatesQuery = useQuery({
    queryKey: ['assessments', 'templates', 1],
    queryFn: () => assessmentService.listTemplates(1), // Fetch first page or all if backend ignores
    retry: 1,
    staleTime: 30 * 1000,
  });

  const submissionsQuery = useQuery({
    queryKey: ['assessments', 'submissions', submissionsPage],
    queryFn: () => assessmentService.listSubmissions(submissionsPage),
    enabled: view === 'submissions',
    retry: 1,
  });

  const templateDetailQuery = useQuery({
    queryKey: ['assessments', 'template', editId],
    queryFn: () => assessmentService.getTemplate(editId as string),
    enabled: Boolean(editId),
    retry: 1,
  });

  const chaptersQuery = useQuery({
    queryKey: ['assessments', 'chapters', form.subject],
    queryFn: () => fetchChaptersBySubject(form.subject),
    enabled: Boolean(form.subject),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const availableQuery = useQuery({
    queryKey: ['assessments', 'available'],
    queryFn: assessmentService.listAvailableAssessments,
    retry: 1,
    staleTime: 30 * 1000,
  });

  const metadata = metadataQuery.data ?? {};
  const metadataSubjects = useMemo(() => extractNamedList(metadata, ['subjects']), [metadata]);
  const metadataChapters = useMemo(() => extractNamedList(metadata, ['chapters']), [metadata]);
  const metadataClasses = useMemo(() => extractNamedList(metadata, ['classes', 'grades']), [metadata]);

  const subjects = useMemo(() => {
    return mergeById([...(subjectsQuery.data ?? []), ...metadataSubjects]) as Subject[];
  }, [subjectsQuery.data, metadataSubjects]);

  const classOptions = useMemo(() => {
    const fromMetadata = metadataClasses
      .map((item) => normalizeGrade(item?.name ?? item?.grade ?? item?.title ?? item))
      .filter(Boolean);
    const fromSubjects = subjects.map((subject) => normalizeGrade(getSubjectGrade(subject))).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CLASSES, ...fromMetadata, ...fromSubjects]));
  }, [metadataClasses, subjects]);

  const filteredSubjects = useMemo(() => {
    if (!form.grade) return subjects;
    const selectedGrade = normalizeGrade(form.grade);
    return subjects.filter((subject) => {
      const subjectGrade = normalizeGrade(getSubjectGrade(subject));
      return !subjectGrade || subjectGrade === selectedGrade;
    });
  }, [form.grade, subjects]);

  const chapters = useMemo(() => {
    if (chaptersQuery.data?.length) return chaptersQuery.data;
    if (!form.subject) return [];
    return metadataChapters.filter((chapter) => getChapterSubjectId(chapter) === String(form.subject)) as CurriculumChapter[];
  }, [chaptersQuery.data, form.subject, metadataChapters]);

  const serverTemplates = useMemo(
    () => {
      const data = templatesQuery.data as any;
      const results = data?.results ?? data ?? [];
      return (Array.isArray(results) ? results : []).map((template: any) => normalizeTemplate(template));
    },
    [templatesQuery.data]
  );

  const allTemplates = useMemo(() => {
    const merged = mergeById([...serverTemplates, ...localTemplates]).map((template) =>
      normalizeTemplate(template)
    );
    return merged.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  }, [serverTemplates, localTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((template) =>
      matchesSearchQuery(search, [
        template.title,
        template.grade,
        template.subject_name,
        formatAssessmentType(template.assessment_type),
        template.total_questions,
        template.status,
      ])
    );
  }, [allTemplates, search]);

  const totalQuestions = useMemo(() => {
    const mcq = Number(form.mcq_count) || 0;
    const short = Number(form.short_count) || 0;
    const long = Number(form.long_count) || 0;
    return mcq + short + long;
  }, [form.mcq_count, form.short_count, form.long_count]);

  useEffect(() => {
    if (!editId) {
      setLoadedEditId(null);
      return;
    }
    if (!templateDetailQuery.data || loadedEditId === editId) return;

    const template = normalizeTemplate(templateDetailQuery.data);
    setForm({
      title: String(template.title ?? ''),
      grade: String(template.grade ?? ''),
      subject: String(template.subject ?? ''),
      assessment_type: ASSESSMENT_TYPES.some((item) => item.value === template.assessment_type)
        ? (template.assessment_type as AssessmentType)
        : 'CHAPTER_WISE',
      chapter_ids: (template.chapter_ids ?? []).map((id) => String(id)),
      cognitive_levels: template.cognitive_levels?.length ? template.cognitive_levels : ['Knowledge'],
      categories: template.categories?.length ? template.categories : ['Conceptual'],
      mcq_count: String(template.mcq_count ?? 0),
      short_count: String(template.short_count ?? 0),
      long_count: String(template.long_count ?? 0),
    });
    setLoadedEditId(editId);
  }, [editId, loadedEditId, templateDetailQuery.data]);

  useEffect(() => {
    if (!form.subject || chapters.length === 0 || form.assessment_type === 'CHAPTER_WISE') return;

    const rule = ASSESSMENT_TYPES.find((item) => item.value === form.assessment_type);
    const allChapterIds = chapters.map((chapter) => getEntityId(chapter)).filter(Boolean);
    const count = rule?.value === 'FULL_BOOK'
      ? allChapterIds.length
      : Math.max(1, Math.ceil(allChapterIds.length * (rule?.ratio ?? 1)));
    const nextIds = allChapterIds.slice(0, count);

    setForm((prev) => {
      const same =
        prev.chapter_ids.length === nextIds.length &&
        prev.chapter_ids.every((id, index) => id === nextIds[index]);
      return same ? prev : { ...prev, chapter_ids: nextIds };
    });
  }, [chapters, form.assessment_type, form.subject]);

  const persistLocalTemplate = (template: AssessmentTemplate) => {
    const normalized = normalizeTemplate(template);
    const next = [
      normalized,
      ...localTemplates.filter((item) => String(item.id) !== String(normalized.id)),
    ].slice(0, 30);
    setLocalTemplates(next);
    saveLocalTemplates(next);
  };

  const removeLocalTemplate = (id: number | string) => {
    const next = localTemplates.filter((item) => String(item.id) !== String(id));
    setLocalTemplates(next);
    saveLocalTemplates(next);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: AssessmentTemplatePayload) => {
      if (editId) return assessmentService.updateTemplate(editId, payload);
      return assessmentService.createTemplate(payload);
    },
    onSuccess: (result, payload) => {
      const normalized = normalizeTemplate(result, {
        id: result?.id ?? editId ?? `local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      });
      persistLocalTemplate(normalized);
      queryClient.invalidateQueries({ queryKey: ['assessments', 'templates'] });
      toast.success(editId ? 'Template updated successfully.' : 'Template created successfully.');
      navigate('/admin/assessments/templates');
    },
    onError: () => {
      toast.error('Template save failed. Please check backend response.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => assessmentService.deleteTemplate(id),
    onSuccess: (_, id) => {
      removeLocalTemplate(id);
      queryClient.invalidateQueries({ queryKey: ['assessments', 'templates'] });
      toast.success('Template deleted successfully.');
    },
    onError: () => {
      toast.error('Template delete failed.');
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ id, score, total_marks }: { id: string | number; score: number; total_marks: number }) => {
      return assessmentService.gradeSubmission(id, { score, total_marks });
    },
    onSuccess: () => {
      toast.success('Submission graded successfully.');
      setGradingSubmission(null);
      setGradingScore('');
      setGradingTotal('');
      queryClient.invalidateQueries({ queryKey: ['assessments', 'submissions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to grade submission.');
    },
  });

  const uploadHandwrittenMutation = useMutation({
    mutationFn: async ({ modelId, file }: { modelId: string | number; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return assessmentService.submitHandwritten(modelId, formData);
    },
    onSuccess: () => {
      toast.success('Handwritten assessment uploaded successfully.');
      setUploadingModelId(null);
      setHandwrittenFile(null);
      queryClient.invalidateQueries({ queryKey: ['assessments', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['assessments', 'submissions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to upload handwritten assessment.');
    },
  });

  const updateForm = <K extends keyof AssessmentFormState>(key: K, value: AssessmentFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGradeChange = (grade: string) => {
    setForm((prev) => ({ ...prev, grade, subject: '', chapter_ids: [] }));
  };

  const handleSubjectChange = (subject: string) => {
    setForm((prev) => ({ ...prev, subject, chapter_ids: [] }));
  };

  const handleTypeChange = (type: AssessmentType) => {
    setForm((prev) => ({ ...prev, assessment_type: type, chapter_ids: type === 'CHAPTER_WISE' ? prev.chapter_ids : [] }));
  };

  const buildPayload = (): AssessmentTemplatePayload | null => {
    if (!form.title.trim()) {
      toast.error('Template name is required.');
      return null;
    }
    if (!form.grade) {
      toast.error('Class is required.');
      return null;
    }
    if (!form.subject) {
      toast.error('Subject is required.');
      return null;
    }
    if (totalQuestions <= 0) {
      toast.error('At least one question is required.');
      return null;
    }
    if (chapters.length > 0 && form.chapter_ids.length === 0) {
      toast.error('Select at least one chapter.');
      return null;
    }
    if (form.cognitive_levels.length === 0) {
      toast.error('Select at least one cognitive level.');
      return null;
    }
    if (form.categories.length === 0) {
      toast.error('Select at least one question source.');
      return null;
    }

    return {
      title: form.title.trim(),
      assessment_type: form.assessment_type,
      grade: form.grade,
      subject: toIdValue(form.subject),
      chapter_ids: form.chapter_ids.map(toIdValue),
      cognitive_levels: form.cognitive_levels,
      categories: form.categories,
      total_questions: totalQuestions,
      mcq_count: Number(form.mcq_count) || 0,
      short_count: Number(form.short_count) || 0,
      long_count: Number(form.long_count) || 0,
    };
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildPayload();
    if (payload) saveMutation.mutate(payload);
  };

  const handleDelete = () => {
    if (!deletingTemplate?.id) return;
    setIsDeleting(true);

    if (String(deletingTemplate.id).startsWith('local-')) {
      removeLocalTemplate(deletingTemplate.id);
      toast.success('Template deleted successfully.');
      setDeletingTemplate(null);
      setIsDeleting(false);
      return;
    }
    deleteMutation.mutate(deletingTemplate.id, {
      onSettled: () => {
        setIsDeleting(false);
        setDeletingTemplate(null);
      }
    });
  };

  const getTemplateSubjectName = (template: AssessmentTemplate) => {
    if (template.subject_name) return template.subject_name;
    const subject = subjects.find((item) => String(item.id) === String(template.subject));
    return subject ? getSubjectName(subject) : 'N/A';
  };

  const renderDashboard = () => {
    const totalQuestionBank = allTemplates.reduce((sum, item) => sum + Number(item.total_questions ?? 0), 0);
    const chapterWiseCount = allTemplates.filter((item) => item.assessment_type === 'CHAPTER_WISE').length;
    const recent = allTemplates.slice(0, 4);

    return (
      <>
        <SectionHeader
          title="Assessment Management"
          subtitle="Create reusable quiz templates powered by CMS classes, subjects, chapters, and SLOs."
          action={
            <PrimaryButton onClick={() => navigate('/admin/assessments/templates/create')}>
              <Plus size={16} /> Create Template
            </PrimaryButton>
          }
        />
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Templates" value={allTemplates.length} icon={<ClipboardList size={20} />} tone="bg-blue-100 text-blue-600" />
          <StatCard label="Chapter Wise" value={chapterWiseCount} icon={<Layers3 size={20} />} tone="bg-purple-100 text-purple-600" />
          <StatCard label="Question Mix" value={totalQuestionBank} icon={<ListChecks size={20} />} tone="bg-emerald-100 text-emerald-600" />
          <StatCard label="Generated" value="0" icon={<Shuffle size={20} />} tone="bg-amber-100 text-amber-600" />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/70 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-bold text-gray-900">Assessment Flow</h2>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              {[
                ['Template', 'Define exam pattern'],
                ['CMS Filters', 'Class, subject, chapter'],
                ['Random Pick', 'Question type counts'],
                ['Student Quiz', 'Generated assessment'],
              ].map(([title, subtitle], index) => (
                <div key={title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-bold text-gray-900">Recent Templates</h2>
            <div className="mt-5 space-y-4">
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500">No templates created yet.</p>
              ) : (
                recent.map((template) => (
                  <div key={String(template.id ?? template.title)} className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{template.title}</p>
                      <p className="text-xs text-slate-400">
                        {formatAssessmentType(template.assessment_type)} - Grade {template.grade}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderTemplates = () => (
    <>
      <SectionHeader
        title="All Templates"
        subtitle="Manage assessment templates and random question rules."
        action={
          <PrimaryButton onClick={() => navigate('/admin/assessments/templates/create')}>
            <Plus size={16} /> Create Template
          </PrimaryButton>
        }
      />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search templates by name, class, subject, type"
        className="mb-5"
      />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_0.7fr_1fr_1fr_0.8fr_0.8fr_0.8fr] gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-bold text-white">
          <span>Template Name</span>
          <span>Class</span>
          <span>Subject</span>
          <span>Assessment Type</span>
          <span>Questions</span>
          <span>Created</span>
          <span>Actions</span>
        </div>
        {templatesQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 size={20} className="mr-2 animate-spin" /> Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No templates found.</div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={String(template.id ?? template.title)}
              className="grid grid-cols-[1.4fr_0.7fr_1fr_1fr_0.8fr_0.8fr_0.8fr] items-center gap-4 border-b border-gray-100 px-6 py-5 last:border-b-0"
            >
              <div>
                <p className="font-bold text-gray-900">{template.title}</p>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {template.cognitive_levels?.join(', ') || 'Random Rule'}
                </p>
              </div>
              <span className="font-semibold text-slate-700">{template.grade || 'N/A'}</span>
              <span className="text-slate-600">{getTemplateSubjectName(template)}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                {formatAssessmentType(template.assessment_type)}
              </span>
              <span className="text-slate-700">
                {template.total_questions ?? 0}
                <span className="ml-1 text-xs text-slate-400">
                  ({template.mcq_count ?? 0}/{template.short_count ?? 0}/{template.long_count ?? 0})
                </span>
              </span>
              <span className="text-slate-500">{formatDate(template.created_at)}</span>
              <div className="flex items-center gap-2">
                <IconButton title="View" tone="blue" onClick={() => setSelectedTemplate(template)}>
                  <Eye size={17} />
                </IconButton>
                <IconButton title="Edit" onClick={() => navigate(`/admin/assessments/templates/create?edit=${template.id}`)}>
                  <Pencil size={17} />
                </IconButton>
                <IconButton title="Delete" tone="red" onClick={() => setDeletingTemplate(template)}>
                  <Trash2 size={17} />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderCreateTemplate = () => {
    const selectedType = ASSESSMENT_TYPES.find((item) => item.value === form.assessment_type);
    const selectedChapterSet = new Set(form.chapter_ids);
    const isChapterWise = form.assessment_type === 'CHAPTER_WISE';
    const footer = (
      <>
        <SecondaryButton onClick={() => navigate('/admin/assessments/templates')}>
          <X size={16} /> Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saveMutation.isPending || templateDetailQuery.isLoading}>
          {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {editId ? 'Update Template' : 'Save Template'}
        </PrimaryButton>
      </>
    );

    return (
      <>
        <SectionHeader
          title={editId ? 'Edit Template' : 'Create Template'}
          subtitle="Build a reusable assessment model with CMS curriculum filters."
        />
        <form onSubmit={handleSubmit}>
          <FormCard
            eyebrow="Assessment Setup"
            title="Template Details"
            subtitle="Configure random question selection from class, subject, and chapter data."
            icon={<ClipboardList size={22} />}
            footer={footer}
          >
            {templateDetailQuery.isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 size={20} className="mr-2 animate-spin" /> Loading template...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <FieldLabel label="Template Name" className="lg:col-span-2">
                  <input
                    value={form.title}
                    onChange={(event) => updateForm('title', event.target.value)}
                    placeholder="Biology Chapter 1 Quiz"
                    className={fieldClass}
                  />
                </FieldLabel>
                <FieldLabel label="Class / Grade">
                  <select value={form.grade} onChange={(event) => handleGradeChange(event.target.value)} className={selectClass}>
                    <option value="">Select Class</option>
                    {classOptions.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Subject">
                  <select value={form.subject} onChange={(event) => handleSubjectChange(event.target.value)} className={selectClass}>
                    <option value="">Select Subject</option>
                    {filteredSubjects.map((subject) => (
                      <option key={getEntityId(subject)} value={getEntityId(subject)}>
                        {getSubjectName(subject)}{getSubjectGrade(subject) ? ` - Grade ${getSubjectGrade(subject)}` : ''}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Assessment Type">
                  <select
                    value={form.assessment_type}
                    onChange={(event) => handleTypeChange(event.target.value as AssessmentType)}
                    className={selectClass}
                  >
                    {ASSESSMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </FieldLabel>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-sm font-bold text-blue-700">{selectedType?.label}</p>
                  <p className="mt-1 text-xs text-blue-500">
                    {isChapterWise
                      ? 'Manual chapter selection'
                      : `${form.chapter_ids.length} chapter(s) selected by assessment type`}
                  </p>
                </div>
                <div className="lg:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Chapters</p>
                    {chaptersQuery.isFetching && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Loader2 size={12} className="animate-spin" /> Loading
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {chapters.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                        Select a subject to load chapters.
                      </div>
                    ) : (
                      chapters.map((chapter) => {
                        const id = getEntityId(chapter);
                        const checked = selectedChapterSet.has(id);
                        return (
                          <label
                            key={id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                              checked ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
                            } ${!isChapterWise ? 'cursor-default opacity-90' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!isChapterWise}
                              onChange={() => updateForm('chapter_ids', toggleValue(form.chapter_ids, id))}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            <span className="font-semibold">{getChapterName(chapter)}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-3 text-sm font-semibold text-gray-700">Cognitive Levels</p>
                  <div className="flex flex-wrap gap-3">
                    {COGNITIVE_LEVELS.map((level) => (
                      <label key={level} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.cognitive_levels.includes(level)}
                          onChange={() => updateForm('cognitive_levels', toggleValue(form.cognitive_levels, level))}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        {level}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-3 text-sm font-semibold text-gray-700">Question Sources</p>
                  <div className="flex flex-wrap gap-3">
                    {QUESTION_CATEGORIES.map((category) => (
                      <label key={category} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.categories.includes(category)}
                          onChange={() => updateForm('categories', toggleValue(form.categories, category))}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        {category}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Random Question Mix</p>
                      <p className="text-xs text-slate-500">Total questions: {totalQuestions}</p>
                    </div>
                    <Shuffle size={20} className="text-blue-500" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FieldLabel label="MCQs">
                      <input
                        type="number"
                        min="0"
                        value={form.mcq_count}
                        onChange={(event) => updateForm('mcq_count', event.target.value)}
                        className={fieldClass}
                      />
                    </FieldLabel>
                    <FieldLabel label="Short Questions">
                      <input
                        type="number"
                        min="0"
                        value={form.short_count}
                        onChange={(event) => updateForm('short_count', event.target.value)}
                        className={fieldClass}
                      />
                    </FieldLabel>
                    <FieldLabel label="Long Questions">
                      <input
                        type="number"
                        min="0"
                        value={form.long_count}
                        onChange={(event) => updateForm('long_count', event.target.value)}
                        className={fieldClass}
                      />
                    </FieldLabel>
                  </div>
                </div>
              </div>
            )}
          </FormCard>
        </form>
      </>
    );
  };

  const renderGenerated = () => {
    const available = availableQuery.data || [];
    return (
      <>
        <SectionHeader
          title="Generated Assessments"
          subtitle="Student-ready assessments produced from saved templates."
          action={
            <PrimaryButton onClick={() => navigate('/admin/assessments/templates/create')}>
              <Plus size={16} /> Create Template
            </PrimaryButton>
          }
        />
        {availableQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 size={20} className="mr-2 animate-spin" /> Loading generated assessments...
          </div>
        ) : available.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white p-10 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BarChart3 size={24} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">No generated assessments yet.</h2>
            <p className="mt-2 text-sm text-slate-500">
              Saved templates are ready for the random generator service.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr] gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-bold text-white">
              <span>Title</span>
              <span>Subject</span>
              <span>Total Questions</span>
              <span>Created</span>
              <span>Status</span>
            </div>
            {available.map((assessment: any) => (
              <div
                key={String(assessment.id ?? assessment.title)}
                className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr] items-center gap-4 border-b border-gray-100 px-6 py-5 last:border-b-0"
              >
                <div>
                  <p className="font-bold text-gray-900">{assessment.title || 'Untitled Assessment'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setUploadingModelId(assessment.id ?? assessment.model_id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                    >
                      <Upload size={14} /> Upload Handwritten
                    </button>
                  </div>
                </div>
                <span className="text-slate-600">{assessment.subject_name || 'N/A'}</span>
                <span className="text-slate-700 font-semibold">{assessment.total_questions || 0} Questions</span>
                <span className="text-slate-500">{formatDate(assessment.created_at)}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 w-max">
                  {assessment.status || 'AVAILABLE'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Handwritten Upload Modal */}
        <AnimatePresence>
          {uploadingModelId && (
            <Modal
              isOpen={!!uploadingModelId}
              onClose={() => { setUploadingModelId(null); setHandwrittenFile(null); }}
              title="Upload Handwritten Assessment"
            >
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">Upload a scanned copy or image of the handwritten assessment for grading.</p>
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setHandwrittenFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <SecondaryButton onClick={() => { setUploadingModelId(null); setHandwrittenFile(null); }}>Cancel</SecondaryButton>
                  <PrimaryButton
                    onClick={() => {
                      if (handwrittenFile && uploadingModelId) {
                        uploadHandwrittenMutation.mutate({ modelId: uploadingModelId, file: handwrittenFile });
                      }
                    }}
                    disabled={!handwrittenFile || uploadHandwrittenMutation.isPending}
                  >
                    {uploadHandwrittenMutation.isPending ? 'Uploading...' : 'Upload'}
                  </PrimaryButton>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </>
    );
  };

  const renderSubmissions = () => {
    const data = submissionsQuery.data;
    const submissions = data?.results || [];
    const totalCount = data?.count || 0;
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

    return (
      <>
        <SectionHeader
          title="Submissions & Grading"
          subtitle="Review and grade student assessment submissions."
        />
        {submissionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 size={20} className="mr-2 animate-spin" /> Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white p-10 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <FileText size={24} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">No Submissions Found</h2>
            <p className="mt-2 text-sm text-slate-500">There are no assessment submissions yet.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-600 to-slate-700 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Student Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Assessment Title</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Submitted At</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Score</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {submissions.map((sub: any, index: number) => (
                    <motion.tr key={sub.id || index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">{sub.student_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sub.assessment_title || 'Untitled Assessment'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(sub.submitted_at || sub.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          sub.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {sub.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">
                        {sub.status === 'GRADED' ? `${sub.score} / ${sub.total_marks}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {sub.status !== 'GRADED' && (
                          <button
                            onClick={() => { setGradingSubmission(sub); setGradingScore(''); setGradingTotal(sub.total_marks ? String(sub.total_marks) : ''); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition"
                          >
                            <Pencil size={14} /> Grade
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Page <span className="font-semibold text-navy-800">{submissionsPage}</span> of <span className="font-semibold text-navy-800">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSubmissionsPage(p => Math.max(1, p - 1))} disabled={submissionsPage === 1} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button onClick={() => setSubmissionsPage(p => Math.min(totalPages, p + 1))} disabled={submissionsPage === totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Grading Modal */}
        <AnimatePresence>
          {gradingSubmission && (
            <Modal
              isOpen={!!gradingSubmission}
              onClose={() => setGradingSubmission(null)}
              title={`Grade Submission - ${gradingSubmission.student_name}`}
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Assessment</p>
                    <p className="font-bold text-slate-800">{gradingSubmission.assessment_title}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FieldLabel label="Score">
                    <input
                      type="number"
                      min="0"
                      value={gradingScore}
                      onChange={(e) => setGradingScore(e.target.value)}
                      className={fieldClass}
                      placeholder="e.g. 85"
                    />
                  </FieldLabel>
                  <FieldLabel label="Total Marks">
                    <input
                      type="number"
                      min="1"
                      value={gradingTotal}
                      onChange={(e) => setGradingTotal(e.target.value)}
                      className={fieldClass}
                      placeholder="e.g. 100"
                    />
                  </FieldLabel>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <SecondaryButton onClick={() => setGradingSubmission(null)}>Cancel</SecondaryButton>
                  <PrimaryButton
                    onClick={() => {
                      if (gradingScore && gradingTotal) {
                        gradeMutation.mutate({
                          id: gradingSubmission.id,
                          score: Number(gradingScore),
                          total_marks: Number(gradingTotal),
                        });
                      } else {
                        toast.error('Please enter both score and total marks.');
                      }
                    }}
                    disabled={!gradingScore || !gradingTotal || gradeMutation.isPending}
                  >
                    {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                  </PrimaryButton>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </>
    );
  };

  const renderTemplateModal = () => {
    if (!selectedTemplate) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-soft-lg">
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">Template Detail</p>
              <h2 className="text-lg font-bold">{selectedTemplate.title}</h2>
            </div>
            <button type="button" onClick={() => setSelectedTemplate(null)} className="rounded-lg p-2 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            {[
              ['Class', selectedTemplate.grade],
              ['Subject', getTemplateSubjectName(selectedTemplate)],
              ['Assessment Type', formatAssessmentType(selectedTemplate.assessment_type)],
              ['Total Questions', selectedTemplate.total_questions ?? 0],
              ['MCQ / Short / Long', `${selectedTemplate.mcq_count ?? 0} / ${selectedTemplate.short_count ?? 0} / ${selectedTemplate.long_count ?? 0}`],
              ['Chapters', selectedTemplate.chapter_ids?.length ?? 0],
              ['Cognitive Levels', selectedTemplate.cognitive_levels?.join(', ') || 'N/A'],
              ['Sources', selectedTemplate.categories?.join(', ') || 'N/A'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                <p className="mt-1 font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'templates') return renderTemplates();
    if (view === 'create-template') return renderCreateTemplate();
    if (view === 'generated') return renderGenerated();
    if (view === 'submissions') return renderSubmissions();
    return renderDashboard();
  };

  const activePageMap: Record<AssessmentView, string> = {
    dashboard: 'assessment-management',
    templates: 'all-assessment-templates',
    'create-template': 'create-assessment-template',
    generated: 'generated-assessments',
    submissions: 'assessment-submissions',
  };

  return (
    <DashboardLayout activePage={activePageMap[view]}>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
        <span>Assessment</span>
        <ArrowRight size={13} />
        <span>Template</span>
        <ArrowRight size={13} />
        <span>Question Mix</span>
        <ArrowRight size={13} />
        <span>Generated Quiz</span>
      </div>
      {renderContent()}
      {renderTemplateModal()}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingTemplate && (
          <Modal
            isOpen={!!deletingTemplate}
            onClose={() => setDeletingTemplate(null)}
            title="Delete Template"
          >
            <div className="flex flex-col items-center text-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete</p>
              <p className="text-sm font-bold text-gray-800 mb-4">"{deletingTemplate.title}"?</p>
              <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setDeletingTemplate(null)} 
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 size={14} className="animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default AssessmentManagement;
