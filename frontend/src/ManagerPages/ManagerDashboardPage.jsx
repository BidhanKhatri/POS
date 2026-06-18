import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useMediaQuery } from '@mui/material';
import AttachMoneyOutlinedIcon  from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon  from '@mui/icons-material/ReceiptLongOutlined';
import PeopleOutlinedIcon       from '@mui/icons-material/PeopleOutlined';
import TrendingUpOutlinedIcon   from '@mui/icons-material/TrendingUpOutlined';
import RefreshOutlinedIcon      from '@mui/icons-material/RefreshOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';

const C = {
  primary:  '#3E2723',
  accent:   '#D4A373',
  bg:       '#F5F3F1',
  surface:  '#ffffff',
  elevated: '#EFE7E2',
  tableHdr: '#F3EDE9',
  border:   '#DDD2CC',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  success:  '#2E7D4F',
  error:    '#B71C1C',
  chartLine: '#4C78A8',
  chartGrid: '#EDE5E0',
};

const RANGE_OPTIONS = ['7D', '30D', '90D'];

const DATA = {
  '7D': [
    { label: 'Mon', sales: 1240 },
    { label: 'Tue', sales: 980  },
    { label: 'Wed', sales: 1560 },
    { label: 'Thu', sales: 2100 },
    { label: 'Fri', sales: 1890 },
    { label: 'Sat', sales: 3200 },
    { label: 'Sun', sales: 2750 },
  ],
  '30D': Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}`,
    sales: Math.floor(800 + Math.random() * 2400),
  })),
  '90D': Array.from({ length: 12 }, (_, i) => ({
    label: `W${i + 1}`,
    sales: Math.floor(6000 + Math.random() * 14000),
  })),
};

const METRICS = [
  { label: 'Total Sales',  value: '$0.00', icon: AttachMoneyOutlinedIcon,  color: '#2E7D4F', iconBg: 'rgba(46,125,79,0.10)'   },
  { label: 'Transactions', value: '0',     icon: ReceiptLongOutlinedIcon,  color: '#0277BD', iconBg: 'rgba(2,119,189,0.10)'   },
  { label: 'Staff Active', value: '0',     icon: PeopleOutlinedIcon,       color: '#B26A00', iconBg: 'rgba(178,106,0,0.10)'   },
  { label: 'Avg. Ticket',  value: '$0.00', icon: TrendingUpOutlinedIcon,   color: '#D4A373', iconBg: 'rgba(212,163,115,0.12)' },
];

const OVERRIDE_ROWS = [
  { time: '10:45 AM', type: 'Manager Sale Entry', employee: 'Kevin S.',  code: '09',  amount: '$450.00', status: 'APPROVED' },
  { time: '10:32 AM', type: 'Price Override',      employee: 'Sarah J.',  code: '402', amount: '$12.99',  status: 'DENIED'   },
  { time: '09:58 AM', type: 'Void Request',         employee: 'James K.', code: '211', amount: '$89.00',  status: 'APPROVED' },
  { time: '09:14 AM', type: 'Refund',               employee: 'Amy L.',   code: '307', amount: '$34.50',  status: 'APPROVED' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(62,39,35,0.10)', minWidth: 120,
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px' }}>
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

function formatY(value) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

function StatusBadge({ status }) {
  const approved = status === 'APPROVED';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
      padding: '3px 9px', borderRadius: 20, flexShrink: 0,
      background: approved ? 'rgba(46,125,79,0.10)' : 'rgba(183,28,28,0.09)',
      color: approved ? C.success : C.error,
      border: `1px solid ${approved ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.20)'}`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

