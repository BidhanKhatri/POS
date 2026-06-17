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
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';

/* ── Design tokens (from AGENTS.md) ── */
const COLOR = {
  line:     '#4C78A8',   // Data Blue  — primary chart series
  grid:     '#EDE5E0',   // near-divider tone — very subtle grid
  dot:      '#4C78A8',
  dotFill:  '#ffffff',
  axisText: '#A09490',   // text.disabled
  border:   '#DDD2CC',
  surface:  '#ffffff',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
};

const RANGE_OPTIONS = ['7D', '30D', '90D'];

/* ── Mock data per range ── */
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

/* ── Custom tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLOR.surface,
      border: `1px solid ${COLOR.border}`,
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(62,39,35,0.10)',
      minWidth: 120,
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: COLOR.axisText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: COLOR.textPri, letterSpacing: '-0.4px' }}>
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

/* ── Y-axis tick formatter ── */
function formatY(value) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

export default function ManagerDashboardPage() {
  const [range, setRange] = useState('7D');
  const chartData = DATA[range];

  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>

      {/* ── Page title ── */}
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

{/* ── Metric cards — 2×2 ── */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginBottom: 16,
  }}
>
  {METRICS.map(({ label, value, icon: Icon, color, iconBg }) => (
    <div
      key={label}
      style={{
        position: 'relative',
        background: COLOR.surface,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Left Corner Accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          borderTop: `1px solid ${color}`,
          borderLeft: `1px solid ${color}`,
          borderTopLeftRadius: 8,
          pointerEvents: 'none',
        }}
      />

      {/* Bottom Right Corner Accent */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 24,
          height: 24,
          borderBottom: `1px solid ${color}`,
          borderRight: `1px solid ${color}`,
          borderBottomRightRadius: 8,
          pointerEvents: 'none',
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 0 1px ${color}20`,
        }}
      >
        <Icon sx={{ fontSize: 17, color }} />
      </div>

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 800,
            color: '#2B1D1A',
            letterSpacing: '-0.3px',
            lineHeight: 1,
          }}
        >
          {value}
        </p>

        <p
          style={{
            margin: '4px 0 0',
            fontSize: 10,
            fontWeight: 600,
            color: '#A09490',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </p>
      </div>
    </div>
  ))}
</div>

      {/* ── Sales line chart card ── */}
      <div style={{
        background: COLOR.surface,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}>

        {/* Card header */}
        <div style={{
          padding: '16px 20px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${COLOR.border}`,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2B1D1A' }}>
              Sales Overview
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: '#A09490' }}>
              Total revenue over time
            </p>
          </div>

          {/* Range selector */}
          <div style={{
            display: 'flex',
            background: '#F3EDE9',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setRange(opt)}
                style={{
                  padding: '4px 11px',
                  borderRadius: 6,
                  border: 'none',
                  background: range === opt ? '#3E2723' : 'transparent',
                  color: range === opt ? '#fff' : '#6B5B57',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: '20px 8px 12px 0' }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                stroke={COLOR.grid}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 600, fill: COLOR.axisText, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tickFormatter={formatY}
                tick={{ fontSize: 11, fontWeight: 600, fill: COLOR.axisText, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                axisLine={false}
                tickLine={false}
                width={52}
                dx={-4}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: COLOR.grid, strokeWidth: 1.5, strokeDasharray: '4 3' }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke={COLOR.line}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: COLOR.dotFill, stroke: COLOR.line, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: COLOR.line, stroke: COLOR.dotFill, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart footer */}
        <div style={{
          padding: '10px 20px 14px',
          borderTop: `1px solid ${COLOR.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            display: 'inline-block', width: 24, height: 2.5,
            background: COLOR.line, borderRadius: 2, flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: COLOR.axisText, letterSpacing: '0.04em' }}>
            Daily Sales Revenue
          </span>
        </div>

      </div>

      {/* ── Override history ── */}
      <div style={{
        background: COLOR.surface,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 16,
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${COLOR.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2B1D1A' }}>Override History</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: '#A09490' }}>Recent manager authorizations</p>
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '58px 1fr auto',
          gap: 10, padding: '8px 18px',
          background: '#F3EDE9', borderBottom: `1px solid ${COLOR.border}`,
        }}>
          {['Time', 'Request', 'Status'].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#3E2723', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {[
          { time: '10:45 AM', type: 'Manager Sale Entry', employee: 'Kevin S. (09)',   amount: '$450.00', status: 'APPROVED' },
          { time: '10:32 AM', type: 'Price Override',      employee: 'Sarah J. (402)',  amount: '$12.99',  status: 'DENIED'   },
          { time: '09:58 AM', type: 'Void Request',         employee: 'James K. (211)', amount: '$89.00',  status: 'APPROVED' },
          { time: '09:14 AM', type: 'Refund',               employee: 'Amy L. (307)',   amount: '$34.50',  status: 'APPROVED' },
        ].map((row, i, arr) => {
          const approved = row.status === 'APPROVED';
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '58px 1fr auto',
              gap: 10, alignItems: 'center',
              padding: '11px 18px',
              borderBottom: i < arr.length - 1 ? `1px solid ${COLOR.border}` : 'none',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490' }}>{row.time}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>{row.type}</p>
                <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: '#6B5B57' }}>{row.employee} · {row.amount}</p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                background: approved ? 'rgba(46,125,79,0.10)' : 'rgba(183,28,28,0.09)',
                color: approved ? '#2E7D4F' : '#B71C1C',
                border: `1px solid ${approved ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.20)'}`,
              }}>
                {row.status}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
