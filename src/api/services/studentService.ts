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

export const studentService = {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
};

export default studentService;
