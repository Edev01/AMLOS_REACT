import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGrades, getSubjects, getChaptersBySubject } from '../api/services/curriculumService';
import api from '../api/services/api';
import { Subject, Chapter } from '../types';

interface CMSSlo {
  id: string | number;
  name?: string;
  title?: string;
  slo_text?: string;
  description?: string;
  google_drive_link?: string;
  difficulty_frequency?: string;
  priority?: string;
  estimated_time?: string | number;
  suggested_time_minutes?: string | number;
  timeline_time?: string | number;
}

interface CMSChapter extends Chapter {
  subject_name?: string;
  subject_grade?: string;
  total_slos?: number;
}

const getSubjectId = (subject: Subject) => Number(subject.id);
const getChapterSlos = (chapter: CMSChapter | Chapter): CMSSlo[] => {
  const slos = (chapter as any).slos ?? (chapter as any).slo_list ?? [];
  return Array.isArray(slos) ? slos : [];
};

// Enriched chapter fetcher matching CMSManagement
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

// Normalizers for preloader matching SchoolManagement
const EMAIL_RE_STRICT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
const EMAIL_RE_LOOSE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val, newKey));
    } else {
      acc[newKey] = val;
    }
    return acc;
  }, {} as Record<string, any>);
};

const normalizeSchool = (raw: any): any => {
  if (!raw || typeof raw !== 'object') return raw;
  const flat = flattenObject(raw);
  const principalKnownKeys = [
    'principal_name', 'admin_name', 'username', 'user.username',
    'admin.username', 'contact_name', 'name', 'full_name',
    'first_name', 'profile.name', 'user.name', 'admin.name',
    'owner', 'created_by',
  ];
  const principal =
    principalKnownKeys.map((k) => flat[k]).find((v) => typeof v === 'string' && v.length > 0 && v !== raw.school_name)
    ?? Object.entries(flat).find(([k, v]) => {
      if (typeof v !== 'string' || v.length < 2 || v === raw.school_name || EMAIL_RE_STRICT.test(v) || /^\d+$/.test(v)) return false;
      const lK = k.toLowerCase();
      return !['id','email','address','website','status','password','phone','city','state','zip','registration','established','count','created','updated'].some(x => lK.includes(x));
    })?.[1];
  const emailKnownKeys = ['email','school_email','contact_email','admin_email','user.email','admin.email','contact.email','principal.email','profile.email','owner.email'];
  const emailFromKeys = emailKnownKeys.map((k) => flat[k]).find((v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v));
  const emailFromDeepScan = Object.values(flat).find((v) => typeof v === 'string' && EMAIL_RE_STRICT.test(v)) as string | undefined;
  const addressEmail = typeof raw.address === 'string' ? raw.address.match(EMAIL_RE_LOOSE)?.[0] : undefined;
  const regNumber =
    raw.registration_number ||
    raw.registration_id ||
    raw.reg_no ||
    raw.reg_number ||
    flat['registration_number'] ||
    flat['reg_id'] ||
    '';
  return { ...raw, principal_name: principal, email: emailFromKeys || emailFromDeepScan || addressEmail, registration_number: regNumber };
};

const getNumber = (...values: any[]): number | undefined => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
};

const parseSchoolsResponse = (payload: any, currentPage: number) => {
  let rawList: any[] = [];
  let meta: any = null;

  if (Array.isArray(payload)) {
    rawList = payload;
  } else if (Array.isArray(payload?.results)) {
    rawList = payload.results;
    meta = payload;
  } else if (Array.isArray(payload?.data?.results)) {
    rawList = payload.data.results;
    meta = payload.data;
  } else if (Array.isArray(payload?.data?.schools)) {
    rawList = payload.data.schools;
    meta = payload.data;
  } else if (Array.isArray(payload?.schools)) {
    rawList = payload.schools;
    meta = payload;
  } else if (Array.isArray(payload?.data)) {
    rawList = payload.data;
    meta = payload;
  }

  const hasPaginationMeta = Boolean(
    meta &&
      ('next' in meta ||
        'previous' in meta ||
        'count' in meta ||
        'total' in meta ||
        'total_count' in meta ||
        'total_pages' in meta ||
        'last_page' in meta)
  );
  const isServerPaginated = hasPaginationMeta && rawList.length <= 10;
  const total = getNumber(meta?.count, meta?.total, meta?.total_count);

  if (!isServerPaginated) {
    return {
      rawList,
      isServerPaginated: false,
      nextPage: undefined,
      totalCount: rawList.length,
      totalPages: 1,
    };
  }

  const explicitNextPage = getNumber(meta.next_page, meta.nextPage);
  const totalPages = getNumber(meta.total_pages, meta.last_page) || Math.ceil((total || 0) / 10) || 1;
  let nextPage = explicitNextPage;

  if (!nextPage && meta.next) nextPage = currentPage + 1;
  if (!nextPage && totalPages && currentPage < totalPages) nextPage = currentPage + 1;
  if (!nextPage && (total || 0) && currentPage * 10 < (total || 0)) nextPage = currentPage + 1;

  return { rawList, isServerPaginated: true, nextPage, totalCount: total, totalPages };
};

export const CMSBackgroundPreloader: React.FC = () => {
  // Grades query
  const gradesQuery = useQuery<any[]>({
    queryKey: ['cms', 'grades'],
    queryFn: getGrades,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Subjects query
  const subjectsQuery = useQuery<Subject[]>({
    queryKey: ['cms', 'subjects'],
    queryFn: getSubjects,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const subjects = subjectsQuery.data ?? [];

  // Chapters query
  const allChaptersQuery = useQuery<CMSChapter[]>({
    queryKey: ['cms', 'chapters', 'all', subjects.map((s) => s.id).join(',')],
    queryFn: () => fetchAllChapters(subjects),
    enabled: subjects.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Schools list query (Page 1, No Search, Admin/Super Admin only)
  const schoolsQuery = useQuery<any>({
    queryKey: ['schools', false, '', 1],
    queryFn: async () => {
      const response = await api.get('/api/auth/schools', {
        params: {
          page: 1,
          page_size: 10,
          limit: 10,
          offset: 0,
        },
      });
      const parsed = parseSchoolsResponse(response.data, 1);
      return {
        schools: parsed.rawList.map(normalizeSchool),
        isForbidden: false,
        isServerPaginated: parsed.isServerPaginated,
        nextPage: parsed.nextPage,
        totalCount: parsed.totalCount,
        totalPages: parsed.totalPages,
      };
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Automatically save to sessionStorage when fetched
  useEffect(() => {
    if (gradesQuery.data) {
      sessionStorage.setItem('cms_grades', JSON.stringify(gradesQuery.data));
    }
  }, [gradesQuery.data]);

  useEffect(() => {
    if (subjectsQuery.data) {
      sessionStorage.setItem('cms_subjects', JSON.stringify(subjectsQuery.data));
    }
  }, [subjectsQuery.data]);

  useEffect(() => {
    if (allChaptersQuery.data) {
      sessionStorage.setItem('cms_all_chapters', JSON.stringify(allChaptersQuery.data));
    }
  }, [allChaptersQuery.data]);

  useEffect(() => {
    if (schoolsQuery.data && schoolsQuery.data.schools && schoolsQuery.data.schools.length > 0) {
      sessionStorage.setItem('schools_list_page_1', JSON.stringify(schoolsQuery.data));
    }
  }, [schoolsQuery.data]);

  return null;
};

export default CMSBackgroundPreloader;
