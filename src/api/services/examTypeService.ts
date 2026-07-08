import { api } from './api';

export interface ExamType {
  id: number | string;
  name: string;
  grade: string;
  created_at?: string;
}

export interface ExamTypePayload {
  name: string;
  grade: string;
}

export const examTypeService = {
  getExamTypes: async () => {
    const response = await api.get('/api/assessments/exam-types/list');
    return response.data;
  },

  createExamType: async (payload: ExamTypePayload) => {
    const response = await api.post('/api/assessments/exam-types', payload);
    return response.data;
  },

  updateExamType: async (id: number | string, payload: ExamTypePayload) => {
    const response = await api.patch(`/api/assessments/exam-types/${id}/update`, payload);
    return response.data;
  },

  deleteExamType: async (id: number | string) => {
    const response = await api.delete(`/api/assessments/exam-types/${id}/delete`);
    return response.data;
  }
};
