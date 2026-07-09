import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import {
  getGrades, createGrade, updateGrade, deleteGrade,
  getSubjects, createSubject, updateSubject, deleteSubject,
  getChaptersBySubject, createChapter, updateChapter, deleteChapter,
  createSlo, updateSlo, deleteSlo, bulkUploadSlos,
} from '../api/services/curriculumService';
import { Chapter, SLO, Subject } from '../types';
import { assessmentService } from '../api/services/assessmentService';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Layers3,
  ListChecks,
  Plus,
  Search,
  Upload,
  Eye,
  Pencil,
  Trash2,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Save,
  X,
  Clock,
  AlertTriangle,
  Download,
  ClipboardList,
} from 'lucide-react';
import ExamTypesModal from '../components/ExamTypesModal';

type CMSView =
  | 'dashboard'
  | 'classes'
  | 'add-class'
  | 'subjects'
  | 'add-subject'
  | 'chapters'
  | 'add-chapter'
  | 'slos'
  | 'add-slo'
  | 'upload-slo';

interface CMSManagementProps {
  view?: CMSView;
}

interface Grade {
  id: number | string;
  name: string;
  description?: string;
}

interface CMSChapter extends Chapter {
  subject_name?: string;
  subject_grade?: string;
  total_slos?: number;
}

interface CMSSlo extends SLO {
  title?: string;
  description?: string;
  estimated_time?: number;
  chapter_id?: number;
  chapter_name?: string;
  subject_name?: string;
  subject_grade?: string;
}

// ── Helpers ──

const getSubjectId = (subject: Subject) => Number(subject.id);
const getChapterId = (chapter: CMSChapter | Chapter) => Number(chapter.id);
const getChapterSubjectId = (chapter: CMSChapter | Chapter) => Number((chapter as any).subject?.id ?? chapter.subject);
const getChapterSlos = (chapter: CMSChapter | Chapter): CMSSlo[] => {
  const slos = (chapter as any).slos ?? (chapter as any).slo_list ?? [];
  return Array.isArray(slos) ? slos : [];
};

const getSloTitle = (slo: CMSSlo) =>
  slo.name || slo.title || slo.slo_text || slo.description || 'Untitled SLO';

const getSloTime = (slo: CMSSlo) =>
  slo.estimated_time ?? slo.suggested_time_minutes ?? slo.timeline_time ?? 0;

const matchesSearchQuery = (query: string, values: unknown[]) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) =>
    String(value ?? '').toLowerCase().includes(normalizedQuery)
  );
};

const fetchChaptersBySubjectEnriched = async (subjectId: number, subjects: Subject[] = []): Promise<CMSChapter[]> => {
  const chapters = await getChaptersBySubject(subjectId);
  const subject = subjects.find((item) => getSubjectId(item) === subjectId);
  return chapters.map((chapter: any) => ({
    ...chapter,
    subject: chapter.subject ?? subjectId,
    subject_name: subject?.name ?? chapter.subject_name,
    subject_grade: subject?.grade ?? chapter.subject_grade,
    total_slos: getChapterSlos(chapter).length,
  })) as CMSChapter[];
};

const fetchAllChapters = async (subjects: Subject[]): Promise<CMSChapter[]> => {
  const results = await Promise.all(
    subjects.map((subject) =>
      fetchChaptersBySubjectEnriched(getSubjectId(subject), subjects).catch(() => [])
    )
  );
  return results.flat();
};

// ── Shared UI Components ──

