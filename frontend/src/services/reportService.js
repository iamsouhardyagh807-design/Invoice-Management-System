import api from './api';

export const reportService = {
  getMonthlyRevenue: async (year) => {
    const res = await api.get(`/reports/monthly-revenue${year ? `?year=${year}` : ''}`);
    return res.data;
  },
  getYearlyRevenue: async () => {
    const res = await api.get('/reports/yearly-revenue');
    return res.data;
  },
  getInvoiceStatusReport: async (params) => {
    const res = await api.get('/reports/invoice-status', { params });
    return res.data;
  },
  getCustomerWiseReport: async (params) => {
    const res = await api.get('/reports/customer-wise', { params });
    return res.data;
  }
};
