import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import CalendarTodayOutlinedIcon  from '@mui/icons-material/CalendarTodayOutlined';
import DateRangeOutlinedIcon      from '@mui/icons-material/DateRangeOutlined';
import AttachMoneyOutlinedIcon    from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon    from '@mui/icons-material/ReceiptLongOutlined';
import TrendingUpOutlinedIcon     from '@mui/icons-material/TrendingUpOutlined';
import PaymentsOutlinedIcon       from '@mui/icons-material/PaymentsOutlined';

/* ── Design tokens ── */
const C = {
  primary:  '#3E2723',
  accent:   '#D4A373',
  success:  '#2E7D4F',
  warning:  '#B26A00',
  error:    '#B71C1C',
  info:     '#0277BD',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  border:   '#DDD2CC',
  surface:  '#ffffff',
  bg:       '#F5F3F1',
  elevated: '#EFE7E2',
  tableHdr: '#F3EDE9',
  /* chart data palette — AGENTS.md */
  dataBlue:   '#4C78A8',
  dataTeal:   '#72B7B2',
  dataGreen:  '#54A24B',
  dataAmber:  '#EECA3B',
  dataOrange: '#F58518',
  dataPurple: '#B279A2',
};

const TABS = [
  { id: 'overall',  label: 'Overall',  short: 'All'  },
  { id: 'daily',    label: 'Daily',    short: 'Day'  },
  { id: 'weekly',   label: 'Weekly',   short: 'Wks'  },
  { id: 'monthly',  label: 'Monthly',  short: 'Mth'  },
  { id: 'annual',   label: 'Annual',   short: 'Yr'   },
  { id: 'employee', label: 'Employee', short: 'Emp'  },
];

/* ── Mock data ── */
const WEEKLY_DAYS = [
  { label: 'Mon', sales: 8420  },
  { label: 'Tue', sales: 7380  },
  { label: 'Wed', sales: 9140  },
  { label: 'Thu', sales: 10620 },
  { label: 'Fri', sales: 12480 },
  { label: 'Sat', sales: 18940 },
  { label: 'Sun', sales: 15760 },
];

const WEEKLY_STATS = {
  totalSales: '$82,740', transactions: '1,238', bestDay: 'Saturday', refunds: '$640',
};

const DAILY_HOURLY = [
  { label: '8am',  sales: 320  },
  { label: '9am',  sales: 580  },
  { label: '10am', sales: 940  },
  { label: '11am', sales: 760  },
  { label: '12pm', sales: 1320 },
  { label: '1pm',  sales: 1080 },
  { label: '2pm',  sales: 870  },
  { label: '3pm',  sales: 990  },
  { label: '4pm',  sales: 1140 },
  { label: '5pm',  sales: 1560 },
  { label: '6pm',  sales: 1220 },
  { label: '7pm',  sales: 680  },
];

const DAILY_PAYMENT = [
  { method: 'Cash',        amount: 3820, pct: '38%', color: C.dataBlue   },
  { method: 'Credit Card', amount: 3240, pct: '32%', color: C.dataTeal   },
  { method: 'Debit Card',  amount: 2180, pct: '22%', color: C.dataGreen  },
  { method: 'Misc',        amount: 760,  pct: '8%',  color: C.dataAmber  },
];

const DAILY_TXNS = [
  { time: '07:42 AM', product: 'P3 · Product 3', method: 'Cash',        amount: '$45.00',  type: 'SALE'   },
  { time: '08:15 AM', product: 'P1 · Product 1', method: 'Credit Card', amount: '$120.00', type: 'SALE'   },
  { time: '09:02 AM', product: 'P7 · Product 7', method: 'Debit Card',  amount: '$38.50',  type: 'SALE'   },
  { time: '09:44 AM', product: 'P2 · Product 2', method: 'Cash',        amount: '$22.00',  type: 'REFUND' },
  { time: '10:18 AM', product: 'P5 · Product 5', method: 'Misc',        amount: '$67.00',  type: 'SALE'   },
];

const MONTHLY_DAILY = Array.from({ length: 30 }, (_, i) => ({
  label: `${i + 1}`,
  sales: Math.floor(3000 + Math.sin(i / 3) * 1500 + Math.random() * 800),
}));

const MONTHLY_STATS = {
  totalSales: '$124,380', transactions: '1,847', refunds: '$2,140', bestDay: 'Sat 14th',
};

const ANNUAL_MONTHLY = [
  { label: 'Jan', sales: 42000 }, { label: 'Feb', sales: 38500 },
  { label: 'Mar', sales: 51200 }, { label: 'Apr', sales: 47800 },
  { label: 'May', sales: 55600 }, { label: 'Jun', sales: 62100 },
  { label: 'Jul', sales: 58400 }, { label: 'Aug', sales: 64200 },
  { label: 'Sep', sales: 59100 }, { label: 'Oct', sales: 67800 },
  { label: 'Nov', sales: 72400 }, { label: 'Dec', sales: 89600 },
];

