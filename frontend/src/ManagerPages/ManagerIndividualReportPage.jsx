import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { jsPDF }               from 'jspdf';
import PersonOutlinedIcon       from '@mui/icons-material/PersonOutlined';
import AttachMoneyOutlinedIcon  from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon  from '@mui/icons-material/ReceiptLongOutlined';
import SpeedOutlinedIcon        from '@mui/icons-material/SpeedOutlined';
import ReplayOutlinedIcon       from '@mui/icons-material/ReplayOutlined';
import BlockOutlinedIcon        from '@mui/icons-material/BlockOutlined';
import AccessTimeOutlinedIcon   from '@mui/icons-material/AccessTimeOutlined';
import SearchOutlinedIcon       from '@mui/icons-material/SearchOutlined';
import EmojiEventsOutlinedIcon  from '@mui/icons-material/EmojiEventsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import Inventory2OutlinedIcon   from '@mui/icons-material/Inventory2Outlined';
import PaymentsOutlinedIcon     from '@mui/icons-material/PaymentsOutlined';
import TrendingUpOutlinedIcon   from '@mui/icons-material/TrendingUpOutlined';
import WorkHistoryOutlinedIcon  from '@mui/icons-material/WorkHistoryOutlined';
import HistoryOutlinedIcon      from '@mui/icons-material/HistoryOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import TableChartOutlinedIcon   from '@mui/icons-material/TableChartOutlined';
import useAuthStore from '../store/useAuthStore';
import { useReportCashiers, useEmployeeReport, buildDateRange } from '../hooks/useReportQuery';
import { useQuery } from '@tanstack/react-query';

import { API_URL as API } from '../config/api';

function useAllEmployees() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/accounts?role=Employee,Cashier&status=ACTIVE`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
import CornerCard from '../components/CornerCard/CornerCard';

const C = {
  primary: '#3E2723', primaryLt: '#5D4037', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9',
};
const PIE_COLORS = ['#4C78A8', '#72B7B2', '#54A24B', '#E45756'];
const RANGES = [
  { id: 'overall', label: 'All Time' },
  { id: 'today',   label: 'Today'    },
  { id: 'week',    label: 'Week'     },
  { id: 'month',   label: 'Month'    },
  { id: 'year',    label: 'Year'     },
];
const DETAIL_TABS = [
  { id: 'overview',     label: 'Overview',      icon: TrendingUpOutlinedIcon },
  { id: 'transactions', label: 'Transactions',  icon: ReceiptLongOutlinedIcon },
  { id: 'products',     label: 'Products',      icon: Inventory2OutlinedIcon },
  { id: 'payments',     label: 'Payments',      icon: PaymentsOutlinedIcon },
  { id: 'shifts',       label: 'Shifts',        icon: WorkHistoryOutlinedIcon },
  { id: 'activity',     label: 'Activity Log',  icon: HistoryOutlinedIcon },
];

function fmt$(n)   { return n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtH(n)   { if (n == null || n === 0) return '0h'; const h = Math.floor(n); const m = Math.round((n - h) * 60); return m ? `${h}h ${m}m` : `${h}h`; }
function fmtDate(d){ return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function fmtTime(d){ return d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'; }
function fmtDateTime(d){ return d ? `${fmtDate(d)} ${fmtTime(d)}` : '—'; }
function initials(name){ return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'; }

function Skeleton({ h = 20, w = '100%', r = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: C.elevated, animation: 'emp-pulse 1.4s ease infinite alternate' }} />;
}

function Badge({ label, color = C.textDim, bg }) {
  return (
    <span style={{ padding: '3px 9px', borderRadius: 6, background: bg || `${color}12`, color, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>
      {label}
    </span>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ padding: '11px 16px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>{title}</p>
      {sub && <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>{sub}</p>}
    </div>
  );
}

function KpiCard({ label, value, sub, color = C.textPri, icon: Icon, iconBg, alert }) {
  return (
    <CornerCard borderColor={alert ? `${C.error}40` : C.border} style={{ background: alert ? `${C.error}04` : C.surface }}>
      <div style={{ padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: iconBg || `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon sx={{ fontSize: 14, color }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: '11px' }}>{label}</p>
          <p style={{ margin: '3px 0 0', fontSize: 17, fontWeight: 800, color, letterSpacing: '-0.4px', lineHeight: '20px' }}>{value}</p>
          {sub && <p style={{ margin: '1px 0 0', fontSize: 9.5, color: C.textDim, lineHeight: '13px' }}>{sub}</p>}
        </div>
      </div>
    </CornerCard>
  );
}

