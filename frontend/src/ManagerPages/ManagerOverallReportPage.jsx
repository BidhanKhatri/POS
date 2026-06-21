import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ComposedChart, Line, Cell, ReferenceLine,
  PieChart, Pie,
} from 'recharts';
import TrendingUpIcon      from '@mui/icons-material/TrendingUp';
import TrendingDownIcon    from '@mui/icons-material/TrendingDown';
import AttachMoneyOutlinedIcon  from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon  from '@mui/icons-material/ReceiptLongOutlined';
import TrendingUpOutlinedIcon   from '@mui/icons-material/TrendingUpOutlined';
import PaymentsOutlinedIcon     from '@mui/icons-material/PaymentsOutlined';
import AssessmentOutlinedIcon   from '@mui/icons-material/AssessmentOutlined';
import ReceiptOutlinedIcon      from '@mui/icons-material/ReceiptOutlined';
import DownloadOutlinedIcon     from '@mui/icons-material/DownloadOutlined';
import RefreshOutlinedIcon      from '@mui/icons-material/RefreshOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import LightbulbOutlinedIcon    from '@mui/icons-material/LightbulbOutlined';
import EmojiEventsOutlinedIcon  from '@mui/icons-material/EmojiEventsOutlined';
import {
  useReportSummary, useReportTrend, useReportPayments,
  useReportProducts, useReportAnomalies, useReportInsights,
  useReportCashiers, buildDateRange, useExportCSV,
} from '../hooks/useReportQuery';

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9',
  dataBlue: '#4C78A8', dataTeal: '#72B7B2', dataGreen: '#54A24B',
  dataAmber: '#EECA3B', dataOrange: '#F58518', dataPurple: '#B279A2',
};

const RANGES = [
  { id: 'overall', label: 'All Time' },
  { id: 'today',   label: 'Today'    },
  { id: 'week',    label: 'Week'     },
  { id: 'month',   label: 'Month'    },
  { id: 'year',    label: 'Year'     },
];

const METHOD_COLORS = { CASH: C.dataBlue, CREDIT: C.dataTeal, DEBIT: C.dataGreen, MISC: C.dataAmber };
const YEAR_COLORS = [C.dataBlue, C.dataTeal, C.dataGreen, C.dataAmber, C.dataOrange, C.dataPurple];

function fmt$(n) { return n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtY(v) { return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`; }
function axisStyle() { return { fontSize: 11, fontWeight: 600, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatPeriod(period) {
  if (!period) return period;
  // Hourly: "2026-06-21T14"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(period)) {
    const h = parseInt(period.slice(11), 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12} ${ampm}`;
  }
  // Daily: "2026-06-21"
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [, m, d] = period.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
  }
  // Monthly: "2026-06"
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
  }
  // Weekly: "2026-W25"
  if (/^\d{4}-W\d{2}$/.test(period)) return `Wk ${parseInt(period.slice(6), 10)}`;
  return period;
}

function DeltaBadge({ value }) {
  if (value == null) return null;
  const up   = value >= 0;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: up ? C.success : C.error }}>
      <Icon sx={{ fontSize: 13 }} />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, iconBg, delta }) {
  return (
    <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 20, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: '26px' }}>{value}</p>
        {sub && <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: C.textDim }}>{sub}</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
          <DeltaBadge value={delta} />
        </div>
      </div>
    </div>
  );
}

function ChartShell({ title, sub, children, action }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>{title}</p>
          {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>{sub}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding: '14px 6px 8px 0' }}>{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px', boxShadow: '0 4px 16px rgba(62,39,35,0.10)' }}>
      <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatPeriod(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.stroke, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.textSec, flex: 1 }}>{p.name || p.dataKey}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>${Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  );
}

function TodayBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px', boxShadow: '0 4px 16px rgba(62,39,35,0.10)' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatPeriod(label)}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>${Number(p.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  );
}

function TodayPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 13px', boxShadow: '0 4px 16px rgba(62,39,35,0.10)' }}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.name}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: p.payload.color }}>${Number(p.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>{p.payload.share}% of total</p>
    </div>
  );
}

