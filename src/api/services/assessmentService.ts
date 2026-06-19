import api from './api';

export type AssessmentType =
  | 'CHAPTER_WISE'
  | 'QUARTER'
  | 'HALF'
  | 'THIRD_QUARTER'
  | 'FULL_BOOK';

export interface AssessmentTemplatePayload {
  title: string;
  assessment_type: AssessmentType;
  grade: string;
  subject: number | string;
  chapter_ids: Array<number | string>;
  cognitive_levels: string[];
  categories: string[];
  total_questions: number;
  mcq_count: number;
  short_count: number;
  long_count: number;
}

export interface AssessmentTemplate extends Partial<AssessmentTemplatePayload> {
  id?: number | string;
  name?: string;
  subject_name?: string;
  subject_title?: string;
  chapters?: any[];
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const extractAssessmentList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.models)) return payload.data.models;
  if (Array.isArray(payload?.data?.templates)) return payload.data.templates;
  if (Array.isArray(payload?.data?.assessments)) return payload.data.assessments;
  if (Array.isArray(payload?.models)) return payload.models;
  if (Array.isArray(payload?.templates)) return payload.templates;
  if (Array.isArray(payload?.assessments)) return payload.assessments;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const unwrap = <T>(payload: any): T => {
  if (payload?.data?.model) return payload.data.model;
  if (payload?.data?.template) return payload.data.template;
  if (payload?.data?.assessment) return payload.data.assessment;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload;
};

export const assessmentService = {
  getMetadata: async () => {
    const response = await api.get('/api/assessments/metadata');
    return response.data;
  },

  listTemplates: async (): Promise<AssessmentTemplate[]> => {
    const response = await api.get('/api/assessments/models');
    return extractAssessmentList(response.data) as AssessmentTemplate[];
  },

  getTemplate: async (id: number | string): Promise<AssessmentTemplate> => {
    const response = await api.get(`/api/assessments/models/${id}`);
    return unwrap<AssessmentTemplate>(response.data);
  },

  createTemplate: async (payload: AssessmentTemplatePayload): Promise<AssessmentTemplate> => {
    const response = await api.post('/api/assessments/models', payload);
    return unwrap<AssessmentTemplate>(response.data);
  },

  updateTemplate: async (
    id: number | string,
    payload: AssessmentTemplatePayload
  ): Promise<AssessmentTemplate> => {
    const response = await api.patch(`/api/assessments/models/${id}`, payload);
    return unwrap<AssessmentTemplate>(response.data);
  },

  deleteTemplate: async (id: number | string): Promise<void> => {
    await api.delete(`/api/assessments/models/${id}`);
  },

  listAvailableAssessments: async () => {
    const response = await api.get('/api/assessments/available');
    return extractAssessmentList(response.data);
  },
};
