import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import GridViewOutlinedIcon          from '@mui/icons-material/GridViewOutlined';
import PointOfSaleIcon               from '@mui/icons-material/PointOfSale';
import ReceiptLongOutlinedIcon       from '@mui/icons-material/ReceiptLongOutlined';
import ReplayOutlinedIcon            from '@mui/icons-material/ReplayOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import RefreshOutlinedIcon           from '@mui/icons-material/RefreshOutlined';
import TrendingUpOutlinedIcon        from '@mui/icons-material/TrendingUpOutlined';
import Inventory2OutlinedIcon        from '@mui/icons-material/Inventory2Outlined';
import AttachMoneyIcon               from '@mui/icons-material/AttachMoney';
import CreditCardIcon                from '@mui/icons-material/CreditCard';
import PaymentIcon                   from '@mui/icons-material/Payment';
import MoreHorizIcon                 from '@mui/icons-material/MoreHoriz';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary:  '#3E2723', accent:   '#D4A373',
  success:  '#2E7D4F', warning:  '#B26A00', error: '#B71C1C',
  textPri:  '#2B1D1A', textSec:  '#6B5B57', textDim: '#A09490',
  border:   '#DDD2CC', surface:  '#ffffff', bg: '#F5F3F1', elevated: '#EFE7E2',
  hover:    '#F3EDE9',
};

const fmt  = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtK = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmt(n);

const METHOD_ICON = { CASH: AttachMoneyIcon, CREDIT: CreditCardIcon, DEBIT: PaymentIcon, MISC: MoreHorizIcon };
const METHOD_COLOR = { CASH: '#2E7D4F', CREDIT: '#1565C0', DEBIT: '#6A1B9A', MISC: '#B26A00' };

const STATUS_S = {
  PENDING:  { bg: 'rgba(178,106,0,0.10)',  color: '#B26A00' },
  APPROVED: { bg: 'rgba(46,125,79,0.10)',  color: '#2E7D4F' },
  DENIED:   { bg: 'rgba(183,28,28,0.09)', color: '#B71C1C' },
};
const TYPE_S = {
  REFUND:       { label: 'Refund',         color: C.primary },
  VOID:         { label: 'Void',           color: '#B26A00' },
  DISCOUNT:     { label: 'Discount',       color: '#8a5a2c' },
  PRICE_CHANGE: { label: 'Price Override', color: '#1565C0' },
};

