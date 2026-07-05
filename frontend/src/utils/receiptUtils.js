const PAYMENT_METHOD_LABELS = {
  CASH: 'Cash', MOI: 'MOI', DEBIT: 'Debit Card', MISC: 'Miscellaneous',
};

export function methodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || 'N/A';
}

/**
 * Opens a thermal-receipt-formatted popup and auto-triggers the browser print dialog.
 * Works with any receipt printer configured as a system printer (80mm paper).
 */
export function printReceipt(sale) {
  const label = methodLabel(sale.method);
  const isRefund = sale.transactionType === 'RF' || sale.paymentStatus === 'REFUNDED';
  const total = sale.grandTotal ?? sale.amount;
  const dateStr = sale.createdAt
    ? new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  const productLine = sale.product
    ? `${sale.product.code} — ${sale.product.name}`
    : sale.items?.[0]
    ? `${sale.items[0].productName}`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Receipt ${sale.invoiceNo}</title>
<style>
  @page { size: 80mm auto; margin: 8mm 4mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; width: 72mm; margin: 0 auto; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 18px; font-weight: bold; }
  .divider { border-top: 1px dashed #999; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; }
  .badge { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-size: 10px; letter-spacing: 0.1em; margin: 4px 0; }
</style></head>
<body>
<div class="center bold" style="font-size:15px;margin-bottom:4px">POS SYSTEM</div>
<div class="center" style="font-size:10px;margin-bottom:6px">Point of Sale Terminal</div>
<div class="divider"></div>
<div class="center"><span class="badge">${isRefund ? 'REFUND' : 'SALE'}</span></div>
<div class="center" style="margin:6px 0 2px"><span class="big">$${total}</span></div>
<div class="center" style="font-size:10px;color:#555">${isRefund ? 'TOTAL REFUNDED' : 'TOTAL PAID'}</div>
<div class="divider"></div>
<div class="row"><span>Invoice</span><span class="bold">${sale.invoiceNo}</span></div>
<div class="row"><span>Date</span><span>${dateStr}</span></div>
<div class="divider"></div>
${productLine ? `<div class="row"><span>Product</span><span class="bold">${productLine}</span></div>` : ''}
<div class="row"><span>Payment</span><span>${label}${sale.card ? ` (${sale.card.cardType}) ${sale.card.brand} ••` + sale.card.last4 : ''}</span></div>
${sale.buyer?.name ? `<div class="row"><span>Buyer</span><span>${sale.buyer.name}</span></div>` : ''}
<div class="divider"></div>
<div class="center" style="font-size:10px;margin-top:4px">Thank you for your purchase!</div>
<div class="center" style="font-size:10px">Keep this receipt for your records.</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=400,height=600,toolbar=no,scrollbars=no');
  if (!win) { alert('Allow pop-ups to print receipts.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

/**
 * Generates and auto-downloads a clean A4 PDF receipt using jsPDF.
 * Lazy-loaded so it doesn't bloat the initial bundle.
 */
export async function downloadPDF(sale) {
  const { default: jsPDF } = await import('jspdf');
  const label = methodLabel(sale.method);
  const isRefund = sale.transactionType === 'RF' || sale.paymentStatus === 'REFUNDED';
  const total = sale.grandTotal ?? sale.amount;
  const dateStr = sale.createdAt
    ? new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  const productLine = sale.product
    ? `${sale.product.code} — ${sale.product.name}`
    : sale.items?.[0]
    ? sale.items[0].productName
    : '';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const L = 18;
  const R = W - 18;
  let y = 22;

  const txt = (text, x, yPos, opts = {}) => {
    doc.setFontSize(opts.size || 11);
    doc.setFont('helvetica', opts.style || 'normal');
    doc.setTextColor(...(opts.color || [43, 29, 26]));
    doc.text(String(text), x, yPos, { align: opts.align });
  };

  const dashedLine = (yPos) => {
    doc.setLineDashPattern([1.5, 2], 0);
    doc.setDrawColor(210, 195, 188);
    doc.line(L, yPos, R, yPos);
    doc.setLineDashPattern([], 0);
  };

  const solidLine = (yPos, light = false) => {
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(...(light ? [235, 225, 220] : [200, 185, 180]));
    doc.line(L, yPos, R, yPos);
  };

  // Store name
  txt('POS System', L, y, { size: 18, style: 'bold', color: [43, 29, 26] });
  txt(isRefund ? 'REFUND' : 'SALE', R, y, {
    size: 9, style: 'bold', align: 'right',
    color: isRefund ? [183, 28, 28] : [46, 125, 79],
  });
  y += 6;
  txt('Point of Sale Receipt', L, y, { size: 9, color: [160, 148, 144] });
  y += 5;
  solidLine(y);
  y += 9;

  // Invoice & date
  txt('INVOICE', L, y, { size: 8, style: 'bold', color: [160, 148, 144] });
  txt(sale.invoiceNo, R, y, { size: 9, style: 'bold', align: 'right' });
  y += 6;
  txt('DATE', L, y, { size: 8, style: 'bold', color: [160, 148, 144] });
  txt(dateStr, R, y, { size: 9, align: 'right', color: [107, 91, 87] });
  y += 8;
  dashedLine(y);
  y += 10;

  // Total
  txt(isRefund ? 'TOTAL REFUNDED' : 'TOTAL PAID', L, y, { size: 8, style: 'bold', color: [160, 148, 144] });
  txt(`$${total}`, R, y + 4, { size: 22, style: 'bold', align: 'right', color: [43, 29, 26] });
  y += 18;
  dashedLine(y);
  y += 10;

  const ROW_GAP = 12;
  const detailRow = (lbl, value) => {
    txt(lbl.toUpperCase(), L, y, { size: 8, style: 'bold', color: [160, 148, 144] });
    txt(value, R, y, { size: 10, align: 'right', color: [43, 29, 26] });
    y += ROW_GAP;
    solidLine(y - 3, true);
  };

  if (productLine)     detailRow('Product', productLine);
  detailRow('Payment Method', `${label}${sale.card ? `  (${sale.card.cardType}) ${sale.card.brand}  ····  ${sale.card.last4}` : ''}`);
  if (sale.buyer?.name)  detailRow('Buyer', sale.buyer.name);

  y += 4;
  solidLine(y);
  y += 10;

  txt('Thank you for your purchase!', W / 2, y, { size: 10, style: 'italic', color: [107, 91, 87], align: 'center' });
  y += 6;
  txt('Keep this receipt for your records.', W / 2, y, { size: 8, color: [160, 148, 144], align: 'center' });

  doc.save(`Receipt-${sale.invoiceNo}.pdf`);
}
