import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import ChevronLeftIcon              from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon             from '@mui/icons-material/ChevronRight';
import CalendarMonthOutlinedIcon    from '@mui/icons-material/CalendarMonthOutlined';
import CalendarTodayOutlinedIcon    from '@mui/icons-material/CalendarTodayOutlined';
import RefreshOutlinedIcon          from '@mui/icons-material/RefreshOutlined';
import SyncOutlinedIcon             from '@mui/icons-material/SyncOutlined';
import StorageOutlinedIcon          from '@mui/icons-material/StorageOutlined';
import AccessTimeOutlinedIcon       from '@mui/icons-material/AccessTimeOutlined';
import EventOutlinedIcon            from '@mui/icons-material/EventOutlined';
import WorkOutlineOutlinedIcon      from '@mui/icons-material/WorkOutlineOutlined';
import LoginOutlinedIcon            from '@mui/icons-material/LoginOutlined';
import LogoutOutlinedIcon           from '@mui/icons-material/LogoutOutlined';
import TimerOutlinedIcon            from '@mui/icons-material/TimerOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import BlockOutlinedIcon            from '@mui/icons-material/BlockOutlined';
import PointOfSaleIcon              from '@mui/icons-material/PointOfSale';
import useAuthStore from '../store/useAuthStore';

const API  = import.meta.env.VITE_API_BASE_URL ?? '';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  bg:       '#F5F3F1', surface:  '#ffffff', elevated: '#EFE7E2',
  divider:  '#DDD2CC', border:   '#E6DAD5',
  primary:  '#3E2723', textPri:  '#2B1D1A', textSec:  '#6B5B57', textMute: '#A09490',
  success:  '#2E7D4F', warning:  '#B26A00', error:    '#B71C1C', info: '#1565C0',
  hover:    '#F3EDE9',
};

