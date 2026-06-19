import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';
import { Chapter, SLO, Subject } from '../types';
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
  Loader2,
  ArrowRight,
  Save,
  X,
  Clock,
} from 'lucide-react';

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

interface CMSClass {
  id: string;
  name: string;
  description?: string;
  source: 'default' | 'subject' | 'local';
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

const LOCAL_CLASSES_KEY = 'amlos_cms_classes';

const DEFAULT_CLASSES: CMSClass[] = [
  { id: 'default-9', name: '9', description: 'Class 9', source: 'default' },
  { id: 'default-10', name: '10', description: 'Class 10', source: 'default' },
  { id: 'default-11', name: '11', description: 'Class 11', source: 'default' },
  { id: 'default-css', name: 'CSS', description: 'Competitive exam class', source: 'default' },
  { id: 'default-mdcat', name: 'MDCAT', description: 'Medical entry test class', source: 'default' },
  { id: 'default-ecat', name: 'ECAT', description: 'Engineering entry test class', source: 'default' },
];

const extractList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.subjects)) return payload.data.subjects;
  if (Array.isArray(payload?.data?.chapters)) return payload.data.chapters;
  if (Array.isArray(payload?.data?.slos)) return payload.data.slos;
  if (Array.isArray(payload?.subjects)) return payload.subjects;
  if (Array.isArray(payload?.chapters)) return payload.chapters;
  if (Array.isArray(payload?.slos)) return payload.slos;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const readLocalClasses = (): CMSClass[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CLASSES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalClasses = (classes: CMSClass[]) => {
  localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classes));
};

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

const fetchSubjects = async (): Promise<Subject[]> => {
  const response = await api.get('/api/curriculum/subjects');
  return extractList(response.data) as Subject[];
};

