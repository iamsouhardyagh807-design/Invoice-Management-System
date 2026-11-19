import React from 'react';
import dayjs from 'dayjs';
import { PenTool } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getAssetUrl } from '../../utils/imageHelper';

export default function InvoicePrintView({
  invoice,
  items = [],
  customer,
  settings,
  onEditSignature,
  readOnly = false
}) {
  if (!invoice) return null;

  // Format numbers with leading zeros if under 10 (e.g. 05)
  const formatQty = (qty) => {
    const n = Number(qty);
    return n < 10 ? `0${n}` : String(n);
  };

  // Company Name - uppercase styled
  const companyTitle = (settings?.business_name || 'LICERIA & CO.').toUpperCase();
  const customerName = (customer?.name || invoice.customer_name || 'OLIVIA WILSON').toUpperCase();

  // Signature customization
  const signatureText = invoice.signature_text || settings?.signature_text || 'INFOTECH';
  const signatureTitle = invoice.signature_title || settings?.signature_title || 'AUTHORIZED SIGNATORY';
  const signatureFont = invoice.signature_font || settings?.signature_font || 'marker';
  const signatureImageUrl = invoice.signature_image_url || settings?.signature_image_url;

  const getSignatureFontClass = () => {
    switch (signatureFont) {
      case 'marker':
        return 'font-sans italic font-black uppercase text-3xl sm:text-4xl text-black tracking-wider';
      case 'caveat':
        return "font-['Caveat',cursive] text-4xl sm:text-5xl text-black font-bold tracking-wide";
      case 'script':
        return 'font-serif italic font-bold text-3xl sm:text-4xl text-black';
      case 'clean':
        return 'font-sans font-black text-2xl uppercase tracking-widest text-black';
      default:
        return 'font-sans italic font-black uppercase text-3xl sm:text-4xl text-black tracking-wider';
    }
  };

  return (
    <div className="bg-[#FAF7EE] text-[#1E1B18] font-mono p-8 sm:p-14 rounded-2xl border border-[#E8E2D2] shadow-lg print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto transition-colors">
      {/* 1. Header: INVOICE (Left) & Company (Right) in Bold Crimson Red */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#DC2626] tracking-tight font-sans">
            INVOICE
          </h1>
          <div className="mt-6 text-xs font-semibold tracking-wider text-[#1E1B18] space-y-1">
            <p>INVOICE NUMBER: #{invoice.invoice_number.replace(/^INV-?/i, '')}</p>
            <p>DATE: {dayjs(invoice.invoice_date).format('MMMM DD, YYYY').toUpperCase()}</p>
            <p>DUE DATE: {dayjs(invoice.due_date).format('MMMM DD, YYYY').toUpperCase()}</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <h2 className="text-2xl sm:text-3xl font-black text-[#DC2626] tracking-tight font-sans">
            {companyTitle}
          </h2>
          <div className="mt-4 text-xs font-medium text-[#1E1B18] space-y-1 uppercase leading-relaxed">
            <p>{settings?.address || '123 ANYWHERE ST.,'}</p>
            <p>{settings?.city ? `${settings.city}, ${settings.state || ''}` : 'ANY CITY'}</p>
            <p>{settings?.phone || '+123-456-7890'}</p>
            {settings?.gstin && <p className="font-bold">GSTIN: {settings.gstin}</p>}
          </div>
        </div>
      </div>

      {/* 2. Bill To & Payment Method in Two Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 pt-6 border-t border-[#E8E2D2]">
        <div>
          <span className="text-sm font-bold text-[#1E1B18] block mb-2 font-sans">
            Bill To:
          </span>
          <div className="text-xs text-[#1E1B18] space-y-1 leading-relaxed">
            <p className="font-bold tracking-wide">{customerName}</p>
            {customer?.company_name && <p>{customer.company_name.toUpperCase()}</p>}
            <p>{customer?.billing_address || '123 Anywhere st., Any City'}</p>
            <p>{customer?.phone || '+123-456-7890'}</p>
            {customer?.gstin && <p>GSTIN: {customer.gstin}</p>}
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-sm font-bold text-[#1E1B18] block mb-2 font-sans">
            Payment Method
          </span>
          <div className="text-xs text-[#1E1B18] space-y-1 leading-relaxed">
            <p className="font-bold">HDFC / Bank Transfer</p>
            <p>AVERY DAVIS</p>
            <p>{settings?.phone || '+123-456-7890'}</p>
            <p className="text-[11px] text-slate-600">A/C: 50200012345678</p>
          </div>
        </div>
      </div>

      {/* 3. Authentic Grid Table with Crisp Solid Black Borders */}
      <div className="my-6 border-2 border-black">
        {/* Table Header */}
        <div className="grid grid-cols-12 border-b-2 border-black text-xs font-bold uppercase text-black bg-[#FAF7EE]">
          <div className="col-span-6 p-2.5 sm:p-3 border-r-2 border-black">
            DESCRIPTION
          </div>
          <div className="col-span-2 p-2.5 sm:p-3 border-r-2 border-black text-center">
            QTY
          </div>
          <div className="col-span-2 p-2.5 sm:p-3 border-r-2 border-black text-center">
            PRICE
          </div>
          <div className="col-span-2 p-2.5 sm:p-3 text-center">
            SUBTOTAL
          </div>
        </div>

        {/* Line Item Rows */}
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="grid grid-cols-12 border-b-2 border-black text-xs uppercase"
          >
            <div className="col-span-6 p-2.5 sm:p-3 border-r-2 border-black flex items-center gap-2.5">
              {item.image_url && (
                <img
                  src={getAssetUrl(item.image_url)}
                  alt={item.item_name}
                  className="w-7 h-7 rounded-md object-cover border border-slate-300 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <p className="font-bold">{item.item_name}</p>
                {item.description && (
                  <p className="text-[10px] text-slate-600 lowercase normal-case">{item.description}</p>
                )}
              </div>
            </div>
            <div className="col-span-2 p-2.5 sm:p-3 border-r-2 border-black text-center font-mono font-semibold">
              {formatQty(item.quantity)}
            </div>
            <div className="col-span-2 p-2.5 sm:p-3 border-r-2 border-black text-center font-mono">
              ₹{Number(item.unit_price).toLocaleString('en-IN')}
            </div>
            <div className="col-span-2 p-2.5 sm:p-3 text-center font-mono font-bold">
              ₹{Number(item.line_total).toLocaleString('en-IN')}
            </div>
          </div>
        ))}

        {/* 2 Blank Receipt Spacer Rows for authentic layout */}
        <div className="grid grid-cols-12 border-b-2 border-black h-8 text-xs">
          <div className="col-span-6 border-r-2 border-black"></div>
          <div className="col-span-2 border-r-2 border-black"></div>
          <div className="col-span-2 border-r-2 border-black"></div>
          <div className="col-span-2"></div>
        </div>
        <div className="grid grid-cols-12 border-b-2 border-black h-8 text-xs">
          <div className="col-span-6 border-r-2 border-black"></div>
          <div className="col-span-2 border-r-2 border-black"></div>
          <div className="col-span-2 border-r-2 border-black"></div>
          <div className="col-span-2"></div>
        </div>

        {/* Tax Row */}
        <div className="grid grid-cols-12 border-b-2 border-black text-xs font-bold uppercase">
          <div className="col-span-8 p-2.5 sm:p-3 border-r-2 border-black text-right pr-4">
            TAX ({invoice.tax_type === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'})
          </div>
          <div className="col-span-4 p-2.5 sm:p-3 text-center font-mono">
            ₹{Number(invoice.tax_total).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Grand Total Row */}
        <div className="grid grid-cols-12 text-xs font-black uppercase bg-[#FAF7EE]">
          <div className="col-span-8 p-3 sm:p-3.5 border-r-2 border-black text-right pr-4 tracking-wider text-sm">
            GRAND TOTAL
          </div>
          <div className="col-span-4 p-3 sm:p-3.5 text-center font-mono text-base font-black text-[#DC2626]">
            ₹{Number(invoice.grand_total).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* 4. Footer: Terms & Condition (Left), Contact Info (Middle), Handwritten Signature (Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 mt-6 items-end">
        {/* Left: Term & Condition */}
        <div className="space-y-1.5 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-black">
            TERM & CONDITION
          </h4>
          <p className="text-[10px] text-slate-700 leading-relaxed font-sans normal-case">
            {invoice.terms || settings?.default_payment_terms || 'Payment is requested according to agreed SLA. Thank you for your partnership.'}
          </p>
        </div>

        {/* Middle: Contact Info */}
        <div className="text-left text-xs uppercase space-y-1">
          <p className="text-[10px] text-slate-500 font-bold">FOR ANY QUESTIONS, PLEASE CONTACT</p>
          <p className="font-bold text-[11px]">{settings?.email || 'BILLING@APEXDIGITAL.IO'}</p>
          <p className="text-[10px] text-slate-600">OR {settings?.phone || '+91 80 4912 3456'}</p>
          <div className="pt-2">
            <p className="font-bold text-[11px]">{customerName}</p>
            <p className="text-[10px] text-slate-500 font-bold">GENERAL MANAGER</p>
          </div>
        </div>

        {/* Right: Signature (Editable) */}
        <div
          onClick={!readOnly && onEditSignature ? onEditSignature : undefined}
          title={!readOnly && onEditSignature ? "Click to edit signature" : undefined}
          className={`relative group text-center sm:text-right flex flex-col items-center sm:items-end justify-end ${
            !readOnly && onEditSignature ? 'cursor-pointer p-2 rounded-xl transition-all hover:bg-black/5' : ''
          }`}
        >
          {/* Edit Badge visible on hover */}
          {!readOnly && onEditSignature && (
            <div className="no-print absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[#7F56D9] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 z-10 pointer-events-none">
              <PenTool className="w-3 h-3" />
              <span>Edit Signature</span>
            </div>
          )}

          {signatureImageUrl ? (
            <div className="mb-2 max-h-16 flex items-center justify-center">
              <img
                src={signatureImageUrl}
                alt="Signature"
                className="max-h-14 max-w-[160px] object-contain"
              />
            </div>
          ) : (
            <div className="relative inline-block mb-1">
              <span className={`${getSignatureFontClass()} select-none`}>
                {signatureText}
              </span>
              <svg
                className="w-36 h-6 text-black -mt-2 opacity-90 mx-auto"
                viewBox="0 0 140 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 16 C 30 18, 55 12, 80 15 C 105 18, 125 10, 135 14"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-sans border-t border-slate-300 pt-1 px-4">
            {signatureTitle}
          </span>
        </div>
      </div>
    </div>
  );
}
