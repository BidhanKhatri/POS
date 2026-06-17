import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import GroupsOutlinedIcon       from '@mui/icons-material/GroupsOutlined';
import WbSunnyOutlinedIcon      from '@mui/icons-material/WbSunnyOutlined';
import Brightness5OutlinedIcon  from '@mui/icons-material/Brightness5Outlined';
import NightlightOutlinedIcon   from '@mui/icons-material/NightlightOutlined';
import AttachMoneyOutlinedIcon  from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon  from '@mui/icons-material/ReceiptLongOutlined';
import SpeedOutlinedIcon        from '@mui/icons-material/SpeedOutlined';
import { useReportGroups, buildDateRange } from '../hooks/useReportQuery';

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9',
  dataBlue: '#4C78A8', dataTeal: '#72B7B2', dataGreen: '#54A24B',
  dataAmber: '#EECA3B', dataOrange: '#F58518',
};

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'Week'  },
  { id: 'month', label: 'Month' },
  { id: 'year',  label: 'Year'  },
];

// Keys must match g.id values from the API: 'Morning', 'Afternoon', 'Night'
const SHIFT_META = {
  Morning:   { color: C.dataAmber,  bg: '#EECA3B18', icon: WbSunnyOutlinedIcon,    label: 'Morning Shift',   hours: '6 AM – 2 PM'  },
  Afternoon: { color: C.dataBlue,   bg: '#4C78A818', icon: Brightness5OutlinedIcon, label: 'Afternoon Shift', hours: '2 PM – 10 PM' },
  Night:     { color: C.dataTeal,   bg: '#72B7B218', icon: NightlightOutlinedIcon,  label: 'Night Shift',     hours: '10 PM – 6 AM' },
};

function fmt$(n) { return n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function SkeletonBlock({ h = 20, w = '100%', radius = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: radius, background: C.elevated, animation: 'pulse 1.4s ease infinite alternate' }} />;
}

