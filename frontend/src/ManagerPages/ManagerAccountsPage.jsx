import React, { useState, useEffect, useCallback } from 'react';
import PeopleOutlinedIcon         from '@mui/icons-material/PeopleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import CheckCircleOutlineIcon     from '@mui/icons-material/CheckCircleOutlined';
import BlockOutlinedIcon          from '@mui/icons-material/BlockOutlined';
import InfoOutlinedIcon           from '@mui/icons-material/InfoOutlined';
import RefreshOutlinedIcon        from '@mui/icons-material/RefreshOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

const C = {
  primary: '#3E2723', primaryLt: '#5A3A33',
  accent: '#D4A373', bg: '#F5F3F1', surface: '#ffffff',
  elevated: '#EFE7E2', border: '#DDD2CC',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
};

const STATUS_META = {
  PENDING:   { label: 'Pending',   color: '#B26A00', bg: 'rgba(178,106,0,0.09)',   border: 'rgba(178,106,0,0.25)'   },
  ACTIVE:    { label: 'Active',    color: '#2E7D4F', bg: 'rgba(46,125,79,0.09)',   border: 'rgba(46,125,79,0.25)'   },
  REJECTED:  { label: 'Rejected',  color: '#B71C1C', bg: 'rgba(183,28,28,0.08)',   border: 'rgba(183,28,28,0.22)'   },
  SUSPENDED: { label: 'Suspended', color: '#6B5B57', bg: 'rgba(107,91,87,0.09)',   border: 'rgba(107,91,87,0.22)'   },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: m.color, background: m.bg, border: `1px solid ${m.border}`,
      borderRadius: 5, padding: '2px 7px',
    }}>
      {m.label}
    </span>
  );
}

function Avatar({ name }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: C.elevated, border: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 800, color: C.primary, textTransform: 'uppercase',
    }}>
      {(name ?? '?').charAt(0)}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, iconBg }) {
  return (
    <CornerCard
      borderColor={C.border} accentColor={color}
      borderRadius={12} cornerSize={22} cornerHeight={22}
      style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 20, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: '26px' }}>{value}</p>
        <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      </div>
    </CornerCard>
  );
}

const TABS = ['PENDING', 'ALL'];