const fetchChaptersBySubject = async (subjectId: number, subjects: Subject[] = []): Promise<CMSChapter[]> => {
  const response = await api.get(`/api/curriculum/chapters/${subjectId}`);
  const subject = subjects.find((item) => getSubjectId(item) === subjectId);

  return extractList(response.data).map((chapter: any) => ({
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
      fetchChaptersBySubject(getSubjectId(subject), subjects).catch(() => [])
    )
  );
  return results.flat();
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
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">CMS</span>
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

const CMSManagement: React.FC<CMSManagementProps> = ({ view = 'dashboard' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [localClasses, setLocalClasses] = useState<CMSClass[]>(readLocalClasses);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectGradeFilter, setSubjectGradeFilter] = useState(searchParams.get('grade') || '');
  const [chapterGradeFilter, setChapterGradeFilter] = useState('');
  const [chapterSubjectId, setChapterSubjectId] = useState(searchParams.get('subject') || '');
  const [chapterSearch, setChapterSearch] = useState('');
  const [sloSearch, setSloSearch] = useState('');
  const [sloSubjectFilter, setSloSubjectFilter] = useState('');
  const [subjectForm, setSubjectForm] = useState({ name: '', grade: '', description: '' });
  const [chapterForm, setChapterForm] = useState({ grade: '', subject: '', name: '' });
  const [sloForm, setSloForm] = useState({
    grade: '',
    subject: '',
    chapter: '',
    name: '',
    difficulty_frequency: 'MEDIUM',
    estimated_time: '45',
  });
  const [bulkText, setBulkText] = useState('');

  const subjectsQuery = useQuery({
    queryKey: ['cms', 'subjects'],
    queryFn: fetchSubjects,
    staleTime: 5 * 60 * 1000,
  });
  const subjects = subjectsQuery.data ?? [];

  const classOptions = useMemo(() => {
    const merged = new Map<string, CMSClass>();
    [...DEFAULT_CLASSES, ...localClasses].forEach((item) => {
      merged.set(item.name.toLowerCase(), item);
    });
    subjects.forEach((subject) => {
      if (!subject.grade) return;
      const key = subject.grade.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, {
          id: `subject-${subject.grade}`,
          name: subject.grade,
          description: 'Created from curriculum subjects',
          source: 'subject',
        });
      }
    });
    return Array.from(merged.values());
  }, [localClasses, subjects]);

  const filteredClasses = useMemo(() => {
    return classOptions.filter((cmsClass) =>
      matchesSearchQuery(classSearch, [
        cmsClass.name,
        cmsClass.description,
        cmsClass.source,
      ])
    );
  }, [classOptions, classSearch]);

  const shouldLoadAllChapters = ['dashboard', 'subjects', 'slos'].includes(view);
  const allChaptersQuery = useQuery({
    queryKey: ['cms', 'chapters', 'all', subjects.map((subject) => subject.id).join(',')],
    queryFn: () => fetchAllChapters(subjects),
    enabled: shouldLoadAllChapters && subjects.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const allChapters = allChaptersQuery.data ?? [];

  const activeChapterSubjectId =
    view === 'chapters'
      ? chapterSubjectId
      : view === 'add-slo' || view === 'upload-slo'
        ? sloForm.subject
        : '';

  const activeChaptersQuery = useQuery({
    queryKey: ['cms', 'chapters', activeChapterSubjectId],
    queryFn: () => fetchChaptersBySubject(Number(activeChapterSubjectId), subjects),
    enabled: Boolean(activeChapterSubjectId),
    staleTime: 5 * 60 * 1000,
  });
  const activeChapters = activeChaptersQuery.data ?? [];

  useEffect(() => {
    const subjectId = searchParams.get('subject');
    if (!subjectId || subjects.length === 0) return;
    const subject = subjects.find((item) => String(item.id) === subjectId);
    setChapterSubjectId(subjectId);
    if (subject?.grade) setChapterGradeFilter(subject.grade);
  }, [searchParams, subjects]);

  useEffect(() => {
    const grade = searchParams.get('grade');
    if (grade) setSubjectGradeFilter(grade);
  }, [searchParams]);

  useEffect(() => {
    const subjectId = searchParams.get('subject');
    const chapterId = searchParams.get('chapter');
    if (!subjectId && !chapterId) return;

    const subject = subjectId
      ? subjects.find((item) => String(item.id) === subjectId)
      : undefined;

    setSloForm((prev) => ({
      ...prev,
      grade: subject?.grade || prev.grade,
      subject: subjectId || prev.subject,
      chapter: chapterId || prev.chapter,
    }));
  }, [searchParams, subjects]);

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
    return allChapters.flatMap((chapter) =>
      getChapterSlos(chapter).map((slo) => ({
        ...slo,
        chapter_id: getChapterId(chapter),
        chapter_name: chapter.name,
        subject_name: chapter.subject_name,
        subject_grade: chapter.subject_grade,
      }))
    );
  }, [allChapters]);

  const sloSubjectOptions = useMemo(() => {
    return Array.from(
      new Set(
        sloRows
          .map((slo) => slo.subject_name)
          .filter((subjectName): subjectName is string => Boolean(subjectName))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [sloRows]);

  const filteredSloRows = useMemo(() => {
    return sloRows.filter((slo) => {
      const matchesSubject = !sloSubjectFilter || slo.subject_name === sloSubjectFilter;
      const matchesText = matchesSearchQuery(sloSearch, [
        getSloTitle(slo),
        slo.chapter_name,
        slo.subject_name,
        slo.subject_grade,
        slo.difficulty_frequency,
        slo.priority,
        getSloTime(slo),
      ]);

      return matchesSubject && matchesText;
    });
  }, [sloRows, sloSearch, sloSubjectFilter]);

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = matchesSearchQuery(subjectSearch, [
      subject.name,
      subject.description,
      subject.grade,
    ]);
    const matchesGrade = !subjectGradeFilter || subject.grade === subjectGradeFilter;
    return matchesSearch && matchesGrade;
  });

  const createSubjectMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: subjectForm.name.trim(),
        description: subjectForm.description.trim(),
        grade: subjectForm.grade.trim(),
      };
      await api.post('/api/curriculum/subjects/create', payload);
    },
    onSuccess: () => {
      toast.success('Subject created successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setSubjectForm({ name: '', grade: '', description: '' });
      navigate('/admin/cms/subjects');
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/curriculum/chapters/create', {
        subject: Number(chapterForm.subject),
        name: chapterForm.name.trim(),
      });
    },
    onSuccess: () => {
      toast.success('Chapter created successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setChapterForm({ grade: '', subject: '', name: '' });
      navigate('/admin/cms/chapters');
    },
  });

  const createSloMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/curriculum/slos/create', {
        chapter: Number(sloForm.chapter),
        name: sloForm.name.trim(),
        difficulty_frequency: sloForm.difficulty_frequency,
        estimated_time: Number(sloForm.estimated_time) || 0,
      });
    },
    onSuccess: () => {
      toast.success('SLO created successfully.');
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setSloForm((prev) => ({ ...prev, name: '' }));
      navigate('/admin/cms/slos');
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async () => {
      const items = bulkText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      await Promise.all(
        items.map((line) =>
          api.post('/api/curriculum/slos/create', {
            chapter: Number(sloForm.chapter),
            name: line,
            difficulty_frequency: sloForm.difficulty_frequency,
            estimated_time: Number(sloForm.estimated_time) || 0,
          })
        )
      );

      return items.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} SLOs uploaded successfully.`);
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      setBulkText('');
      navigate('/admin/cms/slos');
    },
  });

  const handleAddClass = (event: React.FormEvent) => {
    event.preventDefault();
    const name = className.trim();
    if (!name) {
      toast.error('Class name is required.');
      return;
    }
    const nextClasses = [
      ...localClasses.filter((item) => item.name.toLowerCase() !== name.toLowerCase()),
      {
        id: `local-${Date.now()}`,
        name,
        description: classDescription.trim(),
        source: 'local' as const,
      },
    ];
    setLocalClasses(nextClasses);
    saveLocalClasses(nextClasses);
    setClassName('');
    setClassDescription('');
    toast.success('Class saved locally.');
    navigate('/admin/cms/classes');
  };

  const handleDeleteLocalClass = (cmsClass: CMSClass) => {
    if (cmsClass.source !== 'local') {
      toast.error('Default and subject-derived classes cannot be deleted here.');
      return;
    }
    const nextClasses = localClasses.filter((item) => item.id !== cmsClass.id);
    setLocalClasses(nextClasses);
    saveLocalClasses(nextClasses);
    toast.success('Class deleted.');
  };

  const handleBulkFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBulkText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const showPendingApi = (entity: string) => {
    toast.error(`${entity} edit/delete API is not connected yet.`);
  };

  const renderDashboard = () => (
    <>
      <SectionHeader
        title="CMS Management"
        subtitle="Manage classes, subjects, chapters, and SLOs used by planner generation."
        action={
          <PrimaryButton onClick={() => navigate('/admin/cms/subjects/add')}>
            <Plus size={16} /> Add Subject
          </PrimaryButton>
        }
      />
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Classes" value={classOptions.length} icon={<GraduationCap size={20} />} tone="bg-blue-100 text-blue-600" />
        <StatCard label="Total Subjects" value={subjects.length} icon={<BookOpen size={20} />} tone="bg-purple-100 text-purple-600" />
        <StatCard label="Total Chapters" value={allChapters.length} icon={<Layers3 size={20} />} tone="bg-emerald-100 text-emerald-600" />
        <StatCard label="Total SLOs" value={sloRows.length} icon={<ListChecks size={20} />} tone="bg-amber-100 text-amber-600" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/70 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-gray-900">CMS Flow</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            {[
              ['Class / Grade', 'Choose learning level'],
              ['Subject', 'Map curriculum area'],
              ['Chapter', 'Group study content'],
              ['SLOs', 'Planner-ready objectives'],
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
          <h2 className="text-lg font-bold text-gray-900">Recent CMS Activity</h2>
          <div className="mt-5 space-y-4">
            {['New subject added', 'New chapter created', 'SLO uploaded'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item}</p>
                  <p className="text-xs text-slate-400">Curriculum activity</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderClasses = () => (
    <>
      <SectionHeader
        title="All Classes"
        subtitle="Class and grade options used to organize curriculum."
        action={<PrimaryButton onClick={() => navigate('/admin/cms/classes/add')}><Plus size={16} /> Add Class</PrimaryButton>}
      />
      <SearchInput
        value={classSearch}
        onChange={setClassSearch}
        placeholder="Search classes by name, type, description"
        className="mb-5"
      />
      {filteredClasses.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No classes match your search.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredClasses.map((cmsClass) => (
            <div key={cmsClass.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{cmsClass.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{cmsClass.description || 'Curriculum class'}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase text-blue-600">
                  {cmsClass.source}
                </span>
              </div>
              <div className="mt-6 flex items-center justify-end gap-1">
                <IconButton title="View subjects" tone="blue" onClick={() => navigate(`/admin/cms/subjects?grade=${encodeURIComponent(cmsClass.name)}`)}><Eye size={15} /></IconButton>
                <IconButton title="Edit" onClick={() => cmsClass.source === 'local' ? (setClassName(cmsClass.name), setClassDescription(cmsClass.description || ''), navigate('/admin/cms/classes/add')) : toast.error('Only local classes can be edited here.')}><Pencil size={15} /></IconButton>
                <IconButton title="Delete" tone="red" onClick={() => handleDeleteLocalClass(cmsClass)}><Trash2 size={15} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderAddClass = () => (
    <>
      <SectionHeader title="Add Class" subtitle="Create a class or exam category for curriculum planning." />
      <form onSubmit={handleAddClass}>
        <FormCard
          eyebrow="Class Setup"
          title="Class Details"
          subtitle="Create the class or exam level used across CMS and planner setup."
          icon={<GraduationCap size={22} />}
          footer={
            <>
              <SecondaryButton onClick={() => navigate('/admin/cms/classes')}><X size={16} /> Cancel</SecondaryButton>
              <PrimaryButton type="submit"><Save size={16} /> Save Class</PrimaryButton>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FieldLabel label="Class / Grade Name">
              <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Grade 9, CSS, MDCAT" className={fieldClass} />
            </FieldLabel>
            <FieldLabel label="Description" className="lg:col-span-2">
              <textarea value={classDescription} onChange={(e) => setClassDescription(e.target.value)} placeholder="Optional description" className={`${fieldClass} min-h-32 resize-y`} />
            </FieldLabel>
          </div>
        </FormCard>
      </form>
    </>
  );

  const renderSubjects = () => (
    <>
      <SectionHeader
        title="All Subjects"
        subtitle="Subjects are grouped by class or grade and feed into planner creation."
        action={<PrimaryButton onClick={() => navigate('/admin/cms/subjects/add')}><Plus size={16} /> Add Subject</PrimaryButton>}
      />
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
        <SearchInput
          value={subjectSearch}
          onChange={setSubjectSearch}
          placeholder="Search subjects by name, grade, description"
        />
        <select value={subjectGradeFilter} onChange={(e) => setSubjectGradeFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
          <option value="">All Classes</option>
          {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
      </div>
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
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No subjects found.</td></tr>
            ) : (
              filteredSubjects.map((subject) => {
                const counts = chapterCountsBySubject.get(getSubjectId(subject));
                return (
                  <tr key={subject.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{subject.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{subject.grade || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{subject.description || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{counts?.chapters ?? (subject as any).total_chapters ?? (subject as any).chapters_count ?? 0}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{counts?.slos ?? (subject as any).total_slos ?? (subject as any).slos_count ?? 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <IconButton title="View chapters" tone="blue" onClick={() => navigate(`/admin/cms/chapters?subject=${subject.id}`)}><Eye size={15} /></IconButton>
                        <IconButton title="Edit subject" onClick={() => showPendingApi('Subject')}><Pencil size={15} /></IconButton>
                        <IconButton title="Delete subject" tone="red" onClick={() => showPendingApi('Subject')}><Trash2 size={15} /></IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderAddSubject = () => (
    <>
      <SectionHeader title="Add Subject" subtitle="Create a subject under a class or grade." />
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
          subtitle="Attach a curriculum subject to a class or grade."
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
            <FieldLabel label="Class / Grade">
              <input list="cms-grade-options" value={subjectForm.grade} onChange={(e) => setSubjectForm((prev) => ({ ...prev, grade: e.target.value }))} placeholder="10" className={fieldClass} />
            </FieldLabel>
            <FieldLabel label="Description" className="lg:col-span-2">
              <textarea value={subjectForm.description} onChange={(e) => setSubjectForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Core mathematics curriculum for grade 10" className={`${fieldClass} min-h-32 resize-y`} />
            </FieldLabel>
          </div>
        </FormCard>
      </form>
    </>
  );

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
          title="All Chapters"
          subtitle="Select a grade and subject to view the related chapters."
          action={<PrimaryButton onClick={() => navigate('/admin/cms/chapters/add')}><Plus size={16} /> Add Chapter</PrimaryButton>}
        />
        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[220px_280px_1fr]">
          <select value={chapterGradeFilter} onChange={(e) => { setChapterGradeFilter(e.target.value); setChapterSubjectId(''); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
            <option value="">Select Grade</option>
            {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
          <select value={chapterSubjectId} onChange={(e) => setChapterSubjectId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
            <option value="">Select Subject</option>
            {visibleSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <SearchInput
            value={chapterSearch}
            onChange={setChapterSearch}
            placeholder="Search chapters by name, subject, grade"
          />
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
              <div key={chapter.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-900">{chapter.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{selectedSubject?.name || chapter.subject_name || 'Subject'} / Grade {selectedSubject?.grade || chapter.subject_grade || 'N/A'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">{getChapterSlos(chapter).length} SLOs</span>
                </div>
                <div className="mt-5 flex items-center justify-end gap-1">
                  <IconButton title="Add SLO" tone="blue" onClick={() => navigate(`/admin/cms/slos/add?subject=${getChapterSubjectId(chapter)}&chapter=${chapter.id}`)}><Plus size={15} /></IconButton>
                  <IconButton title="Edit chapter" onClick={() => showPendingApi('Chapter')}><Pencil size={15} /></IconButton>
                  <IconButton title="Delete chapter" tone="red" onClick={() => showPendingApi('Chapter')}><Trash2 size={15} /></IconButton>
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
      <SectionHeader title="Add Chapter" subtitle="Create a chapter under a selected subject." />
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
            <FieldLabel label="Class / Grade">
              <select value={chapterForm.grade} onChange={(e) => setChapterForm({ grade: e.target.value, subject: '', name: chapterForm.name })} className={`mt-2 ${selectClass}`}>
                <option value="">Select Grade</option>
                {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Subject">
              <select value={chapterForm.subject} onChange={(e) => setChapterForm((prev) => ({ ...prev, subject: e.target.value }))} className={`mt-2 ${selectClass}`}>
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

  const renderSlos = () => (
    <>
      <SectionHeader
        title="All SLOs"
        subtitle="SLOs are the objectives selected by the planner flow."
        action={<PrimaryButton onClick={() => navigate('/admin/cms/slos/add')}><Plus size={16} /> Add SLO</PrimaryButton>}
      />
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px]">
        <SearchInput
          value={sloSearch}
          onChange={setSloSearch}
          placeholder="Search SLOs by objective, chapter, subject, difficulty"
        />
        <select value={sloSubjectFilter} onChange={(e) => setSloSubjectFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
          <option value="">All Subjects</option>
          {sloSubjectOptions.map((subjectName) => <option key={subjectName} value={subjectName}>{subjectName}</option>)}
        </select>
      </div>
      {allChaptersQuery.isLoading ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin text-blue-600" /> Loading SLOs...</div>
      ) : sloRows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No SLOs found.</div>
      ) : filteredSloRows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">No SLOs match your search.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold">SLO</th>
                <th className="px-6 py-4 text-sm font-bold">Chapter</th>
                <th className="px-6 py-4 text-sm font-bold">Subject</th>
                <th className="px-6 py-4 text-sm font-bold">Difficulty</th>
                <th className="px-6 py-4 text-sm font-bold">Est. Time</th>
                <th className="px-6 py-4 text-sm font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSloRows.map((slo, index) => (
                <tr key={slo.id || `${slo.chapter_id}-${index}`} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{getSloTitle(slo)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{slo.chapter_name || slo.chapter || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{slo.subject_name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{slo.difficulty_frequency || slo.priority || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{getSloTime(slo) ? `${getSloTime(slo)}m` : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <IconButton title="Edit SLO" onClick={() => showPendingApi('SLO')}><Pencil size={15} /></IconButton>
                      <IconButton title="Delete SLO" tone="red" onClick={() => showPendingApi('SLO')}><Trash2 size={15} /></IconButton>
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
        subtitle={bulk ? 'Paste or upload one SLO per line for the selected chapter.' : 'Create a single SLO under a selected chapter.'}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!sloForm.chapter || (bulk ? !bulkText.trim() : !sloForm.name.trim())) {
            toast.error(bulk ? 'Chapter and SLO lines are required.' : 'Chapter and SLO name are required.');
            return;
          }
          if (bulk) bulkUploadMutation.mutate();
          else createSloMutation.mutate();
        }}
      >
        <FormCard
          eyebrow={bulk ? 'Bulk SLO Upload' : 'SLO Setup'}
          title={bulk ? 'Upload Objectives' : 'SLO Details'}
          subtitle={bulk ? 'Upload multiple objectives against a selected chapter.' : 'Create one planner-ready objective under a chapter.'}
          icon={bulk ? <Upload size={22} /> : <ListChecks size={22} />}
          footer={
            <>
              <div className="text-xs font-medium text-slate-400">
                {bulk ? `${bulkText.split(/\r?\n/).filter((line) => line.trim()).length} lines ready` : 'Single SLO entry'}
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
            <FieldLabel label="Class / Grade">
              <select value={sloForm.grade} onChange={(e) => setSloForm((prev) => ({ ...prev, grade: e.target.value, subject: '', chapter: '' }))} className={`mt-2 ${selectClass}`}>
                <option value="">Select Grade</option>
                {classOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Subject">
              <select value={sloForm.subject} onChange={(e) => setSloForm((prev) => ({ ...prev, subject: e.target.value, chapter: '' }))} className={`mt-2 ${selectClass}`}>
                <option value="">Select Subject</option>
                {selectedSloSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Chapter">
              <select value={sloForm.chapter} onChange={(e) => setSloForm((prev) => ({ ...prev, chapter: e.target.value }))} className={`mt-2 ${selectClass}`}>
                <option value="">Select Chapter</option>
                {activeChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Difficulty Frequency">
              <select value={sloForm.difficulty_frequency} onChange={(e) => setSloForm((prev) => ({ ...prev, difficulty_frequency: e.target.value }))} className={`mt-2 ${selectClass}`}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Estimated Time">
              <div className="relative mt-2">
                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min="0" value={sloForm.estimated_time} onChange={(e) => setSloForm((prev) => ({ ...prev, estimated_time: e.target.value }))} placeholder="Estimated time in minutes" className={`${fieldClass} mt-0 pl-11`} />
              </div>
            </FieldLabel>
            {bulk && (
              <FieldLabel label="Upload File">
                <label className="mt-2 flex min-h-[50px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50">
                  <input type="file" accept=".txt,.csv" onChange={handleBulkFile} className="hidden" />
                  <span className="inline-flex items-center gap-2"><Upload size={16} /> Upload TXT/CSV</span>
                </label>
              </FieldLabel>
            )}
            <FieldLabel label={bulk ? 'SLO Lines' : 'SLO'} className="lg:col-span-2">
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
    if (view === 'classes') return renderClasses();
    if (view === 'add-class') return renderAddClass();
    if (view === 'subjects') return renderSubjects();
    if (view === 'add-subject') return renderAddSubject();
    if (view === 'chapters') return renderChapters();
    if (view === 'add-chapter') return renderAddChapter();
    if (view === 'slos') return renderSlos();
    if (view === 'add-slo') return renderSloForm(false);
    if (view === 'upload-slo') return renderSloForm(true);
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

  return (
    <DashboardLayout activePage={activePageMap[view]}>
      <datalist id="cms-grade-options">
        {classOptions.map((item) => <option key={item.id} value={item.name} />)}
      </datalist>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
        <span>Class / Grade</span>
        <ArrowRight size={13} />
        <span>Subject</span>
        <ArrowRight size={13} />
        <span>Chapter</span>
        <ArrowRight size={13} />
        <span>SLOs</span>
      </div>
      {renderContent()}
    </DashboardLayout>
  );
};

export default CMSManagement;
