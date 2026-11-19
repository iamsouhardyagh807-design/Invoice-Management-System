const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');

function generateInvoicePDF(invoiceData, res) {
  const doc = new PDFDocument({ margin: 36, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  const {
    invoice,
    items,
    customer,
    settings
  } = invoiceData;

  const crimsonRed = '#DC2626';
  const solidBlack = '#141414';
  const creamBg = '#FAF7EE';

  // 1. Draw Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(creamBg);

  // 2. Header
  const startY = 40;
  doc
    .fillColor(crimsonRed)
    .fontSize(32)
    .font('Helvetica-Bold')
    .text('INVOICE', 40, startY);

  const companyTitle = (settings.business_name || 'LICERIA & CO.').toUpperCase();
  doc
    .fillColor(crimsonRed)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(companyTitle, 250, startY, { align: 'right', width: 305 });

  // Right Side Address
  let compY = startY + 28;
  doc
    .fillColor(solidBlack)
    .fontSize(8.5)
    .font('Courier')
    .text((settings.address || '123 ANYWHERE ST.,').toUpperCase(), 250, compY, { align: 'right', width: 305 })
    .text(`${settings.city || 'ANY CITY'}, ${settings.state || ''}`.toUpperCase(), 250, compY + 12, { align: 'right', width: 305 })
    .text(settings.phone || '+123-456-7890', 250, compY + 24, { align: 'right', width: 305 });

  if (settings.gstin) {
    doc.text(`GSTIN: ${settings.gstin}`, 250, compY + 36, { align: 'right', width: 305 });
  }

  // Left Side Metadata
  doc
    .fillColor(solidBlack)
    .fontSize(8.5)
    .font('Courier-Bold')
    .text(`INVOICE NUMBER: #${invoice.invoice_number.replace(/^INV-?/i, '')}`, 40, startY + 45)
    .text(`DATE: ${dayjs(invoice.invoice_date).format('MMMM DD, YYYY').toUpperCase()}`, 40, startY + 58)
    .text(`DUE DATE: ${dayjs(invoice.due_date).format('MMMM DD, YYYY').toUpperCase()}`, 40, startY + 71);

  // Divider Line
  doc
    .strokeColor('#E0DAC8')
    .lineWidth(0.8)
    .moveTo(40, startY + 95)
    .lineTo(555, startY + 95)
    .stroke();

  // 3. Bill To & Payment Method in Two Columns
  const billY = startY + 110;
  doc
    .fillColor(solidBlack)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Bill To:', 40, billY)
    .text('Payment Method', 350, billY, { align: 'right', width: 205 });

  const custName = (customer.name || invoice.customer_name || 'OLIVIA WILSON').toUpperCase();
  doc
    .fillColor(solidBlack)
    .fontSize(9)
    .font('Courier-Bold')
    .text(custName, 40, billY + 15)
    .text('HDFC / Bank Transfer', 350, billY + 15, { align: 'right', width: 205 });

  doc
    .font('Courier')
    .text((customer.company_name ? customer.company_name + ', ' : '') + (customer.billing_address || '123 Anywhere st., Any City'), 40, billY + 28, { width: 250 })
    .text('AVERY DAVIS', 350, billY + 28, { align: 'right', width: 205 })
    .text(customer.phone || '+123-456-7890', 40, billY + 48)
    .text(settings.phone || '+123-456-7890', 350, billY + 40, { align: 'right', width: 205 });

  // 4. Solid Black Border Table
  const tableTop = billY + 70;
  const colX = { desc: 40, qty: 320, price: 395, subtotal: 475 };
  const colW = { desc: 280, qty: 75, price: 80, subtotal: 80 };

  // Outer border & header box
  doc
    .rect(40, tableTop, 515, 24)
    .strokeColor(solidBlack)
    .lineWidth(1.5)
    .stroke();

  // Header text
  doc
    .fillColor(solidBlack)
    .fontSize(8.5)
    .font('Courier-Bold')
    .text('DESCRIPTION', 50, tableTop + 8)
    .text('QTY', colX.qty, tableTop + 8, { width: colW.qty, align: 'center' })
    .text('PRICE', colX.price, tableTop + 8, { width: colW.price, align: 'center' })
    .text('SUBTOTAL', colX.subtotal, tableTop + 8, { width: colW.subtotal, align: 'center' });

  // Column vertical divider lines
  const drawVerticalLines = (yStart, h) => {
    doc.moveTo(colX.qty, yStart).lineTo(colX.qty, yStart + h).stroke();
    doc.moveTo(colX.price, yStart).lineTo(colX.price, yStart + h).stroke();
    doc.moveTo(colX.subtotal, yStart).lineTo(colX.subtotal, yStart + h).stroke();
  };

  drawVerticalLines(tableTop, 24);

  // Line items
  let itemY = tableTop + 24;
  const formatQty = (qty) => (Number(qty) < 10 ? `0${Number(qty)}` : String(Number(qty)));

  items.forEach((item) => {
    const rowHeight = 24;
    doc.rect(40, itemY, 515, rowHeight).strokeColor(solidBlack).lineWidth(1).stroke();
    drawVerticalLines(itemY, rowHeight);

    doc
      .fillColor(solidBlack)
      .fontSize(8)
      .font('Courier-Bold')
      .text(item.item_name.toUpperCase(), 50, itemY + 7, { width: 260, lineBreak: false });

    doc
      .font('Courier')
      .text(formatQty(item.quantity), colX.qty, itemY + 7, { width: colW.qty, align: 'center' })
      .text(`₹${Number(item.unit_price).toLocaleString('en-IN')}`, colX.price, itemY + 7, { width: colW.price, align: 'center' })
      .font('Courier-Bold')
      .text(`₹${Number(item.line_total).toLocaleString('en-IN')}`, colX.subtotal, itemY + 7, { width: colW.subtotal, align: 'center' });

    itemY += rowHeight;
  });

  // 2 Blank Spacer rows for authentic receipt look
  for (let b = 0; b < 2; b++) {
    doc.rect(40, itemY, 515, 20).strokeColor(solidBlack).lineWidth(1).stroke();
    drawVerticalLines(itemY, 20);
    itemY += 20;
  }

  // Tax Row
  doc.rect(40, itemY, 515, 22).strokeColor(solidBlack).lineWidth(1).stroke();
  doc.moveTo(colX.subtotal, itemY).lineTo(colX.subtotal, itemY + 22).stroke();
  doc
    .fillColor(solidBlack)
    .fontSize(8.5)
    .font('Courier-Bold')
    .text(`TAX (${invoice.tax_type === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'})`, 50, itemY + 7, { width: 415, align: 'right' })
    .text(`₹${Number(invoice.tax_total).toLocaleString('en-IN')}`, colX.subtotal, itemY + 7, { width: colW.subtotal, align: 'center' });
  itemY += 22;

  // Grand Total Row
  doc.rect(40, itemY, 515, 26).strokeColor(solidBlack).lineWidth(1.5).stroke();
  doc.moveTo(colX.subtotal, itemY).lineTo(colX.subtotal, itemY + 26).stroke();
  doc
    .fillColor(solidBlack)
    .fontSize(9.5)
    .font('Courier-Bold')
    .text('GRAND TOTAL', 50, itemY + 8, { width: 415, align: 'right' })
    .fillColor(crimsonRed)
    .fontSize(11)
    .text(`₹${Number(invoice.grand_total).toLocaleString('en-IN')}`, colX.subtotal, itemY + 7, { width: colW.subtotal, align: 'center' });
  itemY += 26;

  // 5. Footer: Terms (Left), Contact (Middle), Handwritten Signature (Right)
  const footY = itemY + 30;
  doc
    .fillColor(solidBlack)
    .fontSize(8.5)
    .font('Courier-Bold')
    .text('TERM & CONDITION', 40, footY);

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor('#333333')
    .text(
      invoice.terms || settings.default_payment_terms || 'Payment is requested according to agreed SLA. Thank you for your partnership.',
      40,
      footY + 12,
      { width: 170 }
    );

  // Middle Contact
  doc
    .font('Courier-Bold')
    .fontSize(7.5)
    .fillColor(solidBlack)
    .text('FOR ANY QUESTIONS, PLEASE CONTACT', 240, footY)
    .font('Courier')
    .text(settings.email || 'BILLING@APEXDIGITAL.IO', 240, footY + 12)
    .text(`OR ${settings.phone || '+91 80 4912 3456'}`, 240, footY + 24)
    .font('Courier-Bold')
    .text(custName, 240, footY + 42)
    .font('Courier')
    .text('GENERAL MANAGER', 240, footY + 54);

  // Right Signature
  const signatureText = invoice.signature_text || settings.signature_text || 'INFOTECH';
  const signatureTitle = invoice.signature_title || settings.signature_title || 'AUTHORIZED SIGNATORY';
  const sigImageUrl = invoice.signature_image_url || settings.signature_image_url;

  let imageRendered = false;
  if (sigImageUrl) {
    try {
      const fs = require('fs');
      const path = require('path');
      const cleanPath = sigImageUrl.replace(/^\//, '');
      const localFilePath = path.join(__dirname, '..', cleanPath);
      if (fs.existsSync(localFilePath)) {
        doc.image(localFilePath, 430, footY + 10, { fit: [120, 38], align: 'center' });
        imageRendered = true;
      }
    } catch (e) {
      // fallback to text
    }
  }

  if (!imageRendered) {
    doc
      .font('Times-BoldItalic')
      .fontSize(22)
      .fillColor(solidBlack)
      .text(signatureText, 410, footY + 18, { align: 'center', width: 145 });
  }

  doc
    .moveTo(415, footY + 50)
    .lineTo(550, footY + 50)
    .strokeColor(solidBlack)
    .lineWidth(1)
    .stroke();

  doc
    .font('Courier')
    .fontSize(7)
    .fillColor(solidBlack)
    .text(signatureTitle.toUpperCase(), 410, footY + 56, { align: 'center', width: 145 });

  doc.end();
}

module.exports = {
  generateInvoicePDF
};
