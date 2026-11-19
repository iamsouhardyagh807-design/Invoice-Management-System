import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { paymentService } from '../../services/paymentService';
import { invoiceService } from '../../services/invoiceService';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice = null,
  onSuccess
}) {
  const [invoicesList, setInvoicesList] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [activeInvoice, setActiveInvoice] = useState(null);

  const [formData, setFormData] = useState({
    payment_date: dayjs().format('YYYY-MM-DD'),
    amount: '',
    payment_method: 'UPI',
    transaction_reference: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load unpaid/partially paid invoices if no invoice pre-selected
  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        setSelectedInvoiceId(String(invoice.id));
        setActiveInvoice(invoice);
        setFormData((prev) => ({
          ...prev,
          payment_date: dayjs().format('YYYY-MM-DD'),
          amount: Number(invoice.due_amount) > 0 ? String(invoice.due_amount) : '',
          payment_method: 'UPI',
          transaction_reference: '',
          notes: ''
        }));
      } else {
        // Fetch unpaid invoices
        invoiceService
          .getAll()
          .then((res) => {
            if (res.success) {
              const unpaid = res.invoices.filter((i) => Number(i.due_amount) > 0.01 && i.status !== 'draft');
              setInvoicesList(unpaid);
              if (unpaid.length > 0) {
                setSelectedInvoiceId(String(unpaid[0].id));
                setActiveInvoice(unpaid[0]);
                setFormData((prev) => ({
                  ...prev,
                  payment_date: dayjs().format('YYYY-MM-DD'),
                  amount: String(unpaid[0].due_amount)
                }));
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, invoice]);

  const handleInvoiceChange = (e) => {
    const invId = e.target.value;
    setSelectedInvoiceId(invId);
    const found = invoicesList.find((i) => String(i.id) === String(invId));
    setActiveInvoice(found || null);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        amount: String(found.due_amount)
      }));
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInvoiceId) {
      toast.error('Please select an invoice to record payment against.');
      return;
    }

    const payAmount = Number(formData.amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }

    if (activeInvoice && payAmount > Number(activeInvoice.due_amount) + 0.01) {
      toast.error(`Payment amount cannot exceed remaining balance of ${formatCurrency(activeInvoice.due_amount)}.`);
      return;
    }

    setIsLoading(true);
    try {
      const data = await paymentService.record({
        invoice_id: selectedInvoiceId,
        payment_date: formData.payment_date,
        amount: payAmount,
        payment_method: formData.payment_method,
        transaction_reference: formData.transaction_reference,
        notes: formData.notes
      });

      if (data.success) {
        toast.success(data.message || 'Payment recorded successfully!');
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Invoice Payment"
      subtitle="Log incoming customer payment, update balance due, and reconcile ledger"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice Selector */}
        {!invoice && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Select Invoice to Settle <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedInvoiceId}
              onChange={handleInvoiceChange}
              required
              className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose Unsettled Invoice --</option>
              {invoicesList.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} – {inv.customer_name} (Due: {formatCurrency(inv.due_amount)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Invoice Balance Summary Banner */}
        {activeInvoice && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800">
                Invoice #{activeInvoice.invoice_number}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Client: {activeInvoice.customer_name}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Outstanding Due</span>
              <span className="text-sm font-black text-rose-600">
                {formatCurrency(activeInvoice.due_amount)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Payment Date"
            name="payment_date"
            type="date"
            required
            value={formData.payment_date}
            onChange={handleChange}
          />

          <Input
            label="Payment Amount (₹)"
            name="amount"
            type="number"
            min="0.01"
            max={activeInvoice ? activeInvoice.due_amount : undefined}
            step="any"
            required
            placeholder="0.00"
            value={formData.amount}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment Method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            options={[
              { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
              { value: 'Bank Transfer', label: 'Bank Transfer (NEFT / IMPS / RTGS)' },
              { value: 'Card', label: 'Credit / Debit Card' },
              { value: 'Cash', label: 'Cash' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Other', label: 'Other' }
            ]}
          />

          <Input
            label="Transaction Reference / UTR"
            name="transaction_reference"
            placeholder="e.g. UTR-9912048921"
            value={formData.transaction_reference}
            onChange={handleChange}
          />
        </div>

        <Input
          label="Payment Notes"
          name="notes"
          placeholder="e.g. Milestone 1 settlement received via corporate bank"
          value={formData.notes}
          onChange={handleChange}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" isLoading={isLoading}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
