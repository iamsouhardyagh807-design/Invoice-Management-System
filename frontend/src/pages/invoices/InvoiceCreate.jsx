import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  User,
  Percent,
  IndianRupee,
  Save,
  CheckCircle,
  AlertCircle,
  PenTool
} from 'lucide-react';
import toast from 'react-hot-toast';

import { invoiceService } from '../../services/invoiceService';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { settingService } from '../../services/settingService';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Spinner from '../../components/common/Spinner';
import InvoiceItemRow from '../../components/invoices/InvoiceItemRow';
import CustomerModal from '../customers/CustomerModal';
import SignatureEditModal from '../../components/invoices/SignatureEditModal';

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reference lists
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState(searchParams.get('customer_id') || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [dueDate, setDueDate] = useState(dayjs().add(15, 'day').format('YYYY-MM-DD'));
  const [paymentTerms, setPaymentTerms] = useState('Due within 15 days of invoice date');
  const [taxType, setTaxType] = useState('cgst_sgst'); // 'cgst_sgst' | 'igst'
  const [status, setStatus] = useState('pending'); // 'pending' | 'draft'
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Signature State
  const [signatureText, setSignatureText] = useState('INFOTECH');
  const [signatureTitle, setSignatureTitle] = useState('AUTHORIZED SIGNATORY');
  const [signatureFont, setSignatureFont] = useState('marker');
  const [signatureImageUrl, setSignatureImageUrl] = useState('');
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  // Items State
  const [items, setItems] = useState([
    {
      product_id: null,
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 18,
      line_total: 0
    }
  ]);

  // Customer Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [custRes, prodRes, setRes, nextRes] = await Promise.all([
        customerService.getAll(),
        productService.getAll(),
        settingService.getSettings(),
        invoiceService.getNextNumber()
      ]);

      if (custRes.success) setCustomers(custRes.customers);
      if (prodRes.success) setProducts(prodRes.products);
      if (setRes.success && setRes.settings) {
        setSettings(setRes.settings);
        if (setRes.settings.default_payment_terms) {
          setPaymentTerms(setRes.settings.default_payment_terms);
        }
        if (setRes.settings.signature_text) {
          setSignatureText(setRes.settings.signature_text);
        }
        if (setRes.settings.signature_title) {
          setSignatureTitle(setRes.settings.signature_title);
        }
        if (setRes.settings.signature_font) {
          setSignatureFont(setRes.settings.signature_font);
        }
        if (setRes.settings.signature_image_url) {
          setSignatureImageUrl(setRes.settings.signature_image_url);
        }
      }
      if (nextRes.success) {
        setInvoiceNumber(nextRes.invoiceNumber);
      }
    } catch (err) {
      toast.error('Failed to load invoice creation prerequisites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update item row
  const handleItemChange = (index, updatedFields) => {
    setItems((prevItems) => {
      const next = [...prevItems];
      next[index] = { ...next[index], ...updatedFields };
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        item_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_percent: 18,
        line_total: 0
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Real-time calculations
  let calculatedSubtotal = 0;
  let calculatedDiscount = 0;
  let calculatedTax = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const discPct = Number(item.discount_percent) || 0;
    const taxPct = Number(item.tax_percent) || 0;

    const base = qty * price;
    const disc = base * (discPct / 100);
    const taxable = Math.max(0, base - disc);
    const tax = taxable * (taxPct / 100);

    calculatedSubtotal += base;
    calculatedDiscount += disc;
    calculatedTax += tax;
  });

  const calculatedGrandTotal = Math.round((calculatedSubtotal - calculatedDiscount + calculatedTax) * 100) / 100;
  const calculatedCgst = taxType === 'cgst_sgst' ? Math.round((calculatedTax / 2) * 100) / 100 : 0;
  const calculatedSgst = taxType === 'cgst_sgst' ? Math.round((calculatedTax - calculatedCgst) * 100) / 100 : 0;
  const calculatedIgst = taxType === 'igst' ? Math.round(calculatedTax * 100) / 100 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerId) {
      toast.error('Please select a customer for this invoice.');
      return;
    }

    if (!invoiceNumber.trim()) {
      toast.error('Invoice number is required.');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_name.trim()) {
        toast.error(`Please provide an item name for row #${i + 1}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: customerId,
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms: paymentTerms,
        tax_type: taxType,
        status,
        notes,
        terms,
        signature_text: signatureText,
        signature_title: signatureTitle,
        signature_font: signatureFont,
        signature_image_url: signatureImageUrl,
        items
      };

      const res = await invoiceService.create(payload);
      if (res.success) {
        toast.success(`Invoice ${res.invoiceNumber} created successfully!`);
        navigate(`/invoices/${res.invoiceId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner size="lg" label="Preparing invoice form..." className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Create New Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft professional tax invoice with automated GST and balance calculations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => navigate('/invoices')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={saving}
            icon={Save}
          >
            Generate & Issue Invoice
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* A. Invoice Meta & Customer Selection */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Invoice Information</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
              Tax Invoice
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Picker with + Add Shortcut */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Customer / Client <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  + Add Client
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Client from Directory --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Invoice Number"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-1001"
            />

            <Select
              label="Tax Treatment (GST Mode)"
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              options={[
                { value: 'cgst_sgst', label: 'Intra-State: CGST + SGST (Split)' },
                { value: 'igst', label: 'Inter-State: IGST (Integrated)' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Invoice Date"
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />

            <Input
              label="Due Date"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <Input
              label="Payment Terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. Due upon receipt (Net 15)"
            />

            <Select
              label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'pending', label: 'Pending (Ready to send)' },
                { value: 'draft', label: 'Draft (Internal review)' }
              ]}
            />
          </div>
        </div>

        {/* B. Products & Services Line Items Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Line Items & Services</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add products or enter custom line items with volume pricing & tax
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleAddItem}
            >
              Add Item Row
            </Button>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60 p-2.5 rounded-xl">
            <div className="col-span-4">Item & Description</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-2 text-right">Unit Price (₹)</div>
            <div className="col-span-1 text-right">Disc %</div>
            <div className="col-span-1 text-right">GST %</div>
            <div className="col-span-2 text-right">Line Total (₹)</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {/* Item Rows */}
          <div className="space-y-1">
            {items.map((item, index) => (
              <InvoiceItemRow
                key={index}
                index={index}
                item={item}
                products={products}
                onChange={handleItemChange}
                onRemove={handleRemoveItem}
                canRemove={items.length > 1}
              />
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add another line item</span>
            </button>
          </div>
        </div>

        {/* C. Calculations & Bottom Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Notes & Terms on Left */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Notes & Terms
            </h2>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Payment Terms & Conditions
              </label>
              <textarea
                rows="3"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Custom terms, bank transfer account details, IFSC code..."
                className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Customer Notes
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special project notes, milestone references, or thank you message..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141518] p-3 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-[#7F56D9] focus:outline-none"
              />
            </div>

            {/* Signature & Signatory Configuration */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-[#7F56D9]" />
                  <span>Authorized Signature & Signatory</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  className="text-xs font-bold text-[#7F56D9] hover:underline"
                >
                  Style / Draw / Upload
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Signatory Name / Text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="e.g. INFOTECH"
                />
                <Input
                  label="Signatory Designation"
                  value={signatureTitle}
                  onChange={(e) => setSignatureTitle(e.target.value)}
                  placeholder="e.g. AUTHORIZED SIGNATORY"
                />
              </div>

              <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#E8E2D2] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Signature Preview</span>
                  <span className="text-sm font-bold text-black">{signatureText || 'INFOTECH'}</span>
                  <span className="text-[10px] text-slate-500 block">{signatureTitle || 'AUTHORIZED SIGNATORY'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-slate-800 transition-colors"
                >
                  Edit Style
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Calculation Summary on Right */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Financial Summary
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Gross):</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(calculatedSubtotal)}
                </span>
              </div>

              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Discount:</span>
                  <span>-{formatCurrency(calculatedDiscount)}</span>
                </div>
              )}

              {taxType === 'cgst_sgst' ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST Amount:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(calculatedCgst)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST Amount:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(calculatedSgst)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST Amount:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(calculatedIgst)}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-sm font-bold text-slate-900">
                <span className="text-base font-black">Grand Total:</span>
                <span className="text-xl font-black text-indigo-600">
                  {formatCurrency(calculatedGrandTotal)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={saving}
                icon={CheckCircle}
              >
                Create & Save Invoice
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Customer Quick Modal */}
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSuccess={async () => {
          const res = await customerService.getAll();
          if (res.success) {
            setCustomers(res.customers);
            if (res.customers.length > 0) {
              setCustomerId(res.customers[res.customers.length - 1].id);
            }
          }
        }}
      />

      {/* Signature Quick Modal */}
      <SignatureEditModal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        initialData={{
          signature_text: signatureText,
          signature_title: signatureTitle,
          signature_font: signatureFont,
          signature_image_url: signatureImageUrl
        }}
        onSave={async (data) => {
          setSignatureText(data.signature_text);
          setSignatureTitle(data.signature_title);
          setSignatureFont(data.signature_font);
          setSignatureImageUrl(data.signature_image_url);
          toast.success('Signature updated for this invoice!');
        }}
        allowSaveAsDefault={false}
      />
    </div>
  );
}
