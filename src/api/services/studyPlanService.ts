import api from './api';

export interface CreateStudyPlanPayload {
  title: string;
  plan_type: string;
  grade: string;
  mode: string;
  start_date: string;
  end_date: string;
  min_study_time_daily?: number | null;
  max_study_time_daily?: number | null;
  skip_weekends?: boolean;
  slo_ids?: number[];
  subject_ids?: number[];
  chapter_ids?: number[];
}

export interface UpdateStudyPlanPayload extends Partial<CreateStudyPlanPayload> {}

export const studyPlanService = {
  // Create a new custom or parallel study plan
  createPlan: async (payload: CreateStudyPlanPayload) => {
    const response = await api.post('/api/study-plans/create', payload);
    return response.data;
  },

  // Update a plan (used by admin/teacher)
  updatePlan: async (planId: number | string, payload: UpdateStudyPlanPayload) => {
    const response = await api.post(`/api/study-plans/${planId}/update`, payload);
    return response.data;
  },

  // Delete a plan (used by admin/teacher)
  deletePlan: async (planId: number | string) => {
    const response = await api.delete(`/api/study-plans/${planId}/delete`);
    return response.data;
  },
  
  // List all plans (used by admin/teacher)
  listPlans: async () => {
    const response = await api.get('/api/study-plans');
    return response.data;
  }
};