function CashierRow({ c, rank, isSelected, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: isSelected ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`, background: isSelected ? `${C.accent}10` : C.surface, cursor: 'pointer', textAlign: 'left', marginBottom: 5, transition: 'all 0.15s' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: rank === 0 ? C.primary : C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: rank === 0 ? C.accent : C.textDim }}>{initials(c.name)}</span>
        {rank === 0 && <EmojiEventsOutlinedIcon sx={{ fontSize: 9, color: C.accent, position: 'absolute', top: -4, right: -4 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
        <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 500, color: C.textDim }}>{c.txnCount} txns · {fmt$(c.netRevenue)}</p>
      </div>
      {c.voidRate > 3 && <Badge label={`${c.voidRate.toFixed(1)}% void`} color={C.error} />}
    </button>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 13px', boxShadow: '0 4px 16px rgba(62,39,35,0.10)' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.textDim }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: p.stroke || p.fill, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.textSec, flex: 1 }}>{p.name}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.textPri }}>{p.name === 'Txns' ? p.value : fmt$(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function radarData(kpis) {
  if (!kpis) return [];
  const norm = (val, max) => Math.max(0, Math.min(100, (val / max) * 100));
  return [
    { metric: 'Rev/hr',    value: norm(kpis.revenuePerHour ?? 0, 300) },
    { metric: 'Avg Ticket',value: norm(kpis.avgTicket      ?? 0, 80)  },
    { metric: 'Volume',    value: norm(kpis.txnCount       ?? 0, 200) },
    { metric: 'Low Voids', value: Math.max(0, 100 - norm(kpis.voidRate   ?? 0, 10)) },
    { metric: 'Low Refunds',value: Math.max(0, 100 - norm(kpis.refundRate ?? 0, 20)) },
  ];
}

/* ── Overview Tab ─────────────────────────────────────────────────────────── */
function OverviewTab({ data, loading }) {
  const k = data?.kpis;
  const trend = data?.trend || [];

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{[1,2,3,4].map(i => <Skeleton key={i} h={58} r={10} />)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>{[1,2,3].map(i => <Skeleton key={i} h={58} r={10} />)}</div>
      <Skeleton h={220} r={12} />
    </div>
  );
  if (!k) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KpiCard label="Net Revenue"    value={fmt$(k.netRevenue)}    sub={`Gross ${fmt$(k.revenue)}`}         icon={AttachMoneyOutlinedIcon} color={C.success} />
        <KpiCard label="Transactions"   value={k.txnCount ?? 0}       sub={`Avg ticket ${fmt$(k.avgTicket)}`}  icon={ReceiptLongOutlinedIcon}  color={C.info} />
        <KpiCard label="Items Sold"     value={k.itemsSold ?? 0}       sub={`${k.txnCount} transactions`}       icon={Inventory2OutlinedIcon}  color={C.primaryLt} />
        <KpiCard label="Refunded"       value={fmt$(k.refundedAmount)} sub={`${k.refundCount} approved`}        icon={ReplayOutlinedIcon}      color={k.refundRate > 10 ? C.error : C.warning} alert={k.refundRate > 10} />
      </div>
      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KpiCard label="Voids"          value={k.voidCount ?? 0}       sub={`${(k.voidRate ?? 0).toFixed(1)}% rate`}    icon={BlockOutlinedIcon}      color={k.voidRate > 3 ? C.error : C.textDim} alert={k.voidRate > 3} />
        <KpiCard label="Overrides"      value={k.overrideCount ?? 0}   sub="Total requests"                              icon={AdminPanelSettingsOutlinedIcon} color={C.warning} />
        <KpiCard label="Hours Worked"   value={fmtH(k.hoursWorked)}    sub={`${k.shiftCount} shift(s)`}                 icon={AccessTimeOutlinedIcon} color={C.textSec} />
        <KpiCard label="Rev / Hour"     value={fmt$(k.revenuePerHour)} sub={`${k.txnPerHour ?? 0} txns/hr`}            icon={SpeedOutlinedIcon}      color={C.accent} />
      </div>

      {/* Sales trend + radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14 }}>
        <CornerCard borderColor={C.border} style={{ background: C.surface }}>
          <SectionHeader title="Sales Trend" sub="Daily revenue" />
          <div style={{ padding: '10px 4px 8px 0' }}>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="empRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.info} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.info} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EDE5E0" />
                  <XAxis dataKey="date" tickFormatter={d => { const dt = new Date(d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }} tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} dy={4} />
                  <YAxis tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.border }} />
                  <Area type="monotone" dataKey="revenue" stroke={C.info} fill="url(#empRevGrad)" strokeWidth={2} dot={false} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 12, color: C.textDim }}>No trend data for this period</p>
              </div>
            )}
          </div>
        </CornerCard>

        <CornerCard borderColor={C.border} style={{ background: C.surface }}>
          <SectionHeader title="Performance Profile" sub="5-axis normalized score" />
          <div style={{ padding: '4px 0' }}>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData(k)} cx="50%" cy="50%" outerRadius={72}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: C.textDim }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={C.accent} fill={C.accent} fillOpacity={0.18} dot={{ fill: C.accent, r: 3 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CornerCard>
      </div>

      {/* Discount info */}
      {(k.discountTotal > 0) && (
        <CornerCard borderColor={C.border} style={{ background: C.surface }}>
          <SectionHeader title="Discounts Applied" sub="Total discounts given by this employee" />
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.warning }}>{fmt$(k.discountTotal)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>Total discount amount</p>
            </div>
            <div style={{ width: 1, height: 32, background: C.border }} />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textSec }}>
                {k.revenue > 0 ? `${((k.discountTotal / k.revenue) * 100).toFixed(1)}%` : '—'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>of gross revenue</p>
            </div>
          </div>
        </CornerCard>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

/* ── Transactions Tab ─────────────────────────────────────────────────────── */
function TransactionsTab({ data, loading }) {
  const [txnSearch, setTxnSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState('ALL');
  const [page, setPage]           = useState(1);
  const txns = data?.transactions || [];

  const filtered = useMemo(() => {
    return txns.filter(t => {
      const matchStatus = txnFilter === 'ALL' || t.paymentStatus === txnFilter;
      const matchSearch = !txnSearch || t.invoiceNo?.toLowerCase().includes(txnSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [txns, txnFilter, txnSearch]);

  // Reset to page 1 when filter/search changes
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageSlice   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilter = (val) => { setTxnFilter(val); setPage(1); };
  const handleSearch = (val) => { setTxnSearch(val); setPage(1); };

  if (loading) return <Skeleton h={300} r={12} />;

  const statusBadge = (s) => {
    const map = { PAID: [C.success, 'Paid'], VOIDED: [C.error, 'Voided'], REFUNDED: [C.warning, 'Refunded'], PARTIAL: [C.info, 'Partial'] };
    const [color, label] = map[s] || [C.textDim, s];
    return <Badge label={label} color={color} />;
  };

  const pageBtn = (label, target, disabled) => (
    <button onClick={() => setPage(target)} disabled={disabled}
      style={{ minWidth: 32, height: 32, padding: '0 8px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: disabled ? C.textDim : C.textPri, fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      {label}
    </button>
  );

  return (
    <CornerCard borderColor={C.border} style={{ background: C.surface }}>
      <SectionHeader title="Transaction History" sub={`${filtered.length} transaction${filtered.length !== 1 ? 's' : ''} · page ${safePage} of ${totalPages}`} />
      <div style={{ padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <SearchOutlinedIcon sx={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.textDim }} />
          <input value={txnSearch} onChange={e => handleSearch(e.target.value)} placeholder="Search invoice…" style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 28px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontSize: 12, color: C.textPri, outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>
        {['ALL','PAID','REFUNDED','VOIDED'].map(s => (
          <button key={s} onClick={() => handleFilter(s)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${txnFilter === s ? C.primary : C.border}`, background: txnFilter === s ? C.primary : 'transparent', color: txnFilter === s ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{s}</button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.tableHdr }}>
              {['Invoice', 'Date & Time', 'Items', 'Gross', 'Discount', 'Net', 'Status'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '28px 14px', textAlign: 'center', color: C.textDim, fontSize: 12 }}>No transactions found</td></tr>
            ) : pageSlice.map((t, i) => (
              <tr key={String(t.id)} style={{ background: i % 2 === 0 ? C.surface : '#FAFAF9', borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: C.primary, whiteSpace: 'nowrap' }}>{t.invoiceNo}</td>
                <td style={{ padding: '10px 14px', color: C.textSec, whiteSpace: 'nowrap' }}>{fmtDateTime(t.date)}</td>
                <td style={{ padding: '10px 14px', color: C.textSec, textAlign: 'center' }}>{t.itemCount}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: C.textPri }}>{fmt$(t.grandTotal)}</td>
                <td style={{ padding: '10px 14px', color: C.warning }}>{t.discountTotal > 0 ? `-${fmt$(t.discountTotal)}` : '—'}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: t.paymentStatus === 'VOIDED' ? C.textDim : C.success }}>{fmt$(t.netTotal)}</td>
                <td style={{ padding: '10px 14px' }}>{statusBadge(t.paymentStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {filtered.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, color: C.textDim }}>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {pageBtn('«', 1, safePage === 1)}
            {pageBtn('‹', safePage - 1, safePage === 1)}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '…'
                ? <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: C.textDim, padding: '0 4px' }}>…</span>
                : <button key={p} onClick={() => setPage(p)} style={{ minWidth: 32, height: 32, padding: '0 8px', borderRadius: 7, border: `1px solid ${p === safePage ? C.primary : C.border}`, background: p === safePage ? C.primary : C.surface, color: p === safePage ? '#fff' : C.textPri, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{p}</button>
              )
            }
            {pageBtn('›', safePage + 1, safePage === totalPages)}
            {pageBtn('»', totalPages, safePage === totalPages)}
          </div>
        </div>
      )}
    </CornerCard>
  );
}

