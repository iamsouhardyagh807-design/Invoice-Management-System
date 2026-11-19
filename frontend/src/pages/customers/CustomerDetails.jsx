import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  Edit2,
  Calendar,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

import { customerService } from '../../services/customerService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import InvoiceStatusBadge from '../../components/invoices/InvoiceStatusBadge';
import CustomerModal from './CustomerModal';
import { getAssetUrl } from '../../utils/imageHelper';

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await customerService.getById(id);
      if (data.success) {
        setCustomer(data.customer);
        setInvoices(data.invoices || []);
        setPayments(data.payments || []);
      }
    } catch (err) {
      toast.error('Failed to load customer details.');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading || !customer) {
    return <Spinner size="lg" label="Loading customer profile..." className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 rounded-xl bg-white dark:bg-[#24262E] border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3.5">
            {customer.avatar_url ? (
              <img
                src={getAssetUrl(customer.avatar_url)}
                alt={customer.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                  }
                }}
              />
            ) : null}
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md ${
                customer.avatar_url ? 'hidden' : ''
              }`}
            >
              {customer.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {customer.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {customer.company_name ? `${customer.company_name} • ` : ''}Client profile, ledger, and transaction summary
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            icon={Edit2}
            size="sm"
            onClick={() => setEditModalOpen(true)}
          >
            Edit Profile
          </Button>
          <Button
            icon={Plus}
            size="sm"
            onClick={() => navigate(`/invoices/create?customer_id=${customer.id}`)}
          >
            New Invoice for Client
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm border-l-4 border-indigo-600">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Invoices
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {customer.total_invoices || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Billed since account inception</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm border-l-4 border-blue-500">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Billed
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(customer.total_billed)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Gross invoice value</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm border-l-4 border-emerald-500">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Paid
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(customer.total_paid)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Settled via payments</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm border-l-4 border-rose-500">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outstanding Balance
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(customer.outstanding_balance)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pending collection</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3">
          Customer & Tax Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                Full Name / Contact Person
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{customer.name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                Company Name
              </span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {customer.company_name || 'Individual / Non-corporate'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                GSTIN / Tax ID
              </span>
              <p className="font-mono font-bold text-[#7F56D9] mt-0.5">
                {customer.gstin || 'Not registered'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                Email Address
              </span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {customer.email || 'No email registered'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                Phone Number
              </span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone || 'No phone registered'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                Client Since
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">{formatDate(customer.created_at)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                Billing Address
              </span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                {customer.billing_address || 'No address provided'}
                {customer.city && `, ${customer.city}`}
                {customer.state && `, ${customer.state}`}
                {customer.postal_code && ` - ${customer.postal_code}`}
              </p>
            </div>
            {customer.notes && (
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Notes
                </span>
                <p className="text-slate-500 italic mt-0.5">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Invoice History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All invoices issued to this customer</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No invoices have been billed to this client yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-white/5">
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Due Date</th>
                  <th className="py-3 px-6 text-right">Total</th>
                  <th className="py-3 px-6 text-right">Paid</th>
                  <th className="py-3 px-6 text-right">Balance Due</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-[#7F56D9]">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300">{formatDate(inv.invoice_date)}</td>
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300">{formatDate(inv.due_date)}</td>
                    <td className="py-3.5 px-6 text-right font-black text-slate-900 dark:text-white">
                      {formatCurrency(inv.grand_total)}
                    </td>
                    <td className="py-3.5 px-6 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(inv.paid_amount)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold text-rose-500">
                      {formatCurrency(inv.due_amount)}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="text-xs font-semibold text-[#7F56D9] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Payment History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recorded payments received from this customer</p>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No payments have been recorded for this client yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-white/5">
                  <th className="py-3 px-6">Payment Date</th>
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Method</th>
                  <th className="py-3 px-6">Reference</th>
                  <th className="py-3 px-6 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300 font-medium">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-[#7F56D9]">
                      <Link to={`/invoices/${p.invoice_id}`} className="hover:underline">
                        {p.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-500 dark:text-slate-400">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        customer={customer}
        onSuccess={fetchDetails}
      />
    </div>
  );
}
