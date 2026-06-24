import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import GroupsOutlinedIcon         from '@mui/icons-material/GroupsOutlined';
import PeopleOutlinedIcon         from '@mui/icons-material/PeopleOutlined';
import SearchOutlinedIcon         from '@mui/icons-material/SearchOutlined';
import RefreshOutlinedIcon        from '@mui/icons-material/RefreshOutlined';
import KeyboardArrowDownIcon      from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon        from '@mui/icons-material/KeyboardArrowUp';
import StarOutlinedIcon           from '@mui/icons-material/StarOutlined';
import LinkOffOutlinedIcon        from '@mui/icons-material/LinkOffOutlined';
import ErrorOutlineOutlinedIcon   from '@mui/icons-material/ErrorOutlineOutlined';
import InfoOutlinedIcon           from '@mui/icons-material/InfoOutlined';
import useAuthStore from '../store/useAuthStore';

const API  = import.meta.env.VITE_API_BASE_URL ?? '';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary:    '#3E2723',
  primaryLt:  '#6D4C41',
  accent:     '#D4A373',
  accentLt:   '#F3E0C7',
  success:    '#2E7D4F',
  successLt:  '#E8F5EE',
  info:       '#0277BD',
  infoLt:     '#E3F2FD',
  warning:    '#B26A00',
  warningLt:  '#FFF8E1',
  error:      '#B71C1C',
  errorLt:    '#FFEBEE',
  textPri:    '#2B1D1A',
  textSec:    '#6B5B57',
  textDim:    '#A09490',
  border:     '#DDD2CC',
  surface:    '#ffffff',
  bg:         '#F5F3F1',
  elevated:   '#EFE7E2',
  tableHdr:   '#F3EDE9',
};

