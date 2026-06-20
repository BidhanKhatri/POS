import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { printReceipt, downloadPDF, methodLabel } from '../utils/receiptUtils';
import CornerCard from '../components/CornerCard/CornerCard';
import useAuthStore from '../store/useAuthStore';

const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
};

const STATUS_META = {
  PAID:     { label: 'Paid',     icon: CheckCircleOutlinedIcon,     color: '#2E7D4F', bg: 'rgba(46,125,79,0.10)' },
  PARTIAL:  { label: 'Partial',  icon: HourglassEmptyOutlinedIcon,  color: '#B26A00', bg: 'rgba(178,106,0,0.10)' },
  REFUNDED: { label: 'Refunded', icon: ReplayOutlinedIcon,          color: '#B71C1C', bg: 'rgba(183,28,28,0.10)' },
  VOIDED:   { label: 'Voided',   icon: CancelOutlinedIcon,          color: '#6B5B57', bg: 'rgba(160,148,144,0.12)' },
  PENDING:  { label: 'Pending',  icon: HourglassEmptyOutlinedIcon,  color: '#B26A00', bg: 'rgba(178,106,0,0.10)' },
};

function DetailRow({ label, children, mono }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', borderBottom: `1px solid #F0E8E3`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri, textAlign: 'right', maxWidth: '62%', fontFamily: mono ? 'monospace' : FONT }}>
        {children}
      </span>
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label, loading, variant = 'outline' }) {
  const filled = variant === 'filled';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '13px 6px', borderRadius: 12,
        border: `1px solid ${filled ? C.primary : C.border}`,
        background: filled ? C.primary : C.surface,
        color: filled ? C.accent : C.primary,
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
        boxShadow: filled ? '0 3px 0 #2A1715' : '0 2px 0 #ddd0c8',
        fontFamily: FONT,
        transition: 'opacity 0.15s',
      }}
    >
      <Icon sx={{ fontSize: 22 }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center', lineHeight: '14px' }}>
        {label}
      </span>
    </button>
  );
}

