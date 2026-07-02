/**
 * ManagerTransactionDetailPage
 * Full manager view of a single transaction. Calls GET /api/sales/:id/manager-detail
 * which returns sale + all payments (charges + refunds) + override history + audit trail.
 *
 * Sections:
 *  1. Header — invoice #, date, status
 *  2. Summary card — employee, shift, totals
 *  3. Line items table — SKU, name, qty, default price vs selling price, discount, total, refunded
 *  4. Payment history — all CHARGE and REFUND tenders
 *  5. Override history — REFUND / VOID / DISCOUNT / PRICE_CHANGE with status + approver
 *  6. Audit trail — chronological action log
 *  7. Action bar — Print, PDF, Email, Refund, Void
 */

import React, { useState, useEffect }      from 'react';
import { useParams, useNavigate }          from 'react-router-dom';
import ArrowBackIcon                        from '@mui/icons-material/ArrowBack';
import PrintOutlinedIcon                    from '@mui/icons-material/PrintOutlined';
import EmailOutlinedIcon                    from '@mui/icons-material/EmailOutlined';
import DownloadOutlinedIcon                 from '@mui/icons-material/DownloadOutlined';
import SendOutlinedIcon                     from '@mui/icons-material/SendOutlined';
import ReplayOutlinedIcon                   from '@mui/icons-material/ReplayOutlined';
import CheckCircleOutlinedIcon              from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon                   from '@mui/icons-material/CancelOutlined';
import HourglassEmptyOutlinedIcon           from '@mui/icons-material/HourglassEmptyOutlined';
import ReceiptLongOutlinedIcon              from '@mui/icons-material/ReceiptLongOutlined';
import HistoryOutlinedIcon                  from '@mui/icons-material/HistoryOutlined';
import ManageAccountsOutlinedIcon           from '@mui/icons-material/ManageAccountsOutlined';
import PaymentOutlinedIcon                  from '@mui/icons-material/PaymentOutlined';
import InfoOutlinedIcon                     from '@mui/icons-material/InfoOutlined';
import { printReceipt, downloadPDF }        from '../utils/receiptUtils';
import useAuthStore                         from '../store/useAuthStore';

import { useMediaQuery } from '@mui/material';
import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9',
};

const STATUS_META = {
  PAID:     { label: 'Paid',     icon: CheckCircleOutlinedIcon,    color: '#2E7D4F', bg: 'rgba(46,125,79,0.10)',   border: 'rgba(46,125,79,0.25)' },
  PARTIAL:  { label: 'Partial',  icon: HourglassEmptyOutlinedIcon, color: '#B26A00', bg: 'rgba(178,106,0,0.10)',   border: 'rgba(178,106,0,0.25)' },
  REFUNDED: { label: 'Refunded', icon: ReplayOutlinedIcon,         color: '#B71C1C', bg: 'rgba(183,28,28,0.10)',   border: 'rgba(183,28,28,0.25)' },
  VOIDED:   { label: 'Voided',   icon: CancelOutlinedIcon,         color: '#6B5B57', bg: 'rgba(160,148,144,0.12)', border: 'rgba(160,148,144,0.25)' },
  PENDING:  { label: 'Pending',  icon: HourglassEmptyOutlinedIcon, color: '#B26A00', bg: 'rgba(178,106,0,0.10)',   border: 'rgba(178,106,0,0.25)' },
};

const OVERRIDE_TYPE_LABEL = {
  REFUND:       'Refund',
  VOID:         'Void',
  DISCOUNT:     'Discount',
  PRICE_CHANGE: 'Price Change',
};

const OVERRIDE_STATUS_META = {
  PENDING:  { color: '#B26A00', bg: 'rgba(178,106,0,0.10)' },
  APPROVED: { color: '#2E7D4F', bg: 'rgba(46,125,79,0.10)' },
  DENIED:   { color: '#B71C1C', bg: 'rgba(183,28,28,0.10)' },
};

function fmt$(n) {
  if (n == null || n === 0) return '—';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '28px 0 12px', paddingBottom: 8, borderBottom: `1.5px solid ${C.border}` }}>
      <Icon sx={{ fontSize: 17, color: C.primary }} />
      <span style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{title}</span>
    </div>
  );
}

