import axiosInstance from '../axios';
import { CreateStudentPayload, Student, UpdateStudentPayload } from '../../types';

/**
 * Student Service
 * Handles CRUD for students with multi-tenant isolation via the Bearer token.
 * The backend filters by the authenticated user's school; no X-School-ID header needed.
 */

export const createStudent = async (
  schoolId: string,
  payload: Omit<CreateStudentPayload, 'school_id'>
): Promise<Student> => {
  const response = await axiosInstance.post('/api/auth/students/create', {
    ...payload,
    school_id: schoolId,
  });
  return response.data as Student;
};

/** GET /api/auth/students — filtered by the authenticated user's school token */
export const getStudents = async (): Promise<Student[]> => {
  const response = await axiosInstance.get('/api/auth/students');
  const d = response.data;
  const rawList = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
  return rawList as Student[];
};

/** PATCH /api/auth/students/update */
export const updateStudent = async (payload: UpdateStudentPayload): Promise<Student> => {
  const response = await axiosInstance.patch('/api/auth/students/update', payload);
  return response.data as Student;
};

/** DELETE /api/auth/students/delete */
export const deleteStudent = async (studentId: string | number): Promise<void> => {
  await axiosInstance.delete('/api/auth/students/delete', { data: { student_id: studentId } });
};

// --- Curriculum (read-only) ---

/** GET /api/curriculum/chapters/{subjectId} — returns chapters with nested slos[] */
export const getChaptersBySubject = async (subjectId: number) => {
  console.log(`[getChaptersBySubject] Fetching chapters for subject ${subjectId}`);
  const response = await axiosInstance.get(`/api/curriculum/chapters/${subjectId}`);
  const d = response.data;
  const chapters = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
  console.log(`[getChaptersBySubject] Got ${chapters.length} chapters:`, chapters);
  // Log SLO counts per chapter for debugging
  chapters.forEach((ch: any) => {
    console.log(`  Chapter "${ch.name}" (id=${ch.id}): ${(ch.slos || []).length} SLOs`);
  });
  return chapters;
};

/** GET /api/curriculum/slos?chapter_id={id} */
export const getSlosByChapter = async (chapterId: number) => {
  const response = await axiosInstance.get(`/api/curriculum/slos?chapter_id=${chapterId}`);
  const d = response.data;
  return Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
};

export const studentService = {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  getChaptersBySubject,
  getSlosByChapter,
};

export default studentService;