// ─── Date / time helpers ──────────────────────────────────────────────────────

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function getWeekStart(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) { return new Date(date.getTime() + n * 86400000); }
function fmt12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function parseHHmm(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function nowMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}
function fmtDuration(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
function fmtClockTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Shift state machine ──────────────────────────────────────────────────────
// Schedule state: NO_SHIFT | UPCOMING | IN_WINDOW | PAST
// Clock state   : NOT_CLOCKED_IN | CLOCKED_IN

function computeScheduleState(todayShifts) {
  if (!todayShifts || todayShifts.length === 0) return 'NO_SHIFT';
  const s = todayShifts[0];
  const nm = nowMin();
  const start = parseHHmm(s.startTime);
  const end   = parseHHmm(s.endTime);
  if (nm < start) return 'UPCOMING';
  if (nm <= end)  return 'IN_WINDOW';
  return 'PAST';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBanner({ icon: Icon, color, bg, title, subtitle, children }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${color}40`,
      borderRadius: 12, padding: '16px 18px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle || children ? 10 : 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon sx={{ fontSize: 18, color }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>{title}</p>
          {subtitle && <p style={{ margin: '1px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ActionButton({ onClick, loading, disabled, color = C.primary, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
        background: loading || disabled ? C.elevated : color,
        color: loading || disabled ? C.textMute : '#fff',
        fontSize: 14, fontWeight: 800, cursor: loading || disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.02em', fontFamily: FONT,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {Icon && <Icon sx={{ fontSize: 18 }} />}
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function Skeleton({ h = 16, w = '100%', r = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: C.elevated, animation: 'pulse 1.4s ease infinite' }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShiftPage() {
  const navigate   = useNavigate();
  const { token }  = useAuthStore();
  const isDesktop  = useMediaQuery('(min-width:1024px)');
  const headers    = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Schedule data ─────────────────────────────────────────────────────────
  const [weekStart,  setWeekStart]  = useState(() => getWeekStart(new Date()));
  const [schedData,  setSchedData]  = useState([]);
  const [synced,     setSynced]     = useState(false);
  const [schedLoad,  setSchedLoad]  = useState(true);
  const [schedError, setSchedError] = useState('');

  // ── Active shift (clock-in record) ────────────────────────────────────────
  const [activeShift,   setActiveShift]   = useState(null);   // Shift doc or null
  const [shiftLoad,     setShiftLoad]     = useState(true);
  const [clockInBusy,   setClockInBusy]   = useState(false);
  const [clockOutBusy,  setClockOutBusy]  = useState(false);
  const [clockError,    setClockError]    = useState('');
  const [clockOutReason,setClockOutReason]= useState('');
  const [showReasonBox, setShowReasonBox] = useState(false);
  const [clockOutSuccess,setClockOutSuccess] = useState(false);

  // ── Countdown tick ────────────────────────────────────────────────────────
  const [tick, setTick] = useState(0); // increments every 30s to re-evaluate state
  const tickRef = useRef(null);

  const todayYMD  = toYMD(new Date());
  const startDate = toYMD(weekStart);
  const endDate   = toYMD(addDays(weekStart, 6));
  const weekDays  = Array.from({ length: 7 }, (_, i) => toYMD(addDays(weekStart, i)));

  // ── Data loaders ─────────────────────────────────────────────────────────
  const loadSchedule = useCallback(() => {
    setSchedLoad(true);
    setSchedError('');
    fetch(`${API}/api/staffing/my-schedule?startDate=${startDate}&endDate=${endDate}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setSynced(d.synced ?? false); setSchedData(d.data ?? []); }
        else setSchedError(d.message || 'Failed to load schedule');
        setSchedLoad(false);
      })
      .catch(() => { setSchedError('Failed to load schedule'); setSchedLoad(false); });
  }, [startDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadActiveShift = useCallback(() => {
    setShiftLoad(true);
    fetch(`${API}/api/shifts/active`, { headers })
      .then((r) => r.json())
      .then((d) => { setActiveShift(d.data ?? null); setShiftLoad(false); })
      .catch(() => setShiftLoad(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => { loadSchedule(); loadActiveShift(); };

  useEffect(() => { loadSchedule(); }, [loadSchedule]);
  useEffect(() => { loadActiveShift(); }, [loadActiveShift]);

  // Tick every 30 seconds to update countdown / state transitions
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(tickRef.current);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const prevWeek    = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek    = () => setWeekStart(addDays(weekStart,  7));
  const jumpToToday = () => setWeekStart(getWeekStart(new Date()));
  const isCurrentWeek = toYMD(getWeekStart(new Date())) === startDate;
  const shiftsForDay  = (ymd) => schedData.filter((s) => s.date === ymd);

  const weekShifts  = schedData.filter((s) => weekDays.includes(s.date));
  const totalHours  = weekShifts.reduce((sum, s) => sum + (s.scheduledHours ?? 0), 0);
  const shiftCount  = weekShifts.length;
  const workDays    = new Set(weekShifts.map((s) => s.date)).size;
  const todayShifts = shiftsForDay(todayYMD);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduleState = React.useMemo(() => computeScheduleState(todayShifts), [todayShifts, tick]);

  // Countdown to start time
  const countdownLabel = (() => {
    if (scheduleState !== 'UPCOMING' || todayShifts.length === 0) return null;
    const startMs = parseHHmm(todayShifts[0].startTime) * 60_000;
    const nowMs   = (nowMin()) * 60_000;
    return fmtDuration(startMs - nowMs);
  })();

  // Duration since clock-in
  const elapsedLabel = (() => {
    if (!activeShift?.clockInTime) return null;
    return fmtDuration(Date.now() - new Date(activeShift.clockInTime).getTime());
  })();

  const monthLabel = (() => {
    const s = new Date(weekStart);
    const e = addDays(weekStart, 6);
    return s.getMonth() === e.getMonth()
      ? `${MONTHS[s.getMonth()]} ${s.getFullYear()}`
      : `${MONTHS[s.getMonth()]} – ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  })();

  // ── Clock actions ─────────────────────────────────────────────────────────
  const handleClockIn = async () => {
    setClockInBusy(true);
    setClockError('');
    const sched = todayShifts[0];
    try {
      const r = await fetch(`${API}/api/shifts/clock-in`, {
        method: 'POST', headers,
        body: JSON.stringify({
          openingCash:    0,
          scheduleId:     sched?.scheduleId     ?? null,
          scheduleSource: sched ? (synced ? 'EMS' : 'POS') : 'MANUAL',
          scheduledStart: sched?.startTime      ?? null,
          scheduledEnd:   sched?.endTime        ?? null,
          scheduledDate:  todayYMD,
        }),
      });
      const d = await r.json();
      if (d.success) { setActiveShift(d.data); setClockError(''); }
      else setClockError(d.message || 'Clock-in failed.');
    } catch { setClockError('Network error. Please try again.'); }
    finally { setClockInBusy(false); }
  };

  const handleClockOut = async () => {
    // Check if early — if yes and no reason, show the reason box first
    if (scheduleState === 'IN_WINDOW' && !showReasonBox) {
      setShowReasonBox(true);
      return;
    }
    setClockOutBusy(true);
    setClockError('');
    try {
      const r = await fetch(`${API}/api/shifts/clock-out`, {
        method: 'POST', headers,
        body: JSON.stringify({ closingCash: 0, clockOutReason: clockOutReason.trim() || null }),
      });
      const d = await r.json();
      if (d.success) {
        setActiveShift(null);
        setClockOutSuccess(true);
        setShowReasonBox(false);
        setClockOutReason('');
      } else if (d.code === 'EARLY_CLOCKOUT_REASON_REQUIRED') {
        setClockError('Please enter a reason for the early clock-out.');
        setShowReasonBox(true);
      } else {
        setClockError(d.message || 'Clock-out failed.');
      }
    } catch { setClockError('Network error. Please try again.'); }
    finally { setClockOutBusy(false); }
  };

  // ── Shift status panel ────────────────────────────────────────────────────
  const isLoading = schedLoad || shiftLoad;

  const shiftStatusPanel = (() => {
    if (isLoading) {
      return (
        <div style={{ background: C.surface, border: `1px solid ${C.divider}`, borderRadius: 12, padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton h={14} w="60%" />
          <Skeleton h={40} />
          <Skeleton h={46} />
        </div>
      );
    }

    if (clockOutSuccess && scheduleState === 'PAST') {
      return (
        <StatusBanner icon={CheckCircleOutlineOutlinedIcon} color={C.success} bg="rgba(46,125,79,0.06)" title="Shift Complete" subtitle="You have successfully clocked out. Good work!">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(46,125,79,0.07)', borderRadius: 8 }}>
            <BlockOutlinedIcon sx={{ fontSize: 14, color: C.textMute }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Sales access is now disabled until your next shift.</span>
          </div>
        </StatusBanner>
      );
    }

    // ── NO_SHIFT ────────────────────────────────────────────────────────────
    if (scheduleState === 'NO_SHIFT') {
      return (
        <StatusBanner icon={BlockOutlinedIcon} color={C.textMute} bg="#FAF7F5" title="No shift scheduled today" subtitle="You are not scheduled to work today.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: C.elevated, borderRadius: 8 }}>
            <PointOfSaleIcon sx={{ fontSize: 14, color: C.textMute }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Sales terminal access is disabled.</span>
          </div>
        </StatusBanner>
      );
    }

    // ── UPCOMING ────────────────────────────────────────────────────────────
    if (scheduleState === 'UPCOMING') {
      const s = todayShifts[0];
      return (
        <StatusBanner icon={TimerOutlinedIcon} color={C.info} bg="rgba(21,101,192,0.05)" title={`Shift starts in ${countdownLabel}`} subtitle={`Scheduled ${fmt12(s.startTime)} – ${fmt12(s.endTime)}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(21,101,192,0.07)', borderRadius: 8 }}>
            <PointOfSaleIcon sx={{ fontSize: 14, color: C.info }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.info }}>Sales access opens when your shift begins.</span>
          </div>
        </StatusBanner>
      );
    }

    // ── IN_WINDOW — not yet clocked in ──────────────────────────────────────
    if (scheduleState === 'IN_WINDOW' && !activeShift) {
      const s = todayShifts[0];
      return (
        <div style={{ background: C.surface, border: `1px solid ${C.divider}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: 'rgba(46,125,79,0.07)', padding: '14px 18px', borderBottom: `1px solid ${C.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(46,125,79,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LoginOutlinedIcon sx={{ fontSize: 18, color: C.success }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>Shift in progress — clock in to start</p>
              <p style={{ margin: '1px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>{fmt12(s.startTime)} – {fmt12(s.endTime)} · {s.scheduledHours}h scheduled</p>
            </div>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clockError && (
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error, background: 'rgba(183,28,28,0.07)', padding: '7px 10px', borderRadius: 8 }}>{clockError}</p>
            )}
            <ActionButton onClick={handleClockIn} loading={clockInBusy} color={C.success} icon={LoginOutlinedIcon}>
              Clock In
            </ActionButton>
          </div>
        </div>
      );
    }

    // ── CLOCKED IN (IN_WINDOW or PAST but still open) ───────────────────────
    if (activeShift) {
      const isOverdue = scheduleState === 'PAST';
      const s = todayShifts[0];
      return (
        <div style={{ background: C.surface, border: `1px solid ${C.divider}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          {/* Status header */}
          <div style={{ background: isOverdue ? 'rgba(178,106,0,0.07)' : 'rgba(46,125,79,0.07)', padding: '14px 18px', borderBottom: `1px solid ${C.divider}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: isOverdue ? 'rgba(178,106,0,0.14)' : 'rgba(46,125,79,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AccessTimeOutlinedIcon sx={{ fontSize: 18, color: isOverdue ? C.warning : C.success }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>
                    {isOverdue ? 'Shift window ended — please clock out' : 'Shift Active'}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
                    Clocked in at {fmtClockTime(activeShift.clockInTime)} · {elapsedLabel} elapsed
                  </p>
                </div>
              </div>
              {/* Live pulse dot */}
              {!isOverdue && (
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.success, flexShrink: 0, animation: 'pulseDot 2s ease infinite' }} />
              )}
            </div>
          </div>

          {/* Schedule reference */}
          {s && (
            <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.elevated}`, display: 'flex', gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scheduled</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: C.textPri }}>{fmt12(s.startTime)} – {fmt12(s.endTime)}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hours</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: C.textPri }}>{s.scheduledHours}h</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Source</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: C.textPri }}>{activeShift.scheduleSource || 'POS'}</p>
              </div>
            </div>
          )}

          {/* Clock-out area */}
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clockError && (
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error, background: 'rgba(183,28,28,0.07)', padding: '7px 10px', borderRadius: 8 }}>{clockError}</p>
            )}

            {/* Early clock-out reason box */}
            {showReasonBox && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>
                  Reason for early clock-out <span style={{ color: C.error }}>*</span>
                </label>
                <textarea
                  value={clockOutReason}
                  onChange={(e) => setClockOutReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Manager approved early leave"
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.divider}`,
                    fontSize: 13, fontFamily: FONT, color: C.textPri,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => { setShowReasonBox(false); setClockOutReason(''); setClockError(''); }}
                  style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, color: C.textSec, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT }}
                >
                  Cancel
                </button>
              </div>
            )}

            <ActionButton onClick={handleClockOut} loading={clockOutBusy} color={isOverdue ? C.warning : C.error} icon={LogoutOutlinedIcon}>
              {showReasonBox ? 'Confirm Clock Out' : 'Clock Out'}
            </ActionButton>

            {!showReasonBox && !isOverdue && (
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: C.textMute, textAlign: 'center' }}>
                Early clock-out requires a reason.
              </p>
            )}
          </div>
        </div>
      );
    }

    // ── PAST — shift ended, never clocked in ────────────────────────────────
    if (scheduleState === 'PAST' && !activeShift) {
      const s = todayShifts[0];
      return (
        <StatusBanner
          icon={CheckCircleOutlineOutlinedIcon} color={C.textMute} bg="#FAF7F5"
          title="Shift ended" subtitle={s ? `${fmt12(s.startTime)} – ${fmt12(s.endTime)}` : ''}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: C.elevated, borderRadius: 8 }}>
            <BlockOutlinedIcon sx={{ fontSize: 14, color: C.textMute }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Sales access is disabled.</span>
          </div>
        </StatusBanner>
      );
    }

    return null;
  })();

  // ── Navigate to terminal button (only when clocked in) ───────────────────
  const goToTerminal = activeShift && (
    <button
      onClick={() => navigate('/employee/terminal')}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '11px 0', borderRadius: 10, border: `1.5px solid ${C.primary}`,
        background: 'transparent', color: C.primary,
        fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', fontFamily: FONT,
        marginBottom: 16,
      }}
    >
      <PointOfSaleIcon sx={{ fontSize: 17 }} />
      Open Sales Terminal
    </button>
  );

  // ── Schedule card (7-day view) ────────────────────────────────────────────
  const scheduleCard = (
    <div style={{ background: C.surface, border: `1px solid ${C.divider}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: C.bg, borderBottom: `1px solid ${C.elevated}` }}>
        <button onClick={prevWeek} style={navBtn}><ChevronLeftIcon sx={{ fontSize: 17 }} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: C.textSec }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{monthLabel}</span>
          <span style={{ fontSize: 11, color: C.textMute }}>{startDate.slice(5).replace('-','/')} – {endDate.slice(5).replace('-','/')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: 99, background: synced ? 'rgba(46,125,79,0.12)' : 'rgba(62,39,35,0.08)', color: synced ? C.success : C.primary }}>
            {synced ? <><SyncOutlinedIcon sx={{ fontSize: 10 }} /> EMS</> : <><StorageOutlinedIcon sx={{ fontSize: 10 }} /> POS</>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {!isCurrentWeek && (
            <button onClick={jumpToToday} style={{ ...navBtn, padding: '4px 8px', fontSize: 10, fontWeight: 700, color: C.primary }}>Today</button>
          )}
          <button onClick={nextWeek} style={navBtn}><ChevronRightIcon sx={{ fontSize: 17 }} /></button>
        </div>
      </div>

      {schedError && (
        <div style={{ padding: '8px 16px', fontSize: 12, color: C.error, background: 'rgba(183,28,28,0.06)', borderBottom: `1px solid ${C.divider}` }}>{schedError}</div>
      )}

      {weekDays.map((ymd, idx) => {
        const isToday   = ymd === todayYMD;
        const dayDate   = addDays(weekStart, idx);
        const dayNum    = dayDate.getDate();
        const dayShifts = shiftsForDay(ymd);
        const isClockedInToday = isToday && !!activeShift;

        return (
          <div key={ymd} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: isDesktop ? '12px 18px' : '10px 14px', borderBottom: idx < 6 ? `1px solid ${C.elevated}` : 'none', background: isToday ? '#FDF8F5' : 'transparent' }}>
            <div style={{ width: isDesktop ? 56 : 40, flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isToday ? C.primary : C.textMute }}>
                {isDesktop ? DAY_FULL[idx] : DAY_SHORT[idx]}
              </div>
              <div style={{ width: 26, height: 26, borderRadius: '50%', margin: '3px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? C.primary : 'transparent', fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? '#fff' : C.textPri }}>
                {dayNum}
              </div>
            </div>

            <div style={{ flex: 1, paddingTop: 3, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {schedLoad ? (
                <div style={{ height: 22, width: 120, borderRadius: 4, background: C.elevated, animation: 'pulse 1.4s ease-in-out infinite' }} />
              ) : dayShifts.length === 0 ? (
                <span style={{ fontSize: 12, color: C.textMute, fontStyle: 'italic' }}>No shift</span>
              ) : (
                dayShifts.map((s) => (
                  <div key={s.scheduleId} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>{fmt12(s.startTime)} – {fmt12(s.endTime)}</span>
                    <span style={{ fontSize: 11, color: C.textSec }}>{s.scheduledHours}h</span>
                    {s.title && s.title !== 'Regular Shift' && <span style={{ fontSize: 10, color: C.textSec }}>· {s.title}</span>}
                  </div>
                ))
              )}
              {isClockedInToday && (
                <span style={{ fontSize: 10, fontWeight: 800, color: C.success, background: 'rgba(46,125,79,0.10)', padding: '2px 8px', borderRadius: 20 }}>
                  ● Clocked In
                </span>
              )}
            </div>
          </div>
        );
      })}

      {!schedLoad && shiftCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: '8px 16px', background: C.bg, borderTop: `1px solid ${C.elevated}` }}>
          <span style={{ fontSize: 11, color: C.textSec }}><strong style={{ color: C.textPri }}>{shiftCount}</strong> shift{shiftCount !== 1 ? 's' : ''} this week</span>
          <span style={{ fontSize: 11, color: C.textSec }}><strong style={{ color: C.textPri }}>{totalHours.toFixed(1)}h</strong> scheduled</span>
        </div>
      )}
    </div>
  );

  // ── Desktop right panel ───────────────────────────────────────────────────
  const desktopSidePanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Shift status (primary action) */}
      {shiftStatusPanel}
      {goToTerminal}

      {/* Week stats */}
      <div style={{ background: C.surface, border: `1px solid ${C.divider}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>This Week</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            { label: 'Scheduled Hours', value: schedLoad ? '—' : `${totalHours.toFixed(1)}h`, icon: AccessTimeOutlinedIcon, color: C.primary },
            { label: 'Shifts',          value: schedLoad ? '—' : shiftCount,                   icon: WorkOutlineOutlinedIcon, color: C.info },
            { label: 'Working Days',    value: schedLoad ? '—' : workDays,                     icon: EventOutlinedIcon,       color: C.success },
            { label: 'Source',          value: schedLoad ? '—' : (synced ? 'EMS' : 'POS'),     icon: synced ? SyncOutlinedIcon : StorageOutlinedIcon, color: synced ? C.success : C.primary },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <div key={label} style={{ padding: '14px 16px', borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon sx={{ fontSize: 14, color }} />
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
              </div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isDesktop ? '28px 32px' : '20px 16px', maxWidth: isDesktop ? 'none' : 640, margin: isDesktop ? 0 : '0 auto', fontFamily: FONT }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarMonthOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.textPri, margin: 0, letterSpacing: '-0.2px' }}>Schedule</h1>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          title="Refresh"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.divider}`, background: C.surface, color: C.primary, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
        >
          <RefreshOutlinedIcon sx={{ fontSize: 17 }} />
        </button>
      </div>

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          {scheduleCard}
          {desktopSidePanel}
        </div>
      ) : (
        <>
          {shiftStatusPanel}
          {goToTerminal}
          {scheduleCard}
        </>
      )}
    </div>
  );
}

const navBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 28, height: 28, padding: '0 4px', borderRadius: 6,
  background: 'transparent', border: `1px solid ${C.divider}`,
  color: C.primary, cursor: 'pointer',
};
