import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackOutlinedIcon      from '@mui/icons-material/ArrowBackOutlined';
import EditOutlinedIcon           from '@mui/icons-material/EditOutlined';
import PersonOutlineOutlinedIcon  from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon          from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon          from '@mui/icons-material/EmailOutlined';
import ReceiptLongOutlinedIcon    from '@mui/icons-material/ReceiptLongOutlined';
import MoneyOffOutlinedIcon       from '@mui/icons-material/MoneyOffOutlined';
import AttachMoneyOutlinedIcon    from '@mui/icons-material/AttachMoneyOutlined';
import ShoppingBagOutlinedIcon    from '@mui/icons-material/ShoppingBagOutlined';
import EventOutlinedIcon          from '@mui/icons-material/EventOutlined';
import CloseOutlinedIcon          from '@mui/icons-material/CloseOutlined';
import ChevronLeftIcon            from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon           from '@mui/icons-material/ChevronRight';
import OpenInNewOutlinedIcon      from '@mui/icons-material/OpenInNewOutlined';
import useAuthStore               from '../store/useAuthStore';
import CornerCard                 from '../components/CornerCard/CornerCard';

const API  = import.meta.env.VITE_API_BASE_URL ?? '';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9', tableHover: '#EFE7E2',
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

function StatCard({ label, value, sub, icon: Icon, color, skeleton }) {
  return (
    <CornerCard accentColor={color} borderColor={C.border} borderRadius={12} cornerSize={26} cornerHeight={26}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 18, color }} />
        </div>
        <div>
          {skeleton
            ? <div style={{ height: 20, width: 70, borderRadius: 4, background: C.elevated, marginBottom: 4 }} />
            : <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, lineHeight: '24px' }}>{value}</p>}
          {sub && <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim, fontWeight: 600 }}>{sub}</p>}
          <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        </div>
      </div>
    </CornerCard>
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

