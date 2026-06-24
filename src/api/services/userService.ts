import { api } from './api';

export interface UserRolePayload {
  role: string;
}

export const userService = {
  searchUsers: async (query: string, page: number = 1) => {
    const params: Record<string, string | number> = { page };
    if (query) {
      params.search = query;
    }
    const response = await api.get('/api/auth/users', { params });
    return response.data;
  },

  updateUserRole: async (userId: number | string, payload: UserRolePayload) => {
    const response = await api.patch(`/api/auth/users/${userId}/role`, payload);
    return response.data;
  }
};
