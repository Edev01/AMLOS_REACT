import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import api from '../api/services/api';
import { useAuth } from '../context/AuthContext';
import { getGrades } from '../api/services/curriculumService';
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
  Play,
  Shuffle,
  Trash2,
  X,
  AlertTriangle,

  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type AssessmentView = 'dashboard' | 'templates' | 'create-template' | 'generated' | 'submissions';

interface AssessmentManagementProps {
  view?: AssessmentView;
}

interface CognitiveLevelDetail {
  mcq_count: number;
  short_count: number;
  long_count: number;
}

interface AssessmentFormState {
  title: string;
  grade: string;
  subject: string;
  assessment_type: AssessmentType;
  chapter_ids: string[];
  cognitive_levels: string[];
  categories: string[];
  cognitive_level_details: Record<string, CognitiveLevelDetail>;
}

interface CurriculumChapter extends Chapter {
  subject_name?: string;
  subject_grade?: string;
}

const LOCAL_TEMPLATES_KEY = 'amlos_assessment_templates';

// Grades are now fetched dynamically from the CMS database

const ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string; ratio: number }> = [
  { value: 'CHAPTER_WISE', label: 'Chapter Wise', ratio: 0 },
  { value: 'QUARTER', label: 'Quarter', ratio: 0.25 },
  { value: 'HALF', label: 'Half', ratio: 0.5 },
  { value: 'THIRD_QUARTER', label: 'Third Quarter', ratio: 0.75 },
  { value: 'FULL_BOOK', label: 'Full Book', ratio: 1 },
];

const COGNITIVE_LEVELS = ['Knowledge', 'Understanding', 'Application'];
const QUESTION_CATEGORIES = ['Conceptual', 'Past Paper', 'Book Exercise', 'Additional Question'];

const DEFAULT_COGNITIVE_LEVEL_DETAILS: Record<string, CognitiveLevelDetail> = {
  Knowledge: { mcq_count: 3, short_count: 2, long_count: 1 },
  Understanding: { mcq_count: 2, short_count: 1, long_count: 0 },
};

const emptyForm: AssessmentFormState = {
  title: '',
  grade: '',
  subject: '',
  assessment_type: 'CHAPTER_WISE',
  chapter_ids: [],
  cognitive_levels: ['Knowledge', 'Understanding'],
  categories: ['Conceptual'],
  cognitive_level_details: DEFAULT_COGNITIVE_LEVEL_DETAILS,
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
  tone?: 'blue' | 'red' | 'slate' | 'emerald';
  disabled?: boolean;
}> = ({ title, children, onClick, tone = 'slate', disabled }) => {
  const classes =
    tone === 'red'
      ? 'text-red-500 hover:bg-red-50'
      : tone === 'blue'
        ? 'text-blue-600 hover:bg-blue-50'
        : tone === 'emerald'
          ? 'text-emerald-600 hover:bg-emerald-50'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600';

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-1.5 transition ${classes} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
};

type GenerateAssessmentVars = {
  id: string | number;
  printWindow: Window | null;
};