const ANNUAL_STATS = {
  totalRevenue: '$708,700', transactions: '21,340', bestMonth: 'December', growth: '+14.2%',
};

const EMPLOYEES = [
  { name: 'Sarah Jenkins',   code: '402', sales: '$18,420', txns: 284, avg: '$64.86', hours: '162h' },
  { name: 'Michael Chen',    code: '305', sales: '$15,980', txns: 241, avg: '$66.31', hours: '148h' },
  { name: 'Elena Rodriguez', code: '412', sales: '$21,340', txns: 318, avg: '$67.10', hours: '174h' },
  { name: 'Kevin Stewart',   code: '09',  sales: '$12,760', txns: 196, avg: '$65.10', hours: '136h' },
  { name: 'Amy Lin',         code: '307', sales: '$9,880',  txns: 152, avg: '$65.00', hours: '112h' },
];

/* ── Shared sub-components ── */
function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, iconBg }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderLeft: `2px solid ${color}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: iconBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 18, color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 17, fontWeight: 800,
          color: C.textPri, letterSpacing: '-0.3px',
          lineHeight: '22px',
        }}>
          {value}
        </p>
        <p style={{
          margin: '2px 0 0', fontSize: 10, fontWeight: 600,
          color: C.textDim, letterSpacing: '0.06em',
          textTransform: 'uppercase', lineHeight: '14px',
        }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: C.textDim }}>{sub}</p>
      </div>
      <div style={{ padding: '16px 8px 10px 0' }}>
        {children}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '9px 13px',
      boxShadow: '0 4px 16px rgba(62,39,35,0.10)',
    }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

function axisStyle() {
  return { fontSize: 11, fontWeight: 600, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" };
}
function fmtY(v) { return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`; }

