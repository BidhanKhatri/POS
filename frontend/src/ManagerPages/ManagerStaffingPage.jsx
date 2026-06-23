import React, { useState, useEffect, useCallback } from 'react';
import ChevronLeftOutlinedIcon   from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon  from '@mui/icons-material/ChevronRightOutlined';
import AccessTimeOutlinedIcon    from '@mui/icons-material/AccessTimeOutlined';
import PeopleOutlinedIcon        from '@mui/icons-material/PeopleOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RefreshOutlinedIcon       from '@mui/icons-material/RefreshOutlined';
import EventBusyOutlinedIcon     from '@mui/icons-material/EventBusyOutlined';
import ErrorOutlineOutlinedIcon  from '@mui/icons-material/ErrorOutlineOutlined';
import InfoOutlinedIcon          from '@mui/icons-material/InfoOutlined';
import SyncOutlinedIcon          from '@mui/icons-material/SyncOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

/* ─── Brand palette ──────────────────────────────────────────────────────── */
const C = {
  primary:  '#3E2723',
  primaryLt:'#5A3A33',
  accent:   '#D4A373',
  bg:       '#F5F3F1',
  surface:  '#ffffff',
  elevated: '#EFE7E2',
  tableHdr: '#F3EDE9',
  border:   '#DDD2CC',
  borderFoc:'#3E2723',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  success:  '#2E7D4F',
  warning:  '#B26A00',
  error:    '#B71C1C',
  info:     '#0277BD',
};

/* ─── Native date helpers (no date-fns needed) ───────────────────────────── */
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYMD(date) {
  // Produces YYYY-MM-DD in local time (avoids UTC-offset bugs)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(date) {
  return toYMD(date) === toYMD(new Date());
}

