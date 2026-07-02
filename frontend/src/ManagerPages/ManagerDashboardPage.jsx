import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import SpaceDashboardOutlinedIcon  from '@mui/icons-material/SpaceDashboardOutlined';
import AttachMoneyOutlinedIcon     from '@mui/icons-material/AttachMoneyOutlined';
import TrendingUpOutlinedIcon      from '@mui/icons-material/TrendingUpOutlined';
import ReceiptLongOutlinedIcon     from '@mui/icons-material/ReceiptLongOutlined';
import LocalAtmOutlinedIcon        from '@mui/icons-material/LocalAtmOutlined';
import RefundIcon                  from '@mui/icons-material/MoneyOffOutlined';
import DiscountOutlinedIcon        from '@mui/icons-material/DiscountOutlined';
import BlockOutlinedIcon           from '@mui/icons-material/BlockOutlined';
import PeopleOutlinedIcon          from '@mui/icons-material/PeopleOutlined';
import PersonAddOutlinedIcon       from '@mui/icons-material/PersonAddOutlined';
import PendingActionsOutlinedIcon  from '@mui/icons-material/PendingActionsOutlined';
import WarningAmberOutlinedIcon    from '@mui/icons-material/WarningAmberOutlined';
import InventoryOutlinedIcon       from '@mui/icons-material/InventoryOutlined';
import GroupsOutlinedIcon          from '@mui/icons-material/GroupsOutlined';
import AssessmentOutlinedIcon      from '@mui/icons-material/AssessmentOutlined';
import CalendarTodayOutlinedIcon   from '@mui/icons-material/CalendarTodayOutlined';
import PersonSearchOutlinedIcon    from '@mui/icons-material/PersonSearchOutlined';
import RefreshOutlinedIcon         from '@mui/icons-material/RefreshOutlined';
import ArrowUpwardIcon             from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon           from '@mui/icons-material/ArrowDownward';
import ChevronRightOutlinedIcon    from '@mui/icons-material/ChevronRightOutlined';
import EmojiEventsOutlinedIcon     from '@mui/icons-material/EmojiEventsOutlined';
import AccessTimeOutlinedIcon      from '@mui/icons-material/AccessTimeOutlined';
import { useLoading }              from '../context/LoadingContext';
import useAuthStore                from '../store/useAuthStore';
import { useSocketEvent }          from '../context/SocketContext';
import { API_URL as API }          from '../config/api';

// ── Design tokens (consistent with the rest of the app) ──────────────────────
const C = {
  primary:  '#3E2723',
  accent:   '#D4A373',
  bg:       '#F5F3F1',
  surface:  '#FFFFFF',
  elevated: '#EFE7E2',
  tableHdr: '#F3EDE9',
  border:   '#DDD2CC',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  success:  '#2E7D4F',
  warning:  '#B26A00',
  error:    '#B71C1C',
  info:     '#0277BD',
  revenueColor: '#3E2723',
  txnColor:     '#D4A373',
  chartGrid:    '#EDE5E0',
};

const fmt$ = (n) =>
  n === undefined || n === null ? '—' :
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtNum = (n) =>
  n === undefined || n === null ? '—' : Number(n).toLocaleString('en-US');

const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const PERIODS = [
  { key: 'all_time', label: 'All Time' },
  { key: 'today',    label: 'Today' },
  { key: 'week',     label: '7 Days' },
  { key: 'month',    label: 'Month' },
  { key: 'year',     label: 'Year' },
];

const OVERRIDE_TYPE_LABEL = {
  REFUND:       'Refund',
  VOID:         'Void Sale',
  DISCOUNT:     'Discount',
  PRICE_CHANGE: 'Price Override',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Delta({ value }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 1,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      color: up ? C.success : C.error,
    }}>
      {up ? <ArrowUpwardIcon sx={{ fontSize: 10 }} /> : <ArrowDownwardIcon sx={{ fontSize: 10 }} />}
      {Math.abs(value)}%
    </span>
  );
}

