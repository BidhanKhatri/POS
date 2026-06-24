import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { jsPDF }                     from 'jspdf';
import GroupsOutlinedIcon            from '@mui/icons-material/GroupsOutlined';
import AttachMoneyOutlinedIcon       from '@mui/icons-material/AttachMoneyOutlined';
import ReceiptLongOutlinedIcon       from '@mui/icons-material/ReceiptLongOutlined';
import SpeedOutlinedIcon             from '@mui/icons-material/SpeedOutlined';
import TrendingUpOutlinedIcon        from '@mui/icons-material/TrendingUpOutlined';
import AssignmentReturnOutlinedIcon  from '@mui/icons-material/AssignmentReturnOutlined';
import SyncOutlinedIcon              from '@mui/icons-material/SyncOutlined';
import TableChartOutlinedIcon        from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfOutlinedIcon      from '@mui/icons-material/PictureAsPdfOutlined';
import KeyboardArrowDownIcon         from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon           from '@mui/icons-material/KeyboardArrowUp';
import PersonOutlinedIcon            from '@mui/icons-material/PersonOutlined';
import EmojiEventsOutlinedIcon       from '@mui/icons-material/EmojiEventsOutlined';
import LinkOffOutlinedIcon           from '@mui/icons-material/LinkOffOutlined';
import ErrorOutlineOutlinedIcon      from '@mui/icons-material/ErrorOutlineOutlined';
import FilterListOutlinedIcon        from '@mui/icons-material/FilterListOutlined';
import OpenInNewOutlinedIcon         from '@mui/icons-material/OpenInNewOutlined';
import CheckCircleOutlinedIcon       from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackOutlinedIcon         from '@mui/icons-material/ArrowBackOutlined';
import EventAvailableOutlinedIcon    from '@mui/icons-material/EventAvailableOutlined';
import useAuthStore from '../store/useAuthStore';
import { buildDateRange } from '../hooks/useReportQuery';

const API  = import.meta.env.VITE_API_BASE_URL ?? '';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary:    '#3E2723', primaryLt: '#6D4C41',
  accent:     '#D4A373', accentLt:  '#F3E0C7',
  success:    '#2E7D4F', successLt:  '#E8F5EE',
  info:       '#0277BD', infoLt:     '#E3F2FD',
  warning:    '#B26A00', warningLt:  '#FFF3CD',
  error:      '#B71C1C', errorLt:    '#FFEBEE',
  textPri:    '#2B1D1A', textSec:    '#6B5B57', textDim: '#A09490',
  border:     '#DDD2CC', surface:    '#ffffff', bg: '#F5F3F1',
  elevated:   '#EFE7E2', tableHdr:   '#F3EDE9', tableHover: '#EFE7E2',
  dataBlue:   '#4C78A8', dataTeal:   '#72B7B2',
};

const PRESETS = [
  { id: 'overall', label: 'All Time' },
  { id: 'today',   label: 'Today'   },
  { id: 'week',    label: 'Week'    },
  { id: 'month',   label: 'Month'   },
  { id: 'year',    label: 'Year'    },
  { id: 'custom',  label: 'Custom'  },
];

const RANK_OPTIONS = [
  { id: 'revenue',        label: 'Revenue'      },
  { id: 'txnCount',       label: 'Transactions' },
  { id: 'revenuePerHour', label: 'Rev / Hour'   },
];

const GROUP_COLORS = [
  '#4C78A8','#D4A373','#54A24B','#F58518',
  '#72B7B2','#E45756','#B279A2','#FF9DA7',
];

function fmt$(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n, dec = 0) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function apiFetch(path, token, opts = {}) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...opts,
  }).then(async r => {
    if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.message || `${r.status}`); }
    return r.json();
  });
}

function qs(params) {
  const p = Object.entries(params).filter(([, v]) => v != null && v !== '');
  return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Sk({ h = 16, w = '100%', r = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: C.elevated }} />;
}