// ── Inline CSS bar chart ──────────────────────────────────────────────────────
function BarChart({ data, valueKey = 'revenue', labelKey = 'label', color = C.primary, height = 80 }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 0.01);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, width: '100%' }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={i} title={`${d[labelKey]}: ${fmt(d[valueKey])}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              background: pct > 0 ? color : C.elevated,
              height: `${Math.max(pct, 2)}%`,
              transition: 'height 0.4s ease',
              minHeight: pct > 0 ? 4 : 2,
              opacity: pct > 0 ? 1 : 0.4,
            }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Hourly chart with time labels ─────────────────────────────────────────────
function HourlyChart({ data }) {
  const max  = Math.max(...data.map((d) => d.revenue), 0.01);
  const now  = new Date().getHours();
  // only show label every 3 hours
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 72, width: '100%' }}>
        {data.map((d) => {
          const pct    = (d.revenue / max) * 100;
          const isPast = d.hour <= now;
          const isCur  = d.hour === now;
          return (
            <div key={d.hour} title={`${d.hour}:00 — ${fmt(d.revenue)}`}
              style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}>
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                background: isCur ? C.accent : isPast && pct > 0 ? C.primary : C.elevated,
                height: `${Math.max(pct, 2)}%`,
                minHeight: 3,
                opacity: isPast ? 1 : 0.3,
                transition: 'height 0.4s ease',
              }} />
            </div>
          );
        })}
      </div>
      {/* X-axis: every 3 hours */}
      <div style={{ display: 'flex', width: '100%' }}>
        {data.map((d) => (
          <div key={d.hour} style={{ flex: 1, textAlign: 'center' }}>
            {d.hour % 6 === 0 && (
              <span style={{ fontSize: 9, fontWeight: 600, color: C.textDim }}>
                {d.hour === 0 ? '12a' : d.hour < 12 ? `${d.hour}a` : d.hour === 12 ? '12p' : `${d.hour - 12}p`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, iconBg, color, sub }) {
  return (
    <CornerCard borderColor={C.border} cornerSize={18} cornerHeight={18} style={{ background: C.surface }}>
      <div style={{ padding: '13px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon sx={{ fontSize: 15, color }} />
          </div>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: '13px' }}>{label}</p>
        </div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: color || C.textPri, letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 500, color: C.textDim }}>{sub}</p>}
      </div>
    </CornerCard>
  );
}


// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: C.elevated, animation: 'pulse 1.4s ease infinite' }} />;
}

export default function DashboardPage() {
  const navigate   = useNavigate();
  const { token } = useAuthStore();
  const isDesktop  = useMediaQuery('(min-width:1024px)');

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/dashboard/employee`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to load dashboard');
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const go = (path) => navigate(path);

  // ── KPI data ─────────────────────────────────────────────────────────────
  const kpi = data?.kpi;
  const kpiCards = kpi ? [
    { label: "Today's Revenue", value: fmtK(kpi.revenue),      icon: TrendingUpOutlinedIcon,  iconBg: 'rgba(46,125,79,0.10)',   color: C.success },
    { label: 'Transactions',    value: kpi.transactions,        icon: ReceiptLongOutlinedIcon, iconBg: 'rgba(62,39,35,0.09)',    color: C.primary },
    { label: 'Avg Ticket',      value: fmt(kpi.avgTicket),      icon: AttachMoneyIcon,         iconBg: 'rgba(212,163,115,0.18)', color: '#8a5a2c' },
    { label: 'Refunds',         value: fmt(kpi.refundedAmount), icon: ReplayOutlinedIcon,      iconBg: 'rgba(183,28,28,0.09)',   color: C.error   },
  ] : [];

  // ── Derived chart peaks for summary labels ────────────────────────────────
  const peakHour = data?.charts?.hourly?.reduce((best, h) => h.revenue > best.revenue ? h : best, { revenue: 0, hour: -1 });
  const weekTotal = data?.charts?.weekly?.reduce((s, d) => s + d.revenue, 0) || 0;

  // ── Period summary state ──────────────────────────────────────────────────
  const [activePeriod, setActivePeriod] = useState('weekly');
  const PERIODS = [
    { key: 'weekly',  label: 'This Week'  },
    { key: 'monthly', label: 'This Month' },
    { key: 'yearly',  label: 'This Year'  },
    { key: 'overall', label: 'All Time'   },
  ];

  // ── Shared content blocks ─────────────────────────────────────────────────
  const renderPeriods = () => {
    const p = data?.periods?.[activePeriod];
    const STAT_ROWS = [
      { label: 'Revenue',      value: p ? fmtK(p.revenue)        : '—', color: C.success  },
      { label: 'Transactions', value: p ? p.transactions          : '—', color: C.primary  },
      { label: 'Avg Ticket',   value: p ? fmt(p.avgTicket)        : '—', color: '#8a5a2c'  },
      { label: 'Refunded',     value: p ? fmt(p.refundedAmount)   : '—', color: C.error    },
    ];
    return (
      <Section title="Sales Summary">
        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {PERIODS.map(({ key, label }) => {
            const active = activePeriod === key;
            return (
              <button key={key} onClick={() => setActivePeriod(key)} style={{ padding: '6px 14px', borderRadius: 20, flexShrink: 0, border: active ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`, background: active ? C.primary : C.surface, color: active ? '#fff' : C.textSec, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Stats grid */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {STAT_ROWS.map(({ label, value, color }, i) => (
              <div key={label} style={{ padding: isDesktop ? '18px 20px' : '14px 12px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none', borderBottom: 'none' }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton h={11} w="60%" />
                    <Skeleton h={22} w="80%" />
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: isDesktop ? 22 : 17, fontWeight: 800, color, letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>
    );
  };

  const renderKpis = () => (
    <Section title="Today at a Glance">
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4,1fr)' : 'repeat(2,1fr)', gap: 8 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <CornerCard key={i} borderColor={C.border} cornerSize={18} cornerHeight={18} style={{ background: C.surface }}>
                <div style={{ padding: '13px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skeleton h={28} w={28} r={8} />
                  <Skeleton h={22} w="60%" />
                  <Skeleton h={12} w="40%" />
                </div>
              </CornerCard>
            ))
          : kpiCards.map((c, i) => <KpiCard key={i} {...c} />)
        }
      </div>
    </Section>
  );

  const renderCharts = () => (
    <Section title="Performance">
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 12 }}>

        {/* Hourly */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>Hourly Sales</p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: C.textDim }}>Today · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
            {!loading && peakHour?.hour >= 0 && peakHour.revenue > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: 'rgba(46,125,79,0.10)', padding: '3px 8px', borderRadius: 20 }}>
                Peak {peakHour.hour}:00
              </span>
            )}
          </div>
          {loading ? <Skeleton h={80} r={8} /> : <HourlyChart data={data.charts.hourly} />}
        </div>

        {/* Weekly */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>7-Day Trend</p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: C.textDim }}>Last 7 days</p>
            </div>
            {!loading && weekTotal > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: C.primary }}>{fmtK(weekTotal)}</span>
            )}
          </div>
          {loading ? <Skeleton h={80} r={8} /> : (
            <>
              <BarChart data={data.charts.weekly} valueKey="revenue" labelKey="label" color={C.primary} height={72} />
              <div style={{ display: 'flex', marginTop: 6 }}>
                {data.charts.weekly.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: C.textDim }}>
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );

  const renderActivity = () => (
    <Section title="Recent Activity" action={
      <button onClick={() => go('/employee/transactions')} style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>
        View All →
      </button>
    }>
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 12 }}>

        {/* Recent Sales */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>Recent Transactions</p>
          </div>
          {loading ? (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={36} r={6} />)}
            </div>
          ) : !data.activity.recentSales.length ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: C.textDim, fontSize: 12, fontWeight: 600 }}>No transactions yet today</div>
          ) : data.activity.recentSales.map((s, i) => (
            <div key={s._id} style={{ padding: '10px 14px', borderBottom: i < data.activity.recentSales.length - 1 ? `1px solid #F0E8E4` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: i % 2 ? '#FDFCFB' : C.surface }}
              onMouseEnter={e => isDesktop && (e.currentTarget.style.background = C.hover)}
              onMouseLeave={e => isDesktop && (e.currentTarget.style.background = i % 2 ? '#FDFCFB' : C.surface)}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, fontFamily: 'monospace', letterSpacing: '0.04em' }}>{s.invoiceNo}</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 500, color: C.textDim }}>
                  {s.items?.length || 0} item{s.items?.length !== 1 ? 's' : ''} · {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.textPri }}>{fmt(s.grandTotal)}</p>
                {s.refundedAmount > 0 && (
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.error }}>−{fmt(s.refundedAmount)} refunded</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Overrides */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>Override Requests</p>
          </div>
          {loading ? (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={36} r={6} />)}
            </div>
          ) : !data.activity.recentOverrides.length ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: C.textDim, fontSize: 12, fontWeight: 600 }}>No override requests</div>
          ) : data.activity.recentOverrides.map((o, i) => {
            const t = TYPE_S[o.actionType] || TYPE_S.REFUND;
            const s = STATUS_S[o.status] || STATUS_S.PENDING;
            return (
              <div key={o._id} style={{ padding: '10px 14px', borderBottom: i < data.activity.recentOverrides.length - 1 ? `1px solid #F0E8E4` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: i % 2 ? '#FDFCFB' : C.surface }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.productName || '—'}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 500, color: C.textDim }}>
                    {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: 'rgba(62,39,35,0.08)', color: t.color }}>{t.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.color }}>{o.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );

  const renderInsights = () => (
    <Section title="Insights">
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 12 }}>

        {/* Top Products */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Inventory2OutlinedIcon sx={{ fontSize: 14, color: C.primary }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>Top Products Today</p>
          </div>
          {loading ? (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={32} r={6} />)}
            </div>
          ) : !data.insights.topProducts.length ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: C.textDim, fontSize: 12, fontWeight: 600 }}>No sales data yet today</div>
          ) : (() => {
            const maxRev = Math.max(...data.insights.topProducts.map(p => p.revenue), 0.01);
            return data.insights.topProducts.map((p, i) => (
              <div key={String(p._id)} style={{ padding: '10px 14px', borderBottom: i < data.insights.topProducts.length - 1 ? `1px solid #F0E8E4` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: C.primary, flexShrink: 0 }}>{i + 1}</span>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.textPri }}>{fmt(p.revenue)}</p>
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: C.textDim }}>{p.qty} sold</p>
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: C.elevated, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: C.primary, width: `${(p.revenue / maxRev) * 100}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Payment Methods */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AttachMoneyIcon sx={{ fontSize: 14, color: C.primary }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>Payment Methods Today</p>
          </div>
          {loading ? (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={32} r={6} />)}
            </div>
          ) : !data.insights.paymentMethods.length ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: C.textDim, fontSize: 12, fontWeight: 600 }}>No payment data yet today</div>
          ) : (() => {
            const totalPay = data.insights.paymentMethods.reduce((s, p) => s + p.total, 0);
            return data.insights.paymentMethods.map((m, i) => {
              const Icon = METHOD_ICON[m._id] || MoreHorizIcon;
              const color = METHOD_COLOR[m._id] || C.primary;
              const pct = totalPay > 0 ? (m.total / totalPay) * 100 : 0;
              return (
                <div key={m._id} style={{ padding: '10px 14px', borderBottom: i < data.insights.paymentMethods.length - 1 ? `1px solid #F0E8E4` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon sx={{ fontSize: 14, color }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>{m._id}</p>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: C.textDim }}>{m.count} transaction{m.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.textPri }}>{fmt(m.total)}</p>
                      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim }}>{pct.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: C.elevated, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </Section>
  );


  // ── Error state ───────────────────────────────────────────────────────────
  if (error && !loading) return (
    <div style={{ padding: '32px 16px', maxWidth: 480, margin: '0 auto', fontFamily: FONT, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(183,28,28,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <GridViewOutlinedIcon sx={{ fontSize: 26, color: C.error }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: '0 0 6px' }}>Failed to load dashboard</p>
      <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: '0 0 16px' }}>{error}</p>
      <button onClick={load} style={{ padding: '10px 20px', borderRadius: 9, background: C.primary, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );

  const wrapper = isDesktop
    ? { padding: '28px 32px 40px', fontFamily: FONT, background: C.bg, minHeight: '100dvh' }
    : { padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT };

  return (
    <div style={wrapper}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GridViewOutlinedIcon sx={{ fontSize: isDesktop ? 22 : 20, color: C.primary }} />
          <h1 style={{ margin: 0, fontSize: isDesktop ? 22 : 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Dashboard</h1>
        </div>
        <button onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: C.textSec, opacity: loading ? 0.5 : 1 }}>
          <RefreshOutlinedIcon sx={{ fontSize: 15, color: C.textDim, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {isDesktop ? (
        // ── Desktop: two-column content layout ───────────────────────────────
        <>
          {renderKpis()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
            <div>
              {renderPeriods()}
              {renderCharts()}
              {renderActivity()}
              {renderInsights()}
            </div>
            <div>
              {/* Pending tasks panel */}
              {!loading && kpi?.pendingApprovals > 0 && (
                <Section title="Attention Needed">
                  <div style={{ background: 'rgba(178,106,0,0.06)', border: '1px solid rgba(178,106,0,0.28)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(178,106,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 17, color: C.warning }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{kpi.pendingApprovals} Pending Approval{kpi.pendingApprovals !== 1 ? 's' : ''}</p>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: C.textSec }}>Awaiting manager review</p>
                      </div>
                    </div>
                    <button onClick={() => go('/employee/overrides')}
                      style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: `1.5px solid ${C.warning}`, background: 'rgba(178,106,0,0.08)', color: C.warning, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.04em' }}>
                      View Requests →
                    </button>
                  </div>
                </Section>
              )}
            </div>
          </div>
        </>
      ) : (
        // ── Mobile: stacked ───────────────────────────────────────────────────
        <>
          {renderKpis()}
          {renderPeriods()}
          {!loading && kpi?.pendingApprovals > 0 && (
            <div style={{ background: 'rgba(178,106,0,0.06)', border: '1px solid rgba(178,106,0,0.28)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16, color: C.warning }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>{kpi.pendingApprovals} pending approval{kpi.pendingApprovals !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => go('/employee/overrides')}
                  style={{ fontSize: 11, fontWeight: 700, color: C.warning, background: 'none', border: 'none', cursor: 'pointer' }}>
                  View →
                </button>
              </div>
            </div>
          )}
          {renderCharts()}
          {renderActivity()}
          {renderInsights()}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