function KpiCard({ label, mobileLabel, value, icon: Icon, color, iconBg, delta, onClick, alert, compact }) {
  const pad      = compact ? '11px 12px' : '14px 16px';
  const iconSize = compact ? 34 : 38;
  const iconFn   = compact ? 16 : 19;
  const valSize  = compact ? 15 : 18;
  const cornerW  = compact ? 16 : 22;
  const displayLabel = compact && mobileLabel ? mobileLabel : label;
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', background: C.surface,
        border: `1px solid ${alert ? color + '55' : C.border}`,
        borderRadius: 12, padding: pad,
        display: 'flex', alignItems: 'center', gap: compact ? 10 : 12,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        boxShadow: alert ? `0 0 0 2px ${color}22` : 'none',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.boxShadow = '0 2px 12px rgba(62,39,35,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = alert ? `0 0 0 2px ${color}22` : 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: cornerW, height: cornerW, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: cornerW, height: cornerW, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ width: iconSize, height: iconSize, borderRadius: 9, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 1px ${color}22` }}>
        <Icon sx={{ fontSize: iconFn, color }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: valSize, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: compact ? 3 : 4 }}>
          <p style={{ margin: 0, fontSize: compact ? 9 : 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</p>
          {!compact && delta !== undefined && <Delta value={delta} />}
        </div>
      </div>
      {onClick && !compact && <ChevronRightOutlinedIcon sx={{ fontSize: 15, color: C.textDim, flexShrink: 0 }} />}
    </div>
  );
}

function SectionHeader({ title, subtitle, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{title}</p>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim, fontWeight: 500 }}>{subtitle}</p>}
      </div>
      {action && (
        <button onClick={onAction} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 6,
          border: `1px solid ${C.border}`, background: C.surface,
          fontSize: 11, fontWeight: 600, color: C.textSec,
          cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {action} <ChevronRightOutlinedIcon sx={{ fontSize: 13 }} />
        </button>
      )}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, action, onAction, children }) {
  return (
    <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{title}</p>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim, fontWeight: 500 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
        {action && (
          <button onClick={onAction} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '4px 10px', borderRadius: 6,
            border: `1px solid ${C.border}`, background: 'transparent',
            fontSize: 11, fontWeight: 600, color: C.textSec,
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            whiteSpace: 'nowrap',
          }}>
            {action} <ChevronRightOutlinedIcon sx={{ fontSize: 12 }} />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    APPROVED: { bg: 'rgba(46,125,79,0.10)', color: C.success,  border: 'rgba(46,125,79,0.25)' },
    DENIED:   { bg: 'rgba(183,28,28,0.09)', color: C.error,    border: 'rgba(183,28,28,0.20)' },
    PENDING:  { bg: 'rgba(178,106,0,0.10)', color: C.warning,  border: 'rgba(178,106,0,0.25)' },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
      padding: '3px 8px', borderRadius: 20, flexShrink: 0,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}

function Skeleton({ height = 16, width = '100%', borderRadius = 6 }) {
  return (
    <div style={{
      height, width, borderRadius,
      background: 'linear-gradient(90deg, #EDE5E0 25%, #F5F3F1 50%, #EDE5E0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      flexShrink: 0,
    }} />
  );
}

function KpiCardSkeleton({ compact }) {
  const pad      = compact ? '11px 12px' : '14px 16px';
  const iconSize = compact ? 34 : 38;
  const valH     = compact ? 15 : 18;
  const lblH     = compact ? 9  : 10;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: pad,
      display: 'flex', alignItems: 'center', gap: compact ? 10 : 12,
    }}>
      <Skeleton height={iconSize} width={iconSize} borderRadius={9} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: compact ? 5 : 7 }}>
        <Skeleton height={valH} width="68%" />
        <Skeleton height={lblH} width="42%" />
      </div>
    </div>
  );
}

// ── Revenue chart ─────────────────────────────────────────────────────────────
function RevenueChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(62,39,35,0.12)', minWidth: 150 }}>
      <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      {payload.map((p) => {
        if (p.dataKey === 'revenue')      return <p key={p.dataKey} style={{ margin: '2px 0', fontSize: 14, fontWeight: 800, color: C.revenueColor, letterSpacing: '-0.3px' }}>{fmt$(p.value)}</p>;
        if (p.dataKey === 'transactions') return <p key={p.dataKey} style={{ margin: '2px 0', fontSize: 13, fontWeight: 700, color: C.txnColor, letterSpacing: '-0.3px' }}>{fmtNum(p.value)} txns</p>;
        if (p.dataKey === 'cumRevenue')   return <p key={p.dataKey} style={{ margin: '4px 0 2px', fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: '-0.2px', borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>Cumulative: {fmt$(p.value)}</p>;
        return null;
      })}
    </div>
  );
}