/* ── Products Tab ─────────────────────────────────────────────────────────── */
function ProductsTab({ data, loading }) {
  const products = data?.products || [];
  const maxRev   = products[0]?.revenue || 1;

  if (loading) return <Skeleton h={300} r={12} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <CornerCard borderColor={C.border} style={{ background: C.surface }}>
        <SectionHeader title="Top Products Sold" sub="By revenue — up to 10 products" />
        {products.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: C.textDim }}>No product data for this period</p>
        ) : (
          <div style={{ padding: '10px 0 4px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={products} margin={{ top: 4, right: 12, left: 8, bottom: 60 }}>
                <CartesianGrid vertical={false} stroke="#EDE5E0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.textSec }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(237,229,224,0.3)' }} />
                <Bar dataKey="revenue" fill={C.primaryLt} radius={[4,4,0,0]} name="Revenue" maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CornerCard>
      {products.length > 0 && (
        <CornerCard borderColor={C.border} style={{ background: C.surface }}>
          <SectionHeader title="Product Breakdown Table" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.tableHdr }}>
                  {['#', 'Product', 'Qty Sold', 'Transactions', 'Revenue', 'Share'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.name} style={{ background: i % 2 === 0 ? C.surface : '#FAFAF9', borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '9px 14px', color: C.textDim, fontWeight: 700 }}>#{i + 1}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: C.textPri }}>{p.name}</td>
                    <td style={{ padding: '9px 14px', color: C.textSec }}>{p.qty}</td>
                    <td style={{ padding: '9px 14px', color: C.textSec }}>{p.txnCount}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 700, color: C.success }}>{fmt$(p.revenue)}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.elevated, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round((p.revenue / maxRev) * 100)}%`, background: C.primaryLt, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, minWidth: 32 }}>{Math.round((p.revenue / maxRev) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CornerCard>
      )}
    </div>
  );
}

/* ── Payments Tab ─────────────────────────────────────────────────────────── */
function PaymentsTab({ data, loading }) {
  const payments = data?.payments || [];
  const total    = payments.reduce((a, p) => a + p.amount, 0);

  if (loading) return <Skeleton h={300} r={12} />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
      <CornerCard borderColor={C.border} style={{ background: C.surface }}>
        <SectionHeader title="Payment Method Breakdown" sub="By collected amount" />
        {payments.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: C.textDim }}>No payment data for this period</p>
        ) : (
          <>
            <div style={{ padding: '10px 0' }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={payments} barSize={32}>
                  <CartesianGrid vertical={false} stroke="#EDE5E0" />
                  <XAxis dataKey="method" tick={{ fontSize: 11, fill: C.textDim }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(237,229,224,0.3)' }} />
                  <Bar dataKey="amount" radius={[5,5,0,0]} name="Amount">
                    {payments.map((p, i) => <Cell key={p.method} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ padding: '0 16px 14px' }}>
              {payments.map((p, i) => (
                <div key={p.method} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.border}` }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.textPri }}>{p.method}</span>
                  <span style={{ fontSize: 12, color: C.textSec }}>{p.count} txns</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri, minWidth: 80, textAlign: 'right' }}>{fmt$(p.amount)}</span>
                  <span style={{ fontSize: 11, color: C.textDim, minWidth: 36, textAlign: 'right' }}>{total > 0 ? `${((p.amount / total) * 100).toFixed(0)}%` : '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CornerCard>
      <CornerCard borderColor={C.border} style={{ background: C.surface }}>
        <SectionHeader title="Distribution" />
        {payments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payments} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={3}>
                  {payments.map((p, i) => <Cell key={p.method} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt$(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.textSec }} />
              </PieChart>
            </ResponsiveContainer>
            <p style={{ margin: '4px 0 0', fontSize: 10, color: C.textDim }}>Total collected</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: C.textPri }}>{fmt$(total)}</p>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: C.textDim }}>No data</p>
        )}
      </CornerCard>
    </div>
  );
}

