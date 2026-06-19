import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import PersonOutlinedIcon       from '@mui/icons-material/PersonOutlined';
import AttachMoneyOutlinedIcon  from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon  from '@mui/icons-material/ReceiptLongOutlined';
import SpeedOutlinedIcon        from '@mui/icons-material/SpeedOutlined';
import ReplayOutlinedIcon       from '@mui/icons-material/ReplayOutlined';
import BlockOutlinedIcon        from '@mui/icons-material/BlockOutlined';
import AccessTimeOutlinedIcon   from '@mui/icons-material/AccessTimeOutlined';
import SearchOutlinedIcon       from '@mui/icons-material/SearchOutlined';
import EmojiEventsOutlinedIcon  from '@mui/icons-material/EmojiEventsOutlined';
import { useReportCashiers, buildDateRange } from '../hooks/useReportQuery';
import CornerCard from '../components/CornerCard/CornerCard';

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9',
  dataBlue: '#4C78A8', dataTeal: '#72B7B2', dataGreen: '#54A24B',
};

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'Week'  },
  { id: 'month', label: 'Month' },
  { id: 'year',  label: 'Year'  },
];

function fmt$(n) { return n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtH(n) { if (n == null) return '—'; const h = Math.floor(n); const m = Math.round((n - h) * 60); return m ? `${h}h ${m}m` : `${h}h`; }
function initials(name) { return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'; }

function SkeletonBlock({ h = 20, w = '100%', radius = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: radius, background: C.elevated, animation: 'pulse 1.4s ease infinite alternate' }} />;
}

function StatBox({ label, value, sub, color = C.textPri, icon: Icon }) {
  return (
    <CornerCard borderColor={C.border} cornerSize={18} cornerHeight={18} style={{ background: C.surface }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && (
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon sx={{ fontSize: 17, color }} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.3px', lineHeight: '22px' }}>{value}</p>
          {sub && <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim }}>{sub}</p>}
          <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        </div>
      </div>
    </CornerCard>
  );
}

function CashierRow({ c, rank, isSelected, onClick }) {
  const isTop = rank === 0;
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: isSelected ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`, background: isSelected ? `${C.accent}10` : C.surface, cursor: 'pointer', textAlign: 'left', marginBottom: 6, transition: 'all 0.15s' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: isTop ? C.primary : C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: isTop ? C.accent : C.textDim }}>{initials(c.name)}</span>
        {isTop && (
          <EmojiEventsOutlinedIcon sx={{ fontSize: 10, color: C.accent, position: 'absolute', top: -4, right: -4 }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim }}>{c.txnCount} txns · {fmt$(c.netRevenue)}</p>
      </div>
      <span style={{ padding: '3px 8px', borderRadius: 6, background: c.voidRate > 3 ? `${C.error}12` : C.elevated, color: c.voidRate > 3 ? C.error : C.textDim, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
        {(c.voidRate ?? 0).toFixed(1)}% void
      </span>
    </button>
  );
}

function radarData(c) {
  if (!c) return [];
  const norm = (val, min, max) => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  return [
    { metric: 'Rev/hr',     value: norm(c.revenuePerHour ?? 0, 0, 300) },
    { metric: 'Avg Ticket', value: norm(c.avgTicket ?? 0,       0, 80)  },
    { metric: 'Volume',     value: norm(c.txnCount ?? 0,        0, 100) },
    { metric: 'Low Voids',  value: Math.max(0, 100 - norm(c.voidRate ?? 0, 0, 10)) },
    { metric: 'Low Refunds', value: Math.max(0, 100 - norm(c.refundRate ?? 0, 0, 20)) },
  ];
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 13px', boxShadow: '0 4px 16px rgba(62,39,35,0.10)' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.textSec, flex: 1 }}>{p.name}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>{fmt$(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ManagerIndividualReportPage() {
  const [range, setRange]     = useState('today');
  const [search, setSearch]   = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const { start, end } = buildDateRange(range);
  const { data: cashiers, isLoading } = useReportCashiers({ start, end });

  const filtered = useMemo(() => {
    if (!cashiers?.length) return [];
    return cashiers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  }, [cashiers, search]);

  const active = useMemo(() => {
    if (!filtered?.length) return null;
    return selectedId ? (filtered.find(c => c.employeeId === selectedId) ?? filtered[0]) : filtered[0];
  }, [filtered, selectedId]);

  const barData = useMemo(() => {
    if (!filtered?.length) return [];
    return filtered.slice(0, 10).map(c => ({
      name:    c.name?.split(' ')[0] || '?',
      Revenue: c.netRevenue ?? 0,
      Refunds: c.refundedAmount ?? 0,
    }));
  }, [filtered]);

  return (
    <div style={{ padding: '28px 32px 40px', background: C.bg, minHeight: '100dvh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PersonOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Reports</p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Individual Reports</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, background: C.elevated, borderRadius: 10, padding: 3 }}>
          {RANGES.map(({ id, label }) => {
            const isActive = range === id;
            return (
              <button key={id} onClick={() => setRange(id)} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: isActive ? C.surface : 'transparent', cursor: 'pointer', boxShadow: isActive ? '0 1px 4px rgba(62,39,35,0.12)' : 'none', fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? C.primary : C.textDim, transition: 'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

        {/* Employee list */}
        <div>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <SearchOutlinedIcon sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: C.textDim }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 32px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.textPri, outline: 'none' }} />
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(i => <SkeletonBlock key={i} h={56} radius={10} />)}
            </div>
          ) : filtered.length ? (
            <div className="no-scrollbar" style={{ maxHeight: 'calc(100dvh - 200px)', overflowY: 'auto', paddingRight: 2 }}>
              {filtered.map((c, i) => (
                <CashierRow key={c.employeeId} c={c} rank={i} isSelected={selectedId === c.employeeId || (!selectedId && i === 0)} onClick={() => setSelectedId(c.employeeId)} />
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textDim, padding: '32px 0' }}>
              {search ? 'No employees match search' : 'No data for this period'}
            </p>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SkeletonBlock h={90} radius={14} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonBlock key={i} h={80} radius={10} />)}
              </div>
              <SkeletonBlock h={220} radius={14} />
            </div>
          ) : active ? (
            <>
              {/* Identity bar */}
              <CornerCard borderColor={C.border} style={{ background: C.surface, marginBottom: 14 }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 13, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{initials(active.name)}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.textPri }}>{active.name}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: C.textSec }}>{active.role || 'Cashier'} · ID #{active.employeeId?.slice(-6)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {active.voidRate > 3 && (
                      <span style={{ padding: '4px 10px', borderRadius: 8, background: `${C.error}12`, color: C.error, fontSize: 11, fontWeight: 700 }}>High Voids</span>
                    )}
                    {active.refundRate > 10 && (
                      <span style={{ padding: '4px 10px', borderRadius: 8, background: `${C.error}12`, color: C.error, fontSize: 11, fontWeight: 700 }}>High Refunds</span>
                    )}
                    {(active.voidRate ?? 0) <= 1 && (active.refundRate ?? 0) <= 3 && (
                      <span style={{ padding: '4px 10px', borderRadius: 8, background: `${C.success}12`, color: C.success, fontSize: 11, fontWeight: 700 }}>Performing Well</span>
                    )}
                  </div>
                </div>
              </CornerCard>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                <StatBox label="Net Revenue"  value={fmt$(active.netRevenue)}    sub={`Gross ${fmt$(active.revenue)}`}        icon={AttachMoneyOutlinedIcon} color={C.success} />
                <StatBox label="Transactions" value={active.txnCount ?? '—'}     sub={`Avg ticket ${fmt$(active.avgTicket)}`} icon={ReceiptLongOutlinedIcon}  color={C.info} />
                <StatBox label="Revenue / hr" value={fmt$(active.revenuePerHour)} sub={`${fmtH(active.hoursWorked)} worked`}  icon={SpeedOutlinedIcon}        color={C.accent} />
                <StatBox label="Void Rate"    value={`${(active.voidRate ?? 0).toFixed(1)}%`}   sub={`${active.voidCount ?? 0} voids`}      icon={BlockOutlinedIcon}       color={active.voidRate > 3 ? C.error : C.textSec} />
                <StatBox label="Refund Rate"  value={`${(active.refundRate ?? 0).toFixed(1)}%`} sub={`${active.refundCount ?? 0} refunds`}  icon={ReplayOutlinedIcon}      color={active.refundRate > 10 ? C.error : C.textSec} />
                <StatBox label="Hours Worked" value={fmtH(active.hoursWorked)}   sub={`${active.shiftCount ?? 0} shifts`}     icon={AccessTimeOutlinedIcon}  color={C.textSec} />
              </div>

              {/* Charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14 }}>

                {/* Revenue comparison bar */}
                <CornerCard borderColor={C.border} style={{ background: C.surface }}>
                  <div style={{ background: '#FAF7F5', borderBottom: `1px solid ${C.border}`, padding: '11px 16px' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>Revenue Comparison</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: C.textDim }}>Net revenue vs refunds — top 10 cashiers</p>
                  </div>
                  <div style={{ padding: '12px 4px 8px 0' }}>
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={barData} barSize={10} barCategoryGap="30%">
                        <CartesianGrid vertical={false} stroke="#EDE5E0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} dy={5} />
                        <YAxis tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} tick={{ fontSize: 10, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} width={44} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(237,229,224,0.35)' }} />
                        <Bar dataKey="Revenue" fill={C.dataBlue} radius={[3, 3, 0, 0]} name="Revenue" />
                        <Bar dataKey="Refunds" fill={C.error}    radius={[3, 3, 0, 0]} name="Refunds" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CornerCard>

                {/* Radar performance */}
                <CornerCard borderColor={C.border} style={{ background: C.surface }}>
                  <div style={{ background: '#FAF7F5', borderBottom: `1px solid ${C.border}`, padding: '11px 16px' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>Performance Profile</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: C.textDim }}>5-dimension normalized score</p>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <ResponsiveContainer width="100%" height={190}>
                      <RadarChart data={radarData(active)} cx="50%" cy="50%" outerRadius={68}>
                        <PolarGrid stroke={C.border} />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke={C.accent} fill={C.accent} fillOpacity={0.18} dot={{ fill: C.accent, r: 3 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CornerCard>

              </div>
            </>
          ) : (
            <CornerCard borderColor={C.border} style={{ background: C.surface }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360 }}>
                <div style={{ textAlign: 'center' }}>
                  <PersonOutlinedIcon sx={{ fontSize: 44, color: C.elevated }} />
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: C.textDim }}>Select an employee to view their report</p>
                </div>
              </div>
            </CornerCard>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { from { opacity: 1; } to { opacity: 0.5; } }`}</style>
    </div>
  );
}
