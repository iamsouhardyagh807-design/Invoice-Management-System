import api from './api';

export const settingService = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  updateSettings: async (data) => {
    const res = await api.put('/settings', data);
    return res.data;
  },
  uploadLogo: async (formData) => {
    const res = await api.post('/settings/upload-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },
  uploadSignature: async (formData) => {
    const res = await api.post('/settings/upload-signature', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },
  changePassword: async (passwords) => {
    const res = await api.post('/settings/change-password', passwords);
    return res.data;
  }
};