/* ── Desktop KPI Card (corner accent style from reports page) ── */
function KpiCard({ label, value, icon: Icon, color, iconBg }) {
  return (
    <div style={{
      position: 'relative', background: C.surface,
      border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ width: 42, height: 42, borderRadius: 11, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 1px ${color}20` }}>
        <Icon sx={{ fontSize: 21, color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
        <p style={{ margin: '5px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>{label}</p>
      </div>
    </div>
  );
}

/* ── Sales chart card (shared, height is a prop) ── */
function SalesChartCard({ range, onRangeChange, chartData, chartHeight }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>Sales Overview</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: C.textDim }}>Total revenue over time</p>
        </div>
        <div style={{ display: 'flex', background: C.tableHdr, borderRadius: 8, padding: 3, gap: 2 }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onRangeChange(opt)}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none',
                background: range === opt ? C.primary : 'transparent',
                color: range === opt ? '#fff' : C.textSec,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.04em', transition: 'background 0.15s, color 0.15s',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 8px 12px 0' }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={C.chartGrid} strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fontWeight: 600, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              axisLine={false} tickLine={false} dy={8}
            />
            <YAxis
              tickFormatter={formatY}
              tick={{ fontSize: 11, fontWeight: 600, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              axisLine={false} tickLine={false} width={52} dx={-4}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: C.chartGrid, strokeWidth: 1.5, strokeDasharray: '4 3' }}
            />
            <Line
              type="monotone" dataKey="sales"
              stroke={C.chartLine} strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#fff', stroke: C.chartLine, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: C.chartLine, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ padding: '10px 20px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 24, height: 2.5, background: C.chartLine, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.04em' }}>Daily Sales Revenue</span>
      </div>
    </div>
  );
}

export default function ManagerDashboardPage() {
  const [range, setRange] = useState('7D');
  const chartData  = DATA[range];
  const isDesktop  = useMediaQuery('(min-width:1024px)');

  /* ══════════════════════════════════════════
     DESKTOP
  ══════════════════════════════════════════ */
  if (isDesktop) {
    return (
      <div style={{ padding: '28px 32px 40px', background: C.bg, minHeight: '100dvh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SpaceDashboardOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Dashboard</h1>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.surface,
              fontSize: 13, fontWeight: 600, color: C.textSec,
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 16 }} /> Refresh
          </button>
        </div>

        {/* KPI Cards — 4 across */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {METRICS.map((m) => <KpiCard key={m.label} {...m} />)}
        </div>

        {/* Main row: chart (left) + override history (right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16 }}>

          {/* Sales chart */}
          <SalesChartCard range={range} onRangeChange={setRange} chartData={chartData} chartHeight={280} />

          {/* Override history */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>Override History</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: C.textDim }}>Recent manager authorizations</p>
            </div>

            {/* Desktop table header — 5 columns */}
            <div style={{
              display: 'grid', gridTemplateColumns: '68px 1fr 110px 80px auto',
              gap: 8, padding: '8px 20px',
              background: C.tableHdr, borderBottom: `1px solid ${C.border}`,
            }}>
              {['Time', 'Type', 'Employee', 'Amount', 'Status'].map((h) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {h}
                </span>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {OVERRIDE_ROWS.map((row, i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '68px 1fr 110px 80px auto',
                  gap: 8, alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: i % 2 ? '#FDFCFB' : C.surface,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>{row.time}</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.type}</p>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.employee} <span style={{ color: C.textDim }}>({row.code})</span>
                  </p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{row.amount}</p>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    );
  }

  /* ══════════════════════════════════════════
     MOBILE (unchanged layout)
  ══════════════════════════════════════════ */
  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>

      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1px' }}>
            Manager Portal
          </p>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#2B1D1A', margin: 0, letterSpacing: '-0.1px' }}>
            Dashboard
          </h1>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8,
            border: '1px solid #DDD2CC', background: '#fff',
            color: '#6B5B57', cursor: 'pointer',
            boxShadow: '0 1px 0 #e8e0db',
          }}
          title="Refresh"
        >
          <RefreshOutlinedIcon sx={{ fontSize: 17 }} />
        </button>
      </div>

      {/* Metric cards — 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        {METRICS.map(({ label, value, icon: Icon, color, iconBg }) => (
          <div
            key={label}
            style={{
              position: 'relative', background: '#ffffff',
              border: '1px solid #DDD2CC', borderRadius: 10,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: 24, height: 24, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}`, borderTopLeftRadius: 8, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}`, borderBottomRightRadius: 8, pointerEvents: 'none' }} />
            <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 0 1px ${color}20` }}>
              <Icon sx={{ fontSize: 17, color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px', lineHeight: 1 }}>{value}</p>
              <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 600, color: '#A09490', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Sales chart */}
      <SalesChartCard range={range} onRangeChange={setRange} chartData={chartData} chartHeight={220} />

      {/* Override history */}
      <div style={{ background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 14, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #DDD2CC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2B1D1A' }}>Override History</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: '#A09490' }}>Recent manager authorizations</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr auto', gap: 10, padding: '8px 18px', background: '#F3EDE9', borderBottom: '1px solid #DDD2CC' }}>
          {['Time', 'Request', 'Status'].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#3E2723', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>

        {OVERRIDE_ROWS.map((row, i, arr) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '58px 1fr auto', gap: 10, alignItems: 'center', padding: '11px 18px', borderBottom: i < arr.length - 1 ? '1px solid #DDD2CC' : 'none' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490' }}>{row.time}</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>{row.type}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: '#6B5B57' }}>{row.employee} ({row.code}) · {row.amount}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>

    </div>
  );
}
