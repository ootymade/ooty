import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BUSINESS } from '../db/businessInfo.js'

function formatMoney(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Builds the invoice/proforma PDF and returns the jsPDF document (caller
// decides whether to download it or turn it into a Blob for sharing).
export function buildInvoicePdf({ invoice, items }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  let y = margin

  const isGst = invoice.kind === 'gst'
  const title = isGst ? 'TAX INVOICE' : 'PROFORMA INVOICE'

  // --- Header: business details ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(BUSINESS.name, margin, y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const addressLines = doc.splitTextToSize(BUSINESS.address, pageWidth - margin * 2 - 160)
  doc.text(addressLines, margin, y)
  y += addressLines.length * 11
  if (isGst) {
    doc.text(`GSTIN: ${BUSINESS.gstin}`, margin, y)
    y += 12
  }
  doc.text(`Phone: ${BUSINESS.phones.join(', ')}`, margin, y)
  y += 20

  // --- Title + invoice meta (top-right) ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, pageWidth - margin, margin, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const metaY = margin + 18
  if (isGst) {
    doc.text(`Invoice #: INV-${invoice.invoiceNumber}`, pageWidth - margin, metaY, { align: 'right' })
  } else {
    doc.text('Quote (no fixed invoice number)', pageWidth - margin, metaY, { align: 'right' })
  }
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, pageWidth - margin, metaY + 14, { align: 'right' })

  y = Math.max(y, metaY + 40)
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 20

  // --- Customer details ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Bill To', margin, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(invoice.customerName || '-', margin, y)
  y += 12
  if (invoice.customerAddress) {
    const custAddrLines = doc.splitTextToSize(invoice.customerAddress, 260)
    doc.text(custAddrLines, margin, y)
    y += custAddrLines.length * 11
  }
  if (invoice.customerPhone) {
    doc.text(`Phone: ${invoice.customerPhone}`, margin, y)
    y += 12
  }
  doc.text(`State: ${invoice.customerState || '-'}`, margin, y)
  y += 12
  if (invoice.customerGstin) {
    doc.text(`GSTIN: ${invoice.customerGstin}`, margin, y)
    y += 12
  }
  y += 12

  // --- Line items table ---
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Item', 'HSN', 'Qty', 'Unit Price', 'Amount']],
    body: items.map((it, idx) => [
      idx + 1,
      it.name,
      it.hsnCode,
      it.quantity,
      formatMoney(it.unitPrice),
      formatMoney(it.lineTotal),
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 24 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
  })

  y = doc.lastAutoTable.finalY + 16

  // --- Totals ---
  const totalsX = pageWidth - margin - 180
  const row = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(label, totalsX, y)
    doc.text(value, pageWidth - margin, y, { align: 'right' })
    y += 14
  }
  doc.setFontSize(9)
  row('Subtotal', formatMoney(invoice.subtotal))
  if (invoice.cgst > 0) row('CGST', formatMoney(invoice.cgst))
  if (invoice.sgst > 0) row('SGST', formatMoney(invoice.sgst))
  if (invoice.igst > 0) row('IGST', formatMoney(invoice.igst))
  doc.setDrawColor(200)
  doc.line(totalsX, y - 4, pageWidth - margin, y - 4)
  row('Total', formatMoney(invoice.total), true)
  y += 10

  // --- Shipment tracking ---
  if (invoice.trackingNumber) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(
      `Track my order: ${invoice.courierName || 'Courier'} — ${invoice.trackingNumber}`,
      margin,
      y,
    )
    y += 16
  }

  // --- Footer ---
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    isGst
      ? 'This is a computer-generated tax invoice.'
      : 'This is a proforma invoice / quote — not a demand for payment. Prices may change until confirmed.',
    margin,
    doc.internal.pageSize.getHeight() - 30,
  )

  return doc
}

export function downloadInvoicePdf({ invoice, items }) {
  const doc = buildInvoicePdf({ invoice, items })
  const filename = invoice.kind === 'gst' ? `Invoice-INV-${invoice.invoiceNumber}.pdf` : `Proforma-${invoice.id.slice(0, 8)}.pdf`
  doc.save(filename)
}

export async function invoicePdfBlob({ invoice, items }) {
  const doc = buildInvoicePdf({ invoice, items })
  return doc.output('blob')
}

export function invoiceFilename(invoice) {
  return invoice.kind === 'gst' ? `Invoice-INV-${invoice.invoiceNumber}.pdf` : `Proforma-${invoice.id.slice(0, 8)}.pdf`
}
