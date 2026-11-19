import api from './api';

export const invoiceService = {
  getAll: async (params) => {
    const res = await api.get('/invoices', { params });
    return res.data;
  },
  getNextNumber: async () => {
    const res = await api.get('/invoices/next-number');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/invoices', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/invoices/${id}`, data);
    return res.data;
  },
  updateSignature: async (id, data) => {
    const res = await api.patch(`/invoices/${id}/signature`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  },
  downloadPdfUrl: (id) => `/api/invoices/${id}/pdf`
};
