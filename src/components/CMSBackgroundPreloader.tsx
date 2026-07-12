import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGrades, getSubjects, getChaptersBySubject } from '../api/services/curriculumService';
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

export const CMSBackgroundPreloader: React.FC = () => {
  // Grades query
  const gradesQuery = useQuery<any[]>({
    queryKey: ['cms', 'grades'],
    queryFn: getGrades,
    staleTime: 5 * 60 * 1000,
  });

  // Subjects query
  const subjectsQuery = useQuery<Subject[]>({
    queryKey: ['cms', 'subjects'],
    queryFn: getSubjects,
    staleTime: 5 * 60 * 1000,
  });

  const subjects = subjectsQuery.data ?? [];

  // Chapters query
  const allChaptersQuery = useQuery<CMSChapter[]>({
    queryKey: ['cms', 'chapters', 'all', subjects.map((s) => s.id).join(',')],
    queryFn: () => fetchAllChapters(subjects),
    enabled: subjects.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Automatically save to sessionStorage when fetched
  useEffect(() => {
    if (gradesQuery.data && gradesQuery.data.length > 0) {
      sessionStorage.setItem('cms_grades', JSON.stringify(gradesQuery.data));
    }
  }, [gradesQuery.data]);

  useEffect(() => {
    if (subjectsQuery.data && subjectsQuery.data.length > 0) {
      sessionStorage.setItem('cms_subjects', JSON.stringify(subjectsQuery.data));
    }
  }, [subjectsQuery.data]);

  useEffect(() => {
    if (allChaptersQuery.data && allChaptersQuery.data.length > 0) {
      sessionStorage.setItem('cms_all_chapters', JSON.stringify(allChaptersQuery.data));
    }
  }, [allChaptersQuery.data]);

  return null;
};

export default CMSBackgroundPreloader;
