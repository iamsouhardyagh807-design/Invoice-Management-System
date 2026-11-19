import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';

import { paymentService } from '../../services/paymentService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import RecordPaymentModal from './RecordPaymentModal';

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [recordModalOpen, setRecordModalOpen] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getAll({
        search: search.trim() || undefined,
        payment_method: methodFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      toast.error('Failed to load payment transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, methodFilter, startDate, endDate]);

  const totalPaymentsAmount = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Payments Received
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reconcile inbound payments, trace settlement references, and inspect receipts
          </p>
        </div>

        <Button icon={Plus} onClick={() => setRecordModalOpen(true)} className="!bg-[#7F56D9] hover:!bg-[#6941C6] text-white">
          Record Inbound Payment
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="bg-gradient-to-r from-[#7F56D9] to-[#6941C6] rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-200 block">
            Filtered Total Received
          </span>
          <p className="text-3xl font-black mt-1">
            {formatCurrency(totalPaymentsAmount)}
          </p>
        </div>
        <div className="text-left sm:text-right text-xs text-purple-200">
          <p className="font-semibold text-white text-sm">{payments.length} Transactions Recorded</p>
          <p className="mt-0.5">Directly audited with transactional integrity</p>
        </div>
      </div>

      {/* Search and Filter Toolbar */}
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice, client, UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#141518] pl-9 pr-4 py-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#141518] focus:border-[#7F56D9] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141518] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#7F56D9]"
          >
            <option value="">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#141518] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#141518] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {(search || methodFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setMethodFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <Spinner size="lg" label="Loading payments ledger..." />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments recorded"
          description={
            search || methodFilter || startDate || endDate
              ? 'No payment transactions match your query.'
              : 'Record customer payments against active invoices to track revenue.'
          }
          actionLabel="Record Payment"
          onAction={() => setRecordModalOpen(true)}
        />
      ) : (
        <div className="bg-white dark:bg-[#1E1F25] rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-white/5">
                  <th className="py-3 px-6">Payment Date</th>
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Customer</th>
                  <th className="py-3 px-6">Method</th>
                  <th className="py-3 px-6">Reference / UTR</th>
                  <th className="py-3 px-6 text-right">Amount Received</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-200">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-[#7F56D9]">
                      <Link to={`/invoices/${p.invoice_id}`} className="hover:underline">
                        {p.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6">
                      <p className="font-semibold text-slate-800 dark:text-white">{p.customer_name}</p>
                      {p.customer_company && (
                        <p className="text-[11px] text-slate-400">{p.customer_company}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-600 dark:text-slate-400">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/invoices/${p.invoice_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#7F56D9] hover:underline"
                      >
                        <span>View Invoice</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
