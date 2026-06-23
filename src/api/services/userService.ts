import { api } from './api';

export interface UserRolePayload {
  role: string;
}

export const userService = {
  searchUsers: async (query: string) => {
    const response = await api.get('/api/auth/users', {
      params: { search: query }
    });
    return response.data;
  },

  updateUserRole: async (userId: number | string, payload: UserRolePayload) => {
    const response = await api.put(`/api/auth/users/${userId}/role`, payload);
    return response.data;
  }
};