type PaperQuestionGroup = {
  key: 'MCQ' | 'SHORT' | 'LONG' | 'OTHER';
  title: string;
  instructions: string;
  questions: any[];
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getAssessmentQuestions = (assessment: any): any[] => {
  const questions =
    assessment?.questions ??
    assessment?.generated_questions ??
    assessment?.data?.questions ??
    assessment?.data?.generated_questions ??
    [];
  return Array.isArray(questions) ? questions : [];
};

const normalizePaperQuestionType = (question: any): PaperQuestionGroup['key'] => {
  const raw = String(question?.question_type ?? question?.type ?? question?.category_type ?? '').toUpperCase();
  if (raw.includes('MCQ')) return 'MCQ';
  if (raw.includes('SHORT')) return 'SHORT';
  if (raw.includes('LONG')) return 'LONG';
  return 'OTHER';
};

const buildQuestionGroups = (assessment: any): PaperQuestionGroup[] => {
  const questions = getAssessmentQuestions(assessment);
  const groups: PaperQuestionGroup[] = [
    {
      key: 'MCQ',
      title: 'Section A - Multiple Choice Questions',
      instructions: 'Choose the correct option.',
      questions: questions.filter((question) => normalizePaperQuestionType(question) === 'MCQ'),
    },
    {
      key: 'SHORT',
      title: 'Section B - Short Questions',
      instructions: 'Answer briefly and clearly.',
      questions: questions.filter((question) => normalizePaperQuestionType(question) === 'SHORT'),
    },
    {
      key: 'LONG',
      title: 'Section C - Long Questions',
      instructions: 'Write detailed answers with proper reasoning.',
      questions: questions.filter((question) => normalizePaperQuestionType(question) === 'LONG'),
    },
    {
      key: 'OTHER',
      title: 'Additional Questions',
      instructions: 'Attempt the following questions.',
      questions: questions.filter((question) => normalizePaperQuestionType(question) === 'OTHER'),
    },
  ];
  return groups.filter((group) => group.questions.length > 0);
};

const renderPaperQuestion = (question: any, index: number, groupKey: PaperQuestionGroup['key']) => {
  const questionText =
    question?.question_text ??
    question?.text ??
    question?.name ??
    question?.title ??
    `Question ${index + 1}`;
  const marks = Number(question?.marks);
  const time = Number(question?.time_allowed_minutes ?? question?.estimated_time);
  const imageUrl = question?.question_image_url ?? question?.image_url;
  const options = [
    ['A', question?.option_a],
    ['B', question?.option_b],
    ['C', question?.option_c],
    ['D', question?.option_d],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');

  const answerSpace =
    groupKey === 'MCQ'
      ? ''
      : `<div class="answer-space ${groupKey === 'LONG' ? 'answer-space-long' : ''}"></div>`;

  return `
    <article class="question">
      <div class="question-top">
        <div class="question-text">
          <span class="question-number">${index + 1}.</span>
          <span>${escapeHtml(questionText)}</span>
        </div>
        <div class="question-meta">
          ${Number.isFinite(marks) && marks > 0 ? `<span>${marks} mark${marks === 1 ? '' : 's'}</span>` : ''}
          ${Number.isFinite(time) && time > 0 ? `<span>${time} min</span>` : ''}
        </div>
      </div>
      ${imageUrl ? `<img class="question-image" src="${escapeHtml(imageUrl)}" alt="Question image" />` : ''}
      ${
        options.length > 0
          ? `<div class="options">${options
              .map(([label, value]) => `<div><strong>${label}.</strong> ${escapeHtml(value)}</div>`)
              .join('')}</div>`
          : ''
      }
      ${answerSpace}
    </article>
  `;
};

const buildAssessmentPaperHtml = (assessment: any) => {
  const questions = getAssessmentQuestions(assessment);
  const groups = buildQuestionGroups(assessment);
  const chapters = assessment?.chapters_details ?? assessment?.chapters ?? [];
  const totalMarks = questions.reduce((sum, question) => sum + (Number(question?.marks) || 0), 0);
  const totalTime =
    Number(assessment?.duration_minutes) ||
    questions.reduce((sum, question) => sum + (Number(question?.time_allowed_minutes) || 0), 0);
  const title = assessment?.title ?? assessment?.name ?? 'Assessment Paper';
  const subject = assessment?.subject_name ?? assessment?.subject_title ?? assessment?.subject ?? 'N/A';
  const type = formatAssessmentType(assessment?.assessment_type);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - Assessment Paper</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f8fafc;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.5;
    }
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 14px;
      background: #eef2ff;
      border-bottom: 1px solid #c7d2fe;
    }
    .print-toolbar button {
      border: 0;
      border-radius: 10px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-weight: 700;
      padding: 10px 18px;
    }
    .paper {
      width: min(100%, 820px);
      margin: 24px auto;
      background: white;
      border: 1px solid #e5e7eb;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
      padding: 28px;
    }
    .brand {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 3px solid #1d4ed8;
      padding-bottom: 16px;
    }
    .brand h1 {
      margin: 0;
      font-size: 24px;
      letter-spacing: 0;
      color: #0f172a;
    }
    .brand p {
      margin: 3px 0 0;
      color: #475569;
      font-weight: 600;
    }
    .badge {
      align-self: flex-start;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 800;
      padding: 7px 12px;
      white-space: nowrap;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 18px 0;
    }
    .info-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
    }
    .info-box span {
      display: block;
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .info-box strong {
      display: block;
      margin-top: 4px;
      color: #0f172a;
      font-size: 13px;
    }
    .student-row {
      display: grid;
      grid-template-columns: 1.4fr .8fr .8fr;
      gap: 14px;
      margin: 14px 0 20px;
    }
    .line-field {
      border-bottom: 1px solid #94a3b8;
      min-height: 28px;
      padding-top: 7px;
      color: #64748b;
      font-weight: 700;
    }
    .chapters {
      margin: 0 0 18px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px 14px;
    }
    .chapters strong {
      display: block;
      margin-bottom: 5px;
      color: #0f172a;
    }
    .instructions {
      border-radius: 10px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1e3a8a;
      padding: 12px 14px;
      margin-bottom: 20px;
    }
    .section {
      page-break-inside: avoid;
      margin-top: 22px;
    }
    .section h2 {
      margin: 0;
      border-radius: 10px 10px 0 0;
      background: #1d4ed8;
      color: white;
      font-size: 15px;
      padding: 10px 13px;
    }
    .section-note {
      border: 1px solid #dbeafe;
      border-top: 0;
      color: #475569;
      font-weight: 700;
      padding: 8px 13px;
    }
    .question {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #e5e7eb;
      border-top: 0;
      padding: 13px;
    }
    .question-top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .question-text {
      display: flex;
      gap: 7px;
      white-space: pre-wrap;
      font-weight: 700;
      color: #111827;
    }
    .question-number {
      color: #1d4ed8;
      flex: 0 0 auto;
    }
    .question-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }
    .options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 18px;
      margin-top: 11px;
      color: #334155;
    }
    .question-image {
      display: block;
      max-width: 100%;
      max-height: 260px;
      margin-top: 10px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .answer-space {
      margin-top: 13px;
      height: 64px;
      background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #cbd5e1 28px);
    }
    .answer-space-long {
      height: 130px;
    }
    .empty-state {
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      color: #64748b;
      padding: 26px;
      text-align: center;
      font-weight: 700;
    }
    @media print {
      body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-toolbar { display: none; }
      .paper {
        width: auto;
        margin: 0;
        border: 0;
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button type="button" onclick="window.print()">Save / Print PDF</button>
  </div>
  <main class="paper">
    <header class="brand">
      <div>
        <h1>AMLOS Assessment Paper</h1>
        <p>${escapeHtml(title)}</p>
      </div>
      <div class="badge">${escapeHtml(type)}</div>
    </header>

    <section class="info-grid">
      <div class="info-box"><span>Grade</span><strong>${escapeHtml(assessment?.grade ?? 'N/A')}</strong></div>
      <div class="info-box"><span>Subject</span><strong>${escapeHtml(subject)}</strong></div>
      <div class="info-box"><span>Questions</span><strong>${escapeHtml(assessment?.total_questions ?? questions.length)}</strong></div>
      <div class="info-box"><span>Total Marks</span><strong>${totalMarks > 0 ? totalMarks : 'N/A'}</strong></div>
      <div class="info-box"><span>MCQs</span><strong>${escapeHtml(assessment?.mcq_count ?? groups.find((group) => group.key === 'MCQ')?.questions.length ?? 0)}</strong></div>
      <div class="info-box"><span>Short</span><strong>${escapeHtml(assessment?.short_count ?? groups.find((group) => group.key === 'SHORT')?.questions.length ?? 0)}</strong></div>
      <div class="info-box"><span>Long</span><strong>${escapeHtml(assessment?.long_count ?? groups.find((group) => group.key === 'LONG')?.questions.length ?? 0)}</strong></div>
      <div class="info-box"><span>Duration</span><strong>${totalTime > 0 ? `${totalTime} min` : 'N/A'}</strong></div>
    </section>

    <section class="student-row">
      <div class="line-field">Student Name:</div>
      <div class="line-field">Roll No:</div>
      <div class="line-field">Date:</div>
    </section>

    ${
      Array.isArray(chapters) && chapters.length > 0
        ? `<section class="chapters"><strong>Included Chapters</strong>${chapters
            .map((chapter: any) => escapeHtml(chapter?.name ?? chapter?.title ?? `Chapter ${chapter?.id ?? ''}`))
            .join(', ')}</section>`
        : ''
    }

    <section class="instructions">
      Read each question carefully. Attempt all required questions. Marks and suggested time are shown where available.
    </section>

    ${
      groups.length > 0
        ? groups
            .map(
              (group) => `<section class="section">
                <h2>${group.title}</h2>
                <div class="section-note">${group.instructions}</div>
                ${group.questions.map((question, index) => renderPaperQuestion(question, index, group.key)).join('')}
              </section>`
            )
            .join('')
        : '<div class="empty-state">No questions were returned for this assessment.</div>'
    }
  </main>
  <script>
    window.addEventListener('load', function () {
      window.setTimeout(function () { window.print(); }, 350);
    });
  </script>
</body>
</html>`;
};

const buildPaperLoadingHtml = () => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Preparing Assessment Paper</title>
  <style>
    body {
      align-items: center;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      font-family: Arial, Helvetica, sans-serif;
      height: 100vh;
      justify-content: center;
      margin: 0;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, .12);
      padding: 32px;
      text-align: center;
    }
    .spinner {
      animation: spin 1s linear infinite;
      border: 4px solid #dbeafe;
      border-top-color: #2563eb;
      border-radius: 999px;
      height: 38px;
      margin: 0 auto 16px;
      width: 38px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Preparing assessment paper...</h1>
    <p>Please wait while AMLOS fetches the latest questions.</p>
  </div>
</body>
</html>`;

const buildPaperErrorHtml = (message: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Assessment Paper Error</title>
  <style>
    body {
      align-items: center;
      background: #fff7ed;
      color: #7c2d12;
      display: flex;
      font-family: Arial, Helvetica, sans-serif;
      height: 100vh;
      justify-content: center;
      margin: 0;
    }
    .card {
      background: white;
      border: 1px solid #fed7aa;
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(124, 45, 18, .12);
      max-width: 520px;
      padding: 32px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Could not generate assessment paper</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;

const writeToPrintWindow = (printWindow: Window | null, html: string) => {
  if (!printWindow) return false;
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    return true;
  } catch {
    return false;
  }
};

const AssessmentManagement: React.FC<AssessmentManagementProps> = ({ view = 'dashboard' }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
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

  // Generated detail modal state
  const [generatedDetail, setGeneratedDetail] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | number | null>(null);

  // Submissions state
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [gradingScore, setGradingScore] = useState('');
  const [gradingTotal, setGradingTotal] = useState('');



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

  const gradesQuery = useQuery({
    queryKey: ['assessments', 'cms-grades'],
    queryFn: getGrades,
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
    enabled: view === 'generated',
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
    const fromCmsGrades = (gradesQuery.data ?? [])
      .map((g: any) => normalizeGrade(g?.name ?? g?.grade ?? g?.title ?? g))
      .filter(Boolean);
    const fromMetadata = metadataClasses
      .map((item: any) => normalizeGrade(item?.name ?? item?.grade ?? item?.title ?? item))
      .filter(Boolean);
    const fromSubjects = subjects.map((subject) => normalizeGrade(getSubjectGrade(subject))).filter(Boolean);
    return Array.from(new Set([...fromCmsGrades, ...fromMetadata, ...fromSubjects]));
  }, [gradesQuery.data, metadataClasses, subjects]);

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
    return form.cognitive_levels.reduce((sum, level) => {
      const detail = form.cognitive_level_details[level];
      if (!detail) return sum;
      return sum + (detail.mcq_count || 0) + (detail.short_count || 0) + (detail.long_count || 0);
    }, 0);
  }, [form.cognitive_levels, form.cognitive_level_details]);

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
      cognitive_level_details: (template as any).cognitive_level_details ?? DEFAULT_COGNITIVE_LEVEL_DETAILS,
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

  const generateMutation = useMutation({
    mutationFn: async ({ id }: GenerateAssessmentVars) => {
      return assessmentService.getTemplate(id);
    },
    onSuccess: (data, variables) => {
      const detail = (data as any)?.data ?? data;
      const targetWindow = variables.printWindow ?? window.open('', '_blank');
      const printed = writeToPrintWindow(targetWindow, buildAssessmentPaperHtml(detail));
      if (printed) {
        toast.success('Assessment paper generated. Use Save as PDF in the print dialog.');
      } else {
        toast.error('Popup blocked. Please allow popups and try again.');
      }
      setIsGenerating(null);
    },
    onError: (_error, variables) => {
      writeToPrintWindow(
        variables.printWindow,
        buildPaperErrorHtml('Failed to fetch assessment details from the server. Please try again.')
      );
      toast.error('Failed to fetch assessment details.');
      setIsGenerating(null);
    }
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

    // Build cognitive_level_details only for selected levels
    const cognitive_level_details: Record<string, CognitiveLevelDetail> = {};
    form.cognitive_levels.forEach((level) => {
      const detail = form.cognitive_level_details[level];
      cognitive_level_details[level] = {
        mcq_count: detail?.mcq_count ?? 0,
        short_count: detail?.short_count ?? 0,
        long_count: detail?.long_count ?? 0,
      };
    });

    return {
      title: form.title.trim(),
      assessment_type: form.assessment_type,
      grade: form.grade,
      subject: toIdValue(form.subject),
      chapter_ids: form.chapter_ids.map(toIdValue),
      cognitive_levels: form.cognitive_levels,
      cognitive_level_details,
      categories: form.categories,
      total_questions: totalQuestions,
      mcq_count: Object.values(cognitive_level_details).reduce((s, d) => s + d.mcq_count, 0),
      short_count: Object.values(cognitive_level_details).reduce((s, d) => s + d.short_count, 0),
      long_count: Object.values(cognitive_level_details).reduce((s, d) => s + d.long_count, 0),
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
        <div className="grid grid-cols-[minmax(220px,1.45fr)_70px_minmax(110px,0.8fr)_minmax(120px,0.85fr)_100px_136px] gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-sm font-bold text-white text-center">
          <span className="text-left">Template Name</span>
          <span>Class</span>
          <span>Subject</span>
          <span>Assessment Type</span>
          <span>Questions</span>
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
              className="grid grid-cols-[minmax(220px,1.45fr)_70px_minmax(110px,0.8fr)_minmax(120px,0.85fr)_100px_136px] items-center gap-3 border-b border-gray-100 px-5 py-5 last:border-b-0 text-center"
            >
              <div className="text-left">
                <p className="font-bold text-gray-900">{template.title}</p>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {template.cognitive_levels?.join(', ') || 'Random Rule'}
                </p>
              </div>
              <span className="font-semibold text-slate-700">{template.grade || 'N/A'}</span>
              <span className="text-slate-600">{getTemplateSubjectName(template)}</span>
              <div>
                <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                  {formatAssessmentType(template.assessment_type)}
                </span>
              </div>
              <span className="text-slate-700">
                {template.total_questions ?? 0}
                <span className="ml-1 text-xs text-slate-400">
                  ({template.mcq_count ?? 0}/{template.short_count ?? 0}/{template.long_count ?? 0})
                </span>
              </span>
              <div className="flex min-w-[132px] items-center justify-center gap-1.5 whitespace-nowrap">
                <IconButton
                  title="Generate PDF"
                  tone="emerald"
                  onClick={() => {
                    if (!template.id) {
                      toast.error('Template id is missing.');
                      return;
                    }
                    const printWindow = window.open('', '_blank');
                    writeToPrintWindow(printWindow, buildPaperLoadingHtml());
                    setIsGenerating(template.id);
                    generateMutation.mutate({ id: template.id, printWindow });
                  }}
                  disabled={!template.id || isGenerating === template.id}
                >
                  {isGenerating === template.id
                    ? <Loader2 size={17} className="animate-spin" />
                    : <Play size={17} />}
                </IconButton>
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
                  <div className="flex flex-wrap gap-3 mb-4">
                    {COGNITIVE_LEVELS.map((level) => (
                      <label key={level} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        form.cognitive_levels.includes(level)
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={form.cognitive_levels.includes(level)}
                          onChange={() => {
                            const newLevels = toggleValue(form.cognitive_levels, level);
                            // When adding a level, initialise its details if missing
                            const newDetails = { ...form.cognitive_level_details };
                            if (!newDetails[level]) {
                              newDetails[level] = { mcq_count: 2, short_count: 1, long_count: 0 };
                            }
                            setForm(prev => ({ ...prev, cognitive_levels: newLevels, cognitive_level_details: newDetails }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        {level}
                      </label>
                    ))}
                  </div>
                  {/* Per-level question count inputs */}
                  {form.cognitive_levels.length > 0 && (
                    <div className="space-y-4">
                      {form.cognitive_levels.map((level) => {
                        const detail = form.cognitive_level_details[level] ?? { mcq_count: 0, short_count: 0, long_count: 0 };
                        const updateDetail = (field: keyof CognitiveLevelDetail, val: string) => {
                          setForm(prev => ({
                            ...prev,
                            cognitive_level_details: {
                              ...prev.cognitive_level_details,
                              [level]: { ...prev.cognitive_level_details[level], [field]: Number(val) || 0 },
                            },
                          }));
                        };
                        return (
                          <div key={level} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">{level}</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-600">MCQs</label>
                                <input type="number" min="0" value={detail.mcq_count}
                                  onChange={e => updateDetail('mcq_count', e.target.value)}
                                  className={fieldClass} />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600">Short Qs</label>
                                <input type="number" min="0" value={detail.short_count}
                                  onChange={e => updateDetail('short_count', e.target.value)}
                                  className={fieldClass} />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600">Long Qs</label>
                                <input type="number" min="0" value={detail.long_count}
                                  onChange={e => updateDetail('long_count', e.target.value)}
                                  className={fieldClass} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Total Questions</p>
                      <p className="text-xs text-slate-500">{totalQuestions} questions across all cognitive levels</p>
                    </div>
                    <Shuffle size={20} className="text-blue-500" />
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
                        {sub.status !== 'GRADED' && user?.role === 'TEACHER' && (
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
              ['Created At', formatDate(selectedTemplate.created_at)],
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

  const renderGeneratedDetailModal = () => {
    if (!generatedDetail) return null;
    const chapters: any[] = generatedDetail.chapters_details ?? generatedDetail.chapters ?? [];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setGeneratedDetail(null)}>
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">Generated Assessment</p>
              <h2 className="mt-1 text-xl font-bold">{generatedDetail.title}</h2>
              <p className="mt-1 text-sm text-emerald-100">
                Grade {generatedDetail.grade} &nbsp;&bull;&nbsp; {generatedDetail.subject_name} &nbsp;&bull;&nbsp; {formatAssessmentType(generatedDetail.assessment_type)}
              </p>
            </div>
            <button type="button" onClick={() => setGeneratedDetail(null)} className="rounded-xl p-2 hover:bg-white/10 transition">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Questions', value: generatedDetail.total_questions ?? 0, color: 'bg-blue-50 text-blue-700' },
                { label: 'MCQs', value: generatedDetail.mcq_count ?? 0, color: 'bg-violet-50 text-violet-700' },
                { label: 'Short', value: generatedDetail.short_count ?? 0, color: 'bg-amber-50 text-amber-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl p-4 text-center ${color}`}>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs font-semibold mt-1 uppercase">{label}</p>
                </div>
              ))}
            </div>

            {/* Long questions */}
            <div className="flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-3">
              <span className="text-2xl font-bold text-rose-600">{generatedDetail.long_count ?? 0}</span>
              <span className="text-sm font-semibold text-rose-600">Long Questions</span>
            </div>

            {/* Cognitive Levels */}
            {generatedDetail.cognitive_levels?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-2">Cognitive Levels</p>
                <div className="flex flex-wrap gap-2">
                  {generatedDetail.cognitive_levels.map((lvl: string) => (
                    <span key={lvl} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{lvl}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {generatedDetail.categories?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-2">Question Sources</p>
                <div className="flex flex-wrap gap-2">
                  {generatedDetail.categories.map((cat: string) => (
                    <span key={cat} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{cat}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Chapters */}
            {chapters.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-3">Chapters Included ({chapters.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {chapters.map((ch: any, idx: number) => (
                    <div key={ch.id ?? idx} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{idx + 1}</span>
                      <span className="text-sm font-semibold text-slate-700">{ch.name ?? ch.title ?? `Chapter ${ch.id}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-6 py-4 flex justify-end">
            <button
              type="button"
              onClick={() => setGeneratedDetail(null)}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Close
            </button>
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
      {renderGeneratedDetailModal()}



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