function RevenueChart({ data, loading, period }) {
  if (loading) return (
    <div style={{ padding: '16px 18px 14px' }}>
      <Skeleton height={230} borderRadius={8} />
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Skeleton height={10} width={72} />
        <Skeleton height={10} width={88} />
      </div>
    </div>
  );
  if (!data?.labels?.length) return <div style={{ padding: 24, textAlign: 'center', color: C.textDim, fontSize: 12 }}>No data for this period</div>;

  const isAllTime = period === 'all_time';
  let cumSum = 0;
  const chartData = data.labels.map((label, i) => {
    cumSum += data.revenue[i] ?? 0;
    return {
      label,
      revenue:      data.revenue[i]      ?? 0,
      transactions: data.transactions[i] ?? 0,
      ...(isAllTime ? { cumRevenue: cumSum } : {}),
    };
  });

  return (
    <div style={{ padding: '16px 8px 12px 0' }}>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={C.revenueColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={C.revenueColor} stopOpacity={0.01} />
            </linearGradient>
            {isAllTime && (
              <linearGradient id="cumGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={C.accent} stopOpacity={0.4} />
                <stop offset="100%" stopColor={C.accent} stopOpacity={1}   />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid vertical={false} stroke={C.chartGrid} strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fontWeight: 600, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            axisLine={false} tickLine={false} dy={6}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="rev"
            orientation="left"
            tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            tick={{ fontSize: 10, fontWeight: 600, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            axisLine={false} tickLine={false} width={48}
          />
          <YAxis
            yAxisId="txn"
            orientation="right"
            tickFormatter={(v) => v}
            tick={{ fontSize: 10, fontWeight: 600, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            axisLine={false} tickLine={false} width={32}
          />
          {isAllTime && (
            <YAxis yAxisId="cum" orientation="right" hide domain={[0, 'auto']} />
          )}
          <Tooltip content={<RevenueChartTooltip />} cursor={{ stroke: C.chartGrid, strokeWidth: 1.5, strokeDasharray: '4 3' }} />
          <Area
            yAxisId="rev" type="monotone" dataKey="revenue"
            stroke={C.revenueColor} strokeWidth={2.2} fill="url(#revGrad)"
            dot={false} activeDot={{ r: 4, fill: C.revenueColor, stroke: '#fff', strokeWidth: 2 }}
            name="Revenue"
          />
          <Bar
            yAxisId="txn" dataKey="transactions"
            fill={C.txnColor} opacity={0.55} radius={[2, 2, 0, 0]}
            maxBarSize={18}
            name="Transactions"
          />
          {isAllTime && (
            <Line
              yAxisId="cum" type="monotone" dataKey="cumRevenue"
              stroke="url(#cumGrad)" strokeWidth={2.5} fill="none"
              dot={false} activeDot={{ r: 4, fill: C.accent, stroke: '#fff', strokeWidth: 2 }}
              name="Cumulative"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ padding: '6px 20px 4px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="20" height="10" style={{ flexShrink: 0 }}>
            <rect x="0" y="4" width="20" height="6" rx="2" fill={C.revenueColor} fillOpacity={0.15} />
            <line x1="0" y1="4" x2="20" y2="4" stroke={C.revenueColor} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textDim }}>Revenue</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 10, background: C.txnColor, borderRadius: 2, opacity: 0.55 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textDim }}>Transactions</span>
        </div>
        {isAllTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="20" height="10" style={{ flexShrink: 0 }}>
              <line x1="0" y1="5" x2="20" y2="5" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textDim }}>Cumulative</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Employee Leaderboard ──────────────────────────────────────────────────────
function EmployeeLeaderboard({ employees, loading, onViewAll }) {
  return (
    <Card>
      <CardHeader title="Top Performers" subtitle="Revenue this period" action="View All" onAction={onViewAll} />
      <div>
        {loading ? (
          <div style={{ padding: '4px 16px 8px' }}>
            {[1,2,3].map((k, i) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                <Skeleton height={22} width={22} borderRadius={50} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skeleton height={12} width="65%" />
                  <Skeleton height={10} width="45%" />
                </div>
                <Skeleton height={13} width={56} />
              </div>
            ))}
          </div>
        ) : !employees?.length ? (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: C.textDim }}>No sales this period</div>
        ) : employees.map((emp, i) => (
          <div key={emp._id} style={{
            display: 'grid', gridTemplateColumns: '22px 1fr auto',
            gap: 10, alignItems: 'center',
            padding: '10px 16px',
            borderBottom: i < employees.length - 1 ? `1px solid ${C.border}` : 'none',
            background: i === 0 ? 'rgba(212,163,115,0.06)' : 'transparent',
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: i === 0 ? C.accent : C.tableHdr,
              color: i === 0 ? C.primary : C.textDim,
              fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {i === 0 ? <EmojiEventsOutlinedIcon sx={{ fontSize: 12 }} /> : i + 1}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {emp.name ?? 'Unknown'}
              </p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim, fontWeight: 500 }}>
                {emp.transactions} txns · avg {fmt$(emp.avgTicket)}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.textPri, whiteSpace: 'nowrap' }}>
              {fmt$(emp.revenue)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Payment Methods ───────────────────────────────────────────────────────────
function PaymentBreakdown({ methods, loading }) {
  if (loading) return (
    <Card>
      <CardHeader title="Payment Methods" subtitle="By revenue" />
      <div style={{ padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3].map((k) => (
          <div key={k}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <Skeleton height={11} width="38%" />
              <Skeleton height={11} width="22%" />
            </div>
            <Skeleton height={5} borderRadius={3} />
          </div>
        ))}
      </div>
    </Card>
  );

  const total = methods?.reduce((sum, m) => sum + m.total, 0) ?? 0;
  const colors = ['#3E2723', '#D4A373', '#0277BD', '#2E7D4F', '#B26A00'];

  return (
    <Card>
      <CardHeader title="Payment Methods" subtitle="By revenue this period" />
      <div style={{ padding: '8px 16px 14px' }}>
        {!methods?.length ? (
          <p style={{ fontSize: 12, color: C.textDim, textAlign: 'center', padding: '12px 0' }}>No payments this period</p>
        ) : methods.map((m, i) => {
          const pct = total > 0 ? Math.round((m.total / total) * 100) : 0;
          return (
            <div key={m._id} style={{ marginBottom: i < methods.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i] ?? C.textDim, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec }}>{m._id}</span>
                  <span style={{ fontSize: 10, color: C.textDim }}>({m.count})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textPri }}>{fmt$(m.total)}</span>
                  <span style={{ fontSize: 10, color: C.textDim, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: 5, background: C.tableHdr, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: colors[i] ?? C.textDim, borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Inventory Health ──────────────────────────────────────────────────────────
function InventoryHealth({ inventory, loading, onView }) {
  const lowCount = inventory?.lowStock?.length ?? 0;
  const outCount = inventory?.outOfStock?.length ?? 0;
  const hasAlerts = lowCount > 0 || outCount > 0;

  return (
    <Card>
      <CardHeader title="Inventory Health" subtitle="Stock alerts" action="View All" onAction={onView} />
      {loading ? (
        <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map((k) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
              <Skeleton height={11} width="55%" />
              <Skeleton height={11} width="18%" />
            </div>
          ))}
        </div>
      ) : !hasAlerts ? (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>All products in stock</p>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {outCount > 0 && (
            <div style={{ padding: '4px 16px 8px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.error, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Out of Stock ({outCount})
              </p>
              {inventory.outOfStock.map((p) => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.error, flexShrink: 0 }}>0 left</span>
                </div>
              ))}
            </div>
          )}
          {lowCount > 0 && (
            <div style={{ padding: '4px 16px 4px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.warning, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Low Stock ({lowCount})
              </p>
              {inventory.lowStock.map((p) => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.warning, flexShrink: 0 }}>{p.stockQty} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Active Shifts ─────────────────────────────────────────────────────────────
function ActiveShifts({ shifts, loading }) {
  const elapsed = (clockIn) => {
    const ms = Date.now() - new Date(clockIn).getTime();
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      {loading ? (
        <div>
          {[1,2].map((k, i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Skeleton height={30} width={30} borderRadius={8} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skeleton height={12} width={88} />
                  <Skeleton height={10} width={130} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                <Skeleton height={12} width={58} />
                <Skeleton height={10} width={38} />
              </div>
            </div>
          ))}
        </div>
      ) : !shifts?.length ? (
        <p style={{ fontSize: 12, color: C.textDim, margin: 0, padding: '4px 0' }}>No active shifts right now</p>
      ) : shifts.map((s) => (
        <div key={s._id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 0',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(46,125,79,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AccessTimeOutlinedIcon sx={{ fontSize: 15, color: C.success }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>{s.employee?.name ?? 'Unknown'}</p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>
                Clocked in {fmtTime(s.clockInTime)} · {elapsed(s.clockInTime)} ago
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>{fmt$(s.totalSales)}</p>
            <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>{s.totalTxn ?? 0} txns</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recent Overrides ──────────────────────────────────────────────────────────
function RecentOverrides({ overrides, loading, onViewAll }) {
  return (
    <Card>
      <CardHeader title="Recent Overrides" subtitle="Manager authorisations" action="View All" onAction={onViewAll} />
      {loading ? (
        <div>
          {[1,2,3,4].map((k, i) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '10px 16px', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Skeleton height={12} width="58%" />
                <Skeleton height={10} width="72%" />
              </div>
              <Skeleton height={20} width={62} borderRadius={20} />
            </div>
          ))}
        </div>
      ) : !overrides?.length ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: C.textDim }}>No overrides yet</div>
      ) : overrides.map((row, i, arr) => (
        <div key={row._id} style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          gap: 8, alignItems: 'center',
          padding: '10px 16px',
          borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
          background: i % 2 ? '#FDFCFB' : C.surface,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>
              {OVERRIDE_TYPE_LABEL[row.actionType] ?? row.actionType}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: C.textDim }}>
              {row.employeeId?.name ?? '—'} · {fmtTime(row.createdAt)}
              {row.amount ? ` · ${fmt$(row.amount)}` : ''}
            </p>
          </div>
          <StatusBadge status={row.status} />
        </div>
      ))}
    </Card>
  );
}

// ── Top Products ──────────────────────────────────────────────────────────────
function TopProducts({ products, loading, onView }) {
  return (
    <Card>
      <CardHeader title="Top Products" subtitle="By revenue this period" action="Inventory" onAction={onView} />
      <div style={{ padding: '4px 0 8px' }}>
        {loading ? (
          <div>
            {[1,2,3].map((k, i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Skeleton height={18} width={18} borderRadius={4} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Skeleton height={11} width={100} />
                    <Skeleton height={10} width={48} />
                  </div>
                </div>
                <Skeleton height={12} width={54} />
              </div>
            ))}
          </div>
        ) : !products?.length ? (
          <p style={{ padding: '12px 16px', fontSize: 12, color: C.textDim }}>No sales this period</p>
        ) : products.map((p, i) => (
          <div key={p._id ?? i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 16px',
            borderBottom: i < products.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                background: i === 0 ? C.accent + '33' : C.tableHdr,
                color: i === 0 ? C.primary : C.textDim,
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.textDim }}>Qty: {p.qty}</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, flexShrink: 0 }}>{fmt$(p.revenue)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions({ navigate }) {
  const ACTIONS = [
    { label: 'Transactions',  icon: ReceiptLongOutlinedIcon,  path: '/manager/transactions',  color: '#0277BD', bg: 'rgba(2,119,189,0.08)' },
    { label: 'Reports',       icon: AssessmentOutlinedIcon,   path: '/manager/reports',        color: C.primary, bg: 'rgba(62,39,35,0.08)' },
    { label: 'Inventory',     icon: InventoryOutlinedIcon,    path: '/manager/inventory',      color: '#2E7D4F', bg: 'rgba(46,125,79,0.08)' },
    { label: 'Employees',     icon: PeopleOutlinedIcon,       path: '/manager/employees',      color: C.warning, bg: 'rgba(178,106,0,0.08)' },
    { label: 'Customers',     icon: PersonSearchOutlinedIcon, path: '/manager/customers',      color: '#7B1FA2', bg: 'rgba(123,31,162,0.08)' },
    { label: 'Scheduling',    icon: CalendarTodayOutlinedIcon,path: '/manager/scheduling',     color: '#00695C', bg: 'rgba(0,105,92,0.08)' },
  ];

  return (
    <Card>
      <CardHeader title="Quick Actions" subtitle="Navigate to key sections" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0 }}>
        {ACTIONS.map((a, i) => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '14px 8px',
              border: 'none',
              borderRight: i < ACTIONS.length - 1 ? `1px solid ${C.border}` : 'none',
              background: 'transparent',
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = a.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 9, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <a.icon sx={{ fontSize: 18, color: a.color }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textAlign: 'center', letterSpacing: '0.02em' }}>{a.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function QuickActionsMobile({ navigate }) {
  const ACTIONS = [
    { label: 'Transactions',  icon: ReceiptLongOutlinedIcon,  path: '/manager/transactions',  color: '#0277BD', bg: 'rgba(2,119,189,0.08)' },
    { label: 'Reports',       icon: AssessmentOutlinedIcon,   path: '/manager/reports',        color: C.primary, bg: 'rgba(62,39,35,0.08)' },
    { label: 'Inventory',     icon: InventoryOutlinedIcon,    path: '/manager/inventory',      color: '#2E7D4F', bg: 'rgba(46,125,79,0.08)' },
    { label: 'Employees',     icon: PeopleOutlinedIcon,       path: '/manager/employees',      color: C.warning, bg: 'rgba(178,106,0,0.08)' },
    { label: 'Customers',     icon: PersonSearchOutlinedIcon, path: '/manager/customers',      color: '#7B1FA2', bg: 'rgba(123,31,162,0.08)' },
    { label: 'Schedule',      icon: CalendarTodayOutlinedIcon,path: '/manager/scheduling',     color: '#00695C', bg: 'rgba(0,105,92,0.08)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => navigate(a.path)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '12px 8px',
            border: `1px solid ${C.border}`, borderRadius: 12,
            background: C.surface, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 9, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <a.icon sx={{ fontSize: 17, color: a.color }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textAlign: 'center' }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Period Filter ─────────────────────────────────────────────────────────────
function PeriodFilter({ period, onChange }) {
  return (
    <div style={{ display: 'flex', background: C.tableHdr, borderRadius: 8, padding: 3, gap: 2 }}>
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          style={{
            padding: '5px 13px', borderRadius: 6, border: 'none',
            background: period === p.key ? C.primary : 'transparent',
            color:      period === p.key ? '#fff' : C.textSec,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.03em',
            transition: 'background 0.15s, color 0.15s',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerDashboardPage() {
  const navigate    = useNavigate();
  const isDesktop   = useMediaQuery('(min-width:1024px)');
  const token       = useAuthStore((s) => s.token);
  const { stopLoading } = useLoading();

  const [period, setPeriod]       = useState('today');
  const [data,   setData]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Debounce ref so socket events don't hammer the backend
  const debounceRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/api/dashboard/manager?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load dashboard');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[Dashboard] load error:', err);
    } finally {
      setLoading(false);
      stopLoading();
    }
  }, [period, token, stopLoading]);

  useEffect(() => { load(); }, [load]);

  // Real-time refresh — debounced 3 s to avoid cascade
  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(true), 3000);
  }, [load]);

  useSocketEvent('transaction:new',     scheduleRefresh);
  useSocketEvent('override:new',        scheduleRefresh);
  useSocketEvent('override:resolved',   scheduleRefresh);
  useSocketEvent('shift:update',        scheduleRefresh);
  useSocketEvent('inventory:lowstock',  scheduleRefresh);

  const kpi = data?.kpi ?? {};

  // ── KPI definitions ─────────────────────────────────────────────────────────
  const KPI_ROW1 = [
    { label: 'Gross Revenue',  mobileLabel: 'Gross Rev.',  value: fmt$(kpi.grossRevenue),      icon: AttachMoneyOutlinedIcon,    color: '#2E7D4F', iconBg: 'rgba(46,125,79,0.10)',   delta: kpi.revenueChange,   onClick: () => navigate('/manager/reports') },
    { label: 'Net Revenue',    mobileLabel: 'Net Rev.',    value: fmt$(kpi.netRevenue),         icon: TrendingUpOutlinedIcon,      color: '#0277BD', iconBg: 'rgba(2,119,189,0.10)',   delta: undefined,           onClick: () => navigate('/manager/reports') },
    { label: 'Transactions',   mobileLabel: 'Txns',        value: fmtNum(kpi.transactions),    icon: ReceiptLongOutlinedIcon,    color: C.primary, iconBg: 'rgba(62,39,35,0.08)',   delta: kpi.txnChange,       onClick: () => navigate('/manager/transactions') },
    { label: 'Avg. Ticket',    mobileLabel: 'Avg Ticket',  value: fmt$(kpi.avgTicket),          icon: LocalAtmOutlinedIcon,        color: '#B26A00', iconBg: 'rgba(178,106,0,0.10)',   delta: kpi.avgTicketChange, onClick: undefined },
    { label: 'Pending Actions',mobileLabel: 'Pending',     value: fmtNum(kpi.pendingOverrides), icon: PendingActionsOutlinedIcon, color: kpi.pendingOverrides > 0 ? C.error : C.textDim, iconBg: kpi.pendingOverrides > 0 ? 'rgba(183,28,28,0.09)' : C.tableHdr, alert: kpi.pendingOverrides > 0, onClick: () => navigate('/manager/overrides') },
  ];

  const KPI_ROW2 = [
    { label: 'Refunded',      mobileLabel: 'Refunded',   value: fmt$(kpi.refundedAmount),      icon: RefundIcon,            color: C.error,   iconBg: 'rgba(183,28,28,0.08)',  delta: undefined, onClick: undefined },
    { label: 'Discounts',     mobileLabel: 'Discounts',  value: fmt$(kpi.discountTotal),        icon: DiscountOutlinedIcon,  color: '#7B1FA2', iconBg: 'rgba(123,31,162,0.08)',  delta: undefined, onClick: undefined },
    { label: 'Void Sales',    mobileLabel: 'Voids',      value: fmtNum(kpi.voidCount),          icon: BlockOutlinedIcon,     color: C.warning, iconBg: 'rgba(178,106,0,0.10)',   delta: undefined, onClick: undefined },
    { label: 'Active Staff',  mobileLabel: 'Staff',      value: fmtNum(kpi.activeEmployees),   icon: PeopleOutlinedIcon,    color: '#00695C', iconBg: 'rgba(0,105,92,0.10)',    delta: undefined, onClick: () => navigate('/manager/scheduling') },
    { label: 'New Customers', mobileLabel: 'New Cust.',  value: fmtNum(kpi.newCustomers),       icon: PersonAddOutlinedIcon, color: '#7B1FA2', iconBg: 'rgba(123,31,162,0.08)',  delta: undefined, onClick: () => navigate('/manager/customers') },
  ];

  /* ══════════════════════════════════════════════════════
     DESKTOP
  ══════════════════════════════════════════════════════ */
  if (isDesktop) {
    return (
      <div style={{ padding: '26px 32px 48px', background: C.bg, minHeight: '100dvh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SpaceDashboardOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Executive Dashboard</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastRefresh && (
              <span style={{ fontSize: 10, color: C.textDim, fontWeight: 500 }}>
                Updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <PeriodFilter period={period} onChange={(p) => { setPeriod(p); }} />
            <button
              onClick={() => load()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.surface,
                fontSize: 12, fontWeight: 600, color: C.textSec,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <RefreshOutlinedIcon sx={{ fontSize: 15 }} /> Refresh
            </button>
          </div>
        </div>

        {/* ── KPI Row 1 ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
          {loading
            ? [1,2,3,4,5].map((k) => <KpiCardSkeleton key={k} />)
            : KPI_ROW1.map((m) => <KpiCard key={m.label} {...m} />)
          }
        </div>

        {/* ── KPI Row 2 ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {loading
            ? [1,2,3,4,5].map((k) => <KpiCardSkeleton key={k} />)
            : KPI_ROW2.map((m) => <KpiCard key={m.label} {...m} />)
          }
        </div>

        {/* ── Main body: chart + ops ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>
          {/* Revenue chart */}
          <Card>
            <CardHeader title="Revenue & Transactions" subtitle="Trend for selected period" />
            <RevenueChart data={data?.chart} loading={loading} period={period} />
          </Card>

          {/* Operations panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Active shifts */}
            <Card>
              <CardHeader
                title="Active Shifts"
                subtitle={`${kpi.activeEmployees ?? 0} employees clocked in`}
                action="Scheduling"
                onAction={() => navigate('/manager/scheduling')}
              />
              <div style={{ padding: '4px 16px 12px' }}>
                <ActiveShifts shifts={data?.activeShifts} loading={loading} />
              </div>
            </Card>

            {/* Overrides widget */}
            {kpi.pendingOverrides > 0 && (
              <div
                onClick={() => navigate('/manager/overrides')}
                style={{
                  background: 'rgba(183,28,28,0.07)', border: `1px solid rgba(183,28,28,0.25)`,
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PendingActionsOutlinedIcon sx={{ fontSize: 22, color: C.error }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>
                      {kpi.pendingOverrides} Pending Override{kpi.pendingOverrides > 1 ? 's' : ''}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#c62828' }}>Require your approval</p>
                  </div>
                </div>
                <ChevronRightOutlinedIcon sx={{ fontSize: 18, color: C.error }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom: leaderboard + payments + inventory ─────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <EmployeeLeaderboard
            employees={data?.topEmployees}
            loading={loading}
            onViewAll={() => navigate('/manager/reports')}
          />
          <PaymentBreakdown methods={data?.paymentMethods} loading={loading} />
          <InventoryHealth
            inventory={data?.inventory}
            loading={loading}
            onView={() => navigate('/manager/inventory')}
          />
        </div>

        {/* ── Top products + Recent overrides ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <TopProducts
            products={data?.topProducts}
            loading={loading}
            onView={() => navigate('/manager/inventory')}
          />
          <RecentOverrides
            overrides={data?.recentOverrides}
            loading={loading}
            onViewAll={() => navigate('/manager/overrides')}
          />
        </div>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        <QuickActions navigate={navigate} />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     MOBILE
  ══════════════════════════════════════════════════════ */
  const outOfStockCount = data?.inventory?.outOfStock?.length ?? 0;

  return (
    <div style={{ padding: '16px 14px 32px', maxWidth: 640, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .kpi-hscroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>Dashboard</h1>
        </div>
        <button
          onClick={() => load()}
          style={{
            width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <RefreshOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
        </button>
      </div>

      {/* Period filter — horizontally scrollable on narrow screens */}
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14 }}>
        <PeriodFilter period={period} onChange={setPeriod} />
      </div>

      {/* ── KPI cards: 2-row × 5-col horizontal scroll ──────────────────────── */}
      {/* Exactly 2 columns (4 cards) visible; scroll left to reveal the rest   */}
      <div
        className="kpi-hscroll"
        style={{
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          marginBottom: 14,
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          width: 'max-content',
        }}>
          {(() => {
            const all = loading
              ? [1,2,3,4,5,6,7,8,9,10].map((k) => ({ _k: k }))
              : [...KPI_ROW1, ...KPI_ROW2];
            // Group into columns: pair KPI_ROW1[i] with KPI_ROW2[i]
            const cols = [];
            for (let i = 0; i < Math.ceil(all.length / 2); i++) {
              cols.push([all[i * 2], all[i * 2 + 1]].filter(Boolean));
            }
            /* card width: 2 cards + 1 gap must fill the content area exactly
               content area = 100vw - 28px (14px padding each side)
               card_width = (100vw - 28px - 8px) / 2 = (100vw - 36px) / 2      */
            const colW = 'calc((100vw - 36px) / 2)';
            return cols.map((pair, ci) => (
              <div
                key={ci}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: colW,
                  minWidth: colW,
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                }}
              >
                {pair.map((item, ri) =>
                  loading
                    ? <KpiCardSkeleton key={ri} compact />
                    : <KpiCard key={item.label} {...item} compact />
                )}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Revenue chart */}
      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="Revenue & Transactions" subtitle="Trend for selected period" />
        <RevenueChart data={data?.chart} loading={loading} period={period} />
      </Card>

      {/* Active shifts */}
      <Card style={{ marginBottom: 14 }}>
        <CardHeader
          title="Active Shifts"
          subtitle={`${kpi.activeEmployees ?? 0} clocked in`}
          action="Schedule"
          onAction={() => navigate('/manager/scheduling')}
        />
        <div style={{ padding: '4px 14px 12px' }}>
          <ActiveShifts shifts={data?.activeShifts} loading={loading} />
        </div>
      </Card>

      {/* Top performers */}
      <div style={{ marginBottom: 14 }}>
        <EmployeeLeaderboard
          employees={data?.topEmployees}
          loading={loading}
          onViewAll={() => navigate('/manager/reports')}
        />
      </div>

      {/* Payment methods */}
      <div style={{ marginBottom: 14 }}>
        <PaymentBreakdown methods={data?.paymentMethods} loading={loading} />
      </div>

      {/* Inventory health */}
      <div style={{ marginBottom: 14 }}>
        <InventoryHealth
          inventory={data?.inventory}
          loading={loading}
          onView={() => navigate('/manager/inventory')}
        />
      </div>

      {/* Top products */}
      <div style={{ marginBottom: 14 }}>
        <TopProducts
          products={data?.topProducts}
          loading={loading}
          onView={() => navigate('/manager/inventory')}
        />
      </div>

      {/* Recent overrides */}
      <div style={{ marginBottom: 16 }}>
        <RecentOverrides
          overrides={data?.recentOverrides}
          loading={loading}
          onViewAll={() => navigate('/manager/overrides')}
        />
      </div>

      {/* Quick actions */}
      <SectionHeader title="Quick Actions" />
      <QuickActionsMobile navigate={navigate} />

      {/* ── Alert banners — at the very bottom ───────────────────────────────── */}
      {(kpi.pendingOverrides > 0 || outOfStockCount > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {kpi.pendingOverrides > 0 && (
            <div
              onClick={() => navigate('/manager/overrides')}
              style={{
                background: 'rgba(183,28,28,0.07)', border: '1px solid rgba(183,28,28,0.25)',
                borderRadius: 10, padding: '11px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PendingActionsOutlinedIcon sx={{ fontSize: 18, color: C.error }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.error }}>
                  {kpi.pendingOverrides} Pending Override{kpi.pendingOverrides > 1 ? 's' : ''} — Tap to review
                </p>
              </div>
              <ChevronRightOutlinedIcon sx={{ fontSize: 16, color: C.error }} />
            </div>
          )}
          {outOfStockCount > 0 && (
            <div
              onClick={() => navigate('/manager/inventory')}
              style={{
                background: 'rgba(183,28,28,0.06)', border: '1px solid rgba(183,28,28,0.20)',
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: C.error }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.error }}>
                  {outOfStockCount} product{outOfStockCount > 1 ? 's' : ''} out of stock
                </p>
              </div>
              <ChevronRightOutlinedIcon sx={{ fontSize: 16, color: C.error }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