/* ── Shifts Tab ───────────────────────────────────────────────────────────── */
function ShiftsTab({ data, loading }) {
  const shifts = data?.shifts || [];

  if (loading) return <Skeleton h={300} r={12} />;

  const totalHours   = shifts.reduce((a, s) => a + (s.hours || 0), 0);
  const closedShifts = shifts.filter(s => s.status === 'CLOSED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <KpiCard label="Total Shifts"    value={shifts.length}               sub={`${closedShifts.length} closed`} icon={WorkHistoryOutlinedIcon} color={C.info} />
        <KpiCard label="Total Hours"     value={fmtH(totalHours)}            sub="Clocked in time"                  icon={AccessTimeOutlinedIcon} color={C.success} />
        <KpiCard label="Avg Shift Len"   value={closedShifts.length > 0 ? fmtH(totalHours / closedShifts.length) : '—'} sub="Per closed shift" icon={SpeedOutlinedIcon} color={C.accent} />
      </div>
      <CornerCard borderColor={C.border} style={{ background: C.surface }}>
        <SectionHeader title="Shift History" sub={`${shifts.length} shifts in period`} />
        {shifts.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: C.textDim }}>No shifts recorded for this period</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.tableHdr }}>
                  {['Date', 'Clock In', 'Clock Out', 'Duration', 'Sales', 'Transactions', 'Status'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((s, i) => (
                  <tr key={String(s.id)} style={{ background: i % 2 === 0 ? C.surface : '#FAFAF9', borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: C.textPri, whiteSpace: 'nowrap' }}>{fmtDate(s.date)}</td>
                    <td style={{ padding: '9px 14px', color: C.textSec, whiteSpace: 'nowrap' }}>{fmtTime(s.clockIn)}</td>
                    <td style={{ padding: '9px 14px', color: C.textSec, whiteSpace: 'nowrap' }}>{s.clockOut ? fmtTime(s.clockOut) : '—'}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: C.textPri }}>{s.hours != null ? fmtH(s.hours) : '—'}</td>
                    <td style={{ padding: '9px 14px', color: C.success, fontWeight: 600 }}>{fmt$(s.totalSales)}</td>
                    <td style={{ padding: '9px 14px', color: C.textSec }}>{s.totalTransactions}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <Badge label={s.status} color={s.status === 'CLOSED' ? C.success : C.warning} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CornerCard>
    </div>
  );
}