function Badge({ label, color, bg, border }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 10, background: bg, color, border: `1px solid ${border || color + '44'}`, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function KV({ label, value, mono, dimValue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid #F0E8E3`, gap: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: dimValue ? C.textDim : C.textPri, textAlign: 'right', fontFamily: mono ? 'monospace' : FONT }}>{value ?? '—'}</span>
    </div>
  );
}

function ActionBtn({ onClick, icon: Icon, label, loading: btnLoading, variant = 'outline', disabled }) {
  const filled = variant === 'filled';
  return (
    <button onClick={onClick} disabled={btnLoading || disabled}
      style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '12px 6px', borderRadius: 10,
        border: `1px solid ${filled ? C.primary : C.border}`,
        background: filled ? C.primary : disabled ? C.elevated : C.surface,
        color: filled ? C.accent : disabled ? C.textDim : C.primary,
        cursor: btnLoading || disabled ? 'default' : 'pointer',
        opacity: btnLoading ? 0.6 : 1, fontFamily: FONT, transition: 'opacity 0.15s',
        boxShadow: filled ? '0 3px 0 #2A1715' : '0 2px 0 #ddd0c8',
      }}>
      <Icon sx={{ fontSize: 20 }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center' }}>{label}</span>
    </button>
  );
}

export default function ManagerTransactionDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const isMobile = !useMediaQuery('(min-width:1024px)');

  const [emailOpen,    setEmailOpen]    = useState(false);
  const [emailAddr,    setEmailAddr]    = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult,  setEmailResult]  = useState(null);
  const [pdfLoading,   setPdfLoading]   = useState(false);

  const [voidOpen,       setVoidOpen]       = useState(false);
  const [voidReason,     setVoidReason]     = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidResult,     setVoidResult]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API}/api/sales/${id}/manager-detail`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Transaction not found'); return r.json(); })
      .then(d => {
        setData(d);
        setEmailAddr(d.payments?.find(p => p.direction !== 'REFUND')?.buyer?.email || '');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <div style={{ padding: isMobile ? '16px 14px' : '20px 28px', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowBackIcon sx={{ fontSize: 20, color: C.primary }} />
          </button>
          <div style={{ height: 18, width: 180, borderRadius: 4, background: C.elevated }} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 52, borderRadius: 10, background: C.elevated, marginBottom: 10 }} />)}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: FONT }}>
        <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: C.textDim, display: 'block', margin: '0 auto 14px' }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.error }}>{error || 'Transaction not found'}</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '9px 22px', borderRadius: 9, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Go back</button>
      </div>
    );
  }

  const { sale, payments, overrides, auditLogs } = data;
  const statusMeta  = STATUS_META[sale.paymentStatus] || STATUS_META.PENDING;
  const StatusIcon  = statusMeta.icon;
  const chargePayments = payments.filter(p => p.direction !== 'REFUND');
  const refundPayments = payments.filter(p => p.direction === 'REFUND');
  const primaryPmt     = chargePayments[0];

  const canRefund = ['PAID', 'PARTIAL'].includes(sale.paymentStatus);
  const canVoid   = sale.paymentStatus === 'PAID' && (sale.status === 'COMPLETED' || !sale.status) && !voidResult?.ok;

  const buildReceiptSale = () => ({
    invoiceNo:       sale.invoiceNo,
    createdAt:       sale.createdAt,
    grandTotal:      sale.grandTotal,
    paymentStatus:   sale.paymentStatus,
    items:           sale.items,
    method:          primaryPmt?.method,
    card:            primaryPmt?.card || null,
    buyer:           primaryPmt?.buyer || null,
    transactionType: sale.paymentStatus === 'REFUNDED' ? 'RF' : 'SL',
  });

  const handlePrint = () => printReceipt(buildReceiptSale());

  const handlePDF = async () => {
    setPdfLoading(true);
    try { await downloadPDF(buildReceiptSale()); } catch { /* non-critical */ }
    finally { setPdfLoading(false); }
  };

  const handleEmailSend = async () => {
    if (!emailAddr.trim()) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch(`${API}/api/sales/${sale.invoiceNo}/email-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailAddr.trim(), sale: buildReceiptSale() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      setEmailResult({ ok: true, msg: `Sent to ${emailAddr.trim()}` });
    } catch (e) {
      setEmailResult({ ok: false, msg: e.message });
    } finally { setEmailSending(false); }
  };

  const handleVoidRequest = async () => {
    if (!voidReason.trim()) return;
    setVoidSubmitting(true);
    setVoidResult(null);
    try {
      const res = await fetch(`${API}/api/overrides/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ saleId: sale._id, reason: voidReason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      setVoidResult({ ok: true, msg: 'Void submitted — awaiting manager approval.' });
      setVoidReason('');
    } catch (e) {
      setVoidResult({ ok: false, msg: e.message });
    } finally { setVoidSubmitting(false); }
  };

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: '100dvh', paddingBottom: 60 }}>

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '12px 14px' : '14px 28px', borderBottom: `1px solid ${C.border}`, background: C.surface, position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 0 #ddd0c8', flexShrink: 0 }}>
          <ArrowBackIcon sx={{ fontSize: 18, color: C.primary }} />
        </button>
        <ReceiptLongOutlinedIcon sx={{ fontSize: 18, color: C.textDim, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, fontFamily: 'monospace' }}>{sale.invoiceNo}</p>
          <p style={{ margin: 0, fontSize: 11, color: C.textDim, fontWeight: 500 }}>{fmtDate(sale.createdAt)}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: '4px 13px', borderRadius: 12,
          background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`,
          display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.05em',
        }}>
          <StatusIcon sx={{ fontSize: 13 }} />{statusMeta.label}
        </span>
      </div>

      <div style={{ padding: isMobile ? '0 14px' : '0 28px', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Summary ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 20 }}>
          {/* Left: transaction info */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.10em' }}>Transaction Info</p>
            <KV label="Invoice" value={sale.invoiceNo} mono />
            <KV label="Date" value={fmtDate(sale.createdAt)} />
            <KV label="Employee" value={sale.employeeId ? `${sale.employeeId.name} · #${sale.employeeId.employeeCode}` : '—'} />
            <KV label="Shift" value={sale.shiftId ? fmtDate(sale.shiftId.startedAt) : 'No shift'} dimValue={!sale.shiftId} />
            <KV label="Sale Status" value={sale.status || 'COMPLETED'} />
          </div>

          {/* Right: financials */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.10em' }}>Financials</p>
            <KV label="Subtotal" value={`$${Number(sale.subtotal || 0).toFixed(2)}`} />
            {(sale.discountTotal > 0) && <KV label="Discount" value={`−$${Number(sale.discountTotal).toFixed(2)}`} />}
            {(sale.taxTotal > 0) && <KV label="Tax" value={`$${Number(sale.taxTotal).toFixed(2)}`} />}
            <KV label="Grand Total" value={<span style={{ fontSize: 15, fontWeight: 800 }}>${Number(sale.grandTotal).toFixed(2)}</span>} />
            {sale.refundedAmount > 0 && <KV label="Refunded" value={<span style={{ color: C.error, fontWeight: 700 }}>${Number(sale.refundedAmount).toFixed(2)}</span>} />}
            <KV label="Net" value={<span style={{ color: C.success, fontWeight: 800 }}>${(sale.grandTotal - (sale.refundedAmount || 0)).toFixed(2)}</span>} />
          </div>
        </div>

        {/* ── Line items ─────────────────────────────────────────────────── */}
        <SectionHeader icon={ReceiptLongOutlinedIcon} title="Line Items" />
        {isMobile ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {sale.items.map((item, idx) => {
              const hasVariance = item.defaultPrice != null && Math.abs(item.defaultPrice - item.unitPrice) > 0.005;
              return (
                <div key={idx} style={{ padding: '12px 14px', borderBottom: idx < sale.items.length - 1 ? `1px solid ${C.border}` : 'none', background: idx % 2 ? '#FDFCFB' : C.surface }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{item.productName}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, fontFamily: 'monospace', color: C.textDim }}>{item.sku}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>${Number(item.total).toFixed(2)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: C.textSec }}>Qty: <strong>{item.quantity}</strong></span>
                    <span style={{ fontSize: 11, color: hasVariance ? C.error : C.textSec }}>
                      ${Number(item.unitPrice).toFixed(2)}{hasVariance && <span style={{ color: C.warning }}> (was ${Number(item.defaultPrice).toFixed(2)})</span>}
                    </span>
                    {item.discount > 0 && <span style={{ fontSize: 11, color: C.error }}>Disc −${Number(item.discount).toFixed(2)}</span>}
                    {item.refundedAmount > 0 && <span style={{ fontSize: 11, color: C.error, fontWeight: 700 }}>Refunded ${Number(item.refundedAmount).toFixed(2)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 110px 110px 90px 110px 110px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
              {['SKU', 'Product', 'Qty', 'Default Price', 'Selling Price', 'Discount', 'Total', 'Refunded'].map((h, i) => (
                <div key={h} style={{ padding: '9px 12px', fontSize: 9, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {sale.items.map((item, idx) => {
              const hasVariance = item.defaultPrice != null && Math.abs(item.defaultPrice - item.unitPrice) > 0.005;
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 110px 110px 90px 110px 110px', borderBottom: idx < sale.items.length - 1 ? `1px solid ${C.border}` : 'none', background: idx % 2 ? '#FDFCFB' : C.surface }}>
                  <div style={{ padding: '11px 12px', fontSize: 11, fontFamily: 'monospace', color: C.textSec }}>{item.sku}</div>
                  <div style={{ padding: '11px 12px', fontSize: 12, fontWeight: 600, color: C.textPri }}>{item.productName}</div>
                  <div style={{ padding: '11px 12px', fontSize: 12, fontWeight: 700, color: C.textSec, textAlign: 'center' }}>{item.quantity}</div>
                  <div style={{ padding: '11px 12px', textAlign: 'right' }}>
                    {hasVariance
                      ? <span style={{ fontSize: 12, fontWeight: 600, color: C.warning }}>${Number(item.defaultPrice).toFixed(2)}</span>
                      : <span style={{ fontSize: 11, color: C.textDim }}>—</span>
                    }
                  </div>
                  <div style={{ padding: '11px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: hasVariance ? C.error : C.textPri }}>${Number(item.unitPrice).toFixed(2)}</span>
                    {hasVariance && (
                      <p style={{ margin: '1px 0 0', fontSize: 9, color: C.warning, fontWeight: 600 }}>
                        {(Math.abs(item.defaultPrice - item.unitPrice) / item.defaultPrice * 100).toFixed(1)}% variance
                      </p>
                    )}
                  </div>
                  <div style={{ padding: '11px 12px', textAlign: 'right', fontSize: 12, color: item.discount > 0 ? C.error : C.textDim }}>
                    {item.discount > 0 ? `−$${Number(item.discount).toFixed(2)}` : '—'}
                  </div>
                  <div style={{ padding: '11px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: C.textPri }}>
                    ${Number(item.total).toFixed(2)}
                  </div>
                  <div style={{ padding: '11px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: item.refundedAmount > 0 ? C.error : C.textDim }}>
                    {item.refundedAmount > 0 ? `$${Number(item.refundedAmount).toFixed(2)}` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Payment history ─────────────────────────────────────────────── */}
        <SectionHeader icon={PaymentOutlinedIcon} title="Payment History" />
        {payments.length === 0
          ? <p style={{ fontSize: 12, color: C.textDim, marginTop: -8 }}>No payment records.</p>
          : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {payments.map((pmt, idx) => {
                const isRefund = pmt.direction === 'REFUND';
                return isMobile ? (
                  <div key={pmt._id} style={{ padding: '12px 14px', borderBottom: idx < payments.length - 1 ? `1px solid ${C.border}` : 'none', background: idx % 2 ? '#FDFCFB' : C.surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge label={isRefund ? '↩ Refund' : '⬆ Charge'} color={isRefund ? C.error : C.success} bg={isRefund ? 'rgba(183,28,28,0.09)' : 'rgba(46,125,79,0.09)'} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>{pmt.method}{pmt.card ? ` ···· ${pmt.card.last4}` : ''}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: isRefund ? C.error : C.success }}>{isRefund ? '−' : '+'}${Number(pmt.amount).toFixed(2)}</span>
                    </div>
                    {(pmt.buyer?.name || pmt.buyer?.phone || pmt.buyer?.email) && (
                      <div style={{ fontSize: 11, color: C.textDim, lineHeight: '17px' }}>
                        {pmt.buyer.name && <span>{pmt.buyer.name}</span>}
                        {pmt.buyer.phone && <span style={{ marginLeft: 8 }}>{pmt.buyer.phone}</span>}
                        {pmt.buyer.email && <span style={{ marginLeft: 8 }}>{pmt.buyer.email}</span>}
                      </div>
                    )}
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: C.textDim }}>{fmtDate(pmt.createdAt)}</p>
                  </div>
                ) : (
                  <div key={pmt._id} style={{
                    display: 'grid', gridTemplateColumns: '100px 130px 1fr 1fr 120px',
                    padding: '12px 16px', borderBottom: idx < payments.length - 1 ? `1px solid ${C.border}` : 'none',
                    background: idx % 2 ? '#FDFCFB' : C.surface, alignItems: 'center',
                  }}>
                    <div>
                      <Badge
                        label={isRefund ? '↩ Refund' : '⬆ Charge'}
                        color={isRefund ? C.error : C.success}
                        bg={isRefund ? 'rgba(183,28,28,0.09)' : 'rgba(46,125,79,0.09)'}
                      />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>
                        {pmt.method}{pmt.card ? ` ···· ${pmt.card.last4}` : ''}
                      </p>
                      {pmt.card?.brand && <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>{pmt.card.brand}</p>}
                    </div>
                    <div>
                      {pmt.buyer?.name && <p style={{ margin: 0, fontSize: 12, color: C.textSec, fontWeight: 600 }}>{pmt.buyer.name}</p>}
                      {pmt.buyer?.phone && <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>{pmt.buyer.phone}</p>}
                    </div>
                    <div>
                      {pmt.buyer?.email && <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{pmt.buyer.email}</p>}
                      <p style={{ margin: 0, fontSize: 10, color: C.textDim, marginTop: 1 }}>{fmtDate(pmt.createdAt)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: isRefund ? C.error : C.success }}>
                        {isRefund ? '−' : '+'}${Number(pmt.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }

        {/* ── Override history ────────────────────────────────────────────── */}
        <SectionHeader icon={ManageAccountsOutlinedIcon} title="Override History" />
        {overrides.length === 0
          ? <p style={{ fontSize: 12, color: C.textDim, marginTop: -8 }}>No overrides on this transaction.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overrides.map(ov => {
                const sm = OVERRIDE_STATUS_META[ov.status] || OVERRIDE_STATUS_META.PENDING;
                return (
                  <div key={ov._id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge label={OVERRIDE_TYPE_LABEL[ov.actionType] || ov.actionType} color={C.primary} bg={C.elevated} />
                        <Badge label={ov.status} color={sm.color} bg={sm.bg} />
                      </div>
                      <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(ov.createdAt)}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '4px 24px' }}>
                      {ov.reason && <KV label="Reason" value={ov.reason} />}
                      {ov.employeeId && <KV label="Requested by" value={`${ov.employeeId.name} #${ov.employeeId.employeeCode}`} />}
                      {ov.approvedBy && <KV label="Approved by" value={`${ov.approvedBy.name} #${ov.approvedBy.employeeCode}`} />}
                      {ov.resolvedAt && <KV label="Resolved" value={fmtDate(ov.resolvedAt)} />}
                      {ov.amount != null && <KV label="Amount" value={`$${Number(ov.amount).toFixed(2)}`} />}
                      {ov.discountType && <KV label="Discount" value={`${ov.discountValue}${ov.discountType === 'PERCENTAGE' ? '%' : ' flat'} = $${Number(ov.discountAmount || 0).toFixed(2)}`} />}
                      {ov.defaultPrice != null && <KV label="Default price" value={`$${Number(ov.defaultPrice).toFixed(2)}`} />}
                      {ov.sellingPrice != null && <KV label="Selling price" value={`$${Number(ov.sellingPrice).toFixed(2)}`} />}
                      {ov.variancePercent != null && <KV label="Variance" value={`${Number(ov.variancePercent).toFixed(1)}% (limit ${ov.varianceLimit}%)`} />}
                      {ov.productName && <KV label="Product" value={`${ov.productName} · ${ov.sku}`} />}
                      {ov.buyer?.name && <KV label="Buyer" value={ov.buyer.name} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }

        {/* ── Audit trail ─────────────────────────────────────────────────── */}
        <SectionHeader icon={HistoryOutlinedIcon} title="Audit Trail" />
        {auditLogs.length === 0
          ? <p style={{ fontSize: 12, color: C.textDim, marginTop: -8 }}>No audit entries.</p>
          : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {auditLogs.map((log, idx) => (
                isMobile ? (
                  <div key={log._id} style={{ padding: '10px 14px', borderBottom: idx < auditLogs.length - 1 ? `1px solid ${C.border}` : 'none', background: idx % 2 ? '#FDFCFB' : C.surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.textPri, fontFamily: 'monospace' }}>{log.action}</span>
                      {log.role && <span style={{ fontSize: 9, color: C.textDim, background: C.elevated, padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>{log.role}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 10, color: C.textDim }}>{fmtDate(log.timestamp)}{log.performedBy ? ` · ${log.performedBy.name} #${log.performedBy.employeeCode}` : ''}</p>
                  </div>
                ) : (
                  <div key={log._id} style={{
                    display: 'grid', gridTemplateColumns: '190px 160px 1fr',
                    padding: '11px 16px', borderBottom: idx < auditLogs.length - 1 ? `1px solid ${C.border}` : 'none',
                    background: idx % 2 ? '#FDFCFB' : C.surface, alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.textPri, fontFamily: 'monospace' }}>{log.action}</span>
                    <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(log.timestamp)}</span>
                    <span style={{ fontSize: 11, color: C.textSec }}>
                      {log.performedBy ? `${log.performedBy.name} · #${log.performedBy.employeeCode}` : '—'}
                      {log.role && <span style={{ marginLeft: 6, fontSize: 9, color: C.textDim, background: C.elevated, padding: '1px 5px', borderRadius: 4 }}>{log.role}</span>}
                    </span>
                  </div>
                )
              ))}
            </div>
          )
        }

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Receipt Actions</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ActionBtn onClick={handlePrint} icon={PrintOutlinedIcon} label="Print" />
            <ActionBtn onClick={() => { setEmailOpen(o => !o); setEmailResult(null); }} icon={EmailOutlinedIcon} label="Email" />
            <ActionBtn onClick={handlePDF} icon={DownloadOutlinedIcon} label={pdfLoading ? 'Wait…' : 'PDF'} loading={pdfLoading} />
            <ActionBtn
              onClick={() => navigate(`/manager/terminal`, { state: { prefillRefund: { invoiceNo: sale.invoiceNo, amount: sale.grandTotal } } })}
              icon={ReplayOutlinedIcon} label="Refund"
              disabled={!canRefund}
            />
            <ActionBtn
              onClick={() => { setVoidOpen(o => !o); setVoidResult(null); }}
              icon={CancelOutlinedIcon} label="Void"
              disabled={!canVoid}
            />
          </div>

          {/* Email panel */}
          {emailOpen && (
            <div style={{ marginTop: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: C.textPri }}>Send receipt by email</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="email" value={emailAddr} onChange={e => { setEmailAddr(e.target.value); setEmailResult(null); }}
                  placeholder="customer@example.com"
                  style={{ flex: 1, padding: '8px 11px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, background: '#fff', outline: 'none', fontFamily: FONT }} />
                <button onClick={handleEmailSend} disabled={emailSending || !emailAddr.trim()}
                  style={{ padding: '8px 14px', borderRadius: 8, background: emailSending || !emailAddr.trim() ? C.elevated : C.primary, color: emailSending || !emailAddr.trim() ? C.textDim : '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT }}>
                  <SendOutlinedIcon sx={{ fontSize: 15 }} />{emailSending ? '…' : 'Send'}
                </button>
              </div>
              {emailResult && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: emailResult.ok ? C.success : C.error }}>{emailResult.msg}</p>}
            </div>
          )}

          {/* Void panel */}
          {voidOpen && canVoid && !voidResult?.ok && (
            <div style={{ marginTop: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: C.warning }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>Request void</p>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: C.textDim, lineHeight: '16px' }}>Voiding cancels the sale and restores inventory. Requires manager approval in the Overrides queue.</p>
              <textarea value={voidReason} onChange={e => { setVoidReason(e.target.value); setVoidResult(null); }}
                placeholder="Reason for void (e.g. customer changed mind, data entry error)…"
                rows={3}
                style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, background: '#fff', outline: 'none', fontFamily: FONT, resize: 'none', boxSizing: 'border-box' }} />
              <button onClick={handleVoidRequest} disabled={voidSubmitting || !voidReason.trim()}
                style={{ marginTop: 8, width: '100%', padding: '10px', borderRadius: 8, background: voidSubmitting || !voidReason.trim() ? C.elevated : C.textSec, color: voidSubmitting || !voidReason.trim() ? C.textDim : '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: voidSubmitting ? 'wait' : 'pointer', fontFamily: FONT }}>
                {voidSubmitting ? 'Submitting…' : 'Submit Void Request'}
              </button>
              {voidResult && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: voidResult.ok ? C.success : C.error }}>{voidResult.msg}</p>}
            </div>
          )}
          {voidResult?.ok && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(46,125,79,0.07)', border: '1px solid rgba(46,125,79,0.25)' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.success }}>{voidResult.msg}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
