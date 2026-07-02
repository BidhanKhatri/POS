import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackOutlinedIcon     from '@mui/icons-material/ArrowBackOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon         from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon         from '@mui/icons-material/EmailOutlined';
import ShoppingBagOutlinedIcon   from '@mui/icons-material/ShoppingBagOutlined';
import AttachMoneyOutlinedIcon   from '@mui/icons-material/AttachMoneyOutlined';
import EventOutlinedIcon         from '@mui/icons-material/EventOutlined';
import ReceiptLongOutlinedIcon   from '@mui/icons-material/ReceiptLongOutlined';
import MoneyOffOutlinedIcon      from '@mui/icons-material/MoneyOffOutlined';
import ChevronLeftIcon           from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon          from '@mui/icons-material/ChevronRight';
import OpenInNewOutlinedIcon     from '@mui/icons-material/OpenInNewOutlined';
import useAuthStore              from '../store/useAuthStore';

import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHover: '#EFE7E2',
};

const STATUS_META = {
  PAID:     { label: 'Paid',     bg: 'rgba(46,125,79,0.10)',   color: '#2E7D4F' },
  PARTIAL:  { label: 'Partial',  bg: 'rgba(178,106,0,0.10)',   color: '#B26A00' },
  REFUNDED: { label: 'Refunded', bg: 'rgba(183,28,28,0.10)',   color: '#B71C1C' },
  VOIDED:   { label: 'Voided',   bg: 'rgba(160,148,144,0.12)', color: '#6B5B57' },
  PENDING:  { label: 'Pending',  bg: 'rgba(178,106,0,0.10)',   color: '#B26A00' },
};

