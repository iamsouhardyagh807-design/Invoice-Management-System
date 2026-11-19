import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Download,
  CreditCard,
  Printer,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

import { invoiceService } from '../../services/invoiceService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import InvoiceStatusBadge from '../../components/invoices/InvoiceStatusBadge';
import RecordPaymentModal from '../payments/RecordPaymentModal';
import { getAssetUrl } from '../../utils/imageHelper';

const STATUS_TABS = [
  { id: '', label: 'All Invoices' },
  { id: 'pending', label: 'Pending' },
  { id: 'paid', label: 'Paid' },
  { id: 'partially_paid', label: 'Partially Paid' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'draft', label: 'Drafts' }
];

export default function InvoiceList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  // Delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getAll({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      toast.error('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, startDate, endDate]);

  const handleOpenPayment = (inv) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentModalOpen(true);
  };

  const handleOpenDelete = (inv) => {
    setInvoiceToDelete(inv);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await invoiceService.delete(invoiceToDelete.id);
      toast.success(`Invoice "${invoiceToDelete.invoice_number}" deleted successfully.`);
      setDeleteConfirmOpen(false);
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, track, issue, and manage professional GST-compliant invoices
          </p>
        </div>

        <Button icon={Plus} onClick={() => navigate('/invoices/create')} className="!bg-[#7F56D9] hover:!bg-[#6941C6] text-white">
          Create New Invoice
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-white/10">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-[#7F56D9] text-white shadow-sm shadow-[#7F56D9]/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#141518] pl-9 pr-4 py-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#141518] focus:border-[#7F56D9] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
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

          {(search || startDate || endDate || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner size="lg" label="Loading invoices..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={
            search || statusFilter || startDate || endDate
              ? 'No invoices match your current filter parameters.'
              : 'Create your first invoice to bill customers and manage receivables.'
          }
          actionLabel="Create Invoice"
          onAction={() => navigate('/invoices/create')}
        />
      ) : (
        <div className="bg-white dark:bg-[#1E1F25] rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-white/5">
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Customer</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Due Date</th>
                  <th className="py-3 px-6 text-right">Total Amount</th>
                  <th className="py-3 px-6 text-right">Balance Due</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-[#7F56D9]">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        {inv.customer_avatar_url ? (
                          <img
                            src={getAssetUrl(inv.customer_avatar_url)}
                            alt={inv.customer_name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.classList.remove('hidden');
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-7 h-7 rounded-full bg-[#7F56D9]/15 text-[#7F56D9] font-bold text-xs flex items-center justify-center shrink-0 ${
                            inv.customer_avatar_url ? 'hidden' : ''
                          }`}
                        >
                          {inv.customer_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">{inv.customer_name}</p>
                          {inv.customer_company && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs leading-tight">
                              {inv.customer_company}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 font-medium">{formatDate(inv.invoice_date)}</td>
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 font-medium">{formatDate(inv.due_date)}</td>
                    <td className="py-3.5 px-6 text-right font-black text-slate-900 dark:text-white">
                      {formatCurrency(inv.grand_total)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold">
                      <span className={Number(inv.due_amount) > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                        {formatCurrency(inv.due_amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={invoiceService.downloadPdfUrl(inv.id)}
                          download
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <Link
                          to={`/invoices/${inv.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {Number(inv.due_amount) > 0 && inv.status !== 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(inv)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(inv)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={selectedInvoiceForPayment}
        onSuccess={fetchInvoices}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Delete Invoice Record"
        message={`Are you sure you want to delete invoice "${invoiceToDelete?.invoice_number}"? Invoices with existing recorded payments cannot be deleted until payments are removed.`}
        confirmText="Delete Invoice"
      />
    </div>
  );
}
