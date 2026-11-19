import api from './api';

export const customerService = {
  getAll: async (params) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
  uploadAvatar: async (formData) => {
    const res = await api.post('/customers/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};