/* ── Activity Tab ─────────────────────────────────────────────────────────── */
function ActivityTab({ data, loading }) {
  const activity = data?.activity || [];
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return typeFilter === 'ALL' ? activity : activity.filter(a => a.actionType === typeFilter);
  }, [activity, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageSlice  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilter = (val) => { setTypeFilter(val); setPage(1); };

  if (loading) return <Skeleton h={300} r={12} />;

  const typeColor = { REFUND: C.warning, VOID: C.error, DISCOUNT: C.info, PRICE_CHANGE: C.primaryLt };
  const statusColor = { APPROVED: C.success, DENIED: C.error, PENDING: C.warning };

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (safePage >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', safePage - 1, safePage, safePage + 1, '…', totalPages];
  })();

  return (
    <CornerCard borderColor={C.border} style={{ background: C.surface }}>
      <SectionHeader title="Audit & Activity Log" sub={filtered.length > PAGE_SIZE ? `page ${safePage} of ${totalPages}` : `${filtered.length} of ${activity.length} events`} />
      <div style={{ padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['ALL','REFUND','VOID','DISCOUNT','PRICE_CHANGE'].map(t => (
          <button key={t} onClick={() => handleFilter(t)} style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${typeFilter === t ? C.primary : C.border}`, background: typeFilter === t ? C.primary : 'transparent', color: typeFilter === t ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: C.textDim }}>No activity found</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.tableHdr }}>
                {['Date & Time', 'Type', 'Reason', 'Approved By', 'Status'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((a, i) => (
                <tr key={String(a.id)} style={{ background: i % 2 === 0 ? C.surface : '#FAFAF9', borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '9px 14px', color: C.textSec, whiteSpace: 'nowrap' }}>{fmtDateTime(a.date)}</td>
                  <td style={{ padding: '9px 14px' }}><Badge label={a.actionType.replace('_', ' ')} color={typeColor[a.actionType] || C.textDim} /></td>
                  <td style={{ padding: '9px 14px', color: C.textSec, maxWidth: 200 }}>{a.reason || '—'}</td>
                  <td style={{ padding: '9px 14px', color: C.textSec }}>{a.approvedBy || '—'}</td>
                  <td style={{ padding: '9px 14px' }}><Badge label={a.status} color={statusColor[a.status] || C.textDim} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Pagination footer */}
      {filtered.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11, color: C.textDim }}>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setPage(1)} disabled={safePage === 1} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: safePage === 1 ? C.textDim : C.textSec, cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: safePage === 1 ? C.textDim : C.textSec, cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>‹</button>
            {pageNums.map((n, i) => (
              <button key={i} onClick={() => typeof n === 'number' && setPage(n)} disabled={n === '…'} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${n === safePage ? C.primary : C.border}`, background: n === safePage ? C.primary : 'transparent', color: n === safePage ? '#fff' : n === '…' ? C.textDim : C.textSec, cursor: typeof n === 'number' && n !== safePage ? 'pointer' : 'default', fontSize: 12, minWidth: 30 }}>{n}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: safePage === totalPages ? C.textDim : C.textSec, cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: safePage === totalPages ? C.textDim : C.textSec, cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>»</button>
          </div>
        </div>
      )}
    </CornerCard>
  );
}

