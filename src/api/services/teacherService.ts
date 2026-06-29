import axiosInstance from '../axios';
import { CreateTeacherPayload, Teacher } from '../../types';

/**
 * Teacher Service
 * Handles CRUD for teachers with multi-tenant isolation via the Bearer token.
 */

/** POST /api/auth/create-teacher */
export const createTeacher = async (
  payload: CreateTeacherPayload
): Promise<Teacher> => {
  const response = await axiosInstance.post('/api/auth/create-teacher', payload);
  return response.data as Teacher;
};

/** GET /api/auth/teachers — filtered by the authenticated user's school token */
export const getTeachers = async (): Promise<Teacher[]> => {
  const response = await axiosInstance.get('/api/auth/teachers');
  const d = response.data;
  const rawList = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
  return rawList as Teacher[];
};

export const getTeacherById = async (id: string | number): Promise<Teacher> => {
  try {
    const response = await axiosInstance.get(`/api/auth/teachers/${id}`);
    const d = response.data;
    // Handle both cases: { data: teacher } or just teacher
    return d.data || d;
  } catch (error: any) {
    // Fallback if the detail endpoint doesn't exist yet
    if (error.response?.status === 404 || error.response?.status === 405) {
      const allTeachers = await getTeachers();
      const teacher = allTeachers.find(t => String(t.id) === String(id));
      if (!teacher) throw new Error("Teacher not found");
      return teacher;
    }
    throw error;
  }
};

/** PATCH /api/auth/teachers/{id} */
export const updateTeacher = async (teacherId: string | number, payload: any): Promise<Teacher> => {
  const response = await axiosInstance.patch(`/api/auth/teachers/${teacherId}`, payload);
  return response.data as Teacher;
};

export const changeTeacherStatus = async (teacherId: string | number, payload: { is_active: boolean }): Promise<void> => {
  await axiosInstance.patch(`/api/auth/teachers/${teacherId}/status`, payload);
};

export const assignStudentsToTeacher = async (teacherId: string | number, studentIds: number[]): Promise<any> => {
  const response = await axiosInstance.post(`/api/auth/teachers/${teacherId}/assign-students`, {
    student_ids: studentIds
  });
  return response.data;
};

/** DELETE /api/auth/teachers/{id}/delete */
export const deleteTeacher = async (teacherId: string | number): Promise<void> => {
  await axiosInstance.delete(`/api/auth/teachers/${teacherId}/delete`);
};

export const teacherService = {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
};

export default teacherService;
