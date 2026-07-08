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
  username: string;
  first_name?: string;
  last_name?: string;
  password: string;
  email: string;
  phone: string;
}

export interface AssignPayload {
  subject_id: number | string;
  student_ids: (number | string)[];
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
};
