const dayjs = require('dayjs');
const db = require('../config/db');

// Accurate monetary rounding to 2 decimal places
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item totals, subtotal, discount, taxes, and grand total
 */
function calculateInvoiceTotals(items, taxType = 'cgst_sgst') {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const processedItems = items.map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const discPct = Number(item.discount_percent) || 0;
    const taxPct = Number(item.tax_percent) || 0;

    const baseAmount = round2(qty * price);
    const itemDiscount = round2(baseAmount * (discPct / 100));
    const taxableAmount = Math.max(0, baseAmount - itemDiscount);
    const itemTax = round2(taxableAmount * (taxPct / 100));
    const lineTotal = round2(taxableAmount + itemTax);

    subtotal = round2(subtotal + baseAmount);
    discountTotal = round2(discountTotal + itemDiscount);
    taxTotal = round2(taxTotal + itemTax);

    return {
      ...item,
      quantity: qty,
      unit_price: price,
      discount_percent: discPct,
      tax_percent: taxPct,
      line_total: lineTotal
    };
  });

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxType === 'cgst_sgst') {
    cgstAmount = round2(taxTotal / 2);
    sgstAmount = round2(taxTotal - cgstAmount); // avoids 1-cent rounding drift
  } else if (taxType === 'igst') {
    igstAmount = taxTotal;
  }

  const grandTotal = round2(subtotal - discountTotal + taxTotal);

  return {
    processedItems,
    subtotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    grand_total: grandTotal
  };
}

/**
 * Automatically computes invoice status given payment and due date
 */
function determineInvoiceStatus(currentStatus, dueDate, grandTotal, paidAmount) {
  if (currentStatus === 'draft' || currentStatus === 'cancelled') {
    return currentStatus;
  }

  const remainingDue = round2(grandTotal - paidAmount);
  if (remainingDue <= 0.01) {
    return 'paid';
  }

  if (paidAmount > 0) {
    return 'partially_paid';
  }

  const isPastDue = dayjs().isAfter(dayjs(dueDate), 'day');
  if (isPastDue) {
    return 'overdue';
  }

  return 'pending';
}

/**
 * Generate next invoice number for user
 */
async function generateNextInvoiceNumber(userId) {
  const [settings] = await db.query(
    'SELECT invoice_prefix, next_invoice_number FROM business_settings WHERE user_id = ?',
    [userId]
  );

  const prefix = settings && settings.length > 0 ? (settings[0].invoice_prefix || 'INV-') : 'INV-';
  let nextNum = settings && settings.length > 0 ? (settings[0].next_invoice_number || 1001) : 1001;

  // Verify unique
  let isUnique = false;
  let invoiceNumber = '';

  while (!isUnique) {
    invoiceNumber = `${prefix}${nextNum}`;
    const [existing] = await db.query(
      'SELECT id FROM invoices WHERE user_id = ? AND invoice_number = ?',
      [userId, invoiceNumber]
    );
    if (!existing || existing.length === 0) {
      isUnique = true;
    } else {
      nextNum += 1;
    }
  }

  return { invoiceNumber, nextNumberSeq: nextNum + 1 };
}

module.exports = {
  round2,
  calculateInvoiceTotals,
  determineInvoiceStatus,
  generateNextInvoiceNumber
};
