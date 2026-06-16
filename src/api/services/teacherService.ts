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

/** PATCH /api/auth/teachers/{id} */
export const updateTeacher = async (teacherId: string | number, payload: any): Promise<Teacher> => {
  const response = await axiosInstance.patch(`/api/auth/teachers/${teacherId}`, payload);
  return response.data as Teacher;
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