const EMS_AVATAR_BASE = 'http://localhost:5002';

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, iconBg, skeleton }) {
  return (
    <div style={{
      position: 'relative',
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      fontFamily: FONT,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 20, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {skeleton
          ? <div style={{ height: 24, width: 60, borderRadius: 4, background: C.elevated, marginBottom: 6 }} />
          : <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: '28px' }}>{value}</p>}
        <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Member avatar ────────────────────────────────────────────────────────────

function MemberAvatar({ name, profilePicture, size = 32 }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = (name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (profilePicture && !imgErr) {
    const src = profilePicture.startsWith('http') ? profilePicture : `${EMS_AVATAR_BASE}${profilePicture}`;
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.border}` }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: C.accentLt,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, border: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color: C.primaryLt, fontFamily: FONT }}>{initials}</span>
    </div>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const color  = score >= 80 ? C.success  : score >= 50 ? C.warning  : C.error;
  const bg     = score >= 80 ? C.successLt : score >= 50 ? C.warningLt : C.errorLt;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 6, padding: '2px 7px', fontFamily: FONT }}>
      {score}
    </span>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({ group }) {
  const [expanded, setExpanded] = useState(false);
  const members = group.employees ?? [];
  const avgScore = members.length
    ? Math.round(members.reduce((s, m) => s + (m.performanceScore ?? 0), 0) / members.length)
    : 0;
  const totalPts = members.reduce((s, m) => s + (m.totalPoints ?? 0), 0);

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Card header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.elevated}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GroupsOutlinedIcon sx={{ fontSize: 20, color: C.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri }}>{members.length}</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Members</p>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: avgScore >= 80 ? C.success : avgScore >= 50 ? C.warning : C.error }}>{avgScore}</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Score</p>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.accent }}>{totalPts.toLocaleString()}</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Pts</p>
          </div>
        </div>
      </div>

      {/* Member list toggle */}
      {members.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              width: '100%', fontFamily: FONT,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {expanded ? 'Hide members' : 'View members'}
            </span>
            {expanded
              ? <KeyboardArrowUpIcon sx={{ fontSize: 16, color: C.textDim }} />
              : <KeyboardArrowDownIcon sx={{ fontSize: 16, color: C.textDim }} />}
          </button>

          {expanded && (
            <div style={{ borderTop: `1px solid ${C.elevated}` }}>
              {members.map((member, i) => (
                <div key={member._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 18px',
                    borderBottom: i < members.length - 1 ? `1px solid ${C.elevated}` : 'none',
                    background: i % 2 === 0 ? C.surface : C.bg,
                  }}
                >
                  <MemberAvatar name={member.name} profilePicture={member.profilePicture} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    <ScoreBadge score={member.performanceScore ?? 0} />
                    <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{(member.totalPoints ?? 0).toLocaleString()} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: C.elevated }} />
        <div>
          <div style={{ width: 120, height: 14, borderRadius: 4, background: C.elevated, marginBottom: 6 }} />
          <div style={{ width: 70, height: 10, borderRadius: 4, background: C.elevated }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 52, borderRadius: 8, background: C.elevated }} />)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ManagerGroupsPage() {
  const token    = useAuthStore(s => s.token);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Check whether EMS sync is enabled — groups are only available when it is
  const { data: syncData, isLoading: syncLoading } = useQuery({
    queryKey: ['settings-sync'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/settings/sync-staffing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { syncStaffingBetit: false };
      return res.json();
    },
    enabled: !!token,
    staleTime: 0,
  });

  const syncEnabled = syncData?.syncStaffingBetit ?? false;

  const { data: resp, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['ems-groups'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/staffing/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to load groups (${res.status})`);
      }
      return res.json();
    },
    enabled: !!token && syncEnabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  });

  const groups = resp?.data ?? [];

  const filtered = search.trim()
    ? groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.employees?.some(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
      )
    : groups;

  const totalMembers = groups.reduce((s, g) => s + (g.memberCount ?? 0), 0);
  const allMembers   = groups.flatMap(g => g.employees ?? []);
  const globalAvg    = allMembers.length
    ? Math.round(allMembers.reduce((s, m) => s + (m.performanceScore ?? 0), 0) / allMembers.length)
    : 0;
  const globalPts    = allMembers.reduce((s, m) => s + (m.totalPoints ?? 0), 0);

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: '100vh', padding: '24px 24px 48px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GroupsOutlinedIcon sx={{ fontSize: 22, color: C.accent }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Groups</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textDim }}>Employee groups from staffing portal — read only</p>
          </div>
        </div>
        {syncEnabled && (
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 14px',
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, cursor: isFetching ? 'not-allowed' : 'pointer',
              fontFamily: FONT,
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 15, color: C.textSec, animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Refresh</span>
          </button>
        )}
      </div>

      {/* Sync not enabled — block all content */}
      {!syncLoading && !syncEnabled && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '72px 24px', textAlign: 'center',
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <LinkOffOutlinedIcon sx={{ fontSize: 30, color: C.textDim }} />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: C.textPri }}>Staffing Betit not connected</p>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: C.textSec, maxWidth: 340, lineHeight: '1.6' }}>
            Enable the Staffing Betit integration in Settings to view employee groups from the staffing portal.
          </p>
          <button
            onClick={() => navigate('/manager/settings')}
            style={{
              height: 36, padding: '0 20px',
              background: C.primary, border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            Go to Settings
          </button>
        </div>
      )}

      {/* Everything below is hidden when sync is off */}
      {(syncLoading || syncEnabled) && (
        <>

      {/* Read-only notice */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'rgba(2,119,189,0.06)', border:'1px solid rgba(2,119,189,0.18)', borderRadius:10, padding:'10px 14px', marginBottom:20 }}>
        <InfoOutlinedIcon sx={{ fontSize:16, color:C.info, flexShrink:0, marginTop:'1px' }} />
        <p style={{ margin:0, fontSize:12, color:'#01579B', fontWeight:500, lineHeight:'18px', fontFamily:FONT }}>
          <strong>Read-only view</strong> — groups are sourced from Staffing Betit (EMS). To create or modify groups, visit the{' '}
          <a href="http://localhost:5002" target="_blank" rel="noopener noreferrer" style={{ color:C.info, fontWeight:700, textDecoration:'underline' }}>
            Staffing Betit portal
          </a>. To disable this sync, go to <strong>Settings › Sync Data</strong>.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total Groups"   value={isLoading ? '—' : groups.length}          icon={GroupsOutlinedIcon}       color={C.accent}   iconBg={C.accentLt}  skeleton={isLoading} />
        <KpiCard label="Total Members"  value={isLoading ? '—' : totalMembers}            icon={PeopleOutlinedIcon}       color={C.info}     iconBg={C.infoLt}    skeleton={isLoading} />
        <KpiCard label="Avg Perf Score" value={isLoading ? '—' : `${globalAvg}`}          icon={StarOutlinedIcon}         color={C.success}  iconBg={C.successLt} skeleton={isLoading} />
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <SearchOutlinedIcon sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: C.textDim }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search groups or members…"
          style={{
            width: '100%', height: 36, paddingLeft: 34, paddingRight: 12,
            border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface,
            fontSize: 13, fontFamily: FONT, color: C.textPri, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Error state */}
      {isError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.errorLt, border: `1px solid #FFCDD2`, borderRadius: 10,
          padding: '14px 18px', marginBottom: 20,
        }}>
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 20, color: C.error, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>Failed to load groups</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#C62828' }}>{error?.message}</p>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: C.textDim }}>
          <GroupsOutlinedIcon sx={{ fontSize: 48, color: C.border, mb: 1 }} />
          <p style={{ margin: '12px 0 4px', fontSize: 15, fontWeight: 700, color: C.textSec }}>
            {search ? 'No groups match your search' : 'No groups found'}
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            {search ? 'Try a different search term.' : 'Groups created in the staffing portal will appear here.'}
          </p>
        </div>
      )}

      {/* Groups grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <>
          {search && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: C.textDim, fontWeight: 600 }}>
              {filtered.length} of {groups.length} {groups.length === 1 ? 'group' : 'groups'} shown
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(g => <GroupCard key={g._id} group={g} />)}
          </div>
        </>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        </>
      )}
    </div>
  );
}
