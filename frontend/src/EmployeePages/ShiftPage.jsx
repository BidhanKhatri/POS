import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import useAuthStore from '../store/useAuthStore';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

// ─── colors ───────────────────────────────────────────────────────────────────
const C = {
  bg:       '#F5F3F1',
  surface:  '#ffffff',
  elevated: '#EFE7E2',
  divider:  '#DDD2CC',
  border:   '#E6DAD5',
  primary:  '#3E2723',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textMute: '#A09490',
  success:  '#2E7D4F',
  error:    '#B71C1C',
  hover:    '#F3EDE9',
};

// ─── date utilities ───────────────────────────────────────────────────────────

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

function addDays(date, n) {
  return new Date(date.getTime() + n * 86400000);
}

function fmt12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── component ────────────────────────────────────────────────────────────────

export default function ShiftPage() {
  const token      = useAuthStore((s) => s.token);
  const headers    = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isDesktop  = useMediaQuery('(min-width:1024px)');

  const [weekStart,  setWeekStart]  = useState(() => getWeekStart(new Date()));
  const [schedData,  setSchedData]  = useState([]);
  const [synced,     setSynced]     = useState(false);
  const [schedLoad,  setSchedLoad]  = useState(true);
  const [schedError, setSchedError] = useState('');

  const todayYMD  = toYMD(new Date());
  const startDate = toYMD(weekStart);
  const endDate   = toYMD(addDays(weekStart, 6));
  const weekDays  = Array.from({ length: 7 }, (_, i) => toYMD(addDays(weekStart, i)));

  const loadSchedule = () => {
    setSchedLoad(true);
    setSchedError('');
    fetch(
      `${API}/api/staffing/my-schedule?startDate=${startDate}&endDate=${endDate}`,
      { headers }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSynced(d.synced ?? false);
          setSchedData(d.data ?? []);
        } else {
          setSchedError(d.message || 'Failed to load schedule');
        }
        setSchedLoad(false);
      })
      .catch(() => {
        setSchedError('Failed to load schedule');
        setSchedLoad(false);
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSchedule(); }, [startDate]);

  const prevWeek    = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek    = () => setWeekStart(addDays(weekStart,  7));
  const jumpToToday = () => setWeekStart(getWeekStart(new Date()));

  const isCurrentWeek = toYMD(getWeekStart(new Date())) === startDate;
  const shiftsForDay  = (ymd) => schedData.filter((s) => s.date === ymd);

  const monthLabel = (() => {
    const s = new Date(weekStart);
    const e = addDays(weekStart, 6);
    return s.getMonth() === e.getMonth()
      ? `${MONTHS[s.getMonth()]} ${s.getFullYear()}`
      : `${MONTHS[s.getMonth()]} – ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  })();

  // ── derived week stats ────────────────────────────────────────────────────
  const weekShifts = schedData.filter((s) => weekDays.includes(s.date));
  const totalHours = weekShifts.reduce((sum, s) => sum + (s.scheduledHours ?? 0), 0);
  const shiftCount = weekShifts.length;
  const workDays   = new Set(weekShifts.map((s) => s.date)).size;
  const todayShifts = shiftsForDay(todayYMD);

  // ─── schedule card (shared between mobile and desktop) ────────────────────
  const scheduleCard = (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.divider}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* week navigation header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: C.bg,
        borderBottom: `1px solid ${C.elevated}`,
      }}>
        <button onClick={prevWeek} style={navBtn}>
          <ChevronLeftIcon sx={{ fontSize: 17 }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: C.textSec }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{monthLabel}</span>
          <span style={{ fontSize: 11, color: C.textMute }}>
            {startDate.slice(5).replace('-', '/')} – {endDate.slice(5).replace('-', '/')}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            padding: '2px 7px', borderRadius: 99,
            background: synced ? 'rgba(46,125,79,0.12)' : 'rgba(62,39,35,0.08)',
            color:      synced ? C.success              : C.primary,
          }}>
            {synced
              ? <><SyncOutlinedIcon sx={{ fontSize: 10 }} /> EMS</>
              : <><StorageOutlinedIcon sx={{ fontSize: 10 }} /> POS</>}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {!isCurrentWeek && (
            <button onClick={jumpToToday} style={{ ...navBtn, padding: '4px 8px', fontSize: 10, fontWeight: 700, color: C.primary }}>
              Today
            </button>
          )}
          <button onClick={nextWeek} style={navBtn}>
            <ChevronRightIcon sx={{ fontSize: 17 }} />
          </button>
        </div>
      </div>

      {/* error banner */}
      {schedError && (
        <div style={{ padding: '8px 16px', fontSize: 12, color: C.error, background: 'rgba(183,28,28,0.06)', borderBottom: `1px solid ${C.divider}` }}>
          {schedError}
        </div>
      )}

      {/* day rows */}
      {weekDays.map((ymd, idx) => {
        const isToday   = ymd === todayYMD;
        const dayDate   = new Date(weekStart.getTime() + idx * 86400000);
        const dayNum    = dayDate.getDate();
        const dayShifts = shiftsForDay(ymd);

        return (
          <div
            key={ymd}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: isDesktop ? '12px 18px' : '10px 14px',
              borderBottom: idx < 6 ? `1px solid ${C.elevated}` : 'none',
              background: isToday ? '#FDF8F5' : 'transparent',
            }}
          >
            {/* day label */}
            <div style={{ width: isDesktop ? 56 : 40, flexShrink: 0, textAlign: 'center' }}>
              <div style={{
                fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: isToday ? C.primary : C.textMute,
              }}>
                {isDesktop ? DAY_FULL[idx] : DAY_SHORT[idx]}
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                margin: '3px auto 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? C.primary : 'transparent',
                fontSize: 12, fontWeight: isToday ? 800 : 600,
                color: isToday ? '#fff' : C.textPri,
              }}>
                {dayNum}
              </div>
            </div>

            {/* shift pills */}
            <div style={{ flex: 1, paddingTop: 3, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {schedLoad ? (
                <div style={{ height: 22, width: 120, borderRadius: 4, background: C.elevated, animation: 'pulse 1.4s ease-in-out infinite' }} />
              ) : dayShifts.length === 0 ? (
                <span style={{ fontSize: 12, color: C.textMute, fontStyle: 'italic' }}>No shift</span>
              ) : (
                dayShifts.map((s) => (
                  <div key={s.scheduleId} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6,
                    background: `${s.color}18`,
                    border: `1px solid ${s.color}40`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>
                      {fmt12(s.startTime)} – {fmt12(s.endTime)}
                    </span>
                    <span style={{ fontSize: 11, color: C.textSec }}>{s.scheduledHours}h</span>
                    {s.title && s.title !== 'Regular Shift' && (
                      <span style={{ fontSize: 10, color: C.textSec }}>· {s.title}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* footer summary */}
      {!schedLoad && shiftCount > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
          padding: '8px 16px',
          background: C.bg,
          borderTop: `1px solid ${C.elevated}`,
        }}>
          <span style={{ fontSize: 11, color: C.textSec }}>
            <strong style={{ color: C.textPri }}>{shiftCount}</strong> shift{shiftCount !== 1 ? 's' : ''} this week
          </span>
          <span style={{ fontSize: 11, color: C.textSec }}>
            <strong style={{ color: C.textPri }}>{totalHours.toFixed(1)}h</strong> scheduled
          </span>
        </div>
      )}
    </div>
  );

  // ─── right-side summary panel (desktop only) ──────────────────────────────
  const summaryPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* week stats card */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.divider}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '11px 16px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>This Week</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            { label: 'Scheduled Hours', value: schedLoad ? '—' : `${totalHours.toFixed(1)}h`, icon: AccessTimeOutlinedIcon,  color: C.primary },
            { label: 'Shifts',          value: schedLoad ? '—' : shiftCount,                   icon: WorkOutlineOutlinedIcon, color: '#1565C0'  },
            { label: 'Working Days',    value: schedLoad ? '—' : workDays,                     icon: EventOutlinedIcon,       color: C.success  },
            { label: 'Source',          value: schedLoad ? '—' : (synced ? 'EMS' : 'POS'),     icon: synced ? SyncOutlinedIcon : StorageOutlinedIcon, color: synced ? C.success : C.primary },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <div key={label} style={{
              padding: '14px 16px',
              borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
              borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon sx={{ fontSize: 14, color }} />
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
              </div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* today's shift card */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.divider}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '11px 16px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>Today's Shift</p>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {schedLoad ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 14, width: '70%', borderRadius: 4, background: C.elevated, animation: 'pulse 1.4s ease-in-out infinite' }} />
              <div style={{ height: 10, width: '50%', borderRadius: 4, background: C.elevated, animation: 'pulse 1.4s ease-in-out infinite' }} />
            </div>
          ) : todayShifts.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: C.textMute, fontStyle: 'italic' }}>No shift scheduled today</p>
          ) : (
            todayShifts.map((s) => (
              <div key={s.scheduleId} style={{ marginBottom: 10, lastChild: { marginBottom: 0 } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.textPri }}>
                    {fmt12(s.startTime)} – {fmt12(s.endTime)}
                  </span>
                </div>
                <p style={{ margin: '0 0 2px 14px', fontSize: 11, color: C.textSec }}>{s.scheduledHours}h scheduled</p>
                {s.title && s.title !== 'Regular Shift' && (
                  <p style={{ margin: '0 0 0 14px', fontSize: 11, color: C.textSec }}>{s.title}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: isDesktop ? '28px 32px' : '24px 16px',
      maxWidth: isDesktop ? 'none' : 640,
      margin: isDesktop ? 0 : '0 auto',
    }}>

      {/* page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarMonthOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.textPri, margin: 0, letterSpacing: '-0.2px' }}>
            Schedule
          </h1>
        </div>
        <button
          onClick={loadSchedule}
          disabled={schedLoad}
          title="Refresh schedule"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 9,
            border: `1px solid ${C.divider}`,
            background: C.surface,
            color: C.primary,
            cursor: schedLoad ? 'not-allowed' : 'pointer',
            opacity: schedLoad ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <RefreshOutlinedIcon sx={{ fontSize: 17 }} />
        </button>
      </div>

      {/* content */}
      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          {scheduleCard}
          {summaryPanel}
        </div>
      ) : (
        scheduleCard
      )}

    </div>
  );
}

// ─── shared micro-styles ──────────────────────────────────────────────────────
const navBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 28, height: 28, padding: '0 4px', borderRadius: 6,
  background: 'transparent', border: `1px solid ${C.divider}`,
  color: C.primary, cursor: 'pointer',
};
