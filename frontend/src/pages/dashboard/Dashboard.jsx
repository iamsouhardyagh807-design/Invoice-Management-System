import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Plus,
  ArrowUpRight,
  UserPlus,
  Eye,
  Download,
  Calendar,
  Cloud,
  Music,
  ShoppingBag,
  Tv,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';

import { dashboardService } from '../../services/dashboardService';
import { invoiceService } from '../../services/invoiceService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import RecordPaymentModal from '../payments/RecordPaymentModal';
import CustomerModal from '../customers/CustomerModal';

export default function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [revenueChartData, setRevenueChartData] = useState([]);
  const [statusChartData, setStatusChartData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(dayjs().month());
  const [loading, setLoading] = useState(true);

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, recentRes, revRes, statRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getRecentInvoices(5),
        dashboardService.getRevenueChart(selectedYear),
        dashboardService.getStatusChart()
      ]);

      if (sumRes.success) setSummary(sumRes.summary);
      if (recentRes.success) setRecentInvoices(recentRes.recentInvoices);
      if (revRes.success) setRevenueChartData(revRes.monthlyData);
      if (statRes.success) setStatusChartData(statRes.statusChartData);
    } catch (err) {
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setSelectedMonthIndex((prev) => (prev > 0 ? prev - 1 : 11));
  };
  const handleNextMonth = () => {
    setSelectedMonthIndex((prev) => (prev < 11 ? prev + 1 : 0));
  };

  const handleOpenPayment = (inv) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentModalOpen(true);
  };

  // Finly Category colors (Matching Image 1 donut chart)
  const donutColors = ['#8B5CF6', '#06B6D4', '#84CC16', '#F59E0B', '#94A3B8'];

  // Icons for recent transactions
  const txIcons = [
    { icon: Music, bg: 'bg-rose-500 text-white', name: 'Software Services' },
    { icon: Cloud, bg: 'bg-slate-800 text-white dark:bg-slate-700', name: 'Cloud Infrastructure' },
    { icon: Tv, bg: 'bg-amber-500 text-white', name: 'Hosting Retainer' },
    { icon: ShoppingBag, bg: 'bg-violet-600 text-white', name: 'Design Tokens' },
    { icon: CheckCircle2, bg: 'bg-blue-600 text-white', name: 'Settlement Payment' }
  ];

  if (loading && !summary) {
    return <Spinner size="lg" label="Loading Finly dashboard..." className="min-h-[500px]" />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Top Row: 3 Finly Stat Cards (Balance, Salary/Billed, Savings/Outstanding) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Balance (Total Revenue) */}
        <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Balance
            </span>
            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">
              <Info className="w-3 h-3" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {formatCurrency(summary?.total_revenue || 0)}
          </p>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
            <span>+13.4%</span>
            <span className="text-slate-400 dark:text-slate-500 font-normal">from last month</span>
          </div>
        </div>

        {/* Card 2: Billed Amount */}
        <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Invoiced
            </span>
            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">
              <Info className="w-3 h-3" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {formatCurrency(summary?.total_billed || 0)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            for this period
          </p>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Outstanding Due
            </span>
            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">
              <Info className="w-3 h-3" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {formatCurrency(summary?.outstanding_amount || 0)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {summary?.pending_invoices + summary?.overdue_invoices + summary?.partially_paid_invoices} pending collection
          </p>
        </div>
      </div>

      {/* 2. Middle Row: Left Chart (Income vs. Expenses) & Right Column (Recent Transactions + Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Income vs. Expenses Spline Chart & Bottom Widgets */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Chart Card (Exact Finly styling with purple and amber spline lines) */}
          <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Income vs. Expenses
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-finly-purple"></span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Income (Received)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-finly-amber"></span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Expenses (Billed)
                    </span>
                  </div>
                </div>
              </div>

              {/* Year & Date Range Pill */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E1F25] px-3.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value={dayjs().year()}>{dayjs().year()}</option>
                  <option value={dayjs().year() - 1}>{dayjs().year() - 1}</option>
                  <option value={dayjs().year() - 2}>{dayjs().year() - 2}</option>
                </select>
              </div>
            </div>

            {/* Spline Area Chart matching Image 1 */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} opacity={0.6} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name === 'revenue' ? 'Income' : 'Billed'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1E1F25',
                      borderRadius: '16px',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                  <Area
                    type="natural"
                    dataKey="revenue"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    name="revenue"
                  />
                  <Area
                    type="natural"
                    dataKey="billed"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorBilled)"
                    name="billed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row Widgets: "Your cards" & "Goals" (matching bottom of Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Widget 1: Your Cards (Layered credit card visuals) */}
            <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                  Your cards
                </span>
                <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">
                  <Info className="w-3 h-3" />
                </div>
              </div>

              {/* 3 Layered Mini Cards Visual */}
              <div className="relative h-28 my-auto flex items-center justify-center">
                {/* Card 1: Blue */}
                <div className="absolute left-4 top-2 w-36 h-22 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white p-3 shadow-lg transform -rotate-6 transition-transform hover:rotate-0 hover:z-20">
                  <span className="text-[9px] font-bold tracking-wider opacity-80 block">INVOICE PRO</span>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-[10px]">•••• 2026</span>
                    <span className="text-[10px] font-bold">VISA</span>
                  </div>
                </div>

                {/* Card 2: Violet/Magenta */}
                <div className="absolute left-18 top-1 w-36 h-22 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white p-3 shadow-xl transform rotate-3 transition-transform hover:rotate-0 hover:z-20">
                  <span className="text-[9px] font-bold tracking-wider opacity-80 block">PREMIUM</span>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-[10px]">•••• 8821</span>
                    <span className="text-[10px] font-bold">MC</span>
                  </div>
                </div>

                {/* Card 3: Emerald */}
                <div className="absolute left-32 top-3 w-36 h-22 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-3 shadow-md transform rotate-12 transition-transform hover:rotate-0 hover:z-20">
                  <span className="text-[9px] font-bold tracking-wider opacity-80 block">CORPORATE</span>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-[10px]">•••• 5590</span>
                    <span className="text-[10px] font-bold">UPI</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span>Active settlement rails</span>
                <span className="font-bold text-slate-800 dark:text-white">3 Accounts</span>
              </div>
            </div>

            {/* Widget 2: Goals / Collection Targets */}
            <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                  Goals
                </span>
                <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">
                  <Info className="w-3 h-3" />
                </div>
              </div>

              <div className="space-y-4 my-2">
                {/* Goal 1: Revenue Target */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Quarterly Target</span>
                    <span className="font-bold text-finly-purple">68%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-finly-purple rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>

                {/* Goal 2: Invoicing Target */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Paid Settlements</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {summary?.paid_invoices || 0}/{summary?.total_invoices || 0}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-finly-amber rounded-full"
                      style={{
                        width: summary?.total_invoices
                          ? `${Math.round(((summary.paid_invoices || 0) / summary.total_invoices) * 100)}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span>Settled ratio</span>
                <span className="font-bold text-emerald-500">
                  {summary?.total_invoices ? `${Math.round(((summary.paid_invoices || 0) / summary.total_invoices) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Recent Transaction & Expense Categories Donut (Matching Image 1) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recent Transaction Widget */}
          <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Recent Transaction</span>
              </h3>
              <Link to="/invoices" className="text-[11px] font-bold text-finly-purple hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3.5">
              {recentInvoices.map((inv, idx) => {
                const iconConfig = txIcons[idx % txIcons.length];
                const IconComponent = iconConfig.icon;
                const isPaid = inv.status === 'paid';

                return (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconConfig.bg}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <Link to={`/invoices/${inv.id}`} className="text-xs font-bold text-slate-900 dark:text-white hover:text-finly-purple truncate block">
                          {inv.customer_name}
                        </Link>
                        <p className="text-[10px] text-slate-400">
                          {formatDate(inv.invoice_date, 'MMM D [at] HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-extrabold ${isPaid ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                        {isPaid ? '+' : ''}{formatCurrency(inv.grand_total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expense Categories / Invoice Status Donut Chart */}
          <div className="bg-white dark:bg-[#24262E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
            {/* Month Navigator Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                {monthNames[selectedMonthIndex]} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center mb-2">Expense categories</p>

            {/* Donut Chart with Center Number (exact Image 1 format) */}
            <div className="relative h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData.filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Total in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {summary?.total_invoices || 0}
                </span>
                <span className="text-[9px] text-slate-400">Total Invoices</span>
              </div>
            </div>

            {/* Bottom Legend with Colors */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              {statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: donutColors[idx % donutColors.length] }}></span>
                    <span className="text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={selectedInvoiceForPayment}
        onSuccess={() => {
          fetchDashboardData();
          toast.success('Payment recorded successfully!');
        }}
      />

      {/* Add Customer Modal */}
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          toast.success('Customer added successfully!');
        }}
      />
    </div>
  );
}