const SectionHeader: React.FC<{
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  onBack?: () => void;
}> = ({ title, subtitle, action, onBack }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition shadow-sm">
          <ArrowLeft size={18} />
        </button>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: string;
  onClick?: () => void;
}> = ({ label, value, icon, tone, onClick }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border border-white/70 bg-white p-5 shadow-soft transition ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200' : ''}`}
  >
    <div className="mb-4 flex items-center justify-between">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">CMS</span>
    </div>
    <p className="text-xs font-semibold text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-navy-800">{value}</p>
    {onClick && <p className="mt-2 text-[11px] text-blue-500 font-medium">View all →</p>}
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
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100';

const FieldLabel: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={`block ${className}`}>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    {children}
  </div>
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
  footer: React.ReactNode;
  children: React.ReactNode;
}> = ({ eyebrow, title, subtitle, icon, footer, children }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/70 bg-white shadow-soft">
    <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">{eyebrow}</p>
        <p className="text-lg font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
    <div className="p-6">{children}</div>
    <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>
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

// ── Delete Confirmation Modal ──
const DeleteModal: React.FC<{
  title: string;
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}> = ({ title, itemName, onClose, onConfirm, isDeleting }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4"><AlertTriangle size={28} className="text-red-500" /></div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-bold text-gray-800 mb-4">"{itemName}"?</p>
        <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

// ── Edit Modal ──
const EditModal: React.FC<{
  title: string;
  fields: { label: string; name: string; value: string; type?: string; options?: string[] }[];
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
  isSaving: boolean;
}> = ({ title, fields, onClose, onSave, isSaving }) => {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.name, f.value]))
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.name}>
              <label className="text-sm font-semibold text-gray-700">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={values[f.name]}
                  onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className={`${fieldClass} min-h-24 resize-y mt-1`}
                />
              ) : f.type === 'select' ? (
                <select
                  value={values[f.name]}
                  onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className={`${selectClass} mt-1`}
                >
                  <option value="" disabled>Select {f.label}</option>
                  {f.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  value={values[f.name]}
                  onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className={`${fieldClass} mt-1`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button type="button" onClick={() => onSave(values)} disabled={isSaving} className="px-5 py-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════

const CMSManagement: React.FC<CMSManagementProps> = ({ view = 'dashboard' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  let currentView = view;
  if (location.pathname === '/admin/cms/classes') currentView = 'classes';
  else if (location.pathname === '/admin/cms/classes/add') currentView = 'add-class';
  else if (location.pathname === '/admin/cms/subjects') currentView = 'subjects';
  else if (location.pathname === '/admin/cms/subjects/add') currentView = 'add-subject';
  else if (location.pathname === '/admin/cms/chapters') currentView = 'chapters';
  else if (location.pathname === '/admin/cms/chapters/add') currentView = 'add-chapter';
  else if (location.pathname === '/admin/cms/slos') currentView = 'slos';
  else if (location.pathname === '/admin/cms/slos/add') currentView = 'add-slo';
  else if (location.pathname === '/admin/cms/slos/upload') currentView = 'upload-slo';
  else if (location.pathname === '/admin/cms') currentView = 'dashboard';

  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // ── Form state ──
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectGradeFilter, setSubjectGradeFilter] = useState(searchParams.get('grade') || '');
  const [hasSelectedSubjectFilter, setHasSelectedSubjectFilter] = useState(!!searchParams.get('grade'));
  const [chapterGradeFilter, setChapterGradeFilter] = useState('');
  const [chapterSubjectId, setChapterSubjectId] = useState(searchParams.get('subject') || '');
  const [chapterSearch, setChapterSearch] = useState('');
  const [sloSearch, setSloSearch] = useState('');
  const [sloFilterGrade, setSloFilterGrade] = useState('');
  const [sloFilterSubjectId, setSloFilterSubjectId] = useState('');
  const [sloFilterChapterId, setSloFilterChapterId] = useState('');
  const [hasSearchedSlos, setHasSearchedSlos] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', grade: searchParams.get('grade') || '', description: '' });
  const [chapterForm, setChapterForm] = useState({ grade: '', subject: '', name: '' });
  const [sloForm, setSloForm] = useState({
    grade: '',
    subject: '',
    chapter: '',
    name: '',
    difficulty_frequency: 'MEDIUM',
    estimated_time: '45',
    google_drive_link: '',
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkText, setBulkText] = useState('');

  // ── Modal state ──
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [deletingGrade, setDeletingGrade] = useState<Grade | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [editingChapter, setEditingChapter] = useState<CMSChapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<CMSChapter | null>(null);
  const [editingSlo, setEditingSlo] = useState<CMSSlo | null>(null);
  const [deletingSlo, setDeletingSlo] = useState<CMSSlo | null>(null);
  const [managingExamTypesGrade, setManagingExamTypesGrade] = useState<string | null>(null);

  // ═══ QUERIES ═══

  // Grades
  const gradesQuery = useQuery({
    queryKey: ['cms', 'grades'],
    queryFn: getGrades,
    staleTime: 5 * 60 * 1000,
  });
  const grades: Grade[] = gradesQuery.data ?? [];

  // Subjects
  const subjectsQuery = useQuery({
    queryKey: ['cms', 'subjects'],
    queryFn: getSubjects,
    staleTime: 5 * 60 * 1000,
  });
  const subjects: Subject[] = subjectsQuery.data ?? [];

  // Class options derived from grades
  const classOptions = useMemo(() => {
    const merged = new Map<string, Grade>();
    grades.forEach((grade) => {
      merged.set(grade.name.toLowerCase(), grade);
    });
    // Also include grades that appear in subjects but not in grades API
    subjects.forEach((subject) => {
      if (!subject.grade) return;
      const key = subject.grade.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, {
          id: `subject-${subject.grade}`,
          name: subject.grade,
          description: 'From curriculum subjects',
        });
      }
    });
    return Array.from(merged.values());
  }, [grades, subjects]);

  const filteredClasses = useMemo(() => {
    return classOptions.filter((g) =>
      matchesSearchQuery(classSearch, [g.name, g.description])
    );
  }, [classOptions, classSearch]);

  // Chapters
  const shouldLoadAllChapters = ['dashboard', 'subjects'].includes(view);
  const allChaptersQuery = useQuery({
    queryKey: ['cms', 'chapters', 'all', subjects.map((s) => s.id).join(',')],
    queryFn: () => fetchAllChapters(subjects),
    enabled: shouldLoadAllChapters && subjects.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const allChapters = allChaptersQuery.data ?? [];

  const activeChapterSubjectId =
    currentView === 'chapters'
      ? chapterSubjectId
      : currentView === 'slos'
        ? sloFilterSubjectId
        : currentView === 'add-slo' || currentView === 'upload-slo'
          ? sloForm.subject
          : '';

  const activeChaptersQuery = useQuery({
    queryKey: ['cms', 'chapters', activeChapterSubjectId],
    queryFn: () => fetchChaptersBySubjectEnriched(Number(activeChapterSubjectId), subjects),
    enabled: Boolean(activeChapterSubjectId),
    staleTime: 5 * 60 * 1000,
  });
  const activeChapters = activeChaptersQuery.data ?? [];

  // ── URL sync effects ──
  useEffect(() => {
    const subjectId = searchParams.get('subject');
    if (!subjectId || subjects.length === 0) return;
    const subject = subjects.find((item) => String(item.id) === subjectId);
    setChapterSubjectId(subjectId);
    if (subject?.grade) setChapterGradeFilter(subject.grade);
  }, [searchParams, subjects]);

  useEffect(() => {
    const grade = searchParams.get('grade');
    if (grade) {
      setSubjectGradeFilter(grade);
      setHasSelectedSubjectFilter(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const grade = searchParams.get('grade');
    if (currentView === 'add-subject' && grade) {
      setSubjectForm((prev) => (prev.grade === grade ? prev : { ...prev, grade }));
    }
  }, [searchParams, view]);

  useEffect(() => {
    const subjectId = searchParams.get('subject');
    if (currentView === 'add-chapter' && subjectId) {
      const subject = subjects.find((item) => String(item.id) === subjectId);
      setChapterForm((prev) => ({
        ...prev,
        grade: subject?.grade || prev.grade,
        subject: subjectId,
      }));
    }
  }, [searchParams, view, subjects]);

  useEffect(() => {
    const subjectId = searchParams.get('subject');
    const chapterId = searchParams.get('chapter');
    if (!subjectId && !chapterId) return;
    const subject = subjectId ? subjects.find((item) => String(item.id) === subjectId) : undefined;
    setSloForm((prev) => ({
      ...prev,
      grade: subject?.grade || prev.grade,
      subject: subjectId || prev.subject,
      chapter: chapterId || prev.chapter,
    }));
    if (currentView === 'slos') {
      if (subject?.grade) setSloFilterGrade(subject.grade);
      if (subjectId) setSloFilterSubjectId(subjectId);
      if (chapterId) setSloFilterChapterId(chapterId);
      if (subjectId && chapterId) setHasSearchedSlos(true);
    }
  }, [searchParams, subjects, view]);

  // ── Computed ──

  const subjectsByGrade = (grade: string) =>
    grade ? subjects.filter((subject) => subject.grade === grade) : subjects;

  const selectedSloSubjects = subjectsByGrade(sloForm.grade);
  const selectedChapterSubjects = subjectsByGrade(chapterGradeFilter || chapterForm.grade);

  const chapterCountsBySubject = useMemo(() => {
    const map = new Map<number, { chapters: number; slos: number }>();
    allChapters.forEach((chapter) => {
      const subjectId = getChapterSubjectId(chapter);
      const current = map.get(subjectId) ?? { chapters: 0, slos: 0 };
      current.chapters += 1;
      current.slos += getChapterSlos(chapter).length;
      map.set(subjectId, current);
    });
    return map;
  }, [allChapters]);

  const sloRows = useMemo(() => {
    if (currentView === 'slos') {
      if (!hasSearchedSlos || !sloFilterChapterId) return [];
      const chapter = activeChapters.find((ch) => String(ch.id) === sloFilterChapterId);
      if (!chapter) return [];
      return getChapterSlos(chapter).map((slo) => ({
        ...slo,
        chapter_id: getChapterId(chapter),
        chapter_name: chapter.name,
        subject_name: chapter.subject_name,
        subject_grade: chapter.subject_grade,
      }));
    }
    return allChapters.flatMap((chapter) =>
      getChapterSlos(chapter).map((slo) => ({
        ...slo,
        chapter_id: getChapterId(chapter),
        chapter_name: chapter.name,
        subject_name: chapter.subject_name,
        subject_grade: chapter.subject_grade,
      }))
    );
  }, [allChapters, activeChapters, view, hasSearchedSlos, sloFilterChapterId]);

  const filteredSloRows = useMemo(() => {
    return sloRows.filter((slo) =>
      matchesSearchQuery(sloSearch, [
        getSloTitle(slo),
        slo.chapter_name,
        slo.subject_name,
        slo.subject_grade,
        slo.difficulty_frequency,
        slo.priority,
        getSloTime(slo),
      ])
    );
  }, [sloRows, sloSearch]);

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = matchesSearchQuery(subjectSearch, [
      subject.name,
      subject.description,
      subject.grade,
    ]);
    const matchesGrade = !subjectGradeFilter || subject.grade === subjectGradeFilter;
    return matchesSearch && matchesGrade;
  });

  // ═══ MUTATIONS ═══

  // ── Grades ──
  const createGradeMutation = useMutation({
    mutationFn: async () => {
      await createGrade({
        name: className.trim(),
        description: classDescription.trim() || undefined,
      });
    },
    onSuccess: (_, __, _ctx) => {
      toast.success('Grade created successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      const gradeName = className.trim();
      setClassName('');
      setClassDescription('');
      navigate(`/admin/cms/subjects?grade=${encodeURIComponent(gradeName)}`);
    },
    onError: () => toast.error('Failed to create grade.'),
  });

  const updateGradeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Record<string, string> }) => {
      await updateGrade(id, { name: data.name, description: data.description });
    },
    onSuccess: () => {
      toast.success('Grade updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setEditingGrade(null);
    },
    onError: () => toast.error('Failed to update grade.'),
  });

  const deleteGradeMutation = useMutation({
    mutationFn: async (id: number | string) => {
      await deleteGrade(id);
    },
    onSuccess: () => {
      toast.success('Grade deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setDeletingGrade(null);
    },
    onError: () => toast.error('Failed to delete grade.'),
  });

  // ── Subjects ──
  const createSubjectMutation = useMutation({
    mutationFn: async () => {
      await createSubject({
        name: subjectForm.name.trim(),
        description: subjectForm.description.trim(),
        grade: subjectForm.grade.trim(),
      });
    },
    onSuccess: () => {
      const createdGrade = subjectForm.grade.trim();
      toast.success('Subject created successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setSubjectForm({ name: '', grade: createdGrade, description: '' });
      navigate(createdGrade ? `/admin/cms/subjects?grade=${encodeURIComponent(createdGrade)}` : '/admin/cms/subjects');
    },
    onError: () => toast.error('Failed to create subject.'),
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Record<string, string> }) => {
      await updateSubject(id, { name: data.name, description: data.description, grade: data.grade });
    },
    onSuccess: () => {
      toast.success('Subject updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setEditingSubject(null);
    },
    onError: () => toast.error('Failed to update subject.'),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number | string) => {
      await deleteSubject(id);
    },
    onSuccess: () => {
      toast.success('Subject deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setDeletingSubject(null);
    },
    onError: () => toast.error('Failed to delete subject.'),
  });

  // ── Chapters ──
  const createChapterMutation = useMutation({
    mutationFn: async () => {
      await createChapter({
        subject: Number(chapterForm.subject),
        name: chapterForm.name.trim(),
      });
    },
    onSuccess: () => {
      toast.success('Chapter created successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      // Navigate to Add SLO for the chapter we just created, keeping subject context
      queryClient.fetchQuery({
        queryKey: ['cms', 'chapters', chapterForm.subject],
        queryFn: () => fetchChaptersBySubjectEnriched(Number(chapterForm.subject), subjects),
      }).then((chapters: any[]) => {
        const newest = chapters?.[chapters.length - 1];
        if (newest?.id) {
          navigate(`/admin/cms/slos/add?subject=${chapterForm.subject}&chapter=${newest.id}`);
        } else {
          navigate(chapterForm.subject ? `/admin/cms/chapters?subject=${chapterForm.subject}` : '/admin/cms/chapters');
        }
        setChapterForm({ grade: '', subject: '', name: '' });
      }).catch(() => {
        setChapterForm({ grade: '', subject: '', name: '' });
        navigate(chapterForm.subject ? `/admin/cms/chapters?subject=${chapterForm.subject}` : '/admin/cms/chapters');
      });
    },
    onError: () => toast.error('Failed to create chapter.'),
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Record<string, string> }) => {
      await updateChapter(id, { name: data.name });
    },
    onSuccess: () => {
      toast.success('Chapter updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setEditingChapter(null);
    },
    onError: () => toast.error('Failed to update chapter.'),
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (id: number | string) => {
      await deleteChapter(id);
    },
    onSuccess: () => {
      toast.success('Chapter deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setDeletingChapter(null);
    },
    onError: () => toast.error('Failed to delete chapter.'),
  });

  // ── SLOs ──
  const createSloMutation = useMutation({
    mutationFn: async () => {
      await createSlo({
        chapter: Number(sloForm.chapter),
        name: sloForm.name.trim(),
        difficulty_frequency: sloForm.difficulty_frequency,
        estimated_time: Number(sloForm.estimated_time) || 0,
        ...(sloForm.google_drive_link.trim() ? { google_drive_link: sloForm.google_drive_link.trim() } : {}),
      } as any);
    },
    onSuccess: () => {
      toast.success('SLO created successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      const currentSubject = sloForm.subject;
      const currentChapter = sloForm.chapter;
      setSloForm((prev) => ({ ...prev, name: '' }));
      const params = new URLSearchParams();
      if (currentSubject) params.append('subject', currentSubject);
      if (currentChapter) params.append('chapter', currentChapter);
      const q = params.toString();
      navigate(q ? `/admin/cms/slos?${q}` : '/admin/cms/slos');
    },
    onError: () => toast.error('Failed to create SLO.'),
  });

  const updateSloMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Record<string, string> }) => {
      await updateSlo(id, {
        name: data.name,
        difficulty_frequency: data.difficulty_frequency || undefined,
        estimated_time: data.estimated_time ? Number(data.estimated_time) : undefined,
      });
    },
    onSuccess: () => {
      toast.success('SLO updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setEditingSlo(null);
    },
    onError: () => toast.error('Failed to update SLO.'),
  });

  const deleteSloMutation = useMutation({
    mutationFn: async (id: number | string) => {
      await deleteSlo(id);
    },
    onSuccess: () => {
      toast.success('SLO deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setDeletingSlo(null);
    },
    onError: () => toast.error('Failed to delete SLO.'),
  });

  // Bulk upload — uses the real /api/curriculum/bulk-upload with form-data
  const bulkUploadMutation = useMutation({
    mutationFn: async () => {
      if (bulkFile) {
        // Real file upload via form-data
        await bulkUploadSlos(sloForm.grade || '0', bulkFile);
        return 1;
      } else {
        // Text-based fallback: create SLOs one by one
        const items = bulkText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        await Promise.all(
          items.map((line) =>
            createSlo({
              chapter: Number(sloForm.chapter),
              name: line,
              difficulty_frequency: sloForm.difficulty_frequency,
              estimated_time: Number(sloForm.estimated_time) || 0,
            })
          )
        );
        return items.length;
      }
    },
    onSuccess: (count) => {
      toast.success(bulkFile ? 'SLOs uploaded successfully from file.' : `${count} SLOs uploaded successfully.`);
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      const currentSubject = sloForm.subject;
      const currentChapter = sloForm.chapter;
      setBulkText('');
      setBulkFile(null);
      const params = new URLSearchParams();
      if (currentSubject) params.append('subject', currentSubject);
      if (currentChapter) params.append('chapter', currentChapter);
      const q = params.toString();
      navigate(q ? `/admin/cms/slos?${q}` : '/admin/cms/slos');
    },
    onError: () => toast.error('Failed to upload SLOs.'),
  });

  const bulkUploadAssessmentMutation = useMutation({
    mutationFn: async ({ file, chapterId }: { file: File, chapterId: string | number }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chapter_id', String(chapterId));
      await assessmentService.bulkUploadAssessment(formData);
    },
    onSuccess: () => {
      toast.success('Assessment data uploaded successfully.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to upload assessment data.');
    },
  });

  const handleBulkFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    // Also read into textarea for preview
    const reader = new FileReader();
    reader.onload = () => setBulkText(String(reader.result || ''));
    reader.readAsText(file);
  };

  // ═══ RENDER FUNCTIONS ═══

  const renderDashboard = () => (
    <>
      <SectionHeader
        title="CMS Management"
        subtitle="Manage grades, subjects, chapters, and SLOs used by planner generation."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton onClick={() => navigate('/admin/cms/classes/add')}>
              <Plus size={16} /> Add Grade
            </SecondaryButton>
          </div>
        }
      />
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Grades" value={classOptions.length} icon={<GraduationCap size={20} />} tone="bg-blue-100 text-blue-600" onClick={() => navigate('/admin/cms/classes')} />
        <StatCard label="Total Subjects" value={subjects.length} icon={<BookOpen size={20} />} tone="bg-purple-100 text-purple-600" onClick={() => navigate('/admin/cms/subjects')} />
        <StatCard label="Total Chapters" value={allChapters.length} icon={<Layers3 size={20} />} tone="bg-emerald-100 text-emerald-600" onClick={() => navigate('/admin/cms/chapters')} />
        <StatCard label="Total SLOs" value={sloRows.length} icon={<ListChecks size={20} />} tone="bg-amber-100 text-amber-600" onClick={() => navigate('/admin/cms/slos')} />
      </div>
      <div className="rounded-2xl border border-white/70 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-bold text-gray-900">CMS Flow</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { title: 'Grade', subtitle: 'Choose learning level', path: '/admin/cms/classes' },
            { title: 'Subject', subtitle: 'Map curriculum area', path: '/admin/cms/subjects' },
            { title: 'Chapter', subtitle: 'Group study content', path: '/admin/cms/chapters' },
            { title: 'SLOs', subtitle: 'Planner-ready objectives', path: '/admin/cms/slos' },
          ].map(({ title, subtitle, path }, index) => (
            <div
              key={title}
              onClick={() => navigate(path)}
              className="cursor-pointer rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                {index + 1}
              </div>
              <p className="text-sm font-bold text-slate-900">{title}</p>
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
              <p className="mt-2 text-[11px] text-blue-500 font-medium">View all →</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // ── GRADES (Classes) ──
  const renderClasses = () => (
    <>
      <SectionHeader
        title="All Grades"
        subtitle="Grades used to organize the curriculum. Data from the backend API."
        onBack={() => navigate('/admin/cms')}
        action={<PrimaryButton onClick={() => navigate('/admin/cms/classes/add')}><Plus size={16} /> Add Grade</PrimaryButton>}
      />
      <SearchInput
        value={classSearch}
        onChange={setClassSearch}
        placeholder="Search grades by name"
        className="mb-5"
      />
      {gradesQuery.isLoading ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin text-blue-600" /> Loading grades...</div>
      ) : filteredClasses.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No grades found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredClasses.map((grade) => (
            <div 
              key={grade.id} 
              onClick={() => navigate(`/admin/cms/subjects?grade=${encodeURIComponent(grade.name)}`)}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{grade.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{grade.description || 'Curriculum grade'}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase text-blue-600">
                  Grade
                </span>
              </div>
              <div className="mt-6 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <IconButton title="Exam Types" tone="blue" onClick={() => setManagingExamTypesGrade(grade.name)}><ClipboardList size={15} /></IconButton>
                <IconButton title="View subjects" tone="blue" onClick={() => navigate(`/admin/cms/subjects?grade=${encodeURIComponent(grade.name)}`)}><Eye size={15} /></IconButton>
                <IconButton title="Edit" onClick={() => setEditingGrade(grade)}><Pencil size={15} /></IconButton>
                <IconButton title="Delete" tone="red" onClick={() => setDeletingGrade(grade)}><Trash2 size={15} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      )}
      <ExamTypesModal
        isOpen={!!managingExamTypesGrade}
        onClose={() => setManagingExamTypesGrade(null)}
        grade={managingExamTypesGrade || ''}
      />
    </>
  );

  const renderAddClass = () => (
    <>
      <SectionHeader 
        title="Add Grade" 
        subtitle="Create a new grade for curriculum organization." 
        onBack={() => navigate('/admin/cms/classes')}
      />
      <form onSubmit={(e) => { e.preventDefault(); if (!className.trim()) { toast.error('Grade name is required.'); return; } createGradeMutation.mutate(); }}>
        <FormCard
          eyebrow="Grade Setup"
          title="Grade Details"
          subtitle="Create the grade used across CMS and planner setup."
          icon={<GraduationCap size={22} />}
          footer={
            <>
              <SecondaryButton onClick={() => navigate('/admin/cms/classes')}><X size={16} /> Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={createGradeMutation.isPending}>
                {createGradeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Grade
              </PrimaryButton>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FieldLabel label="Grade Name">
              <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="9, 10, CSS, MDCAT" className={fieldClass} />
            </FieldLabel>
            <FieldLabel label="Description" className="lg:col-span-2">
              <textarea value={classDescription} onChange={(e) => setClassDescription(e.target.value)} placeholder="Optional description" className={`${fieldClass} min-h-32 resize-y`} />
            </FieldLabel>
          </div>
        </FormCard>
      </form>
    </>
  );

  // ── SUBJECTS ──
  const renderSubjects = () => (
    <>
      <SectionHeader
        title={subjectGradeFilter ? `All Subjects of Grade ${subjectGradeFilter}` : 'All Subjects'}
        subtitle="Subjects are grouped by grade and feed into planner creation."
        onBack={() => navigate('/admin/cms')}
        action={
          <PrimaryButton
            onClick={() => navigate(subjectGradeFilter ? `/admin/cms/subjects/add?grade=${encodeURIComponent(subjectGradeFilter)}` : '/admin/cms/subjects/add')}
          >
            <Plus size={16} /> Add Subject
          </PrimaryButton>
        }
      />
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
        <SearchInput
          value={subjectSearch}
          onChange={setSubjectSearch}
          placeholder="Search subjects by name, grade, description"
        />
        <select
          value={subjectGradeFilter}
          onChange={(e) => {
            setSubjectGradeFilter(e.target.value);
            setHasSelectedSubjectFilter(true);
          }}
          disabled={!!searchParams.get('grade')}
          className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${searchParams.get('grade') ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
        >
          <option value="">All Grades</option>
          {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
      </div>
      {subjectGradeFilter === '' && !hasSelectedSubjectFilter ? (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 mb-4">
            <BookOpen size={32} className="text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Select a Grade to View Subjects</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Please select a grade from the dropdown filter above to view the subjects associated with it.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold">Subject Name</th>
                <th className="px-6 py-4 text-sm font-bold">Grade</th>
                <th className="px-6 py-4 text-sm font-bold">Description</th>
                <th className="px-6 py-4 text-sm font-bold">Total Chapters</th>
                <th className="px-6 py-4 text-sm font-bold">Total SLOs</th>
                <th className="px-6 py-4 text-sm font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjectsQuery.isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin text-blue-600" /> Loading subjects...</td></tr>
              ) : filteredSubjects.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No subjects found for this grade.</td></tr>
              ) : (
                filteredSubjects.map((subject) => {
                  const counts = chapterCountsBySubject.get(getSubjectId(subject));
                  return (
                    <tr
                      key={subject.id}
                      className="hover:bg-blue-50/50 cursor-pointer transition"
                      onClick={() => navigate(`/admin/cms/chapters?subject=${subject.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{subject.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{subject.grade || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{subject.description || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{counts?.chapters ?? (subject as any).total_chapters ?? (subject as any).chapters_count ?? 0}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{counts?.slos ?? (subject as any).total_slos ?? (subject as any).slos_count ?? 0}</td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <IconButton title="View chapters" tone="blue" onClick={() => navigate(`/admin/cms/chapters?subject=${subject.id}`)}><Eye size={15} /></IconButton>
                          <IconButton title="Edit subject" onClick={() => setEditingSubject(subject)}><Pencil size={15} /></IconButton>
                          <IconButton title="Delete subject" tone="red" onClick={() => setDeletingSubject(subject)}><Trash2 size={15} /></IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderAddSubject = () => (
    <>
      <SectionHeader 
        title="Add Subject" 
        subtitle="Create a subject under a grade." 
        onBack={() => navigate(searchParams.get('grade') ? `/admin/cms/subjects?grade=${encodeURIComponent(searchParams.get('grade')!)}` : '/admin/cms/subjects')}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!subjectForm.name.trim() || !subjectForm.grade.trim()) {
            toast.error('Subject name and grade are required.');
            return;
          }
          createSubjectMutation.mutate();
        }}
      >
        <FormCard
          eyebrow="Subject Setup"
          title="Subject Details"
          subtitle="Attach a curriculum subject to a grade."
          icon={<BookOpen size={22} />}
          footer={
            <>
              <SecondaryButton onClick={() => navigate('/admin/cms/subjects')}><X size={16} /> Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={createSubjectMutation.isPending}>
                {createSubjectMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Subject
              </PrimaryButton>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FieldLabel label="Subject Name">
              <input value={subjectForm.name} onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Mathematics" className={fieldClass} />
            </FieldLabel>
            <FieldLabel label="Grade">
              <select 
                value={subjectForm.grade} 
                onChange={(e) => setSubjectForm((prev) => ({ ...prev, grade: e.target.value }))} 
                disabled={!!searchParams.get('grade')}
                className={`mt-2 ${selectClass} ${searchParams.get('grade') ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
              >
                <option value="">Select Grade</option>
                {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Description" className="lg:col-span-2">
              <textarea value={subjectForm.description} onChange={(e) => setSubjectForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Core mathematics curriculum for grade 10" className={`${fieldClass} min-h-32 resize-y`} />
            </FieldLabel>
          </div>
        </FormCard>
      </form>
    </>
  );

  // ── CHAPTERS ──
  const renderChapters = () => {
    const visibleSubjects = subjectsByGrade(chapterGradeFilter);
    const selectedSubject = subjects.find((item) => String(item.id) === chapterSubjectId);
    const filteredChapters = activeChapters.filter((chapter) =>
      matchesSearchQuery(chapterSearch, [
        chapter.name,
        selectedSubject?.name,
        selectedSubject?.grade,
        chapter.subject_name,
        chapter.subject_grade,
        getChapterSlos(chapter).length,
      ])
    );

    return (
      <>
        <SectionHeader
          title={selectedSubject ? `All Chapters of ${selectedSubject.name}` : 'All Chapters'}
          subtitle="Select a grade and subject to view the related chapters."
          onBack={() => navigate(chapterSubjectId && selectedSubject ? `/admin/cms/subjects?grade=${encodeURIComponent(selectedSubject.grade || '')}` : '/admin/cms')}
          action={<PrimaryButton onClick={() => navigate(chapterSubjectId ? `/admin/cms/chapters/add?subject=${chapterSubjectId}` : '/admin/cms/chapters/add')}><Plus size={16} /> Add Chapter</PrimaryButton>}
        />
        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[220px_280px_1fr]">
          <select 
            value={chapterGradeFilter} 
            onChange={(e) => { setChapterGradeFilter(e.target.value); setChapterSubjectId(''); }} 
            disabled={!!searchParams.get('subject')}
            className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${searchParams.get('subject') ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
          >
            <option value="">Select Grade</option>
            {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
          <select 
            value={chapterSubjectId} 
            onChange={(e) => setChapterSubjectId(e.target.value)} 
            disabled={!!searchParams.get('subject')}
            className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${searchParams.get('subject') ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
          >
            <option value="">Select Subject</option>
            {visibleSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <SearchInput value={chapterSearch} onChange={setChapterSearch} placeholder="Search chapters by name, subject, grade" />
        </div>
        {!chapterSubjectId ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">Select a grade and subject to view chapters.</div>
        ) : activeChaptersQuery.isLoading ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin text-blue-600" /> Loading chapters...</div>
        ) : activeChapters.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No chapters found for {selectedSubject?.name || 'this subject'}.</div>
        ) : filteredChapters.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No chapters match your search.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredChapters.map((chapter) => (
          <div
              key={chapter.id}
              onClick={() => navigate(`/admin/cms/slos/add?subject=${getChapterSubjectId(chapter)}&chapter=${chapter.id}`)}
              className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-slate-900">{chapter.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{selectedSubject?.name || chapter.subject_name || 'Subject'} / Grade {selectedSubject?.grade || chapter.subject_grade || 'N/A'}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">{getChapterSlos(chapter).length} SLOs</span>
              </div>
              <div className="mt-5 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <label className="cursor-pointer rounded-lg p-1.5 transition text-purple-600 hover:bg-purple-50 flex items-center justify-center" title="Bulk Upload Assessment Data">
                  <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.json" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      bulkUploadAssessmentMutation.mutate({ file, chapterId: chapter.id });
                    }
                    e.target.value = '';
                  }} />
                  {bulkUploadAssessmentMutation.isPending && bulkUploadAssessmentMutation.variables?.chapterId === chapter.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Upload size={15} />
                  )}
                </label>
                <IconButton title="Add SLO" tone="blue" onClick={() => navigate(`/admin/cms/slos/add?subject=${getChapterSubjectId(chapter)}&chapter=${chapter.id}`)}><Plus size={15} /></IconButton>
                <IconButton title="Edit chapter" onClick={() => setEditingChapter(chapter)}><Pencil size={15} /></IconButton>
                <IconButton title="Delete chapter" tone="red" onClick={() => setDeletingChapter(chapter)}><Trash2 size={15} /></IconButton>
              </div>
            </div>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderAddChapter = () => (
    <>
      <SectionHeader 
        title="Add Chapter" 
        subtitle="Create a chapter under a selected subject." 
        onBack={() => navigate(searchParams.get('subject') ? `/admin/cms/chapters?subject=${searchParams.get('subject')}` : '/admin/cms/chapters')}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!chapterForm.subject || !chapterForm.name.trim()) {
            toast.error('Subject and chapter name are required.');
            return;
          }
          createChapterMutation.mutate();
        }}
      >
        <FormCard
          eyebrow="Chapter Setup"
          title="Chapter Details"
          subtitle="Create a chapter inside a selected subject."
          icon={<Layers3 size={22} />}
          footer={
            <>
              <SecondaryButton onClick={() => navigate('/admin/cms/chapters')}><X size={16} /> Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={createChapterMutation.isPending}>
                {createChapterMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Chapter
              </PrimaryButton>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FieldLabel label="Grade">
              <select 
                value={chapterForm.grade} 
                onChange={(e) => setChapterForm({ grade: e.target.value, subject: '', name: chapterForm.name })} 
                disabled={!!searchParams.get('subject')}
                className={`mt-2 ${selectClass} ${searchParams.get('subject') ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
              >
                <option value="">Select Grade</option>
                {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Subject">
              <select 
                value={chapterForm.subject} 
                onChange={(e) => setChapterForm((prev) => ({ ...prev, subject: e.target.value }))} 
                disabled={!!searchParams.get('subject')}
                className={`mt-2 ${selectClass} ${searchParams.get('subject') ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
              >
                <option value="">Select Subject</option>
                {subjectsByGrade(chapterForm.grade).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Chapter Name" className="lg:col-span-2">
              <input value={chapterForm.name} onChange={(e) => setChapterForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Algebra Basics" className={fieldClass} />
            </FieldLabel>
          </div>
        </FormCard>
      </form>
    </>
  );

  // ── SLOs ──
  const handleExportSlos = () => {
    if (!filteredSloRows || filteredSloRows.length === 0) return;
    const headers = ['SLO', 'Chapter', 'Subject', 'Priority', 'Est. Time'];
    const csvContent = [
      headers.join(','),
      ...filteredSloRows.map((slo: any) => {
        const title = `"${(getSloTitle(slo) || '').replace(/"/g, '""')}"`;
        const chapter = `"${(slo.chapter_name || slo.chapter || 'N/A').replace(/"/g, '""')}"`;
        const subject = `"${(slo.subject_name || 'N/A').replace(/"/g, '""')}"`;
        const difficulty = `"${(slo.difficulty_frequency || slo.priority || 'N/A').replace(/"/g, '""')}"`;
        const time = `"${getSloTime(slo) ? `${getSloTime(slo)}m` : 'N/A'}"`;
        return [title, chapter, subject, difficulty, time].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'filtered_slos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSlos = () => (
    <>
      <SectionHeader
        title="All SLOs"
        subtitle="SLOs are the objectives selected by the planner flow."
        onBack={() => navigate(sloFilterSubjectId ? `/admin/cms/chapters?subject=${sloFilterSubjectId}` : '/admin/cms')}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSlos}
              disabled={!hasSearchedSlos || filteredSloRows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-bold text-green-600 shadow-sm transition hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => navigate('/admin/cms/slos/upload')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 shadow-sm transition hover:bg-blue-50"
            >
              <Upload size={16} /> Upload SLOs
            </button>
            <PrimaryButton onClick={() => navigate('/admin/cms/slos/add')}><Plus size={16} /> Add SLO</PrimaryButton>
          </div>
        }
      />
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[160px_200px_200px_1fr_auto]">
        <select
          value={sloFilterGrade}
          onChange={(e) => {
            setSloFilterGrade(e.target.value);
            setSloFilterSubjectId('');
            setSloFilterChapterId('');
            setHasSearchedSlos(false);
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Select Grade</option>
          {Array.from(new Set(subjects.map((s) => s.grade).filter(Boolean))).sort().map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>
        <select value={sloFilterSubjectId} onChange={(e) => { setSloFilterSubjectId(e.target.value); setSloFilterChapterId(''); setHasSearchedSlos(false); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
          <option value="">Select Subject</option>
          {(sloFilterGrade ? subjects.filter((s) => s.grade === sloFilterGrade) : subjects).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <select value={sloFilterChapterId} onChange={(e) => { setSloFilterChapterId(e.target.value); setHasSearchedSlos(false); }} disabled={!sloFilterSubjectId || activeChaptersQuery.isLoading} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400">
          <option value="">Select Chapter</option>
          {activeChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
        </select>
        <SearchInput
          value={sloSearch}
          onChange={setSloSearch}
          placeholder="Search SLOs..."
        />
        <PrimaryButton onClick={() => setHasSearchedSlos(true)} disabled={!sloFilterSubjectId || !sloFilterChapterId || activeChaptersQuery.isLoading}>
          {activeChaptersQuery.isFetching && hasSearchedSlos ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
        </PrimaryButton>
      </div>
      {!hasSearchedSlos ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">Please select a grade, subject and chapter, then click Search to view SLOs.</div>
      ) : activeChaptersQuery.isLoading || activeChaptersQuery.isFetching ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin text-blue-600" /> Loading SLOs...</div>
      ) : sloRows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No SLOs found for the selected chapter.</div>
      ) : filteredSloRows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No SLOs match your search.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-left w-[40%]">SLO</th>
                <th className="px-6 py-4 text-sm font-bold text-center whitespace-nowrap">Chapter</th>
                <th className="px-6 py-4 text-sm font-bold text-center">Subject</th>
                <th className="px-6 py-4 text-sm font-bold text-center">Priority</th>
                <th className="px-6 py-4 text-sm font-bold text-center whitespace-nowrap">Est. Time</th>
                <th className="px-6 py-4 text-sm font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSloRows.map((slo, index) => (
                <tr key={slo.id || `${slo.chapter_id}-${index}`} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-left">{getSloTitle(slo)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center whitespace-nowrap">{slo.chapter_name || slo.chapter || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">{slo.subject_name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">{slo.difficulty_frequency || slo.priority || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center whitespace-nowrap">{getSloTime(slo) ? `${getSloTime(slo)}m` : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <IconButton title="Edit SLO" onClick={() => setEditingSlo(slo)}><Pencil size={15} /></IconButton>
                      <IconButton title="Delete SLO" tone="red" onClick={() => setDeletingSlo(slo)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderSloForm = (bulk = false) => (
    <>
      <SectionHeader
        title={bulk ? 'Upload SLOs' : 'Add SLO'}
        subtitle={bulk ? 'Upload a file or paste SLOs for the selected chapter.' : 'Create a single SLO under a selected chapter.'}
        onBack={() => navigate(searchParams.get('chapter') ? `/admin/cms/slos?subject=${searchParams.get('subject')}&chapter=${searchParams.get('chapter')}` : '/admin/cms/slos')}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (bulk) {
            if (!bulkFile && !bulkText.trim()) {
              toast.error('Please upload a file or paste SLO lines.');
              return;
            }
            if (!bulkFile && !sloForm.chapter) {
              toast.error('Please select a chapter for text-based upload.');
              return;
            }
            bulkUploadMutation.mutate();
          } else {
            if (!sloForm.chapter || !sloForm.name.trim()) {
              toast.error('Chapter and SLO name are required.');
              return;
            }
            createSloMutation.mutate();
          }
        }}
      >
        <FormCard
          eyebrow={bulk ? 'Bulk SLO Upload' : 'SLO Setup'}
          title={bulk ? 'Upload Objectives' : 'SLO Details'}
          subtitle={bulk ? 'Upload multiple objectives via file or text.' : 'Create one planner-ready objective under a chapter.'}
          icon={bulk ? <Upload size={22} /> : <ListChecks size={22} />}
          footer={
            <>
              <div className="text-xs font-medium text-slate-400">
                {bulk ? (bulkFile ? `File: ${bulkFile.name}` : `${bulkText.split(/\r?\n/).filter((line) => line.trim()).length} lines ready`) : 'Single SLO entry'}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <SecondaryButton onClick={() => navigate('/admin/cms/slos')}><X size={16} /> Cancel</SecondaryButton>
                <PrimaryButton type="submit" disabled={createSloMutation.isPending || bulkUploadMutation.isPending}>
                  {(createSloMutation.isPending || bulkUploadMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : bulk ? <Upload size={16} /> : <Save size={16} />}
                  {bulk ? 'Upload SLOs' : 'Save SLO'}
                </PrimaryButton>
              </div>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FieldLabel label="Grade">
              <select 
                value={sloForm.grade} 
                onChange={(e) => setSloForm((prev) => ({ ...prev, grade: e.target.value, subject: '', chapter: '' }))} 
                disabled={!!(searchParams.get('chapter') || searchParams.get('subject'))}
                className={`mt-2 ${selectClass} ${(searchParams.get('chapter') || searchParams.get('subject')) ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
              >
                <option value="">Select Grade</option>
                {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Subject">
              <select 
                value={sloForm.subject} 
                onChange={(e) => setSloForm((prev) => ({ ...prev, subject: e.target.value, chapter: '' }))} 
                disabled={!!(searchParams.get('chapter') || searchParams.get('subject'))}
                className={`mt-2 ${selectClass} ${(searchParams.get('chapter') || searchParams.get('subject')) ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
              >
                <option value="">Select Subject</option>
                {selectedSloSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Chapter">
              <select 
                value={sloForm.chapter} 
                onChange={(e) => setSloForm((prev) => ({ ...prev, chapter: e.target.value }))} 
                disabled={!!searchParams.get('chapter')}
                className={`mt-2 ${selectClass} ${searchParams.get('chapter') ? 'cursor-not-allowed opacity-60 appearance-none' : ''}`}
              >
                <option value="">Select Chapter</option>
                {activeChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Priority">
              <select value={sloForm.difficulty_frequency} onChange={(e) => setSloForm((prev) => ({ ...prev, difficulty_frequency: e.target.value }))} className={`mt-2 ${selectClass}`}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Estimated Time (in minutes)">
              <div className="relative mt-2">
                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min="0" value={sloForm.estimated_time} onChange={(e) => setSloForm((prev) => ({ ...prev, estimated_time: e.target.value }))} placeholder="e.g. 45" className={`${fieldClass} mt-0 pl-11`} />
              </div>
            </FieldLabel>
            <FieldLabel label="Google Drive Link (optional)">
              <input
                type="url"
                value={sloForm.google_drive_link}
                onChange={(e) => setSloForm((prev) => ({ ...prev, google_drive_link: e.target.value }))}
                placeholder="https://drive.google.com/..."
                className={fieldClass}
              />
            </FieldLabel>
            {bulk && (
              <FieldLabel label="Upload File (.csv, .txt, .xlsx)">
                <label className="mt-2 flex min-h-[50px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50">
                  <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleBulkFile} className="hidden" />
                  <span className="inline-flex items-center gap-2"><Upload size={16} /> {bulkFile ? bulkFile.name : 'Upload File'}</span>
                </label>
              </FieldLabel>
            )}
            <FieldLabel label={bulk ? 'SLO Lines (Preview / Manual Entry)' : 'SLO'} className="lg:col-span-2">
              {bulk ? (
                <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Student can solve simple linear equations." className={`${fieldClass} min-h-56 resize-y`} />
              ) : (
                <textarea value={sloForm.name} onChange={(e) => setSloForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Student can solve simple linear equations." className={`${fieldClass} min-h-36 resize-y`} />
              )}
            </FieldLabel>
          </div>
        </FormCard>
      </form>
    </>
  );

  const renderContent = () => {
    if (currentView === 'classes') return renderClasses();
    if (currentView === 'add-class') return renderAddClass();
    if (currentView === 'subjects') return renderSubjects();
    if (currentView === 'add-subject') return renderAddSubject();
    if (currentView === 'chapters') return renderChapters();
    if (currentView === 'add-chapter') return renderAddChapter();
    if (currentView === 'slos') return renderSlos();
    if (currentView === 'add-slo') return renderSloForm(false);
    if (currentView === 'upload-slo') return renderSloForm(true);
    return renderDashboard();
  };

  const activePageMap: Record<CMSView, string> = {
    dashboard: 'cms-dashboard',
    classes: 'all-classes',
    'add-class': 'add-class',
    subjects: 'all-subjects',
    'add-subject': 'add-subject',
    chapters: 'all-chapters',
    'add-chapter': 'add-chapter',
    slos: 'all-slos',
    'add-slo': 'add-slo',
    'upload-slo': 'upload-slos',
  };

  let currentStep = 0;
  if (currentView === 'add-class') currentStep = 1;
  else if (currentView === 'subjects' || currentView === 'add-subject') currentStep = 2;
  else if (currentView === 'chapters' || currentView === 'add-chapter') currentStep = 3;
  else if (currentView === 'slos' || currentView === 'add-slo' || currentView === 'upload-slo') currentStep = 4;

  const isInFlow = currentStep > 0;

  const flowSteps = [
    { n: 1, title: 'Grade', sub: 'Setup curriculum grade' },
    { n: 2, title: 'Subject', sub: 'Add subjects to grade' },
    { n: 3, title: 'Chapter', sub: 'Add chapters to subject' },
    { n: 4, title: 'SLOs', sub: 'Define learning outcomes' },
  ];

  return (
    <DashboardLayout activePage={activePageMap[view]}>
      {isInFlow ? (
        <div className="flex items-center justify-between mb-10 max-w-3xl mx-auto">
          {flowSteps.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    currentStep >= s.n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {currentStep > s.n ? <Check size={16} /> : s.n}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{s.title}</p>
                  <p className="text-[10px] text-gray-400">{s.sub}</p>
                </div>
              </div>
              {i < flowSteps.length - 1 && (
                <div className={`hidden sm:block flex-1 h-0.5 mx-3 transition-colors ${currentStep > s.n ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
          <span>Grade</span>
          <ArrowRight size={13} />
          <span>Subject</span>
          <ArrowRight size={13} />
          <span>Chapter</span>
          <ArrowRight size={13} />
          <span>SLOs</span>
        </div>
      )}
      {renderContent()}

      {/* ── Modals ── */}
      <AnimatePresence>
        {/* Grade Edit */}
        {editingGrade && (
          <EditModal
            title="Edit Grade"
            fields={[
              { label: 'Grade Name', name: 'name', value: editingGrade.name },
              { label: 'Description', name: 'description', value: editingGrade.description || '', type: 'textarea' },
            ]}
            onClose={() => setEditingGrade(null)}
            onSave={(values) => updateGradeMutation.mutate({ id: editingGrade.id, data: values })}
            isSaving={updateGradeMutation.isPending}
          />
        )}
        {/* Grade Delete */}
        {deletingGrade && (
          <DeleteModal
            title="Delete Grade"
            itemName={deletingGrade.name}
            onClose={() => setDeletingGrade(null)}
            onConfirm={() => deleteGradeMutation.mutate(deletingGrade.id)}
            isDeleting={deleteGradeMutation.isPending}
          />
        )}
        {/* Subject Edit */}
        {editingSubject && (
          <EditModal
            title="Edit Subject"
            fields={[
              { label: 'Subject Name', name: 'name', value: editingSubject.name },
              { label: 'Grade', name: 'grade', value: editingSubject.grade || '' },
              { label: 'Description', name: 'description', value: editingSubject.description || '', type: 'textarea' },
            ]}
            onClose={() => setEditingSubject(null)}
            onSave={(values) => updateSubjectMutation.mutate({ id: editingSubject.id, data: values })}
            isSaving={updateSubjectMutation.isPending}
          />
        )}
        {/* Subject Delete */}
        {deletingSubject && (
          <DeleteModal
            title="Delete Subject"
            itemName={deletingSubject.name}
            onClose={() => setDeletingSubject(null)}
            onConfirm={() => deleteSubjectMutation.mutate(deletingSubject.id)}
            isDeleting={deleteSubjectMutation.isPending}
          />
        )}
        {/* Chapter Edit */}
        {editingChapter && (
          <EditModal
            title="Edit Chapter"
            fields={[
              { label: 'Chapter Name', name: 'name', value: editingChapter.name },
            ]}
            onClose={() => setEditingChapter(null)}
            onSave={(values) => updateChapterMutation.mutate({ id: editingChapter.id, data: values })}
            isSaving={updateChapterMutation.isPending}
          />
        )}
        {/* Chapter Delete */}
        {deletingChapter && (
          <DeleteModal
            title="Delete Chapter"
            itemName={deletingChapter.name}
            onClose={() => setDeletingChapter(null)}
            onConfirm={() => deleteChapterMutation.mutate(deletingChapter.id)}
            isDeleting={deleteChapterMutation.isPending}
          />
        )}
        {/* SLO Edit */}
        {editingSlo && (
          <EditModal
            title="Edit SLO"
            fields={[
              { label: 'SLO Name', name: 'name', value: getSloTitle(editingSlo) },
              { label: 'Priority', name: 'difficulty_frequency', value: editingSlo.difficulty_frequency || 'MEDIUM', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
              { label: 'Estimated Time (minutes)', name: 'estimated_time', value: String(getSloTime(editingSlo) || ''), type: 'number' },
            ]}
            onClose={() => setEditingSlo(null)}
            onSave={(values) => updateSloMutation.mutate({ id: editingSlo.id, data: values })}
            isSaving={updateSloMutation.isPending}
          />
        )}
        {/* SLO Delete */}
        {deletingSlo && (
          <DeleteModal
            title="Delete SLO"
            itemName={getSloTitle(deletingSlo)}
            onClose={() => setDeletingSlo(null)}
            onConfirm={() => deleteSloMutation.mutate(deletingSlo.id)}
            isDeleting={deleteSloMutation.isPending}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default CMSManagement;