// group.id / group.stats.revenue / group.stats.txnCount / group.members
function GroupCard({ group, isSelected, onClick }) {
  const meta = SHIFT_META[group.id] || { color: C.textDim, bg: C.elevated, icon: GroupsOutlinedIcon, label: group.label || group.id, hours: group.hours || '' };
  const Icon = meta.icon;
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', background: isSelected ? `${meta.color}10` : C.surface, border: `${isSelected ? 1.5 : 1}px solid ${isSelected ? meta.color : C.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 20, color: meta.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>{meta.label}</p>
          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>{meta.hours}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>{fmt$(group.stats?.revenue)}</p>
            <p style={{ margin: '1px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Net Revenue</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>{group.stats?.txnCount ?? 0}</p>
            <p style={{ margin: '1px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Transactions</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>{group.members?.length ?? 0}</p>
            <p style={{ margin: '1px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Employees</p>
          </div>
        </div>
      </div>
    </button>
  );
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
          <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function radarData(groups) {
  if (!groups?.length) return [];
  const maxRev  = Math.max(...groups.map(g => g.stats?.revenue  ?? 0), 1);
  const maxTxns = Math.max(...groups.map(g => g.stats?.txnCount ?? 0), 1);
  const maxHrs  = Math.max(...groups.map(g => g.stats?.hoursWorked ?? 0), 1);
  return groups.map(g => ({
    group:   SHIFT_META[g.id]?.label || g.id,
    Revenue: Math.round(((g.stats?.revenue      ?? 0) / maxRev)  * 100),
    Volume:  Math.round(((g.stats?.txnCount     ?? 0) / maxTxns) * 100),
    Hours:   Math.round(((g.stats?.hoursWorked  ?? 0) / maxHrs)  * 100),
  }));
}

export default function ManagerGroupReportPage() {
  const [range, setRange]       = useState('today');
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { start, end } = buildDateRange(range);
  const { data: groups, isLoading } = useReportGroups({ start, end });

  // Active group — default to first
  const active = useMemo(() => {
    if (!groups?.length) return null;
    return selectedGroup
      ? (groups.find(g => g.id === selectedGroup) ?? groups[0])
      : groups[0];
  }, [groups, selectedGroup]);

  // Bar chart: compare all groups by revenue + transactions
  const barCompare = useMemo(() => {
    if (!groups?.length) return [];
    return groups.map(g => ({
      name:    SHIFT_META[g.id]?.label || g.id,
      Revenue: g.stats?.revenue  ?? 0,
      Txns:    g.stats?.txnCount ?? 0,
    }));
  }, [groups]);

  // Employee breakdown for the active group
  const memberRows = useMemo(() => {
    if (!active?.members?.length) return [];
    return [...active.members].sort((a, b) => (b.netRevenue ?? 0) - (a.netRevenue ?? 0));
  }, [active]);

  const meta = active ? (SHIFT_META[active.id] || { color: C.textDim, icon: GroupsOutlinedIcon }) : null;

  return (
    <div style={{ padding: '28px 32px 40px', background: C.bg, minHeight: '100dvh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GroupsOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Reports</p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Group Reports</h1>
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

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => <SkeletonBlock key={i} h={120} radius={14} />)}
          <SkeletonBlock h={260} radius={14} />
        </div>
      ) : groups?.length ? (
        <>
          {/* Group Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {groups.map(g => (
              <GroupCard
                key={g.id}
                group={g}
                isSelected={active?.id === g.id}
                onClick={() => setSelectedGroup(g.id)}
              />
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 16 }}>

            {/* Bar comparison */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 8px', borderBottom: `1px solid ${C.border}` }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Shift Comparison</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: C.textDim }}>Revenue and transaction volume by shift group</p>
              </div>
              <div style={{ padding: '12px 4px 8px 0' }}>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={barCompare} barSize={22} barCategoryGap="35%">
                    <CartesianGrid vertical={false} stroke="#EDE5E0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} dy={5} />
                    <YAxis yAxisId="left"  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} tick={{ fontSize: 10, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} width={46} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(237,229,224,0.35)' }} />
                    <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600, color: C.textSec, paddingTop: 6 }} />
                    <Bar yAxisId="left"  dataKey="Revenue" fill={C.dataBlue}   radius={[4, 4, 0, 0]} name="Revenue ($)" />
                    <Bar yAxisId="right" dataKey="Txns"    fill={C.dataTeal}   radius={[4, 4, 0, 0]} name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 8px', borderBottom: `1px solid ${C.border}` }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Shift Performance</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: C.textDim }}>Normalized across revenue, volume &amp; hours</p>
              </div>
              <div style={{ padding: '8px 0' }}>
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart data={radarData(groups)} cx="50%" cy="50%" outerRadius={68}>
                    <PolarGrid stroke={C.border} />
                    <PolarAngleAxis dataKey="group" tick={{ fontSize: 10, fill: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="Revenue" stroke={C.dataBlue}  fill={C.dataBlue}  fillOpacity={0.12} name="Revenue" />
                    <Radar dataKey="Volume"  stroke={C.dataTeal}  fill={C.dataTeal}  fillOpacity={0.10} name="Volume" />
                    <Radar dataKey="Hours"   stroke={C.dataAmber} fill={C.dataAmber} fillOpacity={0.10} name="Hours" />
                    <Legend iconType="square" iconSize={7} wrapperStyle={{ fontSize: 10, fontWeight: 600, color: C.textSec, paddingTop: 4 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Employee breakdown for active group */}
          {active && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                {meta && <meta.icon sx={{ fontSize: 15, color: meta.color }} />}
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>
                  {SHIFT_META[active.id]?.label || active.id} — Employee Breakdown
                </p>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: C.textDim }}>
                  {memberRows.length} employee{memberRows.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 600 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 100px 90px 90px', gap: 8, padding: '8px 18px', background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
                    {['Employee', 'Net Revenue', 'Transactions', 'Avg Ticket', 'Void Rate', 'Refund Rate'].map(h => (
                      <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</span>
                    ))}
                  </div>
                  {memberRows.length ? memberRows.map((m, i) => (
                    <div key={String(m.employeeId || i)} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 100px 90px 90px', gap: 8, alignItems: 'center', padding: '12px 18px', borderBottom: i < memberRows.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 ? '#FDFCFB' : C.surface }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim }}>
                            {(m.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{m.name || 'Unknown'}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.success }}>{fmt$(m.netRevenue)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>{m.txnCount ?? '—'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>{fmt$(m.avgTicket)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: (m.voidRate ?? 0) > 3 ? C.error : C.textSec }}>
                        {(m.voidRate ?? 0).toFixed(1)}%
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: (m.refundRate ?? 0) > 10 ? C.error : C.textSec }}>
                        {(m.refundRate ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  )) : (
                    <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: C.textDim }}>
                      No employees worked this shift during the selected period
                    </p>
                  )}
                </div>
              </div>

              {/* Top products for this shift */}
              {active.topProducts?.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '13px 18px 14px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Products This Shift</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {active.topProducts.map((p, i) => (
                      <div key={i} style={{ flex: 1, padding: '10px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{p.productName}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>{p.sku} · qty {p.qty}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 800, color: C.success }}>{fmt$(p.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>
          <div style={{ textAlign: 'center' }}>
            <GroupsOutlinedIcon sx={{ fontSize: 44, color: C.elevated }} />
            <p style={{ margin: '8px 0 0', fontSize: 14, color: C.textDim }}>No shift data for this period</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>Groups are derived from employee clock-in times</p>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { from { opacity: 1; } to { opacity: 0.5; } }`}</style>
    </div>
  );
}
