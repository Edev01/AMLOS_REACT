import api from './api';

export interface PaperChecker {
  id: number | string;
  username: string;
  email: string;
  phone?: string;
  assigned_subject?: any;
  assigned_students?: any[];
  [key: string]: any;
}

export interface CreatePaperCheckerPayload {
  first_name?: string;
  last_name?: string;
  password?: string;
  email: string;
  phone?: string;
  profile_image?: string;
}

export interface AssignPayload {
  subject_id: number | string;
  portion: string;
  student_ids: number[];
}

export const paperCheckerService = {
  listCheckers: async (): Promise<PaperChecker[]> => {
    const response = await api.get('/api/auth/paper-checkers');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data?.results)) return data.data.results;
    return [];
  },

  createChecker: async (payload: CreatePaperCheckerPayload): Promise<PaperChecker> => {
    const response = await api.post('/api/auth/paper-checkers/create', payload);
    return response.data?.data ?? response.data;
  },

  updateChecker: async (checkerId: number | string, payload: Partial<CreatePaperCheckerPayload>): Promise<any> => {
    const response = await api.patch(`/api/auth/paper-checkers/${checkerId}/update`, payload);
    return response.data;
  },

  deleteChecker: async (checkerId: number | string): Promise<any> => {
    const response = await api.delete(`/api/auth/paper-checkers/${checkerId}/delete`);
    return response.data;
  },

  assignToChecker: async (
    checkerId: number | string,
    payload: AssignPayload
  ): Promise<any> => {
    const response = await api.post(
      `/api/auth/paper-checkers/${checkerId}/assign`,
      payload
    );
    return response.data;
  },

  listSubmissions: async (): Promise<any[]> => {
    const response = await api.get('/api/assessments/submissions');
    const data = response.data;
    const envelope = data?.data ?? data;
    const results = envelope?.results ?? (Array.isArray(envelope) ? envelope : []);
    return results;
  },

  getCheckerDashboard: async (): Promise<any> => {
    const response = await api.get('/api/auth/paper-checkers/dashboard');
    return response.data;
  },

  gradeSubmission: async (
    submissionId: number | string,
    payload: { score: number; total_marks: number }
  ): Promise<any> => {
    const response = await api.patch(
      `/api/assessments/submissions/${submissionId}/grade`,
      payload
    );
    return response.data;
  },

  deleteAssignment: async (checkerId: number | string, assignmentId: number | string): Promise<any> => {
    const response = await api.delete(`/api/auth/paper-checkers/${checkerId}/assignments/${assignmentId}/delete`);
    return response.data;
  },

  updateAssignment: async (
    checkerId: number | string,
    assignmentId: number | string,
    payload: { portion: string; student_ids: number[] }
  ): Promise<any> => {
    const response = await api.patch(
      `/api/auth/paper-checkers/${checkerId}/assignments/${assignmentId}/update`,
      payload
    );
    return response.data;
  },
};