function fmt$(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }) + ' · ' +
    dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Sk({ h = 16, w = '100%', r = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#EDE5E0 25%,#F5F3F1 50%,#EDE5E0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />;
}

function StatCard({ label, value, sub, icon: Icon, color, skeleton }) {
  return (
    <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 16, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}14`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 1px ${color}22` }}>
          <Icon sx={{ fontSize: 16, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {skeleton
            ? <Sk h={16} w="62%" r={5} />
            : <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
          }
          {sub && <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 500, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
          <p style={{ margin: skeleton ? '6px 0 0' : '4px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 10, background: m.bg, color: m.color, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

const TABS = ['Purchases', 'Refunds'];

export default function CustomerProfilePage() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { token } = useAuthStore();

  const [customer, setCustomer] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState(0);

  const [purchases, setPurchases] = useState([]);
  const [pLoading,  setPLoading]  = useState(false);
  const [pPage,     setPPage]     = useState(1);
  const [pPages,    setPPages]    = useState(1);
  const [pTotal,    setPTotal]    = useState(0);

  const [refunds,  setRefunds]  = useState([]);
  const [rLoading, setRLoading] = useState(false);
  const [rPage,    setRPage]    = useState(1);
  const [rPages,   setRPages]   = useState(1);
  const [rTotal,   setRTotal]   = useState(0);

  const headers = { Authorization: `Bearer ${token}` };

  const loadCustomer = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/customers/${id}`, { headers });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Not found');
      setCustomer(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadPurchases = async (pg = 1) => {
    setPLoading(true);
    try {
      const r = await fetch(`${API}/api/customers/${id}/purchases?page=${pg}&limit=10`, { headers });
      if (r.ok) {
        const d = await r.json();
        setPurchases(d.purchases || []); setPTotal(d.total || 0);
        setPPage(d.page || 1); setPPages(d.pages || 1);
      }
    } catch { /* */ }
    finally { setPLoading(false); }
  };

  const loadRefunds = async (pg = 1) => {
    setRLoading(true);
    try {
      const r = await fetch(`${API}/api/customers/${id}/refunds?page=${pg}&limit=10`, { headers });
      if (r.ok) {
        const d = await r.json();
        setRefunds(d.refunds || []); setRTotal(d.total || 0);
        setRPage(d.page || 1); setRPages(d.pages || 1);
      }
    } catch { /* */ }
    finally { setRLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    loadCustomer();
    loadPurchases(1);
    loadRefunds(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  if (loading) {
    return (
      <div style={{ padding: '16px 16px 40px', background: C.bg, minHeight: '100%', fontFamily: FONT }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

        {/* Back button placeholder */}
        <Sk h={16} w={90} r={5} />
        <div style={{ height: 18 }} />

        {/* Info card skeleton */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Sk h={48} w={48} r={12} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Sk h={17} w="54%" />
              <Sk h={11} w="28%" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk h={12} w="58%" />
            <Sk h={12} w="42%" />
            <Sk h={12} w="38%" />
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sk h={34} w={34} r={9} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Sk h={16} w="68%" />
                <Sk h={9} w="44%" />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sk h={34} w={34} r={9} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Sk h={16} w="55%" />
            <Sk h={9} w="36%" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: FONT }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.error }}>{error}</p>
        <button onClick={() => navigate('/employee/customers')}
          style={{ marginTop: 14, padding: '9px 20px', borderRadius: 9, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
          Back
        </button>
      </div>
    );
  }

  const isReturning = (customer?.totalOrders ?? 0) > 1;

  return (
    <div style={{ padding: '16px 16px 40px', background: C.bg, minHeight: '100%', fontFamily: FONT }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Back nav */}
      <button
        onClick={() => navigate('/employee/customers')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: 13, fontWeight: 600, padding: '4px 0', marginBottom: 16, fontFamily: FONT }}>
        <ArrowBackOutlinedIcon sx={{ fontSize: 16 }} /> Customers
      </button>

      {/* Customer info card */}
      <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 24, height: 24, borderTop: `1.5px solid ${C.accent}`, borderLeft: `1.5px solid ${C.accent}`, borderTopLeftRadius: 12, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: `1.5px solid ${C.accent}`, borderRight: `1.5px solid ${C.accent}`, borderBottomRightRadius: 12, pointerEvents: 'none' }} />
        <div style={{ padding: 16 }}>
          {/* Avatar + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PersonOutlineOutlinedIcon sx={{ fontSize: 24, color: C.accent }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer?.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: 8, background: isReturning ? 'rgba(46,125,79,0.10)' : 'rgba(2,119,189,0.10)', color: isReturning ? C.success : C.info, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', flexShrink: 0 }}>
                  {isReturning ? 'RETURNING' : 'NEW'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>Member since {fmtDate(customer?.createdAt)}</p>
            </div>
          </div>

          {/* Contact details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {customer?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} />
                <span style={{ fontSize: 13, color: C.textSec, fontFamily: 'monospace' }}>{customer.phone}</span>
              </div>
            )}
            {customer?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EmailOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} />
                <span style={{ fontSize: 13, color: C.textSec }}>{customer.email}</span>
              </div>
            )}
          </div>

          {customer?.notes && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: C.textSec, background: C.bg, padding: '8px 10px', borderRadius: 8, borderLeft: `3px solid ${C.accent}`, lineHeight: 1.5 }}>
              {customer.notes}
            </p>
          )}
        </div>
      </div>

      {/* Stat cards — 2×2 + 1 full-width */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <StatCard label="Total Orders" value={customer?.totalOrders ?? 0}    icon={ShoppingBagOutlinedIcon} color={C.info}    />
        <StatCard label="Total Spend"  value={fmt$(customer?.totalSpent)}     icon={AttachMoneyOutlinedIcon} color={C.success} />
        <StatCard label="Net Spend"    value={fmt$(customer?.netSpent)}        sub="After refunds" icon={AttachMoneyOutlinedIcon} color={C.primary} />
        <StatCard label="Last Visit"   value={fmtDate(customer?.lastVisit)}   icon={EventOutlinedIcon}       color={C.warning} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <StatCard label="Total Refunded" value={fmt$(customer?.refundedAmount)} icon={MoneyOffOutlinedIcon} color={C.error} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: C.elevated, borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: tab === i ? C.surface : 'transparent', fontSize: 12, fontWeight: tab === i ? 700 : 500, color: tab === i ? C.primary : C.textDim, cursor: 'pointer', fontFamily: FONT, boxShadow: tab === i ? '0 1px 3px rgba(62,39,35,0.10)' : 'none', transition: 'all 0.14s' }}>
            {t}
            {i === 0 && pTotal > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: C.textDim }}>({pTotal})</span>}
            {i === 1 && rTotal > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: C.textDim }}>({rTotal})</span>}
          </button>
        ))}
      </div>

      {/* ── Purchases tab ── */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Sk h={13} w={90} />
                  <Sk h={10} w={120} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <Sk h={16} w={72} />
                  <Sk h={10} w={52} />
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <Sk h={10} w={60} />
                <Sk h={10} w={50} />
              </div>
            </div>
          ))}

          {!pLoading && purchases.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 36, color: C.textDim, display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No purchases yet</p>
            </div>
          )}

          {!pLoading && purchases.map(s => (
            <div key={s._id}
              onClick={() => navigate(`/employee/transactions/${s._id}`)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = C.surface}
              onTouchStart={e => e.currentTarget.style.background = C.tableHover}
              onTouchEnd={e => e.currentTarget.style.background = C.surface}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{s.invoiceNo}</p>
                    <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: C.textDim }}>{fmtDateTime(s.createdAt)}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(s.grandTotal)}</p>
                  <div style={{ marginTop: 3 }}><Badge status={s.paymentStatus} /></div>
                </div>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: C.textDim }}>{s.items?.length ?? 0} item{s.items?.length !== 1 ? 's' : ''}</span>
                {s.paymentMethod && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: C.elevated, color: C.textSec }}>{s.paymentMethod}</span>
                )}
              </div>
            </div>
          ))}

          {!pLoading && pPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <button onClick={() => loadPurchases(pPage - 1)} disabled={pPage === 1}
                style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: pPage === 1 ? 'default' : 'pointer', opacity: pPage === 1 ? 0.35 : 1 }}>
                <ChevronLeftIcon sx={{ fontSize: 18, color: C.textSec }} />
              </button>
              <span style={{ fontSize: 12, color: C.textDim }}>{pPage} / {pPages} · {pTotal} purchase{pTotal !== 1 ? 's' : ''}</span>
              <button onClick={() => loadPurchases(pPage + 1)} disabled={pPage === pPages}
                style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: pPage === pPages ? 'default' : 'pointer', opacity: pPage === pPages ? 0.35 : 1 }}>
                <ChevronRightIcon sx={{ fontSize: 18, color: C.textSec }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Refunds tab ── */}
      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Sk h={13} w={90} />
                  <Sk h={10} w={110} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <Sk h={16} w={72} />
                  <Sk h={10} w={52} />
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                <Sk h={20} w={64} r={10} />
              </div>
            </div>
          ))}

          {!rLoading && refunds.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <MoneyOffOutlinedIcon sx={{ fontSize: 36, color: C.textDim, display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No refunds on record</p>
            </div>
          )}

          {!rLoading && refunds.map(s => (
            <div key={s._id}
              onClick={() => navigate(`/employee/transactions/${s._id}`)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = C.surface}
              onTouchStart={e => e.currentTarget.style.background = C.tableHover}
              onTouchEnd={e => e.currentTarget.style.background = C.surface}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{s.invoiceNo}</p>
                    <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: C.textDim }}>{fmtDateTime(s.createdAt)}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.error, fontVariantNumeric: 'tabular-nums' }}>−{fmt$(s.refundedAmount)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>of {fmt$(s.grandTotal)}</p>
                </div>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                <Badge status={s.paymentStatus} />
              </div>
            </div>
          ))}

          {!rLoading && rPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <button onClick={() => loadRefunds(rPage - 1)} disabled={rPage === 1}
                style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: rPage === 1 ? 'default' : 'pointer', opacity: rPage === 1 ? 0.35 : 1 }}>
                <ChevronLeftIcon sx={{ fontSize: 18, color: C.textSec }} />
              </button>
              <span style={{ fontSize: 12, color: C.textDim }}>{rPage} / {rPages} · {rTotal} refund{rTotal !== 1 ? 's' : ''}</span>
              <button onClick={() => loadRefunds(rPage + 1)} disabled={rPage === rPages}
                style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: rPage === rPages ? 'default' : 'pointer', opacity: rPage === rPages ? 0.35 : 1 }}>
                <ChevronRightIcon sx={{ fontSize: 18, color: C.textSec }} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
