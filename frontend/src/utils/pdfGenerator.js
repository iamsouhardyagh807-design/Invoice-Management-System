import jsPDF from 'jspdf';
import 'jspdf-autotable';
import dayjs from 'dayjs';

export function exportInvoiceToPDF(invoice, items, settings, customer) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Background Cream Fill (#FAF7EE)
  doc.setFillColor(250, 247, 238);
  doc.rect(0, 0, 210, 297, 'F');

  const crimsonRed = [220, 38, 38]; // #DC2626
  const solidBlack = [20, 20, 20];

  // 1. Header: INVOICE (Left) & Company Name (Right) in Bold Crimson Red
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...crimsonRed);
  doc.text('INVOICE', 14, 25);

  const companyTitle = (settings?.business_name || 'LICERIA & CO.').toUpperCase();
  doc.setFontSize(18);
  doc.text(companyTitle, 196, 22, { align: 'right' });

  // Right Side Address
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...solidBlack);
  let compY = 28;
  if (settings?.address) {
    doc.text(settings.address.toUpperCase(), 196, compY, { align: 'right' });
    compY += 4.5;
  }
  const cityState = `${settings?.city || 'ANY CITY'}${settings?.state ? `, ${settings.state}` : ''}`.toUpperCase();
  doc.text(cityState, 196, compY, { align: 'right' });
  compY += 4.5;
  doc.text(settings?.phone || '+123-456-7890', 196, compY, { align: 'right' });

  // Left Side Metadata
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(`INVOICE NUMBER: #${invoice.invoice_number.replace(/^INV-?/i, '')}`, 14, 38);
  doc.text(`DATE: ${dayjs(invoice.invoice_date).format('MMMM DD, YYYY').toUpperCase()}`, 14, 43);
  doc.text(`DUE DATE: ${dayjs(invoice.due_date).format('MMMM DD, YYYY').toUpperCase()}`, 14, 48);

  // Divider Line
  doc.setDrawColor(200, 195, 180);
  doc.setLineWidth(0.3);
  doc.line(14, 54, 196, 54);

  // 2. Bill To & Payment Method in Two Columns
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Bill To:', 14, 62);
  doc.text('Payment Method', 196, 62, { align: 'right' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  const custName = (customer?.name || invoice.customer_name || 'OLIVIA WILSON').toUpperCase();
  doc.setFont('courier', 'bold');
  doc.text(custName, 14, 67);
  doc.text('HDFC / Bank Transfer', 196, 67, { align: 'right' });

  doc.setFont('courier', 'normal');
  doc.text(customer?.billing_address || '123 Anywhere st., Any City', 14, 72);
  doc.text('AVERY DAVIS', 196, 72, { align: 'right' });

  doc.text(customer?.phone || '+123-456-7890', 14, 77);
  doc.text(settings?.phone || '+123-456-7890', 196, 77, { align: 'right' });

  // 3. Grid Table with Crisp Black Borders (Matching Image 2)
  const formatQty = (qty) => {
    const n = Number(qty);
    return n < 10 ? `0${n}` : String(n);
  };

  const tableRows = (items || []).map((item) => [
    item.item_name.toUpperCase() + (item.description ? `\n${item.description}` : ''),
    formatQty(item.quantity),
    `₹${Number(item.unit_price).toLocaleString('en-IN')}`,
    `₹${Number(item.line_total).toLocaleString('en-IN')}`
  ]);

  // Add 2 blank spacer rows for authentic receipt look
  tableRows.push(['', '', '', '']);
  tableRows.push(['', '', '', '']);

  doc.autoTable({
    startY: 85,
    head: [['DESCRIPTION', 'QTY', 'PRICE', 'SUBTOTAL']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [250, 247, 238],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      font: 'courier',
      fontSize: 9,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      halign: 'left'
    },
    styles: {
      fontSize: 8.5,
      font: 'courier',
      textColor: [0, 0, 0],
      cellPadding: 3,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      fillColor: [250, 247, 238]
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 32, fontStyle: 'bold' }
    }
  });

  const finalY = doc.lastAutoTable.finalY;

  // Tax Row box
  doc.rect(14, finalY, 182, 7, 'S');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.text(`TAX (${invoice.tax_type === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'})`, 120, finalY + 4.8);
  doc.text(`₹${Number(invoice.tax_total).toLocaleString('en-IN')}`, 180, finalY + 4.8, { align: 'right' });

  // Grand Total Row box
  doc.rect(14, finalY + 7, 182, 9, 'S');
  doc.setFontSize(10.5);
  doc.text('GRAND TOTAL', 120, finalY + 13);
  doc.setTextColor(...crimsonRed);
  doc.text(`₹${Number(invoice.grand_total).toLocaleString('en-IN')}`, 180, finalY + 13, { align: 'right' });

  // 4. Footer: Term & Condition (Left), Contact (Middle), Handwritten Signature (Right)
  const footY = finalY + 25;
  doc.setTextColor(...solidBlack);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.text('TERM & CONDITION', 14, footY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    invoice.terms || settings?.default_payment_terms || 'Payment is requested according to agreed SLA. Thank you for your partnership.',
    14,
    footY + 4,
    { maxWidth: 65 }
  );

  // Middle Contact
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.text('FOR ANY QUESTIONS, PLEASE CONTACT', 85, footY);
  doc.setFont('courier', 'normal');
  doc.text(settings?.email || 'BILLING@APEXDIGITAL.IO', 85, footY + 4);
  doc.text(`OR ${settings?.phone || '+91 80 4912 3456'}`, 85, footY + 8);
  doc.text(custName, 85, footY + 14);
  doc.text('GENERAL MANAGER', 85, footY + 18);

  // Right Signature
  const signatureText = invoice.signature_text || settings?.signature_text || 'INFOTECH';
  const signatureTitle = invoice.signature_title || settings?.signature_title || 'AUTHORIZED SIGNATORY';

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(16);
  doc.setTextColor(...solidBlack);
  doc.text(signatureText, 170, footY + 7, { align: 'center' });
  doc.setLineWidth(0.4);
  doc.line(145, footY + 9, 196, footY + 9);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.text(signatureTitle.toUpperCase(), 170, footY + 13, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}