export default function ManagerCustomerDetailPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { token } = useAuthStore();

  const [customer, setCustomer] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [tab,      setTab]      = useState(0);

  // Purchases
  const [purchases,  setPurchases]  = useState([]);
  const [pTotal,     setPTotal]     = useState(0);
  const [pPage,      setPPage]      = useState(1);
  const [pPages,     setPPages]     = useState(1);
  const [pLoading,   setPLoading]   = useState(false);

  // Refunds
  const [refunds,    setRefunds]    = useState([]);
  const [rTotal,     setRTotal]     = useState(0);
  const [rPage,      setRPage]      = useState(1);
  const [rPages,     setRPages]     = useState(1);
  const [rLoading,   setRLoading]   = useState(false);

  // Edit modal
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ name: '', phone: '', email: '', notes: '' });
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const loadCustomer = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/customers/${id}`, { headers });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Error ${r.status}`);
      const d = await r.json();
      setCustomer(d);
      setForm({ name: d.name || '', phone: d.phone || '', email: d.email || '', notes: d.notes || '' });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadPurchases = async (pg = 1) => {
    setPLoading(true);
    try {
      const r = await fetch(`${API}/api/customers/${id}/purchases?page=${pg}&limit=20`, { headers });
      if (r.ok) {
        const d = await r.json();
        setPurchases(d.purchases || []);
        setPTotal(d.total || 0);
        setPPage(d.page || 1);
        setPPages(d.pages || 1);
      }
    } catch { /* */ }
    finally { setPLoading(false); }
  };

  const loadRefunds = async (pg = 1) => {
    setRLoading(true);
    try {
      const r = await fetch(`${API}/api/customers/${id}/refunds?page=${pg}&limit=20`, { headers });
      if (r.ok) {
        const d = await r.json();
        setRefunds(d.refunds || []);
        setRTotal(d.total || 0);
        setRPage(d.page || 1);
        setRPages(d.pages || 1);
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

  const saveEdit = async () => {
    if (!form.name.trim()) { setFormErr('Name is required.'); return; }
    setSaving(true); setFormErr('');
    try {
      const r = await fetch(`${API}/api/customers/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Save failed');
      setCustomer(prev => ({ ...prev, ...d }));
      setModal(false);
    } catch (e) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div style={{ padding: '28px 32px', fontFamily: FONT }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <div style={{ height: 36, width: 80, borderRadius: 8, background: C.elevated }} />
          <div style={{ height: 36, flex: 1, maxWidth: 200, borderRadius: 8, background: C.elevated }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 22 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 90, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center', fontFamily: FONT }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.error }}>{error}</p>
        <button onClick={() => navigate('/manager/customers')}
          style={{ marginTop: 14, padding: '8px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px 56px', background: C.bg, minHeight: '100dvh', fontFamily: FONT }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/manager/customers')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
            <ArrowBackOutlinedIcon sx={{ fontSize: 15 }} /> Customers
          </button>
          <span style={{ color: C.textDim, fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>{customer?.name}</span>
        </div>
        <button onClick={() => { setFormErr(''); setModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: FONT }}>
          <EditOutlinedIcon sx={{ fontSize: 15 }} /> Edit
        </button>
      </div>

      {/* Customer info card */}
      <CornerCard accentColor={C.accent} borderColor={C.border} borderRadius={14} cornerSize={36} cornerHeight={36} style={{ marginBottom: 20 }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PersonOutlineOutlinedIcon sx={{ fontSize: 26, color: C.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri }}>{customer?.name}</h2>
              <span style={{ padding: '2px 10px', borderRadius: 10, background: customer?.totalOrders > 1 ? 'rgba(46,125,79,0.10)' : 'rgba(2,119,189,0.10)', color: customer?.totalOrders > 1 ? C.success : C.info, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>
                {customer?.totalOrders > 1 ? 'RETURNING' : 'NEW'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {customer?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <PhoneOutlinedIcon sx={{ fontSize: 13, color: C.textDim }} />
                  <span style={{ fontSize: 13, color: C.textSec, fontFamily: 'monospace' }}>{customer.phone}</span>
                </div>
              )}
              {customer?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <EmailOutlinedIcon sx={{ fontSize: 13, color: C.textDim }} />
                  <span style={{ fontSize: 13, color: C.textSec }}>{customer.email}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <EventOutlinedIcon sx={{ fontSize: 13, color: C.textDim }} />
                <span style={{ fontSize: 12, color: C.textDim }}>Registered {fmtDate(customer?.createdAt)}</span>
              </div>
            </div>
            {customer?.notes && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: C.textSec, background: C.bg, padding: '8px 12px', borderRadius: 8, borderLeft: `3px solid ${C.accent}` }}>
                {customer.notes}
              </p>
            )}
          </div>
        </div>
      </CornerCard>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Orders"  value={customer?.totalOrders ?? 0}         icon={ShoppingBagOutlinedIcon} color={C.info}    />
        <StatCard label="Total Spend"   value={fmt$(customer?.totalSpent)}          icon={AttachMoneyOutlinedIcon} color={C.success} />
        <StatCard label="Net Spend"     value={fmt$(customer?.netSpent)}            sub="After refunds"            icon={AttachMoneyOutlinedIcon} color={C.primary} />
        <StatCard label="Last Visit"    value={fmtDate(customer?.lastVisit)}        icon={EventOutlinedIcon}       color={C.warning} />
        <StatCard label="Refunded"      value={fmt$(customer?.refundedAmount)}      icon={MoneyOffOutlinedIcon}    color={C.error}   />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: C.elevated, borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding: '7px 20px', borderRadius: 7, border: 'none', background: tab === i ? C.surface : 'transparent', fontSize: 12, fontWeight: tab === i ? 700 : 500, color: tab === i ? C.primary : C.textDim, cursor: 'pointer', fontFamily: FONT, boxShadow: tab === i ? '0 1px 3px rgba(62,39,35,0.10)' : 'none' }}>
            {t}
            {i === 0 && pTotal > 0 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: tab === 0 ? C.primary : C.textDim }}>({pTotal})</span>}
            {i === 1 && rTotal > 0 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: tab === 1 ? C.primary : C.textDim }}>({rTotal})</span>}
          </button>
        ))}
      </div>

      {/* Purchases tab */}
      {tab === 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 160px 70px 100px 80px 90px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
            {[['Invoice','left'],['Date','left'],['Items','center'],['Amount','right'],['Method','left'],['Status','left']].map(([h, a]) => (
              <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: a }}>{h}</div>
            ))}
          </div>

          {pLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 160px 70px 100px 80px 90px', borderBottom: `1px solid ${C.border}` }}>
              {[120, 130, 30, 70, 50, 60].map((w, j) => (
                <div key={j} style={{ padding: 14 }}>
                  <div style={{ height: 11, width: w, borderRadius: 4, background: C.elevated }} />
                </div>
              ))}
            </div>
          ))}

          {!pLoading && purchases.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 38, color: C.textDim, display: 'block', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No purchases yet</p>
            </div>
          )}

          {!pLoading && purchases.map((s, i) => (
            <div key={s._id}
              onClick={() => navigate(`/manager/transactions/${s._id}`)}
              style={{ display: 'grid', gridTemplateColumns: '140px 160px 70px 100px 80px 90px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{s.invoiceNo}</span>
                <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.textSec }}>{fmtDateTime(s.createdAt)}</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textSec }}>{s.items?.length ?? 0}</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(s.grandTotal)}</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                {s.paymentMethod
                  ? <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, padding: '2px 8px', borderRadius: 5, background: C.elevated }}>{s.paymentMethod}</span>
                  : <span style={{ color: C.textDim }}>—</span>}
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                <Badge status={s.paymentStatus} />
              </div>
            </div>
          ))}

          {!pLoading && pPages > 1 && (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, background: C.tableHdr, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <button onClick={() => loadPurchases(pPage - 1)} disabled={pPage === 1} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: pPage === 1 ? 'default' : 'pointer', opacity: pPage === 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeftIcon sx={{ fontSize: 16, color: C.textSec }} />
              </button>
              <span style={{ fontSize: 12, color: C.textSec, padding: '0 8px' }}>Page {pPage} of {pPages} · {pTotal} purchase{pTotal !== 1 ? 's' : ''}</span>
              <button onClick={() => loadPurchases(pPage + 1)} disabled={pPage === pPages} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: pPage === pPages ? 'default' : 'pointer', opacity: pPage === pPages ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRightIcon sx={{ fontSize: 16, color: C.textSec }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refunds tab */}
      {tab === 1 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 160px 120px 120px 90px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
            {[['Invoice','left'],['Date','left'],['Sale Total','right'],['Refunded','right'],['Status','left']].map(([h, a]) => (
              <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: a }}>{h}</div>
            ))}
          </div>

          {rLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 160px 120px 120px 90px', borderBottom: `1px solid ${C.border}` }}>
              {[120, 130, 80, 80, 60].map((w, j) => (
                <div key={j} style={{ padding: 14 }}>
                  <div style={{ height: 11, width: w, borderRadius: 4, background: C.elevated }} />
                </div>
              ))}
            </div>
          ))}

          {!rLoading && refunds.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <MoneyOffOutlinedIcon sx={{ fontSize: 38, color: C.textDim, display: 'block', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No refunds on record</p>
            </div>
          )}

          {!rLoading && refunds.map(s => (
            <div key={s._id}
              onClick={() => navigate(`/manager/transactions/${s._id}`)}
              style={{ display: 'grid', gridTemplateColumns: '140px 160px 120px 120px 90px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{s.invoiceNo}</span>
                <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.textSec }}>{fmtDateTime(s.createdAt)}</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(s.grandTotal)}</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.error, fontVariantNumeric: 'tabular-nums' }}>−{fmt$(s.refundedAmount)}</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                <Badge status={s.paymentStatus} />
              </div>
            </div>
          ))}

          {!rLoading && rPages > 1 && (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, background: C.tableHdr, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <button onClick={() => loadRefunds(rPage - 1)} disabled={rPage === 1} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: rPage === 1 ? 'default' : 'pointer', opacity: rPage === 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeftIcon sx={{ fontSize: 16, color: C.textSec }} />
              </button>
              <span style={{ fontSize: 12, color: C.textSec, padding: '0 8px' }}>Page {rPage} of {rPages} · {rTotal} refund{rTotal !== 1 ? 's' : ''}</span>
              <button onClick={() => loadRefunds(rPage + 1)} disabled={rPage === rPages} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: rPage === rPages ? 'default' : 'pointer', opacity: rPage === rPages ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRightIcon sx={{ fontSize: 16, color: C.textSec }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={() => !saving && setModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(43,29,26,0.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: C.surface, borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(43,29,26,0.22)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri }}>Edit Customer</h2>
              <button onClick={() => !saving && setModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer' }}>
                <CloseOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
              </button>
            </div>
            <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formErr && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(183,28,28,0.07)', border: `1px solid rgba(183,28,28,0.2)` }}><p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error }}>{formErr}</p></div>}
              {[
                { label: 'Full Name', key: 'name', required: true },
                { label: 'Phone',     key: 'phone' },
                { label: 'Email',     key: 'email' },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: C.textSec }}>{label}{required && <span style={{ color: C.error }}> *</span>}</p>
                  <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.bg, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: C.textSec }}>Notes</p>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.bg, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => !saving && setModal(false)} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: FONT }}>Cancel</button>
                <button onClick={saveEdit} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: saving ? C.elevated : C.primary, fontSize: 13, fontWeight: 700, color: saving ? C.textDim : '#fff', cursor: saving ? 'default' : 'pointer', fontFamily: FONT }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