function fmt12(hhmm) {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function weekLabel(weekStart) {
  const end = addDays(weekStart, 6);
  const sm = MONTHS[weekStart.getMonth()];
  const em = MONTHS[end.getMonth()];
  if (sm === em) {
    return `${sm} ${weekStart.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${sm} ${weekStart.getDate()} – ${em} ${end.getDate()}, ${end.getFullYear()}`;
}

/* ─── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, iconBg }) {
  return (
    <CornerCard
      borderColor={C.border}
      accentColor={color}
      borderRadius={12}
      cornerSize={22}
      cornerHeight={22}
      style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: iconBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 20, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: '26px' }}>
          {value}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </p>
      </div>
    </CornerCard>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function ManagerStaffingPage() {
  const { token } = useAuthStore();
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules,   setSchedules]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  // Sync toggle
  const [syncEnabled,  setSyncEnabled]  = useState(false);
  const [syncLoading,  setSyncLoading]  = useState(true);
  const [syncToggling, setSyncToggling] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings/sync-staffing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setSyncEnabled(d.syncStaffingBetit ?? false))
      .catch(() => {})
      .finally(() => setSyncLoading(false));
  }, [token]);

  const toggleSync = async () => {
    setSyncToggling(true);
    try {
      const res = await fetch(`${API}/api/settings/sync-staffing`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ syncStaffingBetit: !syncEnabled }),
      });
      const data = await res.json();
      setSyncEnabled(data.syncStaffingBetit);
    } catch {
    } finally {
      setSyncToggling(false);
    }
  };

  const weekStart = startOfWeek(currentDate);
  const weekEnd   = addDays(weekStart, 6);

  /* ── fetch week data ── */
  const fetchWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      startDate: toYMD(weekStart),
      endDate:   toYMD(weekEnd),
    });
    try {
      const res = await fetch(`${API}/api/staffing/shifts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error ${res.status}`);
      }
      const json = await res.json();
      setSchedules(json.data ?? []);
    } catch (err) {
      setError(err.message);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [token, toYMD(weekStart), toYMD(weekEnd)]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  /* ── build unique employee list ordered by name ── */
  const employees = [...new Map(
    schedules
      .filter(s => s.employee?._id)
      .map(s => [String(s.employee._id), s.employee])
  ).values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  /* ── schedule lookup: empId+date → [shifts] ── */
  function shiftsFor(empId, ymd) {
    return schedules.filter(s => String(s.employee?._id) === String(empId) && s.date === ymd);
  }

  /* ── weekly hours per employee ── */
  function weeklyHours(empId) {
    const total = schedules
      .filter(s => String(s.employee?._id) === String(empId))
      .reduce((acc, s) => acc + Math.max(0, s.scheduledHours ?? 0), 0);
    const h = Math.floor(total);
    const m = Math.round((total - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  /* ── derived stats ── */
  const totalHours = schedules.reduce((a, s) => a + Math.max(0, s.scheduledHours ?? 0), 0);

  /* ── week day columns ── */
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100dvh - 0px)',
      background: C.bg,
      padding: '20px 20px 32px',
      gap: 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxSizing: 'border-box',
    }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Manager Portal
            </p>
            <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
              Staffing Schedule
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
              Read-only view sourced from Staffing Betit (EMS)
            </p>
          </div>

          {/* Week navigator + refresh */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '6px 8px',
            flexWrap: 'wrap',
          }}>
            {/* Prev week */}
            <button
              onClick={() => setCurrentDate(d => addDays(d, -7))}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.textSec, flexShrink: 0,
              }}
              aria-label="Previous week"
            >
              <ChevronLeftOutlinedIcon sx={{ fontSize: 16 }} />
            </button>

            {/* Date range label */}
            <span style={{
              fontSize: 12, fontWeight: 700, color: C.textPri,
              minWidth: 160, textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              {weekLabel(weekStart)}
            </span>

            {/* Next week */}
            <button
              onClick={() => setCurrentDate(d => addDays(d, 7))}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.textSec, flexShrink: 0,
              }}
              aria-label="Next week"
            >
              <ChevronRightOutlinedIcon sx={{ fontSize: 16 }} />
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

            {/* Today */}
            <button
              onClick={() => setCurrentDate(new Date())}
              style={{
                padding: '5px 12px', borderRadius: 7,
                border: `1px solid ${C.border}`,
                background: C.primary, color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em',
              }}
            >
              Today
            </button>

            {/* Refresh */}
            <button
              onClick={fetchWeek}
              disabled={loading}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.textSec, opacity: loading ? 0.5 : 1, flexShrink: 0,
              }}
              aria-label="Refresh"
            >
              <RefreshOutlinedIcon sx={{ fontSize: 15, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatCard label="Schedules"   value={schedules.length}            icon={CalendarMonthOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.09)"    />
          <StatCard label="Employees"   value={employees.length}            icon={PeopleOutlinedIcon}        color={C.primary} iconBg="rgba(62,39,35,0.09)"     />
          <StatCard label="Total Hours" value={`${totalHours.toFixed(1)}h`} icon={AccessTimeOutlinedIcon}   color={C.success} iconBg="rgba(46,125,79,0.09)"    />
        </div>
      </div>

      {/* ── Sync Staffing Betit toggle ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9, flexShrink: 0,
            background: syncEnabled ? 'rgba(46,125,79,0.10)' : C.elevated,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SyncOutlinedIcon sx={{ fontSize: 19, color: syncEnabled ? C.success : C.textDim }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Sync Staffing Betit</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>
              {syncEnabled
                ? 'Signups verified against EMS — email confirmation required'
                : 'Any email accepted — no EMS validation on signup'}
            </p>
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={toggleSync}
          disabled={syncLoading || syncToggling}
          aria-label="Toggle Staffing Betit sync"
          style={{
            position: 'relative', width: 46, height: 26, borderRadius: 13,
            background: syncEnabled ? C.success : C.border,
            border: 'none', cursor: (syncLoading || syncToggling) ? 'wait' : 'pointer',
            transition: 'background 0.2s', flexShrink: 0,
            opacity: (syncLoading || syncToggling) ? 0.55 : 1,
          }}
        >
          <span style={{
            position: 'absolute', top: 3,
            left: syncEnabled ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* ── Read-only notice ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 14px' }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: C.info, flexShrink: 0, marginTop: '1px' }} />
        <p style={{ margin: 0, fontSize: 12, color: '#01579B', fontWeight: 500, lineHeight: '18px' }}>
          This is a <strong>read-only view</strong> sourced from Staffing Betit (EMS). Shift data updates automatically every 5 minutes. To create or modify schedules, visit the{' '}
          <a
            href="https://staffingbetit.com/admin/scheduling"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0277BD', fontWeight: 700, textDecoration: 'underline' }}
          >
            Staffing Betit admin portal
          </a>.
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && !loading && (
        <div style={{
          background: '#FFF5F5', border: `1px solid #FECACA`,
          borderRadius: 10, padding: '13px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: C.error, flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>{error}</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#7F1D1D', lineHeight: '17px' }}>
              Make sure the EMS server is running on port 5002 and STAFFING_API_TOKEN matches in both .env files.
            </p>
          </div>
        </div>
      )}

      {/* ── Roster table ── */}
      <div style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 320,
        position: 'relative',
      }}>

        {/* Mobile scroll hint */}
        <div style={{
          padding: '7px 14px',
          borderBottom: `1px solid ${C.border}`,
          background: C.tableHdr,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Scroll → to see all days
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.primaryLt }}>
            {employees.length} employee{employees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: 'rgba(255,255,255,0.70)',
            backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `3px solid ${C.elevated}`,
              borderTop: `3px solid ${C.primary}`,
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        {/* Scrollable table area */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{
            width: '100%',
            minWidth: 900,
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}>
            {/* ── Sticky column headers ── */}
            <thead>
              <tr>
                {/* Employee sticky cell */}
                <th style={{
                  position: 'sticky', left: 0, top: 0, zIndex: 40,
                  background: C.surface,
                  borderBottom: `1px solid ${C.border}`,
                  borderRight: `1px solid ${C.border}`,
                  padding: '10px 14px',
                  textAlign: 'left',
                  width: 190, minWidth: 190,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PeopleOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Team Member
                    </span>
                  </div>
                </th>

                {/* Day columns */}
                {weekDays.map((day, idx) => {
                  const today = isToday(day);
                  return (
                    <th key={idx} style={{
                      position: 'sticky', top: 0, zIndex: 30,
                      background: C.surface,
                      borderBottom: `1px solid ${C.border}`,
                      padding: '8px 6px',
                      width: 110, minWidth: 100,
                    }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '6px 8px', borderRadius: 8,
                        background: today ? `${C.primary}10` : 'transparent',
                        border: today ? `1px solid ${C.primary}25` : '1px solid transparent',
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                          color: today ? C.primary : C.textDim,
                          textTransform: 'uppercase',
                        }}>
                          {DAYS[day.getDay()]}
                        </span>
                        <span style={{
                          fontSize: 18, fontWeight: 900, lineHeight: 1.1, marginTop: 1,
                          color: today ? C.primary : C.textPri,
                        }}>
                          {day.getDate()}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* ── Employee rows ── */}
            <tbody>
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, background: C.elevated,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <EventBusyOutlinedIcon sx={{ fontSize: 26, color: C.primary }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>
                        No schedules this week
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: C.textSec, maxWidth: 280, lineHeight: '18px' }}>
                        {error
                          ? 'Connection to EMS failed — see the error above.'
                          : 'No shifts have been published in Staffing Betit for this week. Use the arrows to navigate to another week.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {employees.map((emp) => (
                <tr
                  key={emp._id}
                  style={{ transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Sticky employee cell */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 20,
                    background: 'inherit',
                    borderBottom: `1px solid ${C.border}`,
                    borderRight: `1px solid ${C.border}`,
                    padding: '10px 14px',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: C.elevated,
                        border: `1.5px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 12, fontWeight: 800, color: C.primary,
                        textTransform: 'uppercase',
                      }}>
                        {(emp.name ?? '?').charAt(0)}
                      </div>
                      {/* Info */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120,
                        }}>
                          {emp.name ?? '—'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <p style={{
                            margin: 0, fontSize: 10, color: C.textDim,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90,
                          }}>
                            {emp.email ?? ''}
                          </p>
                          {/* Weekly hours badge */}
                          <span style={{
                            fontSize: 9, fontWeight: 800, color: C.primary,
                            background: `${C.primary}12`,
                            border: `1px solid ${C.primary}25`,
                            borderRadius: 4, padding: '1px 5px',
                            letterSpacing: '0.04em', whiteSpace: 'nowrap',
                          }}>
                            {weeklyHours(emp._id)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {weekDays.map((day, idx) => {
                    const ymd      = toYMD(day);
                    const dayShifts = shiftsFor(emp._id, ymd);
                    const todayCell = isToday(day);

                    return (
                      <td key={idx} style={{
                        borderBottom: `1px solid ${C.border}`,
                        borderLeft: `1px solid ${C.border}`,
                        padding: '6px',
                        verticalAlign: 'top',
                        height: 88,
                        background: todayCell ? `${C.primary}05` : 'transparent',
                      }}>
                        {dayShifts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                            {dayShifts.map((shift) => {
                              const accent = C.primary;
                              return (
                                <div
                                  key={shift.scheduleId}
                                  style={{
                                    flex: 1,
                                    padding: '5px 7px',
                                    borderRadius: 7,
                                    border: `1px solid ${accent}35`,
                                    borderLeft: `3px solid ${accent}`,
                                    background: `${accent}12`,
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
                                    overflow: 'hidden',
                                    minHeight: 0,
                                  }}
                                >
                                  {/* Time row */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <AccessTimeOutlinedIcon sx={{ fontSize: 12, color: accent, flexShrink: 0 }} />
                                    <span style={{
                                      fontSize: 11, fontWeight: 800, color: accent,
                                      letterSpacing: '0.01em', lineHeight: '14px',
                                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                      {fmt12(shift.startTime)} – {fmt12(shift.endTime)}
                                    </span>
                                  </div>
                                  {/* Title */}
                                  <p style={{
                                    margin: 0, fontSize: 11, fontWeight: 600,
                                    color: accent, opacity: 0.85,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  }}>
                                    {shift.title ?? 'Regular Shift'}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* OFF placeholder */
                          <div style={{
                            height: '100%', width: '100%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            border: `1.5px dashed ${C.border}`,
                            borderRadius: 7,
                            background: C.bg,
                          }}>
                            <span style={{
                              fontSize: 8, fontWeight: 800, color: C.textDim,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                            }}>
                              No Schedule
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {!loading && schedules.length > 0 && (
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim,
          textAlign: 'right', letterSpacing: '0.04em',
        }}>
          {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} ·{' '}
          {employees.length} employee{employees.length !== 1 ? 's' : ''} ·{' '}
          {totalHours.toFixed(1)}h total · week of {weekLabel(weekStart)}
        </p>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* thin custom scrollbar */
        .staffing-table::-webkit-scrollbar { height: 5px; width: 5px; }
        .staffing-table::-webkit-scrollbar-track { background: ${C.bg}; }
        .staffing-table::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        .staffing-table::-webkit-scrollbar-thumb:hover { background: ${C.textDim}; }
      `}</style>
    </div>
  );
}
