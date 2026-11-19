import api from './api';

export const dashboardService = {
  getSummary: async () => {
    const res = await api.get('/dashboard/summary');
    return res.data;
  },
  getRecentInvoices: async (limit = 6) => {
    const res = await api.get(`/dashboard/recent-invoices?limit=${limit}`);
    return res.data;
  },
  getRevenueChart: async (year) => {
    const res = await api.get(`/dashboard/revenue-chart${year ? `?year=${year}` : ''}`);
    return res.data;
  },
  getStatusChart: async () => {
    const res = await api.get('/dashboard/status-chart');
    return res.data;
  }
};
