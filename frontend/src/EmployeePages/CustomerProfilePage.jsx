import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackOutlinedIcon      from '@mui/icons-material/ArrowBackOutlined';
import PersonOutlineOutlinedIcon  from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon          from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon          from '@mui/icons-material/EmailOutlined';
import ShoppingBagOutlinedIcon    from '@mui/icons-material/ShoppingBagOutlined';
import AttachMoneyOutlinedIcon    from '@mui/icons-material/AttachMoneyOutlined';
import EventOutlinedIcon          from '@mui/icons-material/EventOutlined';
import ReceiptLongOutlinedIcon    from '@mui/icons-material/ReceiptLongOutlined';
import MoneyOffOutlinedIcon       from '@mui/icons-material/MoneyOffOutlined';
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

function StatCard({ label, value, sub, icon: Icon, color, skeleton }) {
  return (
    <CornerCard accentColor={color} borderColor={C.border} borderRadius={12} cornerSize={22} cornerHeight={22}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}14`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 16, color }} />
        </div>
        <div>
          {skeleton
            ? <div style={{ height: 18, width: 60, borderRadius: 4, background: C.elevated, marginBottom: 4 }} />
            : <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, lineHeight: '22px' }}>{value}</p>}
          {sub && <p style={{ margin: '1px 0 0', fontSize: 9, color: C.textDim, fontWeight: 600 }}>{sub}</p>}
          <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        </div>
      </div>
    </CornerCard>
  );
}

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
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

  const [refunds,   setRefunds]   = useState([]);
  const [rLoading,  setRLoading]  = useState(false);
  const [rPage,     setRPage]     = useState(1);
  const [rPages,    setRPages]    = useState(1);
  const [rTotal,    setRTotal]    = useState(0);

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
      <div style={{ padding: '16px 16px', fontFamily: FONT }}>
        <div style={{ height: 18, width: 80, borderRadius: 6, background: C.elevated, marginBottom: 20 }} />
        <div style={{ height: 110, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 70, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }} />)}
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

  return (
    <div style={{ padding: '16px 16px 40px', background: C.bg, minHeight: '100%', fontFamily: FONT }}>

      {/* Back nav */}
      <button onClick={() => navigate('/employee/customers')}
        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: 13, fontWeight: 600, padding: '4px 0', marginBottom: 16, fontFamily: FONT }}>
        <ArrowBackOutlinedIcon sx={{ fontSize: 16 }} /> Customers
      </button>

      {/* Customer info card */}
      <CornerCard accentColor={C.accent} borderColor={C.border} borderRadius={14} cornerSize={30} cornerHeight={30} style={{ marginBottom: 14 }}>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PersonOutlineOutlinedIcon sx={{ fontSize: 24, color: C.accent }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: C.textPri }}>{customer?.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: 8, background: customer?.totalOrders > 1 ? 'rgba(46,125,79,0.10)' : 'rgba(2,119,189,0.10)', color: customer?.totalOrders > 1 ? C.success : C.info, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em' }}>
                  {customer?.totalOrders > 1 ? 'RETURNING' : 'NEW'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customer?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneOutlinedIcon sx={{ fontSize: 13, color: C.textDim }} />
                <span style={{ fontSize: 13, color: C.textSec, fontFamily: 'monospace' }}>{customer.phone}</span>
              </div>
            )}
            {customer?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EmailOutlinedIcon sx={{ fontSize: 13, color: C.textDim }} />
                <span style={{ fontSize: 13, color: C.textSec }}>{customer.email}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EventOutlinedIcon sx={{ fontSize: 13, color: C.textDim }} />
              <span style={{ fontSize: 12, color: C.textDim }}>Member since {fmtDate(customer?.createdAt)}</span>
            </div>
          </div>

          {customer?.notes && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: C.textSec, background: C.bg, padding: '8px 10px', borderRadius: 8, borderLeft: `3px solid ${C.accent}` }}>
              {customer.notes}
            </p>
          )}
        </div>
      </CornerCard>

      {/* Stats grid — 2x2 + 1 full width on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <StatCard label="Total Orders" value={customer?.totalOrders ?? 0}       icon={ShoppingBagOutlinedIcon} color={C.info}    />
        <StatCard label="Total Spend"  value={fmt$(customer?.totalSpent)}        icon={AttachMoneyOutlinedIcon} color={C.success} />
        <StatCard label="Net Spend"    value={fmt$(customer?.netSpent)}           sub="After refunds" icon={AttachMoneyOutlinedIcon} color={C.primary} />
        <StatCard label="Last Visit"   value={fmtDate(customer?.lastVisit)}      icon={EventOutlinedIcon}       color={C.warning} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <StatCard label="Refunded"     value={fmt$(customer?.refundedAmount)}    icon={MoneyOffOutlinedIcon}    color={C.error}   />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: C.elevated, borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: tab === i ? C.surface : 'transparent', fontSize: 12, fontWeight: tab === i ? 700 : 500, color: tab === i ? C.primary : C.textDim, cursor: 'pointer', fontFamily: FONT, boxShadow: tab === i ? '0 1px 3px rgba(62,39,35,0.10)' : 'none' }}>
            {t}
            {i === 0 && pTotal > 0 && <span style={{ marginLeft: 4, fontSize: 10 }}>({pTotal})</span>}
            {i === 1 && rTotal > 0 && <span style={{ marginLeft: 4, fontSize: 10 }}>({rTotal})</span>}
          </button>
        ))}
      </div>

      {/* Purchases tab */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 12, width: '55%', borderRadius: 4, background: C.elevated }} />
              <div style={{ height: 10, width: '35%', borderRadius: 4, background: C.elevated }} />
            </div>
          ))}

          {!pLoading && purchases.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 36, color: C.textDim, display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No purchases yet</p>
            </div>
          )}

          {!pLoading && purchases.map(s => (
            <div key={s._id}
              onClick={() => navigate(`/employee/transactions/${s._id}`)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}
              onTouchStart={e => e.currentTarget.style.background = C.tableHover}
              onTouchEnd={e => e.currentTarget.style.background = C.surface}
              onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = C.surface}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{s.invoiceNo}</p>
                    <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>{fmtDateTime(s.createdAt)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(s.grandTotal)}</p>
                  <Badge status={s.paymentStatus} />
                </div>
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: C.textDim }}>{s.items?.length ?? 0} item{s.items?.length !== 1 ? 's' : ''}</span>
                {s.paymentMethod && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: C.elevated, color: C.textSec }}>{s.paymentMethod}</span>
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
              <span style={{ fontSize: 12, color: C.textDim }}>
                {pPage} / {pPages} · {pTotal} purchase{pTotal !== 1 ? 's' : ''}
              </span>
              <button onClick={() => loadPurchases(pPage + 1)} disabled={pPage === pPages}
                style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: pPage === pPages ? 'default' : 'pointer', opacity: pPage === pPages ? 0.35 : 1 }}>
                <ChevronRightIcon sx={{ fontSize: 18, color: C.textSec }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refunds tab */}
      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 12, width: '55%', borderRadius: 4, background: C.elevated }} />
              <div style={{ height: 10, width: '35%', borderRadius: 4, background: C.elevated }} />
            </div>
          ))}

          {!rLoading && refunds.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <MoneyOffOutlinedIcon sx={{ fontSize: 36, color: C.textDim, display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No refunds on record</p>
            </div>
          )}

          {!rLoading && refunds.map(s => (
            <div key={s._id}
              onClick={() => navigate(`/employee/transactions/${s._id}`)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}
              onTouchStart={e => e.currentTarget.style.background = C.tableHover}
              onTouchEnd={e => e.currentTarget.style.background = C.surface}
              onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = C.surface}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{s.invoiceNo}</p>
                    <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>{fmtDateTime(s.createdAt)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.error, fontVariantNumeric: 'tabular-nums' }}>−{fmt$(s.refundedAmount)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>of {fmt$(s.grandTotal)}</p>
                </div>
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
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
              <span style={{ fontSize: 12, color: C.textDim }}>
                {rPage} / {rPages} · {rTotal} refund{rTotal !== 1 ? 's' : ''}
              </span>
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
