import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  CreditCard,
  Edit2,
  Trash2,
  Send,
  Calendar,
  Building,
  Mail,
  Phone,
  FileCheck2,
  PenTool
} from 'lucide-react';
import toast from 'react-hot-toast';

import { invoiceService } from '../../services/invoiceService';
import { exportInvoiceToPDF } from '../../utils/pdfGenerator';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import InvoicePrintView from '../../components/invoices/InvoicePrintView';
import SignatureEditModal from '../../components/invoices/SignatureEditModal';
import RecordPaymentModal from '../payments/RecordPaymentModal';

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getById(id);
      if (data.success) {
        setInvoice(data.invoice);
        setItems(data.items);
        setPayments(data.payments);
        setSettings(data.settings);
      }
    } catch (err) {
      toast.error('Failed to load invoice details.');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleClientSidePdf = () => {
    if (!invoice) return;
    try {
      exportInvoiceToPDF(
        invoice,
        items,
        settings,
        {
          name: invoice.customer_name,
          company_name: invoice.customer_company,
          email: invoice.customer_email,
          phone: invoice.customer_phone,
          billing_address: invoice.customer_address,
          city: invoice.customer_city,
          state: invoice.customer_state,
          postal_code: invoice.customer_postal_code,
          gstin: invoice.customer_gstin,
          avatar_url: invoice.customer_avatar_url
        }
      );
      toast.success('PDF generated successfully!');
    } catch (err) {
      toast.error('Failed to export PDF on client.');
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await invoiceService.delete(id);
      toast.success('Invoice deleted successfully.');
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSignature = async (sigData) => {
    try {
      const res = await invoiceService.updateSignature(id, sigData);
      if (res.success) {
        toast.success('Invoice signature updated successfully!');
        setInvoice((prev) => ({
          ...prev,
          ...res.signature
        }));
        if (sigData.save_as_default) {
          setSettings((prev) => ({
            ...prev,
            ...res.signature
          }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update signature.');
      throw err;
    }
  };

  if (loading || !invoice) {
    return <Spinner size="lg" label="Rendering invoice document..." className="min-h-[400px]" />;
  }

  const customerObj = {
    name: invoice.customer_name,
    company_name: invoice.customer_company,
    email: invoice.customer_email,
    phone: invoice.customer_phone,
    billing_address: invoice.customer_address,
    city: invoice.customer_city,
    state: invoice.customer_state,
    postal_code: invoice.customer_postal_code,
    gstin: invoice.customer_gstin,
    avatar_url: invoice.customer_avatar_url
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2.5 rounded-xl bg-white dark:bg-[#1E1F25] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {invoice.invoice_number}
              </h1>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">#{invoice.id}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Issued to {invoice.customer_name} • Due on {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Number(invoice.due_amount) > 0 && invoice.status !== 'draft' && (
            <Button
              variant="success"
              size="sm"
              icon={CreditCard}
              onClick={() => setPaymentModalOpen(true)}
            >
              Record Payment
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={PenTool}
            onClick={() => setSignatureModalOpen(true)}
          >
            Edit Signature
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
          >
            Print
          </Button>

          {/* Download PDF (Server or Client) */}
          <a
            href={invoiceService.downloadPdfUrl(invoice.id)}
            download
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1F25] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Download PDF</span>
          </a>

          <Button
            variant="secondary"
            size="sm"
            icon={Edit2}
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
          >
            Edit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Printable Invoice Component */}
      <div className="print-shadow-none">
        <InvoicePrintView
          invoice={invoice}
          items={items}
          customer={customerObj}
          settings={settings}
          onEditSignature={() => setSignatureModalOpen(true)}
        />
      </div>

      {/* Payments History Box (hidden in print) */}
      <div className="no-print bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Payment Settlements</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Audit log of all payments applied to this invoice
            </p>
          </div>

          {Number(invoice.due_amount) > 0 && invoice.status !== 'draft' && (
            <Button
              variant="outline"
              size="sm"
              icon={CreditCard}
              onClick={() => setPaymentModalOpen(true)}
            >
              Add Payment
            </Button>
          )}
        </div>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3">
            No payments have been recorded for this invoice yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Method</th>
                  <th className="py-2.5">Reference / UTR</th>
                  <th className="py-2.5">Notes</th>
                  <th className="py-2.5 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{formatDate(p.payment_date)}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">{p.transaction_reference || '—'}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{p.notes || '—'}</td>
                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={invoice}
        onSuccess={fetchInvoice}
      />

      {/* Signature Edit Modal */}
      <SignatureEditModal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        initialData={{
          signature_text: invoice.signature_text || settings?.signature_text || 'INFOTECH',
          signature_title: invoice.signature_title || settings?.signature_title || 'AUTHORIZED SIGNATORY',
          signature_font: invoice.signature_font || settings?.signature_font || 'marker',
          signature_image_url: invoice.signature_image_url || settings?.signature_image_url || ''
        }}
        onSave={handleSaveSignature}
        allowSaveAsDefault={true}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoice.invoice_number}? This cannot be undone.`}
        confirmText="Delete Invoice"
      />
    </div>
  );
}
