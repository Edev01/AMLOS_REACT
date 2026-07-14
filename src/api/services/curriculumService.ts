import axiosInstance from '../axios';

/**
 * Curriculum Service
 * Full CRUD for Grades, Subjects, Chapters, and SLOs.
 * All endpoints are under /api/curriculum/
 */

// ── Helper to normalize any response shape into an array ──
const extractList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

// ═══════════════════════════════════════
//  GRADES
// ═══════════════════════════════════════

/** GET /api/curriculum/grades */
export const getGrades = async () => {
  const response = await axiosInstance.get('/api/curriculum/grades');
  return extractList(response.data);
};

/** POST /api/curriculum/grades/create */
export const createGrade = async (payload: { name: string; description?: string }) => {
  const response = await axiosInstance.post('/api/curriculum/grades/create', payload, {
    // @ts-ignore
    hideToast: true
  });
  return response.data;
};

/** PATCH /api/curriculum/grades/{id}/update */
export const updateGrade = async (id: number | string, payload: { name?: string; description?: string }) => {
  const response = await axiosInstance.patch(`/api/curriculum/grades/${id}/update`, payload);
  return response.data;
};

/** DELETE /api/curriculum/grades/{id}/delete */
export const deleteGrade = async (id: number | string) => {
  await axiosInstance.delete(`/api/curriculum/grades/${id}/delete`);
};

// ═══════════════════════════════════════
//  SUBJECTS
// ═══════════════════════════════════════

/** GET /api/curriculum/subjects */
export const getSubjects = async () => {
  const response = await axiosInstance.get('/api/curriculum/subjects');
  return extractList(response.data);
};

/** POST /api/curriculum/subjects/create */
export const createSubject = async (payload: { name: string; description?: string; grade: string }) => {
  const response = await axiosInstance.post('/api/curriculum/subjects/create', payload, {
    // @ts-ignore
    hideToast: true
  });
  return response.data;
};

/** PATCH /api/curriculum/subjects/{id}/update */
export const updateSubject = async (id: number | string, payload: { name?: string; description?: string; grade?: string }) => {
  const response = await axiosInstance.patch(`/api/curriculum/subjects/${id}/update`, payload);
  return response.data;
};

/** DELETE /api/curriculum/subjects/{id}/delete */
export const deleteSubject = async (id: number | string) => {
  await axiosInstance.delete(`/api/curriculum/subjects/${id}/delete`);
};

// ═══════════════════════════════════════
//  CHAPTERS
// ═══════════════════════════════════════

/** GET /api/curriculum/chapters/{subjectId} */
export const getChaptersBySubject = async (subjectId: number | string) => {
  const response = await axiosInstance.get(`/api/curriculum/chapters/${subjectId}`);
  return extractList(response.data);
};

/** POST /api/curriculum/chapters/create */
export const createChapter = async (payload: { subject: number; name: string }) => {
  const response = await axiosInstance.post('/api/curriculum/chapters/create', payload, {
    // @ts-ignore
    hideToast: true
  });
  return response.data;
};

/** PATCH /api/curriculum/chapters/{id}/update */
export const updateChapter = async (id: number | string, payload: { name?: string; subject?: number }) => {
  const response = await axiosInstance.patch(`/api/curriculum/chapters/${id}/update`, payload);
  return response.data;
};

/** DELETE /api/curriculum/chapters/{id}/delete */
export const deleteChapter = async (id: number | string) => {
  await axiosInstance.delete(`/api/curriculum/chapters/${id}/delete`);
};

// ═══════════════════════════════════════
//  SLOs
// ═══════════════════════════════════════

/** POST /api/curriculum/slos/create */
export const createSlo = async (payload: {
  chapter: number;
  name: string;
  difficulty_frequency?: string;
  estimated_time?: number;
}) => {
  const response = await axiosInstance.post('/api/curriculum/slos/create', payload, {
    // @ts-ignore
    hideToast: true
  });
  return response.data;
};

/** POST /api/curriculum/slos/{id}/update */
export const updateSlo = async (id: number | string, payload: {
  name?: string;
  difficulty_frequency?: string;
  estimated_time?: number;
}) => {
  const response = await axiosInstance.patch(`/api/curriculum/slos/${id}/update`, payload);
  return response.data;
};

/** DELETE /api/curriculum/slos/{id}/delete */
export const deleteSlo = async (id: number | string) => {
  await axiosInstance.delete(`/api/curriculum/slos/${id}/delete`);
};

/** POST /api/curriculum/bulk-upload (form-data: grade + uploaded_file) */
export const bulkUploadSlos = async (grade: string, file: File) => {
  const formData = new FormData();
  formData.append('grade', grade);
  formData.append('uploaded_file', file);
  const response = await axiosInstance.post('/api/curriculum/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 60s for large uploads
  });
  return response.data;
};

// ═══════════════════════════════════════
//  BUNDLED EXPORT
// ═══════════════════════════════════════
export const curriculumService = {
  // Grades
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  // Subjects
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  // Chapters
  getChaptersBySubject,
  createChapter,
  updateChapter,
  deleteChapter,
  // SLOs
  createSlo,
  updateSlo,
  deleteSlo,
  bulkUploadSlos,
};

export default curriculumService;