/* ── Tab views ── */
function DailyView() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
        <StatCard label="Today's Sales"   value="$10,000"  icon={AttachMoneyOutlinedIcon} color={C.success} iconBg="rgba(46,125,79,0.10)" />
        <StatCard label="Transactions"    value="148"      icon={ReceiptLongOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.10)" />
        <StatCard label="Avg. Ticket"     value="$67.57"   icon={TrendingUpOutlinedIcon}  color={C.warning} iconBg="rgba(178,106,0,0.10)" />
        <StatCard label="Refunds"         value="$220.00"  icon={PaymentsOutlinedIcon}    color={C.error}   iconBg="rgba(183,28,28,0.09)" />
      </div>

      <SectionDivider label="Hourly Sales" />
      <ChartCard title="Sales by Hour" sub="Revenue trend throughout the day">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={DAILY_HOURLY} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EDE5E0" />
            <XAxis dataKey="label" tick={axisStyle()} axisLine={false} tickLine={false} dy={8} />
            <YAxis tickFormatter={fmtY} tick={axisStyle()} axisLine={false} tickLine={false} width={46} dx={-4} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#EDE5E0', strokeWidth: 1.5, strokeDasharray: '4 3' }} />
            <Line type="monotone" dataKey="sales" stroke={C.dataBlue} strokeWidth={2.5}
              dot={{ r: 3, fill: '#fff', stroke: C.dataBlue, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: C.dataBlue, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <SectionDivider label="Payment Breakdown" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 48px', gap: 8, padding: '8px 16px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
          {['Method', 'Amount', 'Share'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {DAILY_PAYMENT.map((row, i) => (
          <div key={row.method} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 48px', gap: 8, alignItems: 'center', padding: '11px 16px', borderBottom: i < DAILY_PAYMENT.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{row.method}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>${row.amount.toLocaleString()}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>{row.pct}</span>
          </div>
        ))}
      </div>

      <SectionDivider label="Recent Transactions" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 8, padding: '8px 16px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
          {['Time', 'Product · Method', 'Amount'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {DAILY_TXNS.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 8, alignItems: 'center', padding: '11px 16px', borderBottom: i < DAILY_TXNS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>{row.time}</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{row.product}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>{row.method}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: row.type === 'REFUND' ? C.error : C.textPri }}>{row.amount}</p>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
                padding: '2px 6px', borderRadius: 4,
                background: row.type === 'REFUND' ? 'rgba(183,28,28,0.09)' : 'rgba(46,125,79,0.09)',
                color: row.type === 'REFUND' ? C.error : C.success,
              }}>{row.type}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function MonthlyView() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
        <StatCard label="Total Sales"    value={MONTHLY_STATS.totalSales}   icon={AttachMoneyOutlinedIcon} color={C.success} iconBg="rgba(46,125,79,0.10)" />
        <StatCard label="Transactions"   value={MONTHLY_STATS.transactions} icon={ReceiptLongOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.10)" />
        <StatCard label="Refunds"        value={MONTHLY_STATS.refunds}      icon={PaymentsOutlinedIcon}    color={C.error}   iconBg="rgba(183,28,28,0.09)" />
        <StatCard label="Best Day"       value={MONTHLY_STATS.bestDay}      icon={CalendarTodayOutlinedIcon} color={C.warning} iconBg="rgba(178,106,0,0.10)" />
      </div>

      <SectionDivider label="Daily Sales Trend" />
      <ChartCard title="This Month" sub="Day-by-day revenue for the current month">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={MONTHLY_DAILY} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EDE5E0" />
            <XAxis dataKey="label" tick={axisStyle()} axisLine={false} tickLine={false} dy={8}
              interval={4} />
            <YAxis tickFormatter={fmtY} tick={axisStyle()} axisLine={false} tickLine={false} width={46} dx={-4} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#EDE5E0', strokeWidth: 1.5, strokeDasharray: '4 3' }} />
            <Line type="monotone" dataKey="sales" stroke={C.dataTeal} strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: C.dataTeal, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <SectionDivider label="Payment Breakdown" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 48px', gap: 8, padding: '8px 16px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
          {['Method', 'Amount', 'Share'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {[
          { method: 'Cash',        amount: 47267, pct: '38%', color: C.dataBlue   },
          { method: 'Credit Card', amount: 39802, pct: '32%', color: C.dataTeal   },
          { method: 'Debit Card',  amount: 27364, pct: '22%', color: C.dataGreen  },
          { method: 'Misc',        amount: 9947,  pct: '8%',  color: C.dataAmber  },
        ].map((row, i, arr) => (
          <div key={row.method} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 48px', gap: 8, alignItems: 'center', padding: '11px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{row.method}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>${row.amount.toLocaleString()}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>{row.pct}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function AnnualView() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
        <StatCard label="Total Revenue"  value={ANNUAL_STATS.totalRevenue}  icon={AttachMoneyOutlinedIcon} color={C.success} iconBg="rgba(46,125,79,0.10)" />
        <StatCard label="Transactions"   value={ANNUAL_STATS.transactions}  icon={ReceiptLongOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.10)" />
        <StatCard label="Best Month"     value={ANNUAL_STATS.bestMonth}     icon={DateRangeOutlinedIcon}   color={C.warning} iconBg="rgba(178,106,0,0.10)" />
        <StatCard label="YoY Growth"     value={ANNUAL_STATS.growth}        icon={TrendingUpOutlinedIcon}  color={C.success} iconBg="rgba(46,125,79,0.10)" />
      </div>

      <SectionDivider label="Monthly Revenue" />
      <ChartCard title="Annual Overview" sub="Month-by-month revenue for the year">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={ANNUAL_MONTHLY} margin={{ top: 4, right: 20, left: 0, bottom: 0 }} barSize={18}>
            <CartesianGrid vertical={false} stroke="#EDE5E0" />
            <XAxis dataKey="label" tick={axisStyle()} axisLine={false} tickLine={false} dy={8} />
            <YAxis tickFormatter={fmtY} tick={axisStyle()} axisLine={false} tickLine={false} width={46} dx={-4} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(237,229,224,0.5)' }} />
            <Bar dataKey="sales" fill={C.dataBlue} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <SectionDivider label="Monthly Breakdown" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 8, padding: '8px 16px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
          {['Month', 'Revenue', 'vs Prior'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {ANNUAL_MONTHLY.map((row, i, arr) => {
          const prev  = arr[i - 1]?.sales ?? row.sales;
          const delta = (((row.sales - prev) / prev) * 100).toFixed(1);
          const up    = parseFloat(delta) >= 0;
          return (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 8, alignItems: 'center', padding: '10px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>${row.sales.toLocaleString()}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? C.textDim : up ? C.success : C.error }}>
                {i === 0 ? '—' : `${up ? '+' : ''}${delta}%`}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function EmployeeView() {
  const [selected, setSelected] = useState(null);
  const emp = selected !== null ? EMPLOYEES[selected] : null;

  return (
    <>
      <SectionDivider label="Employee Sales Summary" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 56px', gap: 8, padding: '8px 16px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
          {['Employee', 'Sales', 'Txns'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {EMPLOYEES.map((emp, i) => (
          <button
            key={emp.code}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{
              width: '100%', display: 'grid', gridTemplateColumns: '1fr 72px 56px', gap: 8, alignItems: 'center',
              padding: '12px 16px', borderBottom: i < EMPLOYEES.length - 1 ? `1px solid ${C.border}` : 'none',
              background: selected === i ? '#F3EDE9' : C.surface,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              borderLeft: selected === i ? `2px solid ${C.primary}` : '2px solid transparent',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{emp.name}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textDim }}>ID: {emp.code}</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{emp.sales}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>{emp.txns}</span>
          </button>
        ))}
      </div>

      {/* Employee detail card */}
      {emp && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.primary}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${C.border}`, background: C.tableHdr }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>{emp.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: C.textDim }}>Employee ID: {emp.code}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.border }}>
            {[
              { label: 'Total Sales',   value: emp.sales, color: C.success, iconBg: 'rgba(46,125,79,0.10)',  Icon: AttachMoneyOutlinedIcon },
              { label: 'Transactions',  value: emp.txns,  color: C.info,    iconBg: 'rgba(2,119,189,0.10)',  Icon: ReceiptLongOutlinedIcon },
              { label: 'Avg. Ticket',   value: emp.avg,   color: C.warning, iconBg: 'rgba(178,106,0,0.10)', Icon: TrendingUpOutlinedIcon  },
              { label: 'Shift Hours',   value: emp.hours, color: C.primary, iconBg: 'rgba(62,39,35,0.09)',   Icon: DateRangeOutlinedIcon   },
            ].map(({ label, value, color, iconBg, Icon }) => (
              <div key={label} style={{ background: C.surface, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 15, color }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri, lineHeight: 1 }}>{value}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function WeeklyView() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
        <StatCard label="Week Sales"   value={WEEKLY_STATS.totalSales}   icon={AttachMoneyOutlinedIcon} color={C.success} iconBg="rgba(46,125,79,0.10)" />
        <StatCard label="Transactions" value={WEEKLY_STATS.transactions} icon={ReceiptLongOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.10)" />
        <StatCard label="Best Day"     value={WEEKLY_STATS.bestDay}      icon={CalendarTodayOutlinedIcon} color={C.warning} iconBg="rgba(178,106,0,0.10)" />
        <StatCard label="Refunds"      value={WEEKLY_STATS.refunds}      icon={PaymentsOutlinedIcon}    color={C.error}   iconBg="rgba(183,28,28,0.09)" />
      </div>

      <SectionDivider label="Daily Sales This Week" />
      <ChartCard title="Week Overview" sub="Revenue per day for the current week">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={WEEKLY_DAYS} margin={{ top: 4, right: 20, left: 0, bottom: 0 }} barSize={22}>
            <CartesianGrid vertical={false} stroke="#EDE5E0" />
            <XAxis dataKey="label" tick={axisStyle()} axisLine={false} tickLine={false} dy={8} />
            <YAxis tickFormatter={fmtY} tick={axisStyle()} axisLine={false} tickLine={false} width={46} dx={-4} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(237,229,224,0.5)' }} />
            <Bar dataKey="sales" fill={C.dataGreen} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <SectionDivider label="Day Breakdown" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8, padding: '8px 16px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
          {['Day', 'Revenue', 'vs Avg'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {(() => {
          const avg = Math.round(WEEKLY_DAYS.reduce((s, d) => s + d.sales, 0) / WEEKLY_DAYS.length);
          return WEEKLY_DAYS.map((row, i, arr) => {
            const delta = (((row.sales - avg) / avg) * 100).toFixed(1);
            const up = parseFloat(delta) >= 0;
            return (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8, alignItems: 'center', padding: '10px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>${row.sales.toLocaleString()}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: up ? C.success : C.error }}>
                  {up ? '+' : ''}{delta}%
                </span>
              </div>
            );
          });
        })()}
      </div>
    </>
  );
}

/* ── Main page ── */
export default function ManagerReportPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const navigate = useNavigate();

  const views = { daily: <DailyView />, weekly: <WeeklyView />, monthly: <MonthlyView />, annual: <AnnualView />, employee: <EmployeeView /> };

  function handleTabClick(id) {
    if (id === 'overall') {
      navigate('/manager/reports/overall');
    } else {
      setActiveTab(id);
    }
  }

  return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Manager Portal
        </p>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri, letterSpacing: '-0.1px' }}>
          Reports
        </h1>
      </div>

      {/* ── Filter tab bar (scrollable) ── */}
      <div style={{ overflowX: 'auto', marginBottom: 20, paddingBottom: 2, scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 6, background: C.elevated, borderRadius: 10, padding: 4, width: 'max-content', minWidth: '100%' }}>
          {TABS.map(({ id, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                style={{
                  padding: '6px 14px', height: 32, borderRadius: 7,
                  border: 'none',
                  background: active ? C.surface : 'transparent',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 4px rgba(62,39,35,0.13)' : 'none',
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? C.primary : C.textDim,
                  letterSpacing: '0.02em',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: id === 'overall' ? 5 : 0,
                }}
              >
                {id === 'overall' && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? C.primary : C.textDim, flexShrink: 0, transition: 'background 0.15s' }} />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      {views[activeTab]}

      <style>{`::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