export default function TransactionDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();

  const [sale, setSale]         = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Email panel
  const [emailOpen, setEmailOpen]     = useState(false);
  const [emailAddr, setEmailAddr]     = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  // PDF state
  const [pdfLoading, setPdfLoading] = useState(false);

  // Void request panel
  const [voidOpen,       setVoidOpen]       = useState(false);
  const [voidReason,     setVoidReason]     = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidResult,     setVoidResult]     = useState(null);

  const isEmployee   = user?.role === 'Employee';
  const isPrivileged = !isEmployee;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/api/sales/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Transaction not found');
        const data = await res.json();
        setSale(data.sale);
        setPayments(data.payments || []);
        // Pre-fill email from primary payment buyer if available
        setEmailAddr(data.payments?.[0]?.buyer?.email || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token]);

  const handleBack = () => navigate(-1);

  // Build a receipt-compatible object from the sale + primary payment
  const buildReceiptSale = () => {
    const p = payments[0];
    return {
      invoiceNo:       sale.invoiceNo,
      createdAt:       sale.createdAt,
      grandTotal:      sale.grandTotal,
      paymentStatus:   sale.paymentStatus,
      items:           sale.items,
      method:          p?.method,
      card:            p?.card || null,
      buyer:           p?.buyer || null,
      transactionType: sale.paymentStatus === 'REFUNDED' ? 'RF' : 'SL',
    };
  };

  const handlePrint = () => {
    if (!sale) return;
    printReceipt(buildReceiptSale());
  };

  const handlePDF = async () => {
    if (!sale) return;
    setPdfLoading(true);
    try { await downloadPDF(buildReceiptSale()); }
    catch { /* non-critical */ }
    finally { setPdfLoading(false); }
  };

  const handleEmailSend = async () => {
    if (!emailAddr.trim() || !sale) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch(`${API}/api/sales/${sale.invoiceNo}/email-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailAddr.trim(), sale: buildReceiptSale() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send email');
      setEmailResult({ ok: true, msg: `Receipt sent to ${emailAddr.trim()}` });
    } catch (e) {
      setEmailResult({ ok: false, msg: e.message });
    } finally {
      setEmailSending(false);
    }
  };

  const handleRefundRequest = () => {
    const basePath = isEmployee ? '/employee' : '/manager';
    // Navigate to the terminal with pre-filled refund context
    navigate(`${basePath}/terminal`, {
      state: { prefillRefund: { invoiceNo: sale.invoiceNo, amount: sale.grandTotal } },
    });
  };

  const canRefund = sale && ['PAID', 'PARTIAL'].includes(sale.paymentStatus);

  // Void is available on PAID COMPLETED sales that haven't been voided.
  // Employees request a void; managers approve it via the overrides panel.
  const canVoid = sale
    && sale.paymentStatus === 'PAID'
    && (sale.status === 'COMPLETED' || !sale.status)
    && !voidResult?.ok;

  const handleVoidRequest = async () => {
    if (!voidReason.trim()) return;
    setVoidSubmitting(true);
    setVoidResult(null);
    try {
      const res  = await fetch(`${API}/api/overrides/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ saleId: sale._id, reason: voidReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit void request');
      setVoidResult({ ok: true, msg: 'Void request submitted. Awaiting manager approval.' });
      setVoidReason('');
    } catch (e) {
      setVoidResult({ ok: false, msg: e.message });
    } finally {
      setVoidSubmitting(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ padding: '20px 16px', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={handleBack} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowBackIcon sx={{ fontSize: 20, color: C.primary }} />
          </button>
          <div style={{ height: 20, width: 160, borderRadius: 6, background: '#EFE7E2' }} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 60, borderRadius: 10, background: '#EFE7E2', marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: FONT }}>
        <ReceiptLongOutlinedIcon sx={{ fontSize: 36, color: C.textDim, display: 'block', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: C.error, margin: 0 }}>{error}</p>
        <button onClick={handleBack} style={{ marginTop: 16, padding: '9px 22px', borderRadius: 9, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
          Go back
        </button>
      </div>
    );
  }

  if (!sale) return null;

  const statusMeta = STATUS_META[sale.paymentStatus] || STATUS_META.PENDING;
  const StatusIcon = statusMeta.icon;
  const primaryPayment = payments[0];
  const dateStr = new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div style={{ fontFamily: FONT, paddingBottom: 80 }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
        background: C.surface, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={handleBack}
          style={{
            width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.surface, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 0 #ddd0c8', flexShrink: 0,
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20, color: C.primary }} />
        </button>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sale.invoiceNo}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.textDim, fontWeight: 500 }}>{dateStr}</p>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        {/* ── Receipt card ── */}
        <CornerCard
          borderColor={C.border}
          style={{
            background: C.surface,
            marginBottom: 16,
          }}
        >
          {/* Card header */}
          <div style={{
            background: '#FAF7F5',
            borderBottom: `1px solid ${C.border}`,
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              <ReceiptLongOutlinedIcon style={{ fontSize: 14, color: C.textDim }} />
              Receipt
            </span>
            {sale.refundedAmount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textSec }}>
                Refunded ${Number(sale.refundedAmount).toFixed(2)}
              </span>
            )}
          </div>

          <div style={{ padding: '4px 16px 12px' }}>
            {/* Items */}
            {sale.items.map((item, i) => (
              <DetailRow key={i} label={item.sku || 'Item'}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <span>{item.productName}</span>
                  <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>
                    {item.quantity} × ${Number(item.unitPrice).toFixed(2)}
                    {item.discount > 0 && ` − $${Number(item.discount).toFixed(2)}`}
                  </span>
                </div>
              </DetailRow>
            ))}

            {/* Divider */}
            <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />

            {/* Totals */}
            {sale.discountTotal > 0 && <DetailRow label="Discount">−${Number(sale.discountTotal).toFixed(2)}</DetailRow>}
            {sale.taxTotal > 0       && <DetailRow label="Tax">${Number(sale.taxTotal).toFixed(2)}</DetailRow>}
            <DetailRow label="Total Paid">
              <span style={{ fontSize: 15, fontWeight: 800, color: C.textPri }}>${Number(sale.grandTotal).toFixed(2)}</span>
            </DetailRow>
            <DetailRow label="Status">
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 10,
                background: statusMeta.bg, color: statusMeta.color,
                border: `1px solid ${statusMeta.color}33`,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {statusMeta.label}
              </span>
            </DetailRow>

            {/* Divider */}
            <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />

            {/* Payment details */}
            {primaryPayment && (
              <>
                <DetailRow label="Payment">
                  {methodLabel(primaryPayment.method)}
                  {primaryPayment.card ? ` •••• ${primaryPayment.card.last4}` : ''}
                </DetailRow>
                {primaryPayment.buyer?.name  && <DetailRow label="Buyer">{primaryPayment.buyer.name}</DetailRow>}
                {primaryPayment.buyer?.phone && <DetailRow label="Phone">{primaryPayment.buyer.phone}</DetailRow>}
                {primaryPayment.buyer?.email && <DetailRow label="Email">{primaryPayment.buyer.email}</DetailRow>}
              </>
            )}

            {/* Employee (managers see who processed it) */}
            {isPrivileged && sale.employeeId?.name && (
              <DetailRow label="Processed by">
                {sale.employeeId.name}
                {sale.employeeId.employeeCode && ` · ${sale.employeeId.employeeCode}`}
              </DetailRow>
            )}

            <DetailRow label="Invoice" mono>{sale.invoiceNo}</DetailRow>
            <DetailRow label="Date"><span style={{ color: C.textSec }}>{dateStr}</span></DetailRow>
          </div>
        </CornerCard>

        {/* ── Receipt actions ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Receipt Actions
            </span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <ActionButton onClick={handlePrint}  icon={PrintOutlinedIcon}    label="Print" />
            <ActionButton
              onClick={() => { setEmailOpen((o) => !o); setEmailResult(null); }}
              icon={EmailOutlinedIcon}
              label="Email"
            />
            <ActionButton
              onClick={handlePDF}
              icon={DownloadOutlinedIcon}
              label={pdfLoading ? 'Wait…' : 'PDF'}
              loading={pdfLoading}
            />
          </div>

          {/* Email panel */}
          {emailOpen && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '12px 14px', marginBottom: 10,
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: C.textPri }}>Send receipt by email</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={emailAddr}
                  onChange={(e) => { setEmailAddr(e.target.value); setEmailResult(null); }}
                  placeholder="customer@example.com"
                  style={{
                    flex: 1, padding: '8px 11px', borderRadius: 8,
                    border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri,
                    background: '#fff', outline: 'none', boxSizing: 'border-box',
                    fontFamily: FONT,
                  }}
                />
                <button
                  onClick={handleEmailSend}
                  disabled={emailSending || !emailAddr.trim()}
                  style={{
                    padding: '8px 14px', borderRadius: 8, flexShrink: 0,
                    background: emailSending || !emailAddr.trim() ? '#EFE7E2' : C.primary,
                    color: emailSending || !emailAddr.trim() ? C.textDim : '#fff',
                    border: 'none', fontSize: 13, fontWeight: 700,
                    cursor: emailSending ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontFamily: FONT,
                  }}
                >
                  <SendOutlinedIcon sx={{ fontSize: 15 }} />
                  {emailSending ? '…' : 'Send'}
                </button>
              </div>
              {emailResult && (
                <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: emailResult.ok ? C.success : C.error }}>
                  {emailResult.msg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Refund entry point ── */}
        {canRefund && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Refund
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <button
              onClick={handleRefundRequest}
              style={{
                width: '100%', padding: '13px', borderRadius: 12,
                border: '1px solid rgba(183,28,28,0.30)',
                background: 'rgba(183,28,28,0.04)',
                color: C.error, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: '0 2px 0 rgba(183,28,28,0.10)',
              }}
            >
              <ReplayOutlinedIcon sx={{ fontSize: 18 }} />
              Create Refund Request
            </button>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: C.textDim, textAlign: 'center', lineHeight: '16px' }}>
              Refunds require manager approval. This will create a pending request.
            </p>
          </div>
        )}

        {/* ── Void entry point ── */}
        {canVoid && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Void Sale
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <button
              onClick={() => { setVoidOpen((o) => !o); setVoidResult(null); }}
              style={{
                width: '100%', padding: '13px', borderRadius: 12,
                border: '1px solid rgba(107,91,87,0.30)',
                background: 'rgba(107,91,87,0.04)',
                color: C.textSec, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: '0 2px 0 rgba(107,91,87,0.08)',
              }}
            >
              <CancelOutlinedIcon sx={{ fontSize: 18 }} />
              Request Void
            </button>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: C.textDim, textAlign: 'center', lineHeight: '16px' }}>
              Voids cancel the sale and restore inventory. Requires manager approval.
            </p>

            {voidOpen && !voidResult?.ok && (
              <div style={{
                marginTop: 10, background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '12px 14px',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: C.textPri }}>Reason for void</p>
                <textarea
                  value={voidReason}
                  onChange={(e) => { setVoidReason(e.target.value); setVoidResult(null); }}
                  placeholder="e.g. Customer changed mind, entry error…"
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 11px', borderRadius: 8,
                    border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri,
                    background: '#fff', outline: 'none', boxSizing: 'border-box',
                    fontFamily: FONT, resize: 'none',
                  }}
                />
                <button
                  onClick={handleVoidRequest}
                  disabled={voidSubmitting || !voidReason.trim()}
                  style={{
                    marginTop: 8, width: '100%', padding: '10px', borderRadius: 8,
                    background: voidSubmitting || !voidReason.trim() ? '#EFE7E2' : C.textSec,
                    color: voidSubmitting || !voidReason.trim() ? C.textDim : '#fff',
                    border: 'none', fontSize: 13, fontWeight: 700,
                    cursor: voidSubmitting ? 'wait' : 'pointer',
                    fontFamily: FONT,
                  }}
                >
                  {voidSubmitting ? 'Submitting…' : 'Submit Void Request'}
                </button>
                {voidResult && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: voidResult.ok ? C.success : C.error }}>
                    {voidResult.msg}
                  </p>
                )}
              </div>
            )}

            {voidResult?.ok && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(46,125,79,0.07)', border: '1px solid rgba(46,125,79,0.25)',
              }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.success }}>
                  {voidResult.msg}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