export default function ManagerAccountsPage() {
  const { token } = useAuthStore();

  const [tab, setTab]           = useState('PENDING');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [acting, setActing]     = useState(null); // id being updated

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  /* ── fetch accounts ── */
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tab === 'PENDING' ? '?status=PENDING' : '';
      const res = await fetch(`${API}/api/accounts${qs}`, { headers: authHeaders });
      const data = await res.json();
      setAccounts(data.data ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  /* ── update account status ── */
  const updateStatus = async (id, status) => {
    setActing(id);
    try {
      const res = await fetch(`${API}/api/accounts/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAccounts(prev =>
          tab === 'PENDING'
            ? prev.filter(u => u._id !== id)
            : prev.map(u => u._id === id ? { ...u, status, isActive: status === 'ACTIVE' } : u)
        );
      }
    } catch {
    } finally {
      setActing(null);
    }
  };

  /* ── derived stats ── */
  const pending   = accounts.filter(u => u.status === 'PENDING').length;
  const active    = accounts.filter(u => u.status === 'ACTIVE').length;
  const suspended = accounts.filter(u => u.status === 'SUSPENDED').length;
  const allCount  = accounts.length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 0px)',
      background: C.bg, padding: '20px 20px 32px', gap: 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Manager Portal
          </p>
          <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
            Account Management
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
            Review, approve, and manage employee accounts
          </p>
        </div>
        <button
          onClick={fetchAccounts}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.surface,
            fontSize: 12, fontWeight: 700, color: C.textSec, cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshOutlinedIcon sx={{ fontSize: 15, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Info notice */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 14px' }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: C.info, flexShrink: 0, marginTop: '1px' }} />
        <p style={{ margin: 0, fontSize: 12, color: '#01579B', fontWeight: 500, lineHeight: '18px' }}>
          New employee signups are created as <strong>Pending</strong> and cannot log in until approved. Approving sets their account to <strong>Active</strong>. You can suspend or reject accounts at any time.
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <KpiCard label="Total Accounts" value={tab === 'ALL' ? allCount : '—'} icon={PeopleOutlinedIcon}         color={C.info}    iconBg="rgba(2,119,189,0.09)"  />
        <KpiCard label="Pending"        value={tab === 'PENDING' ? allCount : pending}  icon={HourglassEmptyOutlinedIcon} color={C.warning} iconBg="rgba(178,106,0,0.09)"  />
        <KpiCard label="Active"         value={tab === 'ALL' ? active : '—'}    icon={CheckCircleOutlineIcon}   color={C.success} iconBg="rgba(46,125,79,0.09)"  />
        <KpiCard label="Suspended"      value={tab === 'ALL' ? suspended : '—'} icon={BlockOutlinedIcon}         color={C.error}   iconBg="rgba(183,28,28,0.08)"  />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: C.elevated, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              background: tab === t ? C.surface : 'transparent',
              color: tab === t ? C.primary : C.textDim,
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'PENDING' ? 'Pending Approvals' : 'All Accounts'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 280,
        position: 'relative',
      }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `3px solid ${C.elevated}`, borderTop: `3px solid ${C.primary}`,
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#F3EDE9' }}>
                {['Employee', 'Role', 'Status', 'Joined', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: i === 4 ? 'right' : 'left',
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 10, fontWeight: 700, color: C.textDim,
                    letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '52px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PeopleOutlinedIcon sx={{ fontSize: 24, color: C.primary }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>
                        {tab === 'PENDING' ? 'No pending accounts' : 'No accounts found'}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: C.textSec }}>
                        {tab === 'PENDING' ? 'All signup requests have been reviewed.' : 'No local employee accounts exist yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {accounts.map((u) => {
                const isActing = acting === u._id;
                const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                return (
                  <tr
                    key={u._id}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 0.12s' }}
                  >
                    {/* Employee */}
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{u.name ?? '—'}</p>
                          <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{u.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>{u.role}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <StatusBadge status={u.status} />
                    </td>

                    {/* Joined */}
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.textDim }}>{joined}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {u.status !== 'ACTIVE' && (
                          <ActionBtn
                            label="Approve"
                            color="#2E7D4F" bg="rgba(46,125,79,0.09)" border="rgba(46,125,79,0.25)"
                            disabled={isActing}
                            onClick={() => updateStatus(u._id, 'ACTIVE')}
                          />
                        )}
                        {u.status !== 'REJECTED' && u.status !== 'ACTIVE' && (
                          <ActionBtn
                            label="Reject"
                            color="#B71C1C" bg="rgba(183,28,28,0.07)" border="rgba(183,28,28,0.22)"
                            disabled={isActing}
                            onClick={() => updateStatus(u._id, 'REJECTED')}
                          />
                        )}
                        {u.status === 'ACTIVE' && (
                          <ActionBtn
                            label="Suspend"
                            color="#6B5B57" bg="rgba(107,91,87,0.09)" border="rgba(107,91,87,0.22)"
                            disabled={isActing}
                            onClick={() => updateStatus(u._id, 'SUSPENDED')}
                          />
                        )}
                        {(u.status === 'SUSPENDED' || u.status === 'REJECTED') && (
                          <ActionBtn
                            label="Reactivate"
                            color="#2E7D4F" bg="rgba(46,125,79,0.09)" border="rgba(46,125,79,0.25)"
                            disabled={isActing}
                            onClick={() => updateStatus(u._id, 'ACTIVE')}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textAlign: 'right', letterSpacing: '0.04em' }}>
        {accounts.length} account{accounts.length !== 1 ? 's' : ''} · {tab === 'PENDING' ? 'pending approvals' : 'all local employees'}
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function ActionBtn({ label, color, bg, border, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: 7, border: `1px solid ${border}`,
        background: bg, color, fontSize: 11, fontWeight: 700,
        cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap', letterSpacing: '0.03em',
        transition: 'opacity 0.15s',
      }}
    >
      {label}
    </button>
  );
}