/* ── Export helpers ───────────────────────────────────────────────────────── */
function buildCSV(employee, kpis, transactions, products, shifts) {
  const rows = [
    ['Employee Report'],
    ['Name', employee?.name || ''],
    ['Code', employee?.employeeCode || ''],
    ['Role', employee?.role || ''],
    [],
    ['KPIs'],
    ['Net Revenue', kpis?.netRevenue ?? ''],
    ['Gross Revenue', kpis?.revenue ?? ''],
    ['Refunded Amount', kpis?.refundedAmount ?? ''],
    ['Transactions', kpis?.txnCount ?? ''],
    ['Void Count', kpis?.voidCount ?? ''],
    ['Void Rate %', kpis?.voidRate ?? ''],
    ['Avg Ticket', kpis?.avgTicket ?? ''],
    ['Revenue/Hour', kpis?.revenuePerHour ?? ''],
    ['Hours Worked', kpis?.hoursWorked ?? ''],
    ['Shift Count', kpis?.shiftCount ?? ''],
    [],
    ['Transactions'],
    ['Invoice', 'Date', 'Items', 'Gross', 'Discount', 'Net', 'Status'],
    ...(transactions || []).map(t => [t.invoiceNo, fmtDateTime(t.date), t.itemCount, t.grandTotal, t.discountTotal, t.netTotal, t.paymentStatus]),
    [],
    ['Products'],
    ['Product', 'Qty', 'Transactions', 'Revenue'],
    ...(products || []).map(p => [p.name, p.qty, p.txnCount, p.revenue]),
    [],
    ['Shifts'],
    ['Date', 'Clock In', 'Clock Out', 'Hours', 'Sales', 'Transactions', 'Status'],
    ...(shifts || []).map(s => [fmtDate(s.date), fmtTime(s.clockIn), s.clockOut ? fmtTime(s.clockOut) : '', s.hours ?? '', s.totalSales, s.totalTransactions, s.status]),
  ];
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadCSV(employee, data) {
  const csv  = buildCSV(employee, data?.kpis, data?.transactions, data?.products, data?.shifts);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `employee_report_${(employee?.name || 'unknown').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF(employee, data) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const k    = data?.kpis || {};
  const W    = 210;
  const pad  = 16;
  let y      = pad;

  const line = (text, x, size = 10, bold = false, color = [43, 29, 26]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(text, x, y);
  };
  const nl   = (n = 6) => { y += n; };
  const sep  = () => { doc.setDrawColor(220, 210, 204); doc.line(pad, y, W - pad, y); nl(5); };

  // Header
  doc.setFillColor(62, 39, 35);
  doc.roundedRect(pad, y, W - pad * 2, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(212, 163, 115);
  doc.text('Employee Performance Report', pad + 6, y + 9);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 180, 170);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pad + 6, y + 16);
  nl(28);

  // Employee info
  line(`Employee: ${employee?.name || ''}`, pad, 12, true); nl(7);
  line(`Code: ${employee?.employeeCode || '—'}  |  Role: ${employee?.role || '—'}  |  Email: ${employee?.email || '—'}`, pad, 9); nl(10);
  sep();

  // KPIs grid (2 col)
  const kpiItems = [
    ['Net Revenue',    fmt$(k.netRevenue)],
    ['Transactions',   String(k.txnCount ?? 0)],
    ['Avg Ticket',     fmt$(k.avgTicket)],
    ['Revenue / Hour', fmt$(k.revenuePerHour)],
    ['Hours Worked',   fmtH(k.hoursWorked)],
    ['Void Rate',      `${(k.voidRate ?? 0).toFixed(1)}%`],
    ['Refund Rate',    `${(k.refundRate ?? 0).toFixed(1)}%`],
    ['Overrides',      String(k.overrideCount ?? 0)],
  ];
  line('Key Performance Indicators', pad, 11, true); nl(7);
  kpiItems.forEach(([label, val], i) => {
    const col = i % 2 === 0 ? pad : pad + (W - pad * 2) / 2;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 126, 122);
    doc.text(label.toUpperCase(), col, y);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(43, 29, 26);
    doc.text(val, col, y + 5);
    if (i % 2 === 1) nl(13);
  });
  if (kpiItems.length % 2 !== 0) nl(13);
  sep();

  // Transactions (first 20)
  line('Transaction History (last 20)', pad, 11, true); nl(7);
  const txnCols = [pad, pad + 28, pad + 65, pad + 95, pad + 120, pad + 150];
  const txnHeaders = ['Invoice', 'Date', 'Items', 'Gross', 'Net', 'Status'];
  txnHeaders.forEach((h, i) => {
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(140,126,122);
    doc.text(h, txnCols[i], y);
  });
  nl(5);
  (data?.transactions || []).slice(0, 20).forEach((t, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(249, 246, 243); doc.rect(pad, y - 3, W - pad * 2, 6, 'F'); }
    const vals = [t.invoiceNo, fmtDate(t.date), String(t.itemCount), fmt$(t.grandTotal), fmt$(t.netTotal), t.paymentStatus];
    vals.forEach((v, i) => {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(43,29,26);
      doc.text(String(v), txnCols[i], y + 1);
    });
    nl(7);
    if (y > 270) { doc.addPage(); y = pad; }
  });

  doc.save(`employee_report_${(employee?.name || 'report').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
}

/* ── Main page ────────────────────────────────────────────────────────────── */
const VALID_RANGES = new Set(['overall', 'today', 'week', 'month', 'year']);

export default function ManagerIndividualReportPage() {
  const { search: locationSearch } = useLocation();

  const initialPreset = useMemo(() => {
    const p = new URLSearchParams(locationSearch).get('preset');
    return p && VALID_RANGES.has(p) ? p : 'today';
  }, [locationSearch]);

  const initialEmployeeId = useMemo(() => {
    return new URLSearchParams(locationSearch).get('employeeId') ?? null;
  }, [locationSearch]);

  const [range, setRange] = useState(initialPreset);
  const [search, setSearch]         = useState('');
  const [selectedId, setSelectedId] = useState(initialEmployeeId);
  const [activeTab, setActiveTab]   = useState('overview');
  const [exporting, setExporting]   = useState(null);
  const [confirmExport, setConfirmExport] = useState(null); // 'csv' | 'pdf' | null

  const { start, end } = buildDateRange(range);
  const { data: cashiers, isLoading: cashierLoading } = useReportCashiers({ start, end });
  const { data: allEmps,  isLoading: empsLoading }    = useAllEmployees();
  const listLoading = cashierLoading || empsLoading;

  // Merge: all employees always shown; those with sales data get real metrics, others get zeros
  const merged = useMemo(() => {
    const salesMap = {};
    for (const c of cashiers ?? []) salesMap[String(c.employeeId)] = c;

    const base = (allEmps ?? []).map(emp => {
      const id  = String(emp._id);
      const hit = salesMap[id];
      return hit ?? {
        employeeId:     emp._id,
        name:           emp.name,
        employeeCode:   emp.employeeCode,
        role:           emp.role,
        netRevenue:     0,
        revenue:        0,
        txnCount:       0,
        voidCount:      0,
        voidRate:       0,
        refundCount:    0,
        refundRate:     0,
        hoursWorked:    0,
        shiftCount:     0,
        avgTicket:      0,
        revenuePerHour: 0,
      };
    });

    // Employees with sales first (by netRevenue desc), then zero-sales alphabetically
    base.sort((a, b) => {
      if (a.netRevenue !== b.netRevenue) return b.netRevenue - a.netRevenue;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    return base;
  }, [cashiers, allEmps]);

  const filtered = useMemo(() => {
    if (!merged.length) return [];
    return merged.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  }, [merged, search]);

  const activeEmployee = useMemo(() => {
    if (!filtered?.length) return null;
    return selectedId ? (filtered.find(c => c.employeeId === selectedId) ?? filtered[0]) : filtered[0];
  }, [filtered, selectedId]);

  const activeId = activeEmployee?.employeeId ?? null;

  const { data: empData, isLoading: detailLoading } = useEmployeeReport(
    { employeeId: activeId, start, end },
    { enabled: !!activeId }
  );

  const handleExport = useCallback(async (type) => {
    setExporting(type);
    try {
      if (type === 'csv') {
        downloadCSV(empData?.employee || activeEmployee, empData);
      } else if (type === 'pdf') {
        await downloadPDF(empData?.employee || activeEmployee, empData);
      }
    } finally {
      setExporting(null);
    }
  }, [empData, activeEmployee]);

  const perfBadges = useMemo(() => {
    if (!empData?.kpis) return null;
    const k = empData.kpis;
    const badges = [];
    if (k.voidRate > 5) badges.push({ label: 'High Voids',    color: C.error });
    if (k.refundRate > 10) badges.push({ label: 'High Refunds', color: C.error });
    if (k.revenuePerHour > 200) badges.push({ label: 'Top Performer', color: C.success });
    if (badges.length === 0 && k.txnCount > 0 && k.voidRate <= 2 && k.refundRate <= 5)
      badges.push({ label: 'Performing Well', color: C.success });
    return badges;
  }, [empData]);

  return (
    <div style={{ padding: '24px 28px 40px', background: C.bg, minHeight: '100dvh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PersonOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Reports</p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Individual Employee Report</h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Date range tabs */}
          <div style={{ display: 'flex', gap: 2, background: C.elevated, borderRadius: 10, padding: 3 }}>
            {RANGES.map(({ id, label }) => (
              <button key={id} onClick={() => setRange(id)} style={{ padding: '5px 13px', borderRadius: 7, border: 'none', background: range === id ? C.surface : 'transparent', cursor: 'pointer', boxShadow: range === id ? '0 1px 4px rgba(62,39,35,0.12)' : 'none', fontSize: 11, fontWeight: range === id ? 700 : 500, color: range === id ? C.primary : C.textDim, transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          {activeId && empData && (
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'csv', icon: TableChartOutlinedIcon,   label: 'Export CSV' },
                { key: 'pdf', icon: PictureAsPdfOutlinedIcon, label: 'Export PDF' },
              ].map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setConfirmExport(key)} disabled={!!exporting}
                  style={{ height: 34, padding: '0 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', gap: 6, cursor: exporting ? 'wait' : 'pointer', opacity: exporting === key ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {exporting === key
                    ? <span style={{ fontSize: 10, color: C.textDim }}>…</span>
                    : <>
                        <Icon sx={{ fontSize: 15, color: C.textSec }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec, whiteSpace: 'nowrap' }}>{label}</span>
                      </>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>

        {/* Employee list */}
        <div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <SearchOutlinedIcon sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.textDim }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 30px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.textPri, outline: 'none' }} />
          </div>
          {listLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} h={52} r={10} />)}
            </div>
          ) : filtered.length ? (
            <div className="no-scrollbar" style={{ maxHeight: 'calc(100dvh - 220px)', overflowY: 'auto', paddingRight: 2 }}>
              {filtered.map((c, i) => (
                <CashierRow key={c.employeeId} c={c} rank={i} isSelected={activeEmployee?.employeeId === c.employeeId} onClick={() => { setSelectedId(c.employeeId); setActiveTab('overview'); }} />
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textDim, padding: '28px 0' }}>
              {search ? 'No matches' : 'No data for this period'}
            </p>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {!activeEmployee ? (
            <CornerCard borderColor={C.border} style={{ background: C.surface }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                <div style={{ textAlign: 'center' }}>
                  <PersonOutlinedIcon sx={{ fontSize: 44, color: C.elevated }} />
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: C.textDim }}>Select an employee to view their report</p>
                </div>
              </div>
            </CornerCard>
          ) : (
            <>
              {/* Identity bar */}
              <CornerCard borderColor={C.border} style={{ background: C.surface, marginBottom: 14 }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{initials(activeEmployee.name)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri }}>{activeEmployee.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>
                      {empData?.employee?.role || activeEmployee.role || 'Cashier'} · #{activeEmployee.employeeCode || String(activeEmployee.employeeId).slice(-6)}
                      {empData?.employee?.email && <> · {empData.employee.email}</>}
                    </p>
                  </div>
                  {perfBadges?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {perfBadges.map(b => <Badge key={b.label} label={b.label} color={b.color} />)}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <FileDownloadOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} />
                  </div>
                </div>
              </CornerCard>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 14, background: C.elevated, borderRadius: 10, padding: 3, overflowX: 'auto' }}>
                {DETAIL_TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: activeTab === id ? C.surface : 'transparent', cursor: 'pointer', boxShadow: activeTab === id ? '0 1px 4px rgba(62,39,35,0.12)' : 'none', fontSize: 11, fontWeight: activeTab === id ? 700 : 500, color: activeTab === id ? C.primary : C.textDim, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    <Icon sx={{ fontSize: 14 }} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'overview'     && <OverviewTab     data={empData} loading={detailLoading} />}
              {activeTab === 'transactions' && <TransactionsTab data={empData} loading={detailLoading} />}
              {activeTab === 'products'     && <ProductsTab     data={empData} loading={detailLoading} />}
              {activeTab === 'payments'     && <PaymentsTab     data={empData} loading={detailLoading} />}
              {activeTab === 'shifts'       && <ShiftsTab       data={empData} loading={detailLoading} />}
              {activeTab === 'activity'     && <ActivityTab     data={empData} loading={detailLoading} />}
            </>
          )}
        </div>
      </div>

      {/* Export confirmation modal */}
      {confirmExport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,20,15,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => !exporting && setConfirmExport(null)}>
          <div style={{ background: C.surface, borderRadius: 16, padding: '28px 28px 22px', width: 360, boxShadow: '0 12px 40px rgba(30,20,15,0.22)', border: `1px solid ${C.border}` }}
            onClick={e => e.stopPropagation()}>
            {/* Icon */}
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              {confirmExport === 'csv'
                ? <TableChartOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />
                : <PictureAsPdfOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />}
            </div>
            {/* Title */}
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: C.textPri }}>
              Export {confirmExport === 'csv' ? 'CSV' : 'PDF'} Report
            </p>
            {/* Description */}
            <p style={{ margin: '0 0 6px', fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
              You are about to download the report for
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 13, fontWeight: 700, color: C.primary }}>
              {(empData?.employee?.name || activeEmployee?.name || 'this employee')}
            </p>
            <p style={{ margin: '0 0 22px', fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>
              The file will include KPIs, transactions, product performance, and shift data for the selected period.
            </p>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmExport(null)} disabled={!!exporting}
                style={{ padding: '9px 18px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Cancel
              </button>
              <button onClick={() => { const t = confirmExport; setConfirmExport(null); handleExport(t); }} disabled={!!exporting}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: C.primary, color: C.accent, fontSize: 12, fontWeight: 700, cursor: exporting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {exporting
                  ? <><span style={{ fontSize: 10 }}>…</span> Downloading</>
                  : <>Download {confirmExport.toUpperCase()}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes emp-pulse { from { opacity: 1; } to { opacity: 0.45; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