// Custom donut label rendered inside the chart
function DonutLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontFamily="'Plus Jakarta Sans', sans-serif">
      <tspan x={cx} dy="-8" fontSize="10" fontWeight="700" fill={C.textDim} textTransform="uppercase" letterSpacing="1">TOTAL</tspan>
      <tspan x={cx} dy="20" fontSize="15" fontWeight="800" fill={C.textPri}>${Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</tspan>
    </text>
  );
}

function TodayTrendChart({ data, summaryData }) {
  const total      = data.reduce((s, d) => s + (d.Revenue || 0), 0);
  const firstVal   = summaryData?.firstSaleAmount  ?? 0;
  const midDayVal  = summaryData?.midDaySaleAmount ?? 0;

  const fmtTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const firstTime  = fmtTime(summaryData?.firstSaleTime);
  const midDayTime = fmtTime(summaryData?.midDaySaleTime);

  const barData = [
    { name: 'Opening',       label: firstTime  ? `First sale · ${firstTime}`   : 'No sales yet', value: firstVal,  fill: C.dataGreen  },
    { name: 'Mid-Day',       label: midDayTime ? `Closest to noon · ${midDayTime}` : 'No sales yet', value: midDayVal, fill: C.dataAmber  },
    { name: 'Total Revenue', label: 'Sum of all sales today',                                     value: total,     fill: C.dataBlue   },
  ];

  // Pie: Opening + Mid-Day as slices of the total; remainder = rest of day
  const totalSafe  = total || 1;
  const restVal    = Math.max(0, total - firstVal - midDayVal);
  const pieData = [
    { name: 'Opening', value: firstVal,  color: C.dataGreen, share: ((firstVal  / totalSafe) * 100).toFixed(1) },
    { name: 'Mid-Day', value: midDayVal, color: C.dataAmber, share: ((midDayVal / totalSafe) * 100).toFixed(1) },
    { name: 'Rest',    value: restVal,   color: C.dataBlue,  share: ((restVal   / totalSafe) * 100).toFixed(1) },
  ];

  const noData = total === 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 0, alignItems: 'center', padding: '0 8px 8px' }}>

      {/* Bar chart */}
      <div>
        <div style={{ display: 'flex', gap: 10, paddingLeft: 8, paddingBottom: 10, flexWrap: 'wrap' }}>
          {barData.map((b, i) => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: b.fill }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec }}>{b.name}</span>
            </div>
          ))}
        </div>
        {noData ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 12, color: C.textDim }}>No sales recorded yet today</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="#EDE5E0" />
              <XAxis dataKey="name" tick={axisStyle()} axisLine={false} tickLine={false} dy={8} />
              <YAxis tickFormatter={fmtY} tick={axisStyle()} axisLine={false} tickLine={false} width={50} dx={-4} />
              <Tooltip content={<TodayBarTooltip />} cursor={{ fill: 'rgba(237,229,224,0.35)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {barData.map((entry, index) => (
                  <Cell key={`bc-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Sub-labels under bars */}
        {!noData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: '4px 8px 0', marginTop: -4 }}>
            {barData.map(b => (
              <p key={b.name} style={{ margin: 0, fontSize: 9, color: C.textDim, textAlign: 'center', lineHeight: '12px' }}>{b.label}</p>
            ))}
          </div>
        )}
      </div>

      {/* Donut pie chart */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {noData ? (
          <div style={{ width: 160, height: 160, borderRadius: '50%', border: `2px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: C.textDim, textAlign: 'center', margin: 0, padding: '0 12px' }}>Awaiting sales</p>
          </div>
        ) : (
          <PieChart width={190} height={190}>
            <Pie
              data={pieData}
              cx={95} cy={95}
              innerRadius={54} outerRadius={82}
              paddingAngle={3}
              dataKey="value"
              startAngle={90} endAngle={-270}
            >
              {pieData.map((entry, index) => (
                <Cell key={`pie-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<TodayPieTooltip />} />
            <DonutLabel cx={95} cy={95} total={total} />
          </PieChart>
        )}
        {/* Pie legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', padding: '0 12px' }}>
          {pieData.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: C.textSec }}>{p.name}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.textPri }}>{p.share}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function AllTimeTrendChart({ data }) {
  // Group monthly periods by year for the donut
  const yearMap = {};
  for (const d of data) {
    const year = (d.period || '').slice(0, 4);
    if (!year) continue;
    yearMap[year] = (yearMap[year] || 0) + (d.Revenue || 0);
  }

  const total     = Object.values(yearMap).reduce((s, v) => s + v, 0);
  const totalSafe = total || 1;

  const pieData = Object.entries(yearMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, value], i) => ({
      name:  year,
      value,
      color: YEAR_COLORS[i % YEAR_COLORS.length],
      share: ((value / totalSafe) * 100).toFixed(1),
    }));

  // Assign each monthly bar the color of its year
  const yearColorMap = {};
  pieData.forEach(p => { yearColorMap[p.name] = p.color; });

  const barData = data.map(d => ({
    name:  d.period,
    value: d.Revenue || 0,
    fill:  yearColorMap[(d.period || '').slice(0, 4)] || C.dataBlue,
  }));

  const noData = total === 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 0, alignItems: 'center', padding: '0 8px 8px' }}>

      {/* Monthly bar chart */}
      <div>
        <div style={{ display: 'flex', gap: 10, paddingLeft: 8, paddingBottom: 10, flexWrap: 'wrap' }}>
          {pieData.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec }}>{p.name}</span>
            </div>
          ))}
        </div>
        {noData ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 12, color: C.textDim }}>No sales data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="#EDE5E0" />
              <XAxis dataKey="name" tickFormatter={formatPeriod} tick={axisStyle()} axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd" />
              <YAxis tickFormatter={fmtY} tick={axisStyle()} axisLine={false} tickLine={false} width={50} dx={-4} />
              <Tooltip content={<TodayBarTooltip />} cursor={{ fill: 'rgba(237,229,224,0.35)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {barData.map((entry, index) => (
                  <Cell key={`atbc-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Yearly donut */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {noData ? (
          <div style={{ width: 160, height: 160, borderRadius: '50%', border: `2px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: C.textDim, textAlign: 'center', margin: 0, padding: '0 12px' }}>No data</p>
          </div>
        ) : (
          <PieChart width={190} height={190}>
            <Pie
              data={pieData}
              cx={95} cy={95}
              innerRadius={54} outerRadius={82}
              paddingAngle={3}
              dataKey="value"
              startAngle={90} endAngle={-270}
            >
              {pieData.map((entry, index) => (
                <Cell key={`atpie-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<TodayPieTooltip />} />
            <DonutLabel cx={95} cy={95} total={total} />
          </PieChart>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', padding: '0 12px' }}>
          {pieData.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: C.textSec }}>{p.name}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.textPri }}>{p.share}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function SkeletonBlock({ h = 20, w = '100%', radius = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: radius, background: C.elevated, animation: 'pulse 1.4s ease infinite alternate' }} />;
}

function LoadingKpis() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14 }}>
          <SkeletonBlock h={40} w={40} radius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonBlock h={22} w="70%" />
            <SkeletonBlock h={12} w="50%" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertBanner({ alerts }) {
  const [dismissed, setDismissed] = useState([]);
  const visible = alerts.filter((_, i) => !dismissed.includes(i));
  if (!visible.length) return null;
  const severityColor = { HIGH: C.error, MEDIUM: C.warning, LOW: C.info };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      {visible.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${severityColor[a.severity] || C.border}`, background: `${severityColor[a.severity] || C.border}10` }}>
          <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: severityColor[a.severity], flexShrink: 0, mt: '1px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>{a.title}</p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textSec }}>{a.detail}</p>
          </div>
          <button onClick={() => setDismissed(d => [...d, i])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.textDim, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      ))}
    </div>
  );
}

function InsightsPanel({ insights }) {
  const [open, setOpen] = useState(false);
  if (!insights?.length) return null;
  const iconMap = { warning: WarningAmberOutlinedIcon, star: EmojiEventsOutlinedIcon, info: LightbulbOutlinedIcon };
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginTop: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <LightbulbOutlinedIcon sx={{ fontSize: 16, color: C.accent }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.textPri }}>Insights & Recommendations</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${C.accent}25`, color: C.warning }}>{insights.length}</span>
        <span style={{ fontSize: 14, color: C.textDim, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 0' }}>
          {insights.map((ins, i) => {
            const Icon = iconMap[ins.icon] || LightbulbOutlinedIcon;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 18px', borderBottom: i < insights.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <Icon sx={{ fontSize: 16, color: ins.type === 'PRODUCT_RISK' ? C.error : ins.type === 'PERFORMANCE' ? C.accent : C.info, flexShrink: 0, mt: '1px' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{ins.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSec }}>{ins.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ManagerOverallReportPage() {
  const [range, setRange] = useState('today');
  const dr = buildDateRange(range);
  const { start, end, compareStart, compareEnd, groupBy } = dr;

  const summary  = useReportSummary({ start, end, compareStart, compareEnd });
  const trend    = useReportTrend({ start, end, groupBy, compareStart, compareEnd });
  const payments = useReportPayments({ start, end });
  const products = useReportProducts({ start, end, limit: 10, sortBy: 'revenue' });
  const cashiers = useReportCashiers({ start, end });
  const anomalies = useReportAnomalies({ start, end });
  const insights  = useReportInsights({ start, end });
  const exportCSV = useExportCSV();

  const handleExport = useCallback(async () => {
    try { await exportCSV({ start, end }); }
    catch (e) { console.error('Export failed', e); }
  }, [exportCSV, start, end]);

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['report'] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const cur    = summary.data?.current;
  const deltas = summary.data?.deltas;

  const trendData = (() => {
    const curr  = trend.data?.current || [];
    const prior = trend.data?.prior   || [];
    if (!prior.length) return curr.map(d => ({ period: d.period, Revenue: d.netRevenue, Transactions: d.txnCount }));
    const priorMap = {};
    prior.forEach(d => { priorMap[d.period] = d.netRevenue; });
    return curr.map(d => ({ period: d.period, Revenue: d.netRevenue, 'Prior Period': priorMap[d.period] ?? null, Transactions: d.txnCount }));
  })();

  const isToday   = range === 'today';
  const isOverall = range === 'overall';

  return (
    <div style={{ padding: '28px 32px 40px', background: C.bg, minHeight: '100dvh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AssessmentOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Reports</p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Overall Reports</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Range */}
          <div style={{ display: 'flex', gap: 3, background: C.elevated, borderRadius: 10, padding: 3 }}>
            {RANGES.map(({ id, label }) => {
              const active = range === id;
              return (
                <button key={id} onClick={() => setRange(id)} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: active ? C.surface : 'transparent', cursor: 'pointer', boxShadow: active ? '0 1px 4px rgba(62,39,35,0.12)' : 'none', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? C.primary : C.textDim, transition: 'all 0.15s' }}>
                  {label}
                </button>
              );
            })}
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: refreshing ? C.textDim : C.textSec, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.7 : 1 }}>
            <RefreshOutlinedIcon sx={{ fontSize: 15, animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: C.primary, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            <DownloadOutlinedIcon sx={{ fontSize: 15 }} /> Export CSV
          </button>
        </div>
      </div>

      {/* Alerts */}
      {anomalies.data?.length > 0 && <AlertBanner alerts={anomalies.data} />}

      {/* KPI Cards */}
      {summary.isLoading ? <LoadingKpis /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <KpiCard label="Net Revenue"    value={fmt$(cur?.netRevenue)}     sub={`Gross ${fmt$(cur?.grossRevenue)}`}             icon={AttachMoneyOutlinedIcon} color={C.success} iconBg="rgba(46,125,79,0.10)"  delta={deltas?.netRevenue} />
          <KpiCard label="Transactions"   value={cur?.txnCount ?? '—'}      sub={`Avg ticket ${fmt$(cur?.avgTicket)}`}            icon={ReceiptLongOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.10)"  delta={deltas?.txnCount} />
          <KpiCard label="Refund Rate"    value={`${cur?.refundRate ?? 0}%`} sub={`${cur?.refundCount ?? 0} refunds · ${fmt$(cur?.refundedAmount)}`} icon={PaymentsOutlinedIcon}    color={C.error}   iconBg="rgba(183,28,28,0.09)"  delta={deltas?.refundedAmount != null ? -deltas.refundedAmount : null} />
          <KpiCard label="Tax Collected"  value={fmt$(cur?.taxTotal)}       sub={`Discounts ${fmt$(cur?.discountTotal)}`}         icon={ReceiptOutlinedIcon}    color={C.warning} iconBg="rgba(178,106,0,0.10)"  delta={deltas?.taxTotal} />
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>

        {/* Revenue Trend */}
        <ChartShell
          title="Revenue Trend"
          sub={isToday
            ? 'Opening sale · total revenue · last sale — with composition breakdown'
            : isOverall
            ? 'Monthly revenue bars colored by year · donut shows each year\'s share of all-time revenue'
            : `Net revenue over the selected period${compareStart ? ' vs. prior period' : ''}`}
        >
          {trend.isLoading ? <SkeletonBlock h={248} radius={0} /> : isToday ? (
            <TodayTrendChart data={trendData} summaryData={cur} />
          ) : isOverall ? (
            <AllTimeTrendChart data={trendData} />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={trendData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.dataBlue} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.dataBlue} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.dataTeal} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={C.dataTeal} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EDE5E0" />
                <XAxis dataKey="period" tickFormatter={formatPeriod} tick={axisStyle()} axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtY} tick={axisStyle()} axisLine={false} tickLine={false} width={50} dx={-4} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#EDE5E0', strokeWidth: 1.5, strokeDasharray: '4 3' }} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600, color: C.textSec, paddingTop: 6 }} />
                {trendData[0]?.['Prior Period'] !== undefined && (
                  <Area type="monotone" dataKey="Prior Period" stroke={C.dataTeal} strokeWidth={1.5} strokeDasharray="5 3" fill="url(#grad2)" dot={false} activeDot={{ r: 4, fill: C.dataTeal, stroke: '#fff', strokeWidth: 2 }} />
                )}
                <Area type="monotone" dataKey="Revenue" stroke={C.dataBlue} strokeWidth={2.5} fill="url(#grad1)" dot={false} activeDot={{ r: 5, fill: C.dataBlue, stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartShell>

        {/* Payment Methods */}
        <ChartShell title="Payment Methods" sub="Revenue by tender type">
          {payments.isLoading ? <SkeletonBlock h={230} radius={0} /> : (
            <div style={{ padding: '0 12px 4px' }}>
              {(payments.data?.methods || []).map((m, i, arr) => (
                <div key={m.method} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: METHOD_COLORS[m.method] || C.textDim, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.textPri }}>{m.method}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{fmt$(m.amount)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim, background: C.elevated, borderRadius: 5, padding: '2px 7px' }}>{m.share}%</span>
                </div>
              ))}
              {payments.data?.dailySeries?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={payments.data.dailySeries} barSize={8} barCategoryGap="20%">
                      <XAxis dataKey="date" tickFormatter={formatPeriod} tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} dy={4} interval="preserveStartEnd" />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(237,229,224,0.4)' }} />
                      {['CASH', 'CREDIT', 'DEBIT', 'MISC'].map(m => (
                        <Bar key={m} dataKey={m} stackId="a" fill={METHOD_COLORS[m]} radius={m === 'MISC' ? [2, 2, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {(!payments.data?.methods?.length) && (
                <p style={{ textAlign: 'center', fontSize: 12, color: C.textDim, padding: '32px 0' }}>No payment data for this period</p>
              )}
            </div>
          )}
        </ChartShell>
      </div>

      {/* Top Products */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 0 }}>
        <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>Top Products</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>Ranked by net revenue · real-time from sales data</p>
        </div>
        {products.isLoading ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4, 5].map(i => <SkeletonBlock key={i} h={16} />)}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 90px 90px 90px 80px', gap: 8, padding: '8px 20px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
              {['#', 'Product', 'SKU', 'Qty Sold', 'Revenue', 'Refunds', 'Refund Rate'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</span>
              ))}
            </div>
            {products.data?.length ? products.data.map((p, i) => (
              <div key={String(p.productId)} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 90px 90px 90px 80px', gap: 8, alignItems: 'center', padding: '12px 20px', borderBottom: i < products.data.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 ? '#FDFCFB' : C.surface }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? C.primary : C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: i === 0 ? C.accent : C.textDim }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{p.productName}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, fontFamily: 'monospace' }}>{p.sku}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>{p.qtySold}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.success }}>{fmt$(p.netRevenue)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: p.refundedAmt > 0 ? C.error : C.textDim }}>{fmt$(p.refundedAmt)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: p.refundRate > 5 ? C.error : p.refundRate > 2 ? C.warning : C.success }}>
                  {p.refundRate.toFixed(1)}%
                </span>
              </div>
            )) : (
              <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: C.textDim }}>No sales data for this period</p>
            )}
          </>
        )}
      </div>

      {/* Employee Sales Report */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>Employee Sales Report</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>Detailed performance breakdown per employee · ranked by net revenue</p>
        </div>
        {cashiers.isLoading ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} h={16} />)}
          </div>
        ) : cashiers.data?.length ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: C.tableHdr }}>
                    {['#', 'Employee', 'Role', 'Transactions', 'Items Sold', 'Gross Revenue', 'Net Revenue', 'Discounts', 'Avg Ticket', 'Rev / Hr', 'Voids', 'Refunds', 'Hours'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', textAlign: h === '#' ? 'center' : 'left', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cashiers.data.map((emp, i) => (
                    <tr key={String(emp.employeeId)} style={{ background: i % 2 ? '#FDFCFB' : C.surface }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? C.primary : C.elevated, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: i === 0 ? C.accent : C.textDim }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{emp.name}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, fontFamily: 'monospace' }}>{emp.employeeCode}</p>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: C.elevated, color: C.textSec }}>{emp.role}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.textSec }}>{emp.txnCount}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.textSec }}>{emp.itemsSold}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.textPri }}>{fmt$(emp.revenue)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: C.success }}>{fmt$(emp.netRevenue)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: emp.discountTotal > 0 ? C.warning : C.textDim }}>{fmt$(emp.discountTotal)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.textSec }}>{fmt$(emp.avgTicket)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: emp.revenuePerHour > 0 ? C.info : C.textDim }}>{emp.revenuePerHour > 0 ? fmt$(emp.revenuePerHour) : '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: emp.voidCount > 0 ? C.error : C.textDim }}>{emp.voidCount}</span>
                        {emp.voidCount > 0 && <span style={{ fontSize: 10, color: C.textDim, marginLeft: 4 }}>({emp.voidRate.toFixed(1)}%)</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: emp.approvedRefunds > 0 ? C.error : C.textDim }}>{emp.approvedRefunds}</span>
                        {emp.approvedRefunds > 0 && <span style={{ fontSize: 10, color: C.textDim, marginLeft: 4 }}>({emp.refundRate.toFixed(1)}%)</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.textSec }}>{emp.hoursWorked > 0 ? `${emp.hoursWorked}h` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Summary footer row */}
            <div style={{ display: 'flex', gap: 24, padding: '12px 20px', borderTop: `1px solid ${C.border}`, background: C.tableHdr, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Employees</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: C.textPri }}>{cashiers.data.length}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Transactions</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: C.textPri }}>{cashiers.data.reduce((s, e) => s + e.txnCount, 0)}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Net Revenue</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: C.success }}>{fmt$(cashiers.data.reduce((s, e) => s + e.netRevenue, 0))}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Discounts</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: C.warning }}>{fmt$(cashiers.data.reduce((s, e) => s + e.discountTotal, 0))}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Voids</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: C.error }}>{cashiers.data.reduce((s, e) => s + e.voidCount, 0)}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Refunds</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: C.error }}>{cashiers.data.reduce((s, e) => s + e.approvedRefunds, 0)}</p>
              </div>
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: C.textDim }}>No employee sales data for this period</p>
        )}
      </div>

      {/* Insights */}
      {insights.data && <InsightsPanel insights={insights.data} />}

      <style>{`
        @keyframes pulse { from { opacity: 1; } to { opacity: 0.5; } }
        @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
