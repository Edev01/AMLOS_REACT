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
  cognitive_level_details?: Record<string, {
    mcq_count: number;
    short_count: number;
    long_count: number;
  }>;
  categories?: string[];
  total_questions?: number;
  mcq_count?: number;
  short_count?: number;
  long_count?: number;
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

export interface GradeSubmissionPayload {
  score: number;
  total_marks: number;
}

export interface Submission {
  id: number | string;
  student_name?: string;
  student_email?: string;
  assessment_title?: string;
  assessment_id?: number | string;
  score?: number;
  total_marks?: number;
  status?: string;
  submitted_at?: string;
  graded_at?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const assessmentService = {
  getMetadata: async () => {
    const response = await api.get('/api/assessments/metadata');
    return response.data;
  },

  // Paginated list of assessment models
  listTemplates: async (page: number = 1): Promise<PaginatedResponse<AssessmentTemplate>> => {
    const response = await api.get(`/api/assessments/models/all?page=${page}`);
    const data = response.data;
    // Normalize response — backend may return different shapes
    return {
      results: extractAssessmentList(data) as AssessmentTemplate[],
      count: data?.count ?? data?.data?.count ?? data?.total ?? 0,
      next: data?.next ?? data?.data?.next ?? null,
      previous: data?.previous ?? data?.data?.previous ?? null,
    };
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
    payload: Partial<AssessmentTemplatePayload> & { title?: string; description?: string }
  ): Promise<AssessmentTemplate> => {
    const response = await api.patch(`/api/assessments/models/${id}/update`, payload);
    return unwrap<AssessmentTemplate>(response.data);
  },

  deleteTemplate: async (id: number | string): Promise<void> => {
    await api.delete(`/api/assessments/models/${id}/delete`);
  },

  listAvailableAssessments: async () => {
    const response = await api.get('/api/assessments/available');
    return extractAssessmentList(response.data);
  },

  // ───── Submissions ─────

  listSubmissions: async (page: number = 1): Promise<PaginatedResponse<Submission>> => {
    const response = await api.get(`/api/assessments/submissions?page=${page}`);
    const raw = response.data;
    // Backend returns: { success, message, data: { count, next, previous, results: [...] } }
    const envelope = raw?.data ?? raw;
    const results = envelope?.results ?? raw?.results ?? (Array.isArray(envelope) ? envelope : []);
    return {
      results,
      count: envelope?.count ?? raw?.count ?? results.length,
      next: envelope?.next ?? raw?.next ?? null,
      previous: envelope?.previous ?? raw?.previous ?? null,
    };
  },

  gradeSubmission: async (submissionId: number | string, payload: GradeSubmissionPayload) => {
    const response = await api.patch(`/api/assessments/submissions/${submissionId}/grade`, payload);
    return response.data;
  },

  submitHandwritten: async (modelId: number | string, formData: FormData) => {
    const response = await api.post(`/api/assessments/models/${modelId}/submit-handwritten`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  bulkUploadAssessment: async (formData: FormData) => {
    const response = await api.post('/api/assessments/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
