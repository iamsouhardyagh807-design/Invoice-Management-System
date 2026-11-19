import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import toast from 'react-hot-toast';

import { reportService } from '../../services/reportService';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'yearly' | 'status' | 'customer'
  const [selectedYear, setSelectedYear] = useState(dayjs().year());

  // Report Data States
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Status/Customer
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const loadReportData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'monthly') {
        const res = await reportService.getMonthlyRevenue(selectedYear);
        if (res.success) setMonthlyData(res.monthlyReport || []);
      } else if (activeTab === 'yearly') {
        const res = await reportService.getYearlyRevenue();
        if (res.success) setYearlyData(res.yearlyReport || []);
      } else if (activeTab === 'status') {
        const res = await reportService.getInvoiceStatusReport({
          startDate: startDate || undefined,
          endDate: endDate || undefined
        });
        if (res.success) setStatusData(res.statusBreakdown || []);
      } else if (activeTab === 'customer') {
        const res = await reportService.getCustomerWiseReport({
          search: customerSearch.trim() || undefined
        });
        if (res.success) setCustomerData(res.customerReport || []);
      }
    } catch (err) {
      toast.error('Failed to load report analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab, selectedYear, startDate, endDate, customerSearch]);

  // Export to CSV Function
  const exportToCsv = (filename, rows) => {
    if (!rows || !rows.length) {
      toast.error('No report data available to export.');
      return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row) => {
          return keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported successfully!');
  };

  const handleExportCurrent = () => {
    if (activeTab === 'monthly') {
      exportToCsv(`Monthly-Revenue-Report-${selectedYear}`, monthlyData);
    } else if (activeTab === 'yearly') {
      exportToCsv('Yearly-Revenue-Report', yearlyData);
    } else if (activeTab === 'status') {
      exportToCsv('Invoice-Status-Report', statusData);
    } else if (activeTab === 'customer') {
      exportToCsv('Customer-Wise-Ledger-Report', customerData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aggregated audit statements, revenue trends, and client performance ledgers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportCurrent}
          >
            Export to CSV
          </Button>
          <Button
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => window.print()}
            className="!bg-[#7F56D9] hover:!bg-[#6941C6] text-white"
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'monthly'
              ? 'bg-[#7F56D9] text-white shadow-sm shadow-[#7F56D9]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Monthly Revenue Report</span>
        </button>

        <button
          onClick={() => setActiveTab('yearly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'yearly'
              ? 'bg-[#7F56D9] text-white shadow-sm shadow-[#7F56D9]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Yearly Revenue Report</span>
        </button>

        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'status'
              ? 'bg-[#7F56D9] text-white shadow-sm shadow-[#7F56D9]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Paid vs Unpaid Report</span>
        </button>

        <button
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'customer'
              ? 'bg-[#7F56D9] text-white shadow-sm shadow-[#7F56D9]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer-Wise Report</span>
        </button>
      </div>

      {/* Content based on Active Tab */}
      {loading ? (
        <Spinner size="lg" label="Computing report figures..." className="min-h-[400px]" />
      ) : (
        <div className="space-y-6">
          {/* TAB 1: MONTHLY REVENUE */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Monthly Revenue Summary ({selectedYear})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Month-by-month cashflow collection vs billed invoices
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-semibold rounded-lg border border-slate-200 px-3 py-1.5 text-slate-800"
                  >
                    <option value={dayjs().year()}>{dayjs().year()} (Current)</option>
                    <option value={dayjs().year() - 1}>{dayjs().year() - 1}</option>
                    <option value={dayjs().year() - 2}>{dayjs().year() - 2}</option>
                  </select>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Revenue Trend Chart</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        formatter={(val, name) => [
                          formatCurrency(val),
                          name === 'total_collected' ? 'Payments Collected' : 'Invoices Billed'
                        ]}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="total_collected" name="Payments Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_billed" name="Invoices Billed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-6">Month</th>
                      <th className="py-3 px-6 text-center">Invoices</th>
                      <th className="py-3 px-6 text-right">Total Billed</th>
                      <th className="py-3 px-6 text-right">Collected (Revenue)</th>
                      <th className="py-3 px-6 text-right">Remaining Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-6 font-bold text-slate-800">{m.month}</td>
                        <td className="py-3 px-6 text-center">{m.total_invoices}</td>
                        <td className="py-3 px-6 text-right font-medium text-slate-700">
                          {formatCurrency(m.total_billed)}
                        </td>
                        <td className="py-3 px-6 text-right font-black text-emerald-600">
                          {formatCurrency(m.total_collected)}
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-rose-600">
                          {formatCurrency(m.total_due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: YEARLY REVENUE */}
          {activeTab === 'yearly' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Annual Revenue Comparisons</h2>
                <p className="text-xs text-slate-500 mt-0.5">High-level financial summaries year over year</p>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-6">Year</th>
                    <th className="py-3 px-6 text-center">Invoices Count</th>
                    <th className="py-3 px-6 text-right">Gross Billed</th>
                    <th className="py-3 px-6 text-right">Total Collected</th>
                    <th className="py-3 px-6 text-right">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearlyData.map((y, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-extrabold text-indigo-600 text-sm">{y.year}</td>
                      <td className="py-3.5 px-6 text-center font-medium">{y.total_invoices}</td>
                      <td className="py-3.5 px-6 text-right font-bold text-slate-800">
                        {formatCurrency(y.total_billed)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-black text-emerald-600">
                        {formatCurrency(y.total_collected)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-bold text-rose-600">
                        {formatCurrency(y.total_due)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: PAID VS UNPAID */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Filter Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-center">Invoice Count</th>
                      <th className="py-3 px-6 text-right">Total Invoice Value</th>
                      <th className="py-3 px-6 text-right">Settled Amount</th>
                      <th className="py-3 px-6 text-right">Unpaid Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statusData.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-6 font-bold uppercase text-slate-800">
                          {s.status.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-6 text-center font-semibold">{s.count}</td>
                        <td className="py-3.5 px-6 text-right font-medium text-slate-900">
                          {formatCurrency(s.total_amount)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-emerald-600">
                          {formatCurrency(s.paid_amount)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-rose-600">
                          {formatCurrency(s.due_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMER-WISE REPORT */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <input
                  type="text"
                  placeholder="Filter by customer name or company..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full sm:w-80 text-xs rounded-xl border border-slate-200 px-3.5 py-2"
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-6">Customer Name</th>
                      <th className="py-3 px-6">Company</th>
                      <th className="py-3 px-6 text-center">Invoices</th>
                      <th className="py-3 px-6 text-right">Total Billed</th>
                      <th className="py-3 px-6 text-right">Total Paid</th>
                      <th className="py-3 px-6 text-right">Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerData.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-6 font-bold text-slate-800">{c.customer_name}</td>
                        <td className="py-3.5 px-6 text-slate-500">{c.company_name || '—'}</td>
                        <td className="py-3.5 px-6 text-center font-medium">{c.total_invoices}</td>
                        <td className="py-3.5 px-6 text-right font-medium text-slate-900">
                          {formatCurrency(c.total_billed)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-emerald-600">
                          {formatCurrency(c.total_paid)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-black">
                          <span className={Number(c.outstanding_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {formatCurrency(c.outstanding_balance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