function KpiCard({ label, value, sub, icon: Icon, color, iconBg, skeleton }) {
  return (
    <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, fontFamily: FONT }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 20, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {skeleton ? <Sk h={24} w={80} r={4} /> : <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: '26px' }}>{value}</p>}
        {sub && !skeleton && <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim, fontWeight: 600 }}>{sub}</p>}
        <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.textPri, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT }}>{title}</h2>
      {right}
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function Leaderboard({ data, loading, rankBy, onRankChange, onGroupClick }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.elevated}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EmojiEventsOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>Group Leaderboard</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANK_OPTIONS.map(o => (
            <button key={o.id} onClick={() => onRankChange(o.id)} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: FONT,
              background: rankBy === o.id ? C.primary : C.elevated,
              color:      rankBy === o.id ? '#fff'     : C.textSec,
            }}>{o.label}</button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.tableHdr }}>
              {['Rank','Group','Members','Revenue','Transactions','Avg Ticket','Rev / Hour'].map((h, i) => (
                <th key={h} style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: C.textDim, textAlign: i <= 1 || i === 2 || i === 4 ? 'center' : 'right', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {loading && [0,1,2].map(i => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.elevated}` }}>
                {[...Array(8)].map((_,j) => <td key={j} style={{ padding: '12px 14px' }}><Sk h={12} w={j===1?120:60} r={4} /></td>)}
              </tr>
            ))}
            {!loading && (data ?? []).map((g, i) => (
              <tr key={g.groupId} onClick={() => onGroupClick(g.groupId)}
                style={{ borderBottom: `1px solid ${C.elevated}`, cursor: 'pointer', background: i%2===0 ? C.surface : C.bg }}
                onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
                onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? C.surface : C.bg}
              >
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <span style={{ fontSize: i<3?16:12, fontWeight:800, color: i<3?'inherit':C.textDim }}>{i<3?medals[i]:`#${i+1}`}</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28,height:28,borderRadius:8,background:`${GROUP_COLORS[i%GROUP_COLORS.length]}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <GroupsOutlinedIcon sx={{ fontSize:14, color:GROUP_COLORS[i%GROUP_COLORS.length] }} />
                    </div>
                    <span style={{ fontSize:13,fontWeight:600,color:C.textPri }}>{g.groupName}</span>
                  </div>
                </td>
                <td style={{ padding:'10px 14px',textAlign:'center',fontSize:13,color:C.textSec }}>{g.stats.memberCount}</td>
                <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,fontWeight:700,color:C.textPri }}>{fmt$(g.stats.revenue)}</td>
                <td style={{ padding:'10px 14px',textAlign:'center',fontSize:13,color:C.textSec }}>{fmtNum(g.stats.txnCount)}</td>
                <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,color:C.textSec }}>{fmt$(g.stats.avgTicket)}</td>
                <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,color:C.textSec }}>{fmt$(g.stats.revenuePerHour)}/hr</td>
                <td style={{ padding:'10px 14px' }}><OpenInNewOutlinedIcon sx={{ fontSize:14,color:C.textDim }} /></td>
              </tr>
            ))}
            {!loading && (!data||data.length===0) && (
              <tr><td colSpan={8} style={{ padding:'32px 14px',textAlign:'center',color:C.textDim,fontSize:13 }}>No data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, rank, onDrill }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 16px',borderBottom:`1px solid ${C.elevated}` }}>
      <span style={{ width:20,fontSize:11,fontWeight:700,color:C.textDim,textAlign:'center',flexShrink:0 }}>#{rank}</span>
      <div style={{ width:30,height:30,borderRadius:'50%',background:'#F3E0C7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <PersonOutlinedIcon sx={{ fontSize:15,color:'#6D4C41' }} />
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <p style={{ margin:0,fontSize:12,fontWeight:600,color:C.textPri,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{member.name}</p>
        <p style={{ margin:'1px 0 0',fontSize:10,color:C.textDim }}>{member.code}</p>
      </div>
      <div style={{ display:'flex',gap:16,flexShrink:0 }}>
        <div style={{ textAlign:'right' }}>
          <p style={{ margin:0,fontSize:12,fontWeight:700,color:C.textPri }}>{fmt$(member.netRevenue)}</p>
          <p style={{ margin:'1px 0 0',fontSize:10,color:C.textDim }}>{member.txnCount} txns</p>
        </div>
        <div style={{ textAlign:'right',minWidth:48 }}>
          <p style={{ margin:0,fontSize:12,fontWeight:700,color:C.textSec }}>{fmt$(member.avgTicket)}</p>
          <p style={{ margin:'1px 0 0',fontSize:10,color:C.textDim }}>avg</p>
        </div>
      </div>
      <button onClick={() => onDrill(member.employeeId)} title="Individual Report"
        style={{ padding:'4px 8px',borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',display:'flex',alignItems:'center' }}>
        <OpenInNewOutlinedIcon sx={{ fontSize:13,color:C.textDim }} />
      </button>
    </div>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({ group, color, isSelected, onSelect, token, qp, syncEnabled, onDrillMember }) {
  const [expanded, setExpanded] = useState(false);
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['grp-detail', group.groupId, qp.start, qp.end],
    queryFn:  () => apiFetch(`/api/reports/group-ems/${group.groupId}${qs(qp)}`, token),
    enabled:  expanded && !!token && syncEnabled,
    staleTime: 0,
  });
  const s = group.stats;
  return (
    <div style={{ background:C.surface,border:`1.5px solid ${isSelected?color:C.border}`,borderRadius:14,overflow:'hidden',fontFamily:FONT,
      boxShadow:isSelected?`0 0 0 3px ${color}22`:'none',transition:'border-color 0.15s,box-shadow 0.15s' }}>
      <div onClick={() => onSelect(group.groupId)}
        style={{ padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,borderBottom:`1px solid ${C.elevated}` }}>
        <div style={{ width:36,height:36,borderRadius:9,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <GroupsOutlinedIcon sx={{ fontSize:18,color }} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ margin:0,fontSize:13,fontWeight:700,color:C.textPri,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{group.groupName}</p>
          <p style={{ margin:'2px 0 0',fontSize:10,color:C.textDim }}>{s.memberCount} members · {fmtNum(s.txnCount)} transactions</p>
        </div>
        {isSelected && <div style={{ width:8,height:8,borderRadius:'50%',background:color,flexShrink:0 }} />}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:C.elevated }}>
        {[
          { label:'Revenue',     value:fmt$(s.revenue)                  },
          { label:'Avg Ticket',  value:fmt$(s.avgTicket)                },
          { label:'Rev / Hour',  value:fmt$(s.revenuePerHour)           },
          { label:'Refund Rate', value:`${fmtNum(s.refundRate,1)}%`     },
          { label:'Attendance',  value:`${fmtNum(s.attendanceRate,0)}%` },
          { label:'Hrs Worked',  value:`${fmtNum(s.hoursWorked,1)}h`    },
        ].map(({ label,value }) => (
          <div key={label} style={{ background:C.surface,padding:'10px 12px',textAlign:'center' }}>
            <p style={{ margin:0,fontSize:13,fontWeight:800,color:C.textPri }}>{value}</p>
            <p style={{ margin:'2px 0 0',fontSize:9,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.06em' }}>{label}</p>
          </div>
        ))}
      </div>
      <button onClick={() => setExpanded(v=>!v)}
        style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 16px',background:'none',border:'none',cursor:'pointer',fontFamily:FONT }}>
        <span style={{ fontSize:11,fontWeight:700,color:C.textSec,textTransform:'uppercase',letterSpacing:'0.07em' }}>
          {expanded?'Hide members':'View members'}
        </span>
        {expanded?<KeyboardArrowUpIcon sx={{ fontSize:16,color:C.textDim }}/>:<KeyboardArrowDownIcon sx={{ fontSize:16,color:C.textDim }}/>}
      </button>
      {expanded && (
        <div style={{ borderTop:`1px solid ${C.elevated}` }}>
          {detailLoading && [0,1,2].map(i => (
            <div key={i} style={{ display:'flex',gap:10,padding:'10px 16px',borderBottom:`1px solid ${C.elevated}` }}>
              <Sk h={30} w={30} r={15}/><div style={{ flex:1 }}><Sk h={10} w="60%" r={4}/><div style={{ marginTop:4 }}><Sk h={10} w="40%" r={4}/></div></div>
            </div>
          ))}
          {!detailLoading && detailData?.members?.map((m,i) => (
            <MemberRow key={String(m.employeeId)} member={m} rank={i+1} onDrill={onDrillMember} />
          ))}
          {!detailLoading && !detailData?.members?.length && (
            <p style={{ margin:0,padding:'12px 16px',fontSize:12,color:C.textDim,textAlign:'center' }}>No member sales data for this period</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

function TrendChart({ data, loading, metric, onMetricChange }) {
  const METRICS = [
    { id:'revenue',  label:'Revenue',       color:C.dataBlue },
    { id:'txnCount', label:'Transactions',  color:C.dataTeal },
  ];
  const active = METRICS.find(m=>m.id===metric)??METRICS[0];
  return (
    <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px',fontFamily:FONT }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
        <span style={{ fontSize:13,fontWeight:700,color:C.textPri }}>Trend</span>
        <div style={{ display:'flex',gap:4 }}>
          {METRICS.map(m => (
            <button key={m.id} onClick={() => onMetricChange(m.id)} style={{
              padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:FONT,
              background:metric===m.id?C.primary:C.elevated,
              color:      metric===m.id?'#fff'    :C.textSec,
            }}>{m.label}</button>
          ))}
        </div>
      </div>
      {loading && <Sk h={180} r={8} />}
      {!loading && (!data||data.length===0) && (
        <div style={{ height:180,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <p style={{ color:C.textDim,fontSize:13 }}>No trend data for this period</p>
        </div>
      )}
      {!loading && data && data.length>0 && (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top:4,right:8,left:4,bottom:0 }}>
            <defs>
              <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={active.color} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={active.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={C.elevated}/>
            <XAxis dataKey="date" tick={{ fontSize:9,fill:C.textDim }} axisLine={false} tickLine={false} tickFormatter={v=>v?.slice(5)??v}/>
            <YAxis tick={{ fontSize:9,fill:C.textDim }} axisLine={false} tickLine={false} width={46}
              tickFormatter={v=>metric==='revenue'?`$${v>=1000?`${(v/1000).toFixed(0)}k`:v}`:String(v)}/>
            <Tooltip contentStyle={{ fontFamily:FONT,fontSize:12,border:`1px solid ${C.border}`,borderRadius:8 }}
              formatter={v=>[metric==='revenue'?fmt$(v):fmtNum(v),active.label]}/>
            <Area dataKey={metric} stroke={active.color} strokeWidth={2} fill="url(#tGrad)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Group comparison bar chart ──────────────────────────────────────────────

function GroupComparisonChart({ groups, loading, metric, onMetricChange }) {
  const METRICS = [
    { id:'revenue',        label:'Revenue',       fmt: v => `$${Number(v).toFixed(0)}` },
    { id:'txnCount',       label:'Transactions',  fmt: v => String(v) },
    { id:'revenuePerHour', label:'Rev / Hour',    fmt: v => `$${Number(v).toFixed(0)}` },
    { id:'attendanceRate', label:'Attendance %',  fmt: v => `${Number(v).toFixed(0)}%` },
  ];
  const active = METRICS.find(m => m.id === metric) ?? METRICS[0];

  const chartData = (groups ?? []).map((g, i) => ({
    name:  g.groupName.length > 14 ? g.groupName.slice(0, 13) + '…' : g.groupName,
    value: g.stats[metric] ?? 0,
    color: GROUP_COLORS[i % GROUP_COLORS.length],
  }));

  return (
    <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px',fontFamily:FONT }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
        <span style={{ fontSize:13,fontWeight:700,color:C.textPri }}>Group Comparison</span>
        <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
          {METRICS.map(m => (
            <button key={m.id} onClick={() => onMetricChange(m.id)} style={{
              padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:FONT,
              background:metric===m.id?C.primary:C.elevated,
              color:      metric===m.id?'#fff'    :C.textSec,
            }}>{m.label}</button>
          ))}
        </div>
      </div>
      {loading && <Sk h={200} r={8} />}
      {!loading && chartData.length === 0 && (
        <div style={{ height:200,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <p style={{ color:C.textDim,fontSize:13 }}>No group data for this period</p>
        </div>
      )}
      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top:4,right:8,left:4,bottom:40 }} barSize={36}>
            <CartesianGrid vertical={false} stroke={C.elevated}/>
            <XAxis dataKey="name" tick={{ fontSize:10,fill:C.textDim }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0}/>
            <YAxis tick={{ fontSize:9,fill:C.textDim }} axisLine={false} tickLine={false} width={50}
              tickFormatter={v => active.fmt(v)}/>
            <Tooltip contentStyle={{ fontFamily:FONT,fontSize:12,border:`1px solid ${C.border}`,borderRadius:8 }}
              formatter={v => [active.fmt(v), active.label]}/>
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Stat summary row ─────────────────────────────────────────────────────────

function StatRow({ label, value, sub, color }) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:`1px solid ${C.elevated}` }}>
      <span style={{ fontSize:13,color:C.textSec,fontFamily:FONT }}>{label}</span>
      <div style={{ textAlign:'right' }}>
        <span style={{ fontSize:14,fontWeight:800,color:color??C.textPri,fontFamily:FONT }}>{value}</span>
        {sub && <p style={{ margin:'1px 0 0',fontSize:10,color:C.textDim,fontFamily:FONT }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function triggerCSV(token, start, end) {
  const url = `${API}/api/reports/group-ems/export${qs({ start: start.toISOString(), end: end.toISOString() })}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `group_report_${new Date(start).toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}

function buildPDF(summary, dateLabel) {
  const doc = new jsPDF({ orientation:'portrait',unit:'mm',format:'a4' });
  const pw  = doc.internal.pageSize.getWidth();
  const { groups=[], totals } = summary;

  doc.setFillColor(62,39,35);
  doc.rect(0,0,pw,22,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.text('Groups Report',14,10);
  doc.setFontSize(8);
  doc.setFont('helvetica','normal');
  doc.text(dateLabel,14,16);
  doc.text(`Generated ${new Date().toLocaleString()}`,pw-14,16,{ align:'right' });

  let y=30;
  doc.setTextColor(43,29,26);
  if (totals) {
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.text('Overall',14,y); y+=5;
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.text(`Revenue: ${fmt$(totals.revenue)}   Transactions: ${totals.txnCount}   Avg Ticket: ${fmt$(totals.avgTicket)}   Groups: ${totals.totalGroups}   Rev/Hr: ${fmt$(totals.revenuePerHour)}`,14,y); y+=10;
  }

  const cols   = ['Group','Members','Revenue','Txns','Avg Ticket','Rev/Hr','Refund%','Attend%'];
  const widths = [46,16,24,14,24,20,16,16];
  const rowH   = 7;

  doc.setFillColor(243,237,233);
  doc.rect(14,y,pw-28,rowH,'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(7);
  doc.setTextColor(100,80,70);
  let x=14;
  cols.forEach((c,i)=>{ doc.text(c,x+2,y+4.5); x+=widths[i]; });
  y+=rowH;

  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  doc.setTextColor(43,29,26);
  groups.forEach((g,idx)=>{
    if(y>262){ doc.addPage(); y=20; }
    if(idx%2===0){ doc.setFillColor(249,245,242); doc.rect(14,y,pw-28,rowH,'F'); }
    x=14;
    const row=[
      g.groupName.slice(0,24),
      String(g.stats.memberCount),
      fmt$(g.stats.revenue),
      String(g.stats.txnCount),
      fmt$(g.stats.avgTicket),
      `${fmt$(g.stats.revenuePerHour)}/hr`,
      `${fmtNum(g.stats.refundRate,1)}%`,
      `${fmtNum(g.stats.attendanceRate,0)}%`,
    ];
    row.forEach((v,i)=>{ doc.text(String(v),x+2,y+4.5); x+=widths[i]; });
    y+=rowH;
  });

  doc.save(`group_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Group Detail Screen ──────────────────────────────────────────────────────

function GroupDetailScreen({ groupId, groupStats, detailData, detailLoading, trendData, trendLoading, dateLabel, presetLabel, onBack, onDrillMember }) {
  const [trendMetric, setTrendMetric] = useState('revenue');
  const s = groupStats?.stats;
  const members = detailData?.members ?? [];

  const kpis = s ? [
    { label:'Revenue',      value:fmt$(s.revenue),                       icon:AttachMoneyOutlinedIcon,     color:C.accent,    iconBg:C.accentLt     },
    { label:'Transactions', value:fmtNum(s.txnCount),                    icon:ReceiptLongOutlinedIcon,     color:C.info,      iconBg:C.infoLt       },
    { label:'Avg Ticket',   value:fmt$(s.avgTicket),                     icon:TrendingUpOutlinedIcon,      color:C.success,   iconBg:C.successLt    },
    { label:'Rev / Hour',   value:`${fmt$(s.revenuePerHour)}/hr`,        icon:SpeedOutlinedIcon,           color:C.primaryLt, iconBg:C.elevated     },
    { label:'Refund Rate',  value:`${fmtNum(s.refundRate,1)}%`,          icon:AssignmentReturnOutlinedIcon,color:C.warning,   iconBg:C.warningLt    },
    { label:'Attendance',   value:`${fmtNum(s.attendanceRate,0)}%`,      icon:EventAvailableOutlinedIcon,  color:C.success,   iconBg:C.successLt    },
  ] : [];

  return (
    <div style={{ fontFamily:FONT, background:C.bg, minHeight:'100vh', padding:'24px 24px 56px' }}>

      {/* ── Back bar ── */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ display:'flex',alignItems:'center',gap:6,height:34,padding:'0 14px',border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,cursor:'pointer',fontFamily:FONT }}>
          <ArrowBackOutlinedIcon sx={{ fontSize:16,color:C.textSec }}/>
          <span style={{ fontSize:12,fontWeight:600,color:C.textSec }}>Back to Groups</span>
        </button>
        <span style={{ fontSize:12,color:C.textDim }}>Group Reports</span>
        <span style={{ fontSize:12,color:C.textDim }}>›</span>
        <span style={{ fontSize:12,fontWeight:700,color:C.textPri }}>{groupStats?.groupName ?? '—'}</span>
        {presetLabel && (
          <span style={{ marginLeft:'auto',fontSize:11,fontWeight:700,color:C.primaryLt,background:C.accentLt,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 10px',letterSpacing:'0.04em' }}>
            {presetLabel}
          </span>
        )}
      </div>

      {/* ── Group header ── */}
      <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:24,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:'18px 22px' }}>
        <div style={{ width:52,height:52,borderRadius:14,background:C.accentLt,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <GroupsOutlinedIcon sx={{ fontSize:26,color:C.accent }}/>
        </div>
        <div style={{ flex:1 }}>
          <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:C.textPri,letterSpacing:'-0.3px' }}>{groupStats?.groupName ?? '—'}</h1>
          <p style={{ margin:'3px 0 0',fontSize:12,color:C.textDim }}>{s?.memberCount ?? 0} members · {dateLabel}</p>
        </div>
        <div style={{ display:'flex',gap:24,flexShrink:0 }}>
          {[
            { label:'Hours Worked', value:`${fmtNum(s?.hoursWorked,1)}h` },
            { label:'Attended',     value:`${s?.attended ?? 0} / ${s?.memberCount ?? 0}` },
          ].map(({ label,value }) => (
            <div key={label} style={{ textAlign:'right' }}>
              <p style={{ margin:0,fontSize:16,fontWeight:800,color:C.textPri }}>{value}</p>
              <p style={{ margin:'2px 0 0',fontSize:10,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.07em' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:14,marginBottom:24 }}>
        {!s && [0,1,2,3,4,5].map(i=>(
          <div key={i} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px' }}><Sk h={24} w={80} r={4}/></div>
        ))}
        {kpis.map(k => <KpiCard key={k.label} {...k} skeleton={false}/>)}
      </div>

      {/* ── Trend ── */}
      <div style={{ marginBottom:24 }}>
        <SectionHeader title="Sales Trend"/>
        <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <span style={{ fontSize:13,fontWeight:700,color:C.textPri }}>Trend</span>
            <div style={{ display:'flex',gap:4 }}>
              {[{id:'revenue',label:'Revenue',color:C.dataBlue},{id:'txnCount',label:'Transactions',color:C.dataTeal}].map(m=>(
                <button key={m.id} onClick={()=>setTrendMetric(m.id)} style={{
                  padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:FONT,
                  background:trendMetric===m.id?C.primary:C.elevated,
                  color:trendMetric===m.id?'#fff':C.textSec,
                }}>{m.label}</button>
              ))}
            </div>
          </div>
          {trendLoading && <Sk h={200} r={8}/>}
          {!trendLoading && (!trendData||trendData.length===0) && (
            <div style={{ height:200,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <p style={{ color:C.textDim,fontSize:13 }}>No trend data for this period</p>
            </div>
          )}
          {!trendLoading && trendData && trendData.length>0 && (() => {
            const active = trendMetric==='revenue' ? {color:C.dataBlue,label:'Revenue'} : {color:C.dataTeal,label:'Transactions'};
            return (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top:4,right:8,left:4,bottom:0 }}>
                  <defs>
                    <linearGradient id="dtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={active.color} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={active.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={C.elevated}/>
                  <XAxis dataKey="date" tick={{ fontSize:9,fill:C.textDim }} axisLine={false} tickLine={false} tickFormatter={v=>v?.slice(5)??v}/>
                  <YAxis tick={{ fontSize:9,fill:C.textDim }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={v=>trendMetric==='revenue'?`$${v>=1000?`${(v/1000).toFixed(0)}k`:v}`:String(v)}/>
                  <Tooltip contentStyle={{ fontFamily:FONT,fontSize:12,border:`1px solid ${C.border}`,borderRadius:8 }}
                    formatter={v=>[trendMetric==='revenue'?fmt$(v):fmtNum(v),active.label]}/>
                  <Area dataKey={trendMetric} stroke={active.color} strokeWidth={2} fill="url(#dtGrad)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* ── Member performance table ── */}
      <div style={{ marginBottom:24 }}>
        <SectionHeader title={`Member Performance (${members.length})`}/>
        <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.tableHdr }}>
                  {['#','Member','Revenue','Transactions','Avg Ticket','Rev / Hour','Hrs Worked',''].map((h,i)=>(
                    <th key={i} style={{ padding:'9px 14px',fontSize:10,fontWeight:700,color:C.textDim,textAlign:i<=1?'left':i===7?'center':'right',textTransform:'uppercase',letterSpacing:'0.07em',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailLoading && [0,1,2,3].map(i=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${C.elevated}` }}>
                    {[...Array(8)].map((_,j)=><td key={j} style={{ padding:'12px 14px' }}><Sk h={12} w={j===1?120:60} r={4}/></td>)}
                  </tr>
                ))}
                {!detailLoading && members.map((m,i)=>(
                  <tr key={String(m.employeeId)}
                    style={{ borderBottom:`1px solid ${C.elevated}`,background:i%2===0?C.surface:C.bg }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.tableHover}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.surface:C.bg}
                  >
                    <td style={{ padding:'10px 14px',fontSize:12,fontWeight:700,color:C.textDim,width:32 }}>#{i+1}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                        <div style={{ width:32,height:32,borderRadius:'50%',background:C.accentLt,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <PersonOutlinedIcon sx={{ fontSize:15,color:C.primaryLt }}/>
                        </div>
                        <div>
                          <p style={{ margin:0,fontSize:13,fontWeight:600,color:C.textPri }}>{m.name}</p>
                          <p style={{ margin:'1px 0 0',fontSize:10,color:C.textDim }}>{m.code}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,fontWeight:700,color:C.textPri }}>{fmt$(m.netRevenue)}</td>
                    <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,color:C.textSec }}>{fmtNum(m.txnCount)}</td>
                    <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,color:C.textSec }}>{fmt$(m.avgTicket)}</td>
                    <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,color:C.textSec }}>{fmt$(m.revenuePerHour)}/hr</td>
                    <td style={{ padding:'10px 14px',textAlign:'right',fontSize:13,color:C.textSec }}>{fmtNum(m.hoursWorked,1)}h</td>
                    <td style={{ padding:'10px 14px',textAlign:'center' }}>
                      <button onClick={()=>onDrillMember(m.employeeId)} title="Individual Report"
                        style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',fontFamily:FONT,fontSize:11,fontWeight:600,color:C.textSec }}>
                        <OpenInNewOutlinedIcon sx={{ fontSize:12 }}/> Report
                      </button>
                    </td>
                  </tr>
                ))}
                {!detailLoading && members.length===0 && (
                  <tr><td colSpan={8} style={{ padding:'32px 14px',textAlign:'center',color:C.textDim,fontSize:13 }}>No sales data for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Group stat summary cards ── */}
      {s && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:C.elevated,borderRadius:14,overflow:'hidden',border:`1px solid ${C.border}` }}>
          {[
            { label:'Total Revenue',    value:fmt$(s.revenue)                    },
            { label:'Refunded Amount',  value:fmt$(s.refundedAmount)             },
            { label:'Net Revenue',      value:fmt$(s.revenue - (s.refundedAmount??0)) },
            { label:'Transactions',     value:fmtNum(s.txnCount)                 },
            { label:'Hours Worked',     value:`${fmtNum(s.hoursWorked,1)}h`      },
            { label:'Refund Rate',      value:`${fmtNum(s.refundRate,1)}%`       },
          ].map(({ label,value })=>(
            <div key={label} style={{ background:C.surface,padding:'16px 18px',textAlign:'center' }}>
              <p style={{ margin:0,fontSize:18,fontWeight:800,color:C.textPri }}>{value}</p>
              <p style={{ margin:'4px 0 0',fontSize:10,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.07em' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ManagerGroupReportPage() {
  const token       = useAuthStore(s => s.token);
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [preset,       setPreset]       = useState('today');
  const [customStart,  setCustomStart]  = useState('');
  const [customEnd,    setCustomEnd]    = useState('');
  const [rankBy,       setRankBy]       = useState('revenue');
  const [selectedGroup,setSelectedGroup]= useState(null);
  const [detailGroupId,setDetailGroupId]= useState(null);
  const [compareMetric,setCompareMetric]= useState('revenue');
  const [exporting,    setExporting]    = useState(null);
  const [confirmExport,setConfirmExport]= useState(null);
  const [syncMsg,      setSyncMsg]      = useState(null);

  const range = useMemo(() => {
    if (preset === 'overall') {
      const end   = new Date();
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 5);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (preset === 'custom' && customStart && customEnd)
      return buildDateRange('custom', customStart, customEnd);
    return buildDateRange(preset);
  }, [preset, customStart, customEnd]);

  const qp        = { start: range.start, end: range.end };
  const dateLabel = preset === 'overall'
    ? 'All Time'
    : `${new Date(range.start).toLocaleDateString()} – ${new Date(range.end).toLocaleDateString()}`;

  // ── Sync setting — staleTime:0 so navigating to this page always re-fetches
  const { data: syncData, isLoading: syncLoading } = useQuery({
    queryKey: ['settings-sync'],
    queryFn:  () => apiFetch('/api/settings/sync-staffing', token),
    enabled:  !!token,
    staleTime: 0,
  });
  const syncEnabled = syncData?.syncStaffingBetit ?? false;

  // ── Summary (all groups)
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['grp-summary', range.start, range.end],
    queryFn:  () => apiFetch(`/api/reports/group-ems${qs(qp)}`, token),
    enabled:  !!token && syncEnabled,
    staleTime: 0,
  });

  // ── Leaderboard
  const { data: leaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['grp-lb', range.start, range.end, rankBy],
    queryFn:  () => apiFetch(`/api/reports/group-ems/leaderboard${qs({ ...qp, rankBy })}`, token),
    enabled:  !!token && syncEnabled,
    staleTime: 0,
  });

  const trendGroupBy = preset === 'today' ? 'hour' : preset === 'year' || preset === 'overall' ? 'month' : 'day';

  // ── Detail screen queries (fired only when a group is drilled into)
  const { data: detailGroupData, isLoading: detailGroupLoading } = useQuery({
    queryKey: ['grp-detail-screen', detailGroupId, range.start, range.end],
    queryFn:  () => apiFetch(`/api/reports/group-ems/${detailGroupId}${qs(qp)}`, token),
    enabled:  !!token && syncEnabled && !!detailGroupId,
    staleTime: 0,
  });
  const { data: detailTrendData, isLoading: detailTrendLoading } = useQuery({
    queryKey: ['grp-trend-screen', detailGroupId, range.start, range.end, trendGroupBy],
    queryFn:  () => apiFetch(`/api/reports/group-ems/${detailGroupId}/trend${qs({ ...qp, groupBy: trendGroupBy })}`, token),
    enabled:  !!token && syncEnabled && !!detailGroupId,
    staleTime: 0,
  });

  // ── Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => apiFetch('/api/reports/group-ems/sync', token, { method: 'POST' }),
    onSuccess: r => {
      setSyncMsg(`Synced ${r.totalGroups} groups · ${r.totalMapped} POS employees matched`);
      queryClient.invalidateQueries({ queryKey: ['grp-'] });
      setTimeout(()=>setSyncMsg(null), 5000);
    },
    onError: err => setSyncMsg(`Sync failed: ${err.message}`),
  });

  const handleExport = useCallback(async type => {
    setExporting(type);
    try {
      if (type==='csv') triggerCSV(token, new Date(range.start), new Date(range.end));
      else if (type==='pdf' && summary) buildPDF(summary, dateLabel);
    } finally { setExporting(null); setConfirmExport(null); }
  }, [token, range, summary, dateLabel]);

  const handleGroupSelect  = useCallback(id => setSelectedGroup(p => p===id?null:id), []);
  const handleDrillMember  = useCallback(empId => navigate(`/manager/reports/individual?employeeId=${empId}&preset=${preset}`), [navigate, preset]);
  const handleLeaderboardClick = useCallback(id => setDetailGroupId(id), []);
  const handleBackToList   = useCallback(() => setDetailGroupId(null), []);

  const groups     = summary?.groups ?? [];
  const totals     = summary?.totals;
  const anyLoading = summaryLoading || syncLoading;

  const topGroupByRevenue    = groups.length ? [...groups].sort((a,b) => b.stats.revenue - a.stats.revenue)[0] : null;
  const topGroupByAttendance = groups.length ? [...groups].sort((a,b) => b.stats.attendanceRate - a.stats.attendanceRate)[0] : null;
  const detailGroupStats     = groups.find(g => g.groupId === detailGroupId) ?? null;

  // ── Render detail screen when a group is drilled into
  if (detailGroupId) {
    const presetLabel = PRESETS.find(p => p.id === preset)?.label ?? '';
    return (
      <GroupDetailScreen
        groupId={detailGroupId}
        groupStats={detailGroupStats}
        detailData={detailGroupData}
        detailLoading={detailGroupLoading}
        trendData={detailTrendData}
        trendLoading={detailTrendLoading}
        dateLabel={dateLabel}
        presetLabel={presetLabel}
        onBack={handleBackToList}
        onDrillMember={handleDrillMember}
      />
    );
  }

  return (
    <div style={{ fontFamily:FONT, background:C.bg, minHeight:'100vh', padding:'24px 24px 56px' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:42,height:42,borderRadius:12,background:'#F3E0C7',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <GroupsOutlinedIcon sx={{ fontSize:22,color:'#D4A373' }}/>
          </div>
          <div>
            <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:C.textPri,letterSpacing:'-0.3px' }}>Group Reports</h1>
            <p style={{ margin:'2px 0 0',fontSize:12,color:C.textDim }}>EMS group analytics · POS data · {dateLabel}</p>
          </div>
        </div>
        {syncEnabled && (
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
              style={{ height:34,padding:'0 14px',display:'flex',alignItems:'center',gap:6,borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:syncMutation.isPending?'wait':'pointer',fontFamily:FONT }}>
              <SyncOutlinedIcon sx={{ fontSize:15,color:C.textSec,animation:syncMutation.isPending?'spin 1s linear infinite':'none' }}/>
              <span style={{ fontSize:12,fontWeight:600,color:C.textSec }}>Sync Groups</span>
            </button>
            {[{key:'csv',icon:TableChartOutlinedIcon,label:'Export CSV'},{key:'pdf',icon:PictureAsPdfOutlinedIcon,label:'Export PDF'}].map(({key,icon:Icon,label})=>(
              <button key={key} onClick={()=>setConfirmExport(key)} disabled={!!exporting}
                style={{ height:34,padding:'0 14px',display:'flex',alignItems:'center',gap:6,borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:exporting?'wait':'pointer',fontFamily:FONT }}>
                <Icon sx={{ fontSize:15,color:C.textSec }}/>
                <span style={{ fontSize:12,fontWeight:600,color:C.textSec }}>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Sync feedback ── */}
      {syncMsg && (
        <div style={{ display:'flex',alignItems:'center',gap:10,
          background:syncMsg.startsWith('Sync failed')?'#FFEBEE':'#E8F5EE',
          border:`1px solid ${syncMsg.startsWith('Sync failed')?'#FFCDD2':'#C8E6C9'}`,
          borderRadius:10,padding:'10px 16px',marginBottom:16 }}>
          {syncMsg.startsWith('Sync failed')
            ? <ErrorOutlineOutlinedIcon sx={{ fontSize:18,color:C.error }}/>
            : <CheckCircleOutlinedIcon  sx={{ fontSize:18,color:C.success }}/>}
          <span style={{ fontSize:12,fontWeight:600,color:syncMsg.startsWith('Sync failed')?C.error:C.success }}>{syncMsg}</span>
        </div>
      )}

      {/* ── Sync disabled ── */}
      {!syncLoading && !syncEnabled && (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'80px 24px',textAlign:'center' }}>
          <div style={{ width:64,height:64,borderRadius:18,background:C.elevated,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20 }}>
            <LinkOffOutlinedIcon sx={{ fontSize:30,color:C.textDim }}/>
          </div>
          <p style={{ margin:'0 0 6px',fontSize:16,fontWeight:800,color:C.textPri }}>Staffing Betit not connected</p>
          <p style={{ margin:'0 0 24px',fontSize:13,color:C.textSec,maxWidth:360,lineHeight:1.6 }}>
            Enable the Staffing Betit integration in Settings to access group-based analytics powered by EMS group membership.
          </p>
          <button onClick={()=>navigate('/manager/settings')}
            style={{ height:36,padding:'0 20px',background:C.primary,border:'none',borderRadius:8,fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer',fontFamily:FONT }}>
            Go to Settings
          </button>
        </div>
      )}

      {(syncLoading || syncEnabled) && (
        <>
          {/* ── Date filter ── */}
          <div style={{ display:'flex',gap:6,marginBottom:24,flexWrap:'wrap',alignItems:'center' }}>
            <FilterListOutlinedIcon sx={{ fontSize:17,color:C.textDim }}/>
            {PRESETS.map(p=>(
              <button key={p.id} onClick={()=>{ setPreset(p.id); setSelectedGroup(null); }} style={{
                padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:FONT,
                border:`1px solid ${preset===p.id?C.primary:C.border}`,
                background:preset===p.id?C.primary:C.surface,
                color:preset===p.id?'#fff':C.textSec,
              }}>{p.label}</button>
            ))}
            {preset==='custom' && (
              <>
                <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}
                  style={{ height:34,padding:'0 10px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:FONT,color:C.textPri }}/>
                <span style={{ color:C.textDim,fontSize:12 }}>–</span>
                <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}
                  style={{ height:34,padding:'0 10px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:FONT,color:C.textPri }}/>
              </>
            )}
          </div>

          {/* ── KPI cards ── */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:14,marginBottom:24 }}>
            <KpiCard label="Total Revenue"   value={fmt$(totals?.revenue)}      icon={AttachMoneyOutlinedIcon}      color={C.accent}   iconBg={C.accentLt}          skeleton={anyLoading}/>
            <KpiCard label="Transactions"    value={fmtNum(totals?.txnCount)}   icon={ReceiptLongOutlinedIcon}      color={C.info}     iconBg={C.infoLt}            skeleton={anyLoading}/>
            <KpiCard label="Avg Ticket"      value={fmt$(totals?.avgTicket)}    icon={TrendingUpOutlinedIcon}       color={C.success}  iconBg={C.successLt}         skeleton={anyLoading}/>
            <KpiCard label="Rev / Hour"      value={totals?`${fmt$(totals.revenuePerHour)}/hr`:'—'} icon={SpeedOutlinedIcon} color={C.primaryLt} iconBg={C.elevated} skeleton={anyLoading}/>
            <KpiCard label="Active Groups"   value={fmtNum(totals?.totalGroups)} icon={GroupsOutlinedIcon}          color={C.dataBlue} iconBg={`${C.dataBlue}18`}   skeleton={anyLoading}/>
            <KpiCard label="Avg Refund"
              value={groups.length?`${fmtNum(groups.reduce((s,g)=>s+g.stats.refundRate,0)/groups.length,1)}%`:'—'}
              icon={AssignmentReturnOutlinedIcon} color={C.warning} iconBg={C.warningLt} skeleton={anyLoading}/>
          </div>

          {/* ── Leaderboard ── */}
          <div style={{ marginBottom:24 }}>
            <SectionHeader title="Leaderboard"/>
            <Leaderboard
              data={leaderboard}
              loading={lbLoading}
              rankBy={rankBy}
              onRankChange={setRankBy}
              onGroupClick={handleLeaderboardClick}
            />
          </div>

          {/* ── Group cards ── */}
          <SectionHeader title={`Group Breakdown (${groups.length})`} right={
            selectedGroup && (
              <button onClick={()=>setSelectedGroup(null)}
                style={{ fontSize:11,fontWeight:700,color:C.textDim,background:'none',border:'none',cursor:'pointer',fontFamily:FONT }}>
                Clear selection
              </button>
            )
          }/>

          {summaryLoading && (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16 }}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16 }}>
                  <div style={{ display:'flex',gap:10,marginBottom:14 }}>
                    <Sk h={36} w={36} r={9}/><div style={{ flex:1 }}><Sk h={12} r={4}/><div style={{ marginTop:6 }}><Sk h={10} w="50%" r={4}/></div></div>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4 }}>
                    {[0,1,2,3,4,5].map(j=><Sk key={j} h={52} r={6}/>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!summaryLoading && groups.length===0 && (
            <div style={{ textAlign:'center',padding:'48px 24px',color:C.textDim }}>
              <GroupsOutlinedIcon sx={{ fontSize:48,color:C.border }}/>
              <p style={{ margin:'12px 0 4px',fontSize:14,fontWeight:700,color:C.textSec }}>No groups found</p>
              <p style={{ margin:'0 0 16px',fontSize:13 }}>Click "Sync Groups" to pull group data from the staffing portal.</p>
              <button onClick={()=>syncMutation.mutate()} disabled={syncMutation.isPending}
                style={{ height:36,padding:'0 18px',background:C.primary,border:'none',borderRadius:8,fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer',fontFamily:FONT }}>
                Sync Now
              </button>
            </div>
          )}

          {!summaryLoading && groups.length>0 && (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16,marginBottom:32 }}>
              {groups.map((g,i)=>(
                <GroupCard key={g.groupId} group={g} color={GROUP_COLORS[i%GROUP_COLORS.length]}
                  isSelected={selectedGroup===g.groupId} onSelect={handleGroupSelect}
                  token={token} qp={qp} syncEnabled={syncEnabled}
                  onDrillMember={handleDrillMember}/>
              ))}
            </div>
          )}

          {/* ── Group comparison bar chart ── */}
          <div style={{ marginBottom:24 }}>
            <SectionHeader title="Group Comparison"/>
            <GroupComparisonChart
              groups={groups}
              loading={summaryLoading}
              metric={compareMetric}
              onMetricChange={setCompareMetric}
            />
          </div>
        </>
      )}

      {/* ── Export modal ── */}
      {confirmExport && (
        <div onClick={()=>!exporting&&setConfirmExport(null)}
          style={{ position:'fixed',inset:0,background:'rgba(30,20,15,0.45)',zIndex:1200,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:C.surface,borderRadius:16,padding:'28px 28px 22px',width:340,boxShadow:'0 24px 60px rgba(62,39,35,0.22)',fontFamily:FONT }}>
            <div style={{ width:44,height:44,borderRadius:12,background:confirmExport==='pdf'?'#FFEBEE':'#E3F2FD',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14 }}>
              {confirmExport==='pdf'
                ?<PictureAsPdfOutlinedIcon sx={{ fontSize:22,color:C.error }}/>
                :<TableChartOutlinedIcon  sx={{ fontSize:22,color:C.info }}/>}
            </div>
            <p style={{ margin:'0 0 4px',fontSize:16,fontWeight:800,color:C.textPri }}>Export {confirmExport.toUpperCase()}</p>
            <p style={{ margin:'0 0 4px',fontSize:13,color:C.textSec }}>Group Report · {dateLabel}</p>
            <p style={{ margin:'0 0 20px',fontSize:12,color:C.textDim }}>
              {confirmExport==='csv'?'All groups with KPI metrics in a spreadsheet.':'Formatted PDF with summary, leaderboard, and group breakdown.'}
            </p>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setConfirmExport(null)} disabled={!!exporting}
                style={{ flex:1,height:38,borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,fontSize:13,fontWeight:600,color:C.textSec,cursor:'pointer',fontFamily:FONT }}>
                Cancel
              </button>
              <button onClick={()=>handleExport(confirmExport)} disabled={!!exporting}
                style={{ flex:2,height:38,borderRadius:8,border:'none',background:C.primary,fontSize:13,fontWeight:700,color:'#fff',cursor:exporting?'wait':'pointer',fontFamily:FONT }}>
                {exporting?'Exporting…':`Download ${confirmExport.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
