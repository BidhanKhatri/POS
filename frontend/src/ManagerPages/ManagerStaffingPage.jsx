import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '@mui/material';
import ChevronLeftOutlinedIcon    from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon   from '@mui/icons-material/ChevronRightOutlined';
import AccessTimeOutlinedIcon     from '@mui/icons-material/AccessTimeOutlined';
import PeopleOutlinedIcon         from '@mui/icons-material/PeopleOutlined';
import CalendarMonthOutlinedIcon  from '@mui/icons-material/CalendarMonthOutlined';
import RefreshOutlinedIcon        from '@mui/icons-material/RefreshOutlined';
import EventBusyOutlinedIcon      from '@mui/icons-material/EventBusyOutlined';
import ErrorOutlineOutlinedIcon   from '@mui/icons-material/ErrorOutlineOutlined';
import InfoOutlinedIcon           from '@mui/icons-material/InfoOutlined';
import SyncOutlinedIcon           from '@mui/icons-material/SyncOutlined';
import AddOutlinedIcon            from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon           from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon  from '@mui/icons-material/DeleteOutlineOutlined';
import ContentCopyOutlinedIcon    from '@mui/icons-material/ContentCopyOutlined';
import CloseOutlinedIcon          from '@mui/icons-material/CloseOutlined';
import LockClockOutlinedIcon      from '@mui/icons-material/LockClockOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';
import ForceCheckoutDialog from '../components/ForceCheckoutDialog';
import { useSocketEvent } from '../context/SocketContext';

import { API_URL as API } from '../config/api';

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

/* ─── Shift color presets ────────────────────────────────────────────────── */
const SHIFT_COLORS = [
  '#3E2723', // brown (primary)
  '#1565C0', // blue
  '#2E7D32', // green
  '#B71C1C', // red
  '#E65100', // orange
  '#6A1B9A', // purple
];

/* ─── Native date helpers ────────────────────────────────────────────────── */
const DAYS   = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYMD(date) {
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

function fmtLocal12(utcString, fallbackHhmm) {
  if (!utcString) return fmt12(fallbackHhmm);
  return new Date(utcString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
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

/* ─── Active Shifts / Missed Checkouts ───────────────────────────────────── */
function ShiftStatusSection({ activeShifts, missedCheckouts, loading, onForceCheckout, isDesktop }) {
  const elapsed = (clockIn) => {
    const ms = Date.now() - new Date(clockIn).getTime();
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  const fmtOvertime = (mins) => {
    const h = Math.floor((mins ?? 0) / 60);
    const m = (mins ?? 0) % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 10 }}>
      {/* Active shifts */}
      <CornerCard borderColor={C.border} accentColor={C.success} borderRadius={12} cornerSize={22} cornerHeight={22} style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: C.textPri }}>Active Shifts</p>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 600, color: C.textDim }}>{activeShifts?.length ?? 0} employees clocked in</p>
        {loading ? (
          <p style={{ fontSize: 11, color: C.textDim, margin: 0, padding: '4px 0' }}>Loading…</p>
        ) : !activeShifts?.length ? (
          <p style={{ fontSize: 11, color: C.textDim, margin: 0, padding: '4px 0' }}>No active shifts right now</p>
        ) : activeShifts.map((s, i) => (
          <div key={s._id} style={{ ...rowStyle, borderBottom: i === activeShifts.length - 1 ? 'none' : rowStyle.borderBottom }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'rgba(46,125,79,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: C.success }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.employee?.name ?? 'Unknown'}</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>Clocked in {fmtTime(s.clockInTime)} · {elapsed(s.clockInTime)} ago</p>
              </div>
            </div>
          </div>
        ))}
      </CornerCard>

      {/* Missed checkouts */}
      <CornerCard borderColor={C.border} accentColor={C.error} borderRadius={12} cornerSize={22} cornerHeight={22} style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: C.textPri }}>Missed Checkouts</p>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 600, color: C.textDim }}>{missedCheckouts?.length ?? 0} still clocked in past scheduled end</p>
        {loading ? (
          <p style={{ fontSize: 11, color: C.textDim, margin: 0, padding: '4px 0' }}>Loading…</p>
        ) : !missedCheckouts?.length ? (
          <p style={{ fontSize: 11, color: C.textDim, margin: 0, padding: '4px 0' }}>No missed checkouts</p>
        ) : missedCheckouts.map((s, i) => (
          <div key={s._id} style={{ ...rowStyle, borderBottom: i === missedCheckouts.length - 1 ? 'none' : rowStyle.borderBottom }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'rgba(183,28,28,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LockClockOutlinedIcon sx={{ fontSize: 14, color: C.error }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.employee?.name ?? 'Unknown'}</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, color: C.error, fontWeight: 600 }}>Sched. end {fmtTime(s.scheduledEnd)} · {fmtOvertime(s.overtimeMinutes)} over</p>
              </div>
            </div>
            <button
              onClick={() => onForceCheckout(s)}
              style={{ flexShrink: 0, padding: '6px 11px', borderRadius: 8, border: `1px solid ${C.error}`, background: 'transparent', color: C.error, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}
            >
              Force Checkout
            </button>
          </div>
        ))}
      </CornerCard>
    </div>
  );
}

/* ─── Shift Modal (Add / Edit) ───────────────────────────────────────────── */
function ShiftModal({ open, onClose, employees, mode, empId, date, startTime, endTime, title, color,
                      onEmpChange, onDateChange, onStartChange, onEndChange, onTitleChange, onColorChange,
                      onSave, onDelete, saving }) {
  if (!open) return null;
  const isEdit = mode === 'edit';
  const emp = employees.find(e => e._id === empId);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1300,
      background: 'rgba(43,29,26,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
      className="staffing-modal-overlay"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="staffing-modal-panel"
        style={{
          background: C.surface, borderRadius: '18px 18px 0 0',
          width: '100%', maxWidth: 480, maxHeight: '92dvh',
          overflowY: 'auto', padding: '24px 20px 32px',
          boxShadow: '0 -8px 40px rgba(43,29,26,0.18)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: `${C.primary}12`,
              border: `1px solid ${C.primary}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AccessTimeOutlinedIcon sx={{ fontSize: 20, color: C.primary }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>
                {isEdit ? 'Edit Shift' : 'Add Shift'}
              </p>
              {emp && (
                <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec, fontWeight: 500 }}>
                  {emp.name}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.elevated, border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloseOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Employee selector (only in create mode) */}
          {!isEdit && (
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Employee</label>
              <select
                value={empId}
                onChange={e => onEmpChange(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none',
                }}
              >
                <option value="">Select employee…</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date — native picker, value displayed as "21 Apr 2026" */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Date</label>
            <div style={{ position: 'relative' }}>
              {/* Styled display */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.bg,
                pointerEvents: 'none',
              }}>
                <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: C.textDim, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: date ? C.textPri : C.textDim }}>
                  {date
                    ? (() => {
                        const [y, m, d] = date.split('-').map(Number);
                        return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} ${y}`;
                      })()
                    : 'Select date'}
                </span>
              </div>
              {/* Invisible native input on top — triggers system date picker on click */}
              <input
                type="date"
                value={date}
                onChange={e => onDateChange(e.target.value)}
                style={{
                  position: 'absolute', inset: 0,
                  opacity: 0, cursor: 'pointer',
                  width: '100%', height: '100%',
                  border: 'none', padding: 0, margin: 0,
                }}
              />
            </div>
          </div>

          {/* Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => onStartChange(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => onEndChange(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          {/* Overnight notice — shown when end time is earlier than start time */}
          {startTime && endTime && (() => {
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            if ((eh * 60 + em) < (sh * 60 + sm)) {
              const [sy, smo, sd] = (date || '').split('-').map(Number);
              const nextDay = date
                ? (() => { const d = new Date(sy, smo - 1, sd); d.setDate(d.getDate() + 1); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`; })()
                : 'next day';
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, background: 'rgba(2,119,189,0.07)', border: '1px solid rgba(2,119,189,0.20)' }}>
                  <InfoOutlinedIcon sx={{ fontSize: 14, color: C.info, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.info }}>Overnight shift — ends {nextDay}</span>
                </div>
              );
            }
            return null;
          })()}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Shift Label</label>
            <input
              type="text"
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              placeholder="Regular Shift"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.bg,
                fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Color swatches */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Colour</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SHIFT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none',
                    background: c, cursor: 'pointer',
                    outline: color === c ? `3px solid ${C.textPri}` : `2px solid transparent`,
                    outlineOffset: 2, transition: 'outline 0.12s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {isEdit && (
              <button
                onClick={onDelete}
                disabled={saving}
                style={{
                  padding: '11px 16px', borderRadius: 10,
                  border: `1.5px solid ${C.error}25`, background: `${C.error}08`,
                  color: C.error, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <DeleteOutlineOutlinedIcon sx={{ fontSize: 14 }} />
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '11px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.bg,
                color: C.textSec, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                flex: 2, padding: '11px', borderRadius: 10,
                border: 'none', background: C.primary, color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {saving ? '…' : isEdit ? 'Update Shift' : 'Add Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Bulk Ops Modal ─────────────────────────────────────────────────────── */
function BulkOpsModal({ open, onClose, employees, weekStart, bulkTab, setBulkTab,
                        bulkEmpId, setBulkEmpId,
                        bulkWeeks, setBulkWeeks,
                        bulkSyncDate, setBulkSyncDate,
                        bulkDeleteStart, setBulkDeleteStart,
                        bulkDeleteEnd, setBulkDeleteEnd,
                        onCopy, onSyncDay, onDelete, working }) {
  if (!open) return null;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1300,
      background: 'rgba(43,29,26,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
      className="staffing-modal-overlay"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="staffing-modal-panel"
        style={{
          background: C.surface, borderRadius: '18px 18px 0 0',
          width: '100%', maxWidth: 480, maxHeight: '92dvh',
          overflowY: 'auto', padding: '24px 20px 32px',
          boxShadow: '0 -8px 40px rgba(43,29,26,0.18)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: `${C.primary}12`, border: `1px solid ${C.primary}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ContentCopyOutlinedIcon sx={{ fontSize: 19, color: C.primary }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>Bulk Operations</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>Manage schedules efficiently</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.elevated, border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloseOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: C.elevated, borderRadius: 10, padding: 4, marginBottom: 20, gap: 2 }}>
          {[
            { key: 'copy',   label: 'Sync Schedule', color: C.primary },
            { key: 'sync',   label: 'Sync Day',  color: C.success },
            { key: 'delete', label: 'Delete',    color: C.error   },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setBulkTab(key)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                background: bulkTab === key ? C.surface : 'transparent',
                color: bulkTab === key ? color : C.textDim,
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                boxShadow: bulkTab === key ? '0 1px 4px rgba(43,29,26,0.10)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Common: Apply To */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Apply To</label>
            <select
              value={bulkEmpId}
              onChange={e => setBulkEmpId(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.bg,
                fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none',
              }}
            >
              <option value="all">Whole Team (All Employees)</option>
              {employees.map(e => (
                <option key={e._id} value={e._id}>{e.name} ({e.email})</option>
              ))}
            </select>
          </div>

          {bulkTab === 'copy' && (
            <>
              {/* Source week info */}
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Source Week</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{weekLabel(weekStart)}</p>
              </div>

              {/* Duration */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Sync Forward For</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[
                    { label: '1 Wk',  sub: '1 week',   weeks: 1  },
                    { label: '1 Mo',  sub: '4 weeks',  weeks: 4  },
                    { label: '3 Mo',  sub: '13 weeks', weeks: 13 },
                    { label: '6 Mo',  sub: '26 weeks', weeks: 26 },
                    { label: '1 Yr',  sub: '52 weeks', weeks: 52 },
                  ].map(({ label, sub, weeks }) => {
                    const active = bulkWeeks === weeks;
                    return (
                      <button
                        key={weeks}
                        onClick={() => setBulkWeeks(weeks)}
                        style={{
                          padding: '10px 4px 8px', borderRadius: 9,
                          border: `1.5px solid ${active ? C.primary : C.border}`,
                          background: active ? C.primary : C.surface,
                          color: active ? '#fff' : C.textSec,
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 800 }}>{label}</span>
                        <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.65 }}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: C.textDim }}>
                  This week's shift pattern will repeat forward for the chosen period.
                </p>
              </div>
            </>
          )}

          {bulkTab === 'sync' && (
            <>
              <div style={{ background: 'rgba(46,125,79,0.06)', border: '1px solid rgba(46,125,79,0.18)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#1B5E20', lineHeight: '18px' }}>
                  Pick a day from this week and its schedule will be copied to every other day in the week.
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Source Day</label>
                <select
                  value={bulkSyncDate}
                  onChange={e => setBulkSyncDate(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: `1.5px solid ${C.border}`, background: C.bg,
                    fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none',
                  }}
                >
                  {weekDays.map(d => {
                    const ymd = toYMD(d);
                    return (
                      <option key={ymd} value={ymd}>
                        {DAYS[d.getDay()]} — {MONTHS[d.getMonth()]} {d.getDate()}
                      </option>
                    );
                  })}
                </select>
              </div>
            </>
          )}

          {bulkTab === 'delete' && (
            <>
              <div style={{ background: '#FFF5F5', border: `1px solid ${C.error}25`, borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 12, color: C.error, lineHeight: '18px' }}>
                  <strong>Warning:</strong> This permanently removes all schedules in the selected range.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>From</label>
                  <input type="date" value={bulkDeleteStart} onChange={e => setBulkDeleteStart(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>To</label>
                  <input type="date" value={bulkDeleteEnd} onChange={e => setBulkDeleteEnd(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.textSec, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
            {bulkTab === 'copy' && (
              <button onClick={onCopy} disabled={working}
                style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: working ? 'wait' : 'pointer', opacity: working ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {working ? '…' : <><ContentCopyOutlinedIcon sx={{ fontSize: 14 }} /> Sync Schedule</>}
              </button>
            )}
            {bulkTab === 'sync' && (
              <button onClick={onSyncDay} disabled={working}
                style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.success, color: '#fff', fontSize: 12, fontWeight: 700, cursor: working ? 'wait' : 'pointer', opacity: working ? 0.65 : 1 }}>
                {working ? '…' : 'Sync to Week'}
              </button>
            )}
            {bulkTab === 'delete' && (
              <button onClick={onDelete} disabled={working}
                style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.error, color: '#fff', fontSize: 12, fontWeight: 700, cursor: working ? 'wait' : 'pointer', opacity: working ? 0.65 : 1 }}>
                {working ? '…' : 'Clear Schedules'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── DayRow (module-level to avoid remount bug) ────────────────────────── */
function DayRow({ plan, weekDay, dayIndex, onChange, onCopyToAll, error }) {
  const [sh, sm] = (plan.startTime || '09:00').split(':').map(Number);
  const [eh, em] = (plan.endTime   || '17:00').split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  const isOvernightDay = plan.enabled && (eh * 60 + em) < (sh * 60 + sm);
  if (mins <= 0 && plan.enabled) mins += 24 * 60;
  const dur = mins > 0
    ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`
    : '';
  const todayMark = isToday(weekDay);

  return (
    <div style={{
      padding: '11px 20px',
      borderBottom: `1px solid ${C.border}`,
      background: plan.enabled ? C.surface : `${C.bg}CC`,
      transition: 'background 0.12s',
    }}>
      {/* ── Row 1: toggle + day label + status badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => onChange({ enabled: !plan.enabled })}
          aria-label={plan.enabled ? 'Disable day' : 'Enable day'}
          style={{
            width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
            background: plan.enabled ? C.success : C.border,
            position: 'relative', transition: 'background 0.15s', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 3,
            left: plan.enabled ? 19 : 3,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          }} />
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: todayMark ? C.primary : (plan.enabled ? C.textPri : C.textDim),
          }}>
            {DAYS[weekDay.getDay()]}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, whiteSpace: 'nowrap' }}>
            {weekDay.getDate()} {MONTHS[weekDay.getMonth()]}
          </span>
          {todayMark && (
            <span style={{ fontSize: 8, fontWeight: 800, color: C.primary, background: `${C.primary}15`, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>
              TODAY
            </span>
          )}
        </div>

        {plan.enabled
          ? <span style={{ fontSize: 9, fontWeight: 800, color: C.success, background: 'rgba(46,125,79,0.10)', border: '1px solid rgba(46,125,79,0.2)', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>{dur || '—'}</span>
          : <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.05em', flexShrink: 0 }}>OFF</span>
        }
      </div>

      {/* ── Expanded rows when enabled ── */}
      {plan.enabled && (
        <div style={{ paddingLeft: 48, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Time inputs row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="time" value={plan.startTime}
              onChange={e => onChange({ startTime: e.target.value })}
              style={{
                flex: 1, padding: '7px 9px', borderRadius: 8,
                border: `1.5px solid ${error ? C.error : C.border}`,
                background: C.bg, fontSize: 12, fontWeight: 700, color: C.textPri, outline: 'none',
              }}
            />
            <span style={{ color: C.textDim, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>–</span>
            <input
              type="time" value={plan.endTime}
              onChange={e => onChange({ endTime: e.target.value })}
              style={{
                flex: 1, padding: '7px 9px', borderRadius: 8,
                border: `1.5px solid ${error ? C.error : C.border}`,
                background: C.bg, fontSize: 12, fontWeight: 700, color: C.textPri, outline: 'none',
              }}
            />
            {isOvernightDay && (
              <span style={{ fontSize: 8, fontWeight: 900, color: C.info, background: 'rgba(2,119,189,0.12)', borderRadius: 4, padding: '2px 5px', flexShrink: 0, letterSpacing: '0.03em' }}>+1</span>
            )}
            <button
              type="button"
              onClick={() => onCopyToAll(dayIndex)}
              title="Copy these times to all enabled days"
              style={{
                padding: '6px 9px', borderRadius: 7,
                border: `1px solid ${C.border}`, background: C.elevated,
                cursor: 'pointer', color: C.textSec,
                fontSize: 9, fontWeight: 800, flexShrink: 0,
                whiteSpace: 'nowrap', letterSpacing: '0.04em',
              }}
            >
              ↓ All
            </button>
          </div>

          {/* Label + color row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <input
              type="text" value={plan.title}
              onChange={e => onChange({ title: e.target.value })}
              placeholder="Regular Shift"
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 8,
                border: `1.5px solid ${C.border}`, background: C.bg,
                fontSize: 11, fontWeight: 600, color: C.textPri, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {SHIFT_COLORS.map(c => (
                <button
                  key={c} type="button" onClick={() => onChange({ color: c })}
                  style={{
                    width: 17, height: 17, borderRadius: 5,
                    border: 'none', background: c, cursor: 'pointer',
                    outline: plan.color === c ? `2px solid ${C.textPri}` : 'none',
                    outlineOffset: 1.5, flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Color bar preview */}
          <div style={{ height: 3, borderRadius: 2, background: plan.color, opacity: 0.5 }} />

          {error && (
            <p style={{ margin: 0, fontSize: 10, color: C.error, fontWeight: 600 }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── WeeklyScheduleModal ────────────────────────────────────────────────── */
const REPEAT_OPTS = [
  { key: '1week',   label: '1 Week',   weeks: 1  },
  { key: '1month',  label: '1 Month',  weeks: 4  },
  { key: '6months', label: '6 Months', weeks: 26 },
  { key: '1year',   label: '1 Year',   weeks: 52 },
];

function blankDay() {
  return { enabled: false, startTime: '09:00', endTime: '17:00', title: 'Regular Shift', color: SHIFT_COLORS[0] };
}

function WeeklyScheduleModal({
  open, onClose,
  employee,       // pre-selected employee object (null = let manager pick)
  employees,      // all employees for selector
  initialWeekStart,
  token,
  onSave, saving,
}) {
  const [weekStart,     setWeekStart]     = useState(() => startOfWeek(new Date()));
  const [dayPlans,      setDayPlans]      = useState(() => Array.from({ length: 7 }, blankDay));
  const [repeatPeriod,  setRepeatPeriod]  = useState('1week');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [errors,        setErrors]        = useState({});
  const [fetching,      setFetching]      = useState(false);

  /* Re-init when modal opens */
  useEffect(() => {
    if (!open) return;
    const ws = startOfWeek(initialWeekStart ?? new Date());
    setWeekStart(ws);
    setRepeatPeriod('1week');
    setErrors({});
    setSelectedEmpId(employee?._id ?? '');
  }, [open]);                               // eslint-disable-line react-hooks/exhaustive-deps

  /* Fetch existing shifts whenever week or employee changes */
  useEffect(() => {
    if (!open || !selectedEmpId) {
      setDayPlans(Array.from({ length: 7 }, blankDay));
      return;
    }
    setFetching(true);
    const we = addDays(weekStart, 6);
    const params = new URLSearchParams({
      employeeId: selectedEmpId,
      startDate: toYMD(weekStart),
      endDate: toYMD(we),
    });
    fetch(`${API}/api/schedules?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const list = json.data ?? [];
        setDayPlans(Array.from({ length: 7 }, (_, i) => {
          const date = toYMD(addDays(weekStart, i));
          const ex   = list.find(s => s.date === date);
          return ex
            ? { enabled: true, startTime: ex.startTime, endTime: ex.endTime, title: ex.title ?? 'Regular Shift', color: ex.color ?? SHIFT_COLORS[0] }
            : blankDay();
        }));
      })
      .catch(() => setDayPlans(Array.from({ length: 7 }, blankDay)))
      .finally(() => setFetching(false));
  }, [open, selectedEmpId, weekStart, token]);

  if (!open) return null;

  const weekDays     = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedEmp  = employees.find(e => e._id === selectedEmpId) ?? employee;
  const enabledCount = dayPlans.filter(d => d.enabled).length;

  const weeklyHrs = dayPlans.reduce((acc, d) => {
    if (!d.enabled) return acc;
    const [sh, sm] = (d.startTime || '09:00').split(':').map(Number);
    const [eh, em] = (d.endTime   || '17:00').split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return acc + mins / 60;
  }, 0);

  const repeatWeeks = REPEAT_OPTS.find(o => o.key === repeatPeriod)?.weeks ?? 1;

  function updateDay(idx, patch) {
    setDayPlans(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
    setErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
  }

  function copyToAll(srcIdx) {
    const src = dayPlans[srcIdx];
    setDayPlans(prev => prev.map((d, i) =>
      i === srcIdx ? d : { ...d, startTime: src.startTime, endTime: src.endTime, title: src.title, color: src.color }
    ));
  }

  function enableAll()  { setDayPlans(prev => prev.map(d => ({ ...d, enabled: true }))); }
  function disableAll() { setDayPlans(prev => prev.map(d => ({ ...d, enabled: false }))); }

  function validate() {
    const errs = {};
    dayPlans.forEach((d, i) => {
      if (!d.enabled) return;
      if (d.startTime === d.endTime) errs[i] = 'Start and end time cannot be the same.';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!selectedEmpId) { alert('Please select an employee.'); return; }
    if (!validate()) return;
    if (enabledCount === 0) { alert('Enable at least one day.'); return; }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const baseStart = toYMD(weekStart);

    onSave({
      employeeId: selectedEmpId,
      weekStart: baseStart,
      days: dayPlans.map((d, i) => {
        if (!d.enabled) return { dayIndex: i, ...d };
        
        const dDate = toYMD(addDays(weekStart, i));
        const startD = new Date(`${dDate}T${d.startTime}:00`);
        const endD = new Date(`${dDate}T${d.endTime}:00`);
        if (endD <= startD) endD.setDate(endD.getDate() + 1);

        return {
          dayIndex: i, ...d,
          timezone: tz,
          startUtc: startD.toISOString(),
          endUtc: endD.toISOString()
        };
      }),
      repeatPeriod,
    });
  }

  const navWeek = dir => setWeekStart(prev => addDays(prev, dir * 7));

  return createPortal(
    <div
      className="staffing-modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(43,29,26,0.52)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        className="staffing-weekly-panel"
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface, borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 600, maxHeight: '94dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -12px 50px rgba(43,29,26,0.28)',
        }}
      >
        {/* ── Sticky header ── */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${C.primary}12`, border: `1px solid ${C.primary}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: C.primary, flexShrink: 0, textTransform: 'uppercase',
              }}>
                {(selectedEmp?.name ?? '?').charAt(0)}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>
                  {selectedEmp?.name ?? 'Weekly Schedule'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>
                  {enabledCount} day{enabledCount !== 1 ? 's' : ''} · {weeklyHrs.toFixed(1)}h this week
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: C.elevated, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CloseOutlinedIcon sx={{ fontSize: 15, color: C.textSec }} />
            </button>
          </div>

          {/* Employee selector (no pre-selected employee) */}
          {!employee && (
            <select
              value={selectedEmpId}
              onChange={e => setSelectedEmpId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 600, color: C.textPri, outline: 'none', marginBottom: 12 }}
            >
              <option value="">Select employee…</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          )}

          {/* Week nav + quick toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => navWeek(-1)}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ChevronLeftOutlinedIcon sx={{ fontSize: 15, color: C.textSec }} />
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {weekLabel(weekStart)}
            </span>
            <button onClick={() => navWeek(1)}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ChevronRightOutlinedIcon sx={{ fontSize: 15, color: C.textSec }} />
            </button>
            <div style={{ width: 1, height: 18, background: C.border, flexShrink: 0 }} />
            <button onClick={enableAll}  style={{ padding: '5px 9px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontSize: 9, fontWeight: 800, color: C.success, flexShrink: 0, letterSpacing: '0.04em' }}>ALL ON</button>
            <button onClick={disableAll} style={{ padding: '5px 9px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontSize: 9, fontWeight: 800, color: C.textDim, flexShrink: 0, letterSpacing: '0.04em' }}>ALL OFF</button>
          </div>
        </div>

        {/* ── Scrollable day rows ── */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {fetching && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${C.elevated}`, borderTop: `2.5px solid ${C.primary}`, animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}
          {weekDays.map((day, idx) => (
            <DayRow
              key={idx}
              plan={dayPlans[idx]}
              weekDay={day}
              dayIndex={idx}
              onChange={patch => updateDay(idx, patch)}
              onCopyToAll={copyToAll}
              error={errors[idx]}
            />
          ))}
        </div>

        {/* ── Sticky footer ── */}
        <div style={{ padding: '14px 20px 22px', borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>

          {/* Repeat period selector */}
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Repeat This Pattern For
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
            {REPEAT_OPTS.map(({ key, label, weeks }) => {
              const active = repeatPeriod === key;
              return (
                <button key={key} type="button" onClick={() => setRepeatPeriod(key)}
                  style={{
                    padding: '9px 4px 7px', borderRadius: 9,
                    border: `1.5px solid ${active ? C.primary : C.border}`,
                    background: active ? C.primary : C.surface,
                    color: active ? '#fff' : C.textSec,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>{label}</span>
                  <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.65 }}>{weeks} wk{weeks > 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>

          {/* Summary + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, flex: 1, fontSize: 11, color: C.textSec, lineHeight: '15px' }}>
              {enabledCount} day{enabledCount !== 1 ? 's' : ''} × {repeatWeeks} wk{repeatWeeks > 1 ? 's' : ''}{' '}
              = <strong style={{ color: C.textPri }}>{(weeklyHrs * repeatWeeks).toFixed(0)}h total</strong>
            </p>
            <button onClick={onClose}
              style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.textSec, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !selectedEmpId || enabledCount === 0}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: (enabledCount === 0 || !selectedEmpId) ? C.border : C.primary,
                color: '#fff', fontSize: 12, fontWeight: 800,
                cursor: (saving || !selectedEmpId || enabledCount === 0) ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1, flexShrink: 0,
              }}>
              {saving ? 'Saving…' : `Save Schedule`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function ManagerStaffingPage() {
  const { token } = useAuthStore();
  const isDesktop = useMediaQuery('(min-width:1024px)');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [currentDate, setCurrentDate] = useState(new Date());

  /* ── EMS / sync mode state ── */
  const [schedules,   setSchedules]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  /* ── Sync state (read-only, controlled from Settings › Sync Data) ── */
  const [syncEnabled,  setSyncEnabled]  = useState(false);
  const [syncLoading,  setSyncLoading]  = useState(true);

  /* ── Active shifts / missed checkouts ── */
  const [activeShifts,    setActiveShifts]    = useState([]);
  const [missedCheckouts, setMissedCheckouts]  = useState([]);
  const [shiftStatusLoading, setShiftStatusLoading] = useState(true);
  const [forceCheckoutTarget, setForceCheckoutTarget] = useState(null);

  /* ── Local schedule state ── */
  const [localEmployees, setLocalEmployees] = useState([]);
  const [localSchedules, setLocalSchedules] = useState([]);
  const [localLoading,   setLocalLoading]   = useState(false);
  const [localError,     setLocalError]     = useState(null);

  /* ── Weekly schedule modal (create flow) ── */
  const [weeklyOpen,        setWeeklyOpen]        = useState(false);
  const [weeklyEmployee,    setWeeklyEmployee]    = useState(null);
  const [weeklyWeekStart,   setWeeklyWeekStart]   = useState(null);
  const [weeklySaving,      setWeeklySaving]      = useState(false);

  /* ── Shift modal (edit existing shift) ── */
  const [modalOpen,      setModalOpen]      = useState(false);
  const [modalMode,      setModalMode]      = useState('edit');
  const [modalEventId,   setModalEventId]   = useState(null);
  const [modalEmpId,     setModalEmpId]     = useState('');
  const [modalDate,      setModalDate]      = useState('');
  const [modalStart,     setModalStart]     = useState('09:00');
  const [modalEnd,       setModalEnd]       = useState('17:00');
  const [modalTitle,     setModalTitle]     = useState('Regular Shift');
  const [modalColor,     setModalColor]     = useState(SHIFT_COLORS[0]);
  const [modalSaving,    setModalSaving]    = useState(false);

  /* ── Bulk ops modal ── */
  const [bulkOpen,        setBulkOpen]        = useState(false);
  const [bulkTab,         setBulkTab]         = useState('copy');
  const [bulkEmpId,       setBulkEmpId]       = useState('all');
  const [bulkWeeks,       setBulkWeeks]       = useState(4);
  const [bulkSyncDate,    setBulkSyncDate]    = useState('');
  const [bulkDeleteStart, setBulkDeleteStart] = useState('');
  const [bulkDeleteEnd,   setBulkDeleteEnd]   = useState('');
  const [bulkWorking,     setBulkWorking]     = useState(false);

  const weekStart = startOfWeek(currentDate);
  const weekEnd   = addDays(weekStart, 6);

  /* ── fetch sync setting ── */
  useEffect(() => {
    fetch(`${API}/api/settings/sync-staffing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setSyncEnabled(d.syncStaffingBetit ?? false))
      .catch(() => {})
      .finally(() => setSyncLoading(false));
  }, [token]);

  /* ── fetch active shifts / missed checkouts ── */
  const loadShiftStatus = useCallback(async () => {
    try {
      const [activeRes, missedRes] = await Promise.all([
        fetch(`${API}/api/shifts/active-all`,      { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/shifts/missed-checkouts`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [activeData, missedData] = await Promise.all([activeRes.json(), missedRes.json()]);
      setActiveShifts(activeData.success ? activeData.data : []);
      setMissedCheckouts(missedData.success ? missedData.data : []);
    } catch {
      // non-fatal — section just shows empty/stale until next refresh
    } finally {
      setShiftStatusLoading(false);
    }
  }, [token]);

  useEffect(() => { loadShiftStatus(); }, [loadShiftStatus]);

  useSocketEvent('shift:missedcheckout', loadShiftStatus);
  useSocketEvent('shift:update',         loadShiftStatus);


  /* ── EMS fetch (sync mode ON) ── */
  const fetchEmsWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ startDate: toYMD(weekStart), endDate: toYMD(weekEnd) });
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

  /* ── Local fetch (sync mode OFF) ── */
  const fetchLocalWeek = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    const params = new URLSearchParams({ startDate: toYMD(weekStart), endDate: toYMD(weekEnd) });
    try {
      const res = await fetch(`${API}/api/schedules?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error ${res.status}`);
      }
      const json = await res.json();
      setLocalSchedules(json.data ?? []);
    } catch (err) {
      setLocalError(err.message);
      setLocalSchedules([]);
    } finally {
      setLocalLoading(false);
    }
  }, [token, toYMD(weekStart), toYMD(weekEnd)]);

  /* ── Fetch all active employees for local mode ── */
  const fetchLocalEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/accounts?role=Employee&status=ACTIVE`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const emps = (json.data ?? []).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setLocalEmployees(emps);
    } catch {
      setLocalEmployees([]);
    }
  }, [token]);

  /* ── Fetch on mode / week change ── */
  useEffect(() => {
    if (syncLoading) return;
    if (syncEnabled) {
      fetchEmsWeek();
    } else {
      fetchLocalEmployees();
      fetchLocalWeek();
    }
  }, [syncEnabled, syncLoading, fetchEmsWeek, fetchLocalWeek, fetchLocalEmployees]);

  /* ── Derived display data ── */

  // EMS: employees derived from schedule data
  const emsEmployees = [...new Map(
    schedules.filter(s => s.employee?._id)
      .map(s => [String(s.employee._id), s.employee])
  ).values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const displaySchedules = syncEnabled ? schedules      : localSchedules;
  const displayEmployees = syncEnabled ? emsEmployees   : localEmployees;
  const displayLoading   = syncEnabled ? loading        : localLoading;
  const displayError     = syncEnabled ? error          : localError;

  function shiftsFor(empId, ymd) {
    return displaySchedules.filter(
      s => String(s.employee?._id) === String(empId) && s.date === ymd
    );
  }

  function weeklyHours(empId) {
    const total = displaySchedules
      .filter(s => String(s.employee?._id) === String(empId))
      .reduce((acc, s) => acc + Math.max(0, s.scheduledHours ?? 0), 0);
    const h = Math.floor(total);
    const m = Math.round((total - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  const totalHours = displaySchedules.reduce((a, s) => a + Math.max(0, s.scheduledHours ?? 0), 0);
  const weekDays   = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* ── Modal helpers ── */
  function openCreateModal(ymd, empId) {
    // Open the full weekly schedule modal for this employee + week
    const emp = localEmployees.find(e => e._id === empId) ?? null;
    setWeeklyEmployee(emp);
    setWeeklyWeekStart(startOfWeek(ymd ? new Date(ymd) : new Date()));
    setWeeklyOpen(true);
  }

  function openEditModal(shift) {
    setModalMode('edit');
    setModalEventId(shift.scheduleId);
    setModalDate(shift.date);
    setModalEmpId(String(shift.employee?._id ?? ''));
    setModalStart(shift.startTime);
    setModalEnd(shift.endTime);
    setModalTitle(shift.title ?? 'Regular Shift');
    setModalColor(shift.color ?? SHIFT_COLORS[0]);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!modalEmpId || !modalDate || !modalStart || !modalEnd) return;
    if (modalStart === modalEnd) return;
    setModalSaving(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startD = new Date(`${modalDate}T${modalStart}:00`);
      const endD = new Date(`${modalDate}T${modalEnd}:00`);
      if (endD <= startD) endD.setDate(endD.getDate() + 1);

      const body = { 
        employeeId: modalEmpId, date: modalDate, startTime: modalStart, endTime: modalEnd, 
        title: modalTitle, color: modalColor,
        timezone: tz,
        startUtc: startD.toISOString(),
        endUtc: endD.toISOString()
      };
      const url  = modalMode === 'edit' ? `${API}/api/schedules/${modalEventId}` : `${API}/api/schedules`;
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Failed');
      setModalOpen(false);
      fetchLocalWeek();
    } catch (err) {
      alert(err.message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleDelete() {
    if (!modalEventId) return;
    setModalSaving(true);
    try {
      const res = await fetch(`${API}/api/schedules/${modalEventId}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Failed');
      setModalOpen(false);
      fetchLocalWeek();
    } catch (err) {
      alert(err.message);
    } finally {
      setModalSaving(false);
    }
  }

  /* ── Batch save (weekly modal) ── */
  async function handleBatchSave(payload) {
    setWeeklySaving(true);
    try {
      const res = await fetch(`${API}/api/schedules/batch`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      setWeeklyOpen(false);
      fetchLocalWeek();
    } catch (err) {
      alert(err.message);
    } finally {
      setWeeklySaving(false);
    }
  }

  /* ── Bulk ops ── */
  async function handleBulkCopy() {
    setBulkWorking(true);
    try {
      const sourceStartDate = toYMD(weekStart);
      const body = { sourceStartDate, weeksCount: bulkWeeks };
      if (bulkEmpId !== 'all') body.employeeId = bulkEmpId;
      const res = await fetch(`${API}/api/schedules/bulk-copy`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      setBulkOpen(false);
      fetchLocalWeek();
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkSync() {
    if (!bulkSyncDate) { alert('Please select a source day.'); return; }
    setBulkWorking(true);
    try {
      const body = { sourceDate: bulkSyncDate };
      if (bulkEmpId !== 'all') body.employeeId = bulkEmpId;
      const res = await fetch(`${API}/api/schedules/copy-week`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      setBulkOpen(false);
      fetchLocalWeek();
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkDelete() {
    if (!bulkDeleteStart || !bulkDeleteEnd) { alert('Please select both start and end dates.'); return; }
    setBulkWorking(true);
    try {
      const body = { startDate: bulkDeleteStart, endDate: bulkDeleteEnd };
      if (bulkEmpId !== 'all') body.employeeId = bulkEmpId;
      const res = await fetch(`${API}/api/schedules/bulk-delete`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      setBulkOpen(false);
      fetchLocalWeek();
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkWorking(false);
    }
  }

  const sharedOverlays = (
    <>
      {/* ── Weekly schedule modal (create flow) ── */}
      <WeeklyScheduleModal
        open={weeklyOpen}
        onClose={() => setWeeklyOpen(false)}
        employee={weeklyEmployee}
        employees={localEmployees}
        initialWeekStart={weeklyWeekStart}
        token={token}
        onSave={handleBatchSave}
        saving={weeklySaving}
      />

      {/* ── Shift modal (edit existing shift) ── */}
      <ShiftModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employees={localEmployees}
        mode={modalMode}
        empId={modalEmpId}
        date={modalDate}
        startTime={modalStart}
        endTime={modalEnd}
        title={modalTitle}
        color={modalColor}
        onEmpChange={setModalEmpId}
        onDateChange={setModalDate}
        onStartChange={setModalStart}
        onEndChange={setModalEnd}
        onTitleChange={setModalTitle}
        onColorChange={setModalColor}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={modalSaving}
      />

      <BulkOpsModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        employees={localEmployees}
        weekStart={weekStart}
        bulkTab={bulkTab}
        setBulkTab={setBulkTab}
        bulkEmpId={bulkEmpId}
        setBulkEmpId={setBulkEmpId}
        bulkWeeks={bulkWeeks}
        setBulkWeeks={setBulkWeeks}
        bulkSyncDate={bulkSyncDate}
        setBulkSyncDate={setBulkSyncDate}
        bulkDeleteStart={bulkDeleteStart}
        setBulkDeleteStart={setBulkDeleteStart}
        bulkDeleteEnd={bulkDeleteEnd}
        setBulkDeleteEnd={setBulkDeleteEnd}
        onCopy={handleBulkCopy}
        onSyncDay={handleBulkSync}
        onDelete={handleBulkDelete}
        working={bulkWorking}
      />

      {/* Animations */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .staffing-table::-webkit-scrollbar { height: 5px; width: 5px; }
        .staffing-table::-webkit-scrollbar-track { background: ${C.bg}; }
        .staffing-table::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        .staffing-table::-webkit-scrollbar-thumb:hover { background: ${C.textDim}; }
        .staffing-mobile-hscroll::-webkit-scrollbar { display: none; }

        /* Desktop: center modals instead of anchoring to bottom */
        @media (min-width: 640px) {
          .staffing-modal-overlay { align-items: center !important; }
          .staffing-modal-panel   { border-radius: 18px !important; max-height: 85dvh; }
          .staffing-weekly-panel  { border-radius: 20px !important; max-height: 88dvh; }
        }
      `}</style>
    </>
  );

  if (!isDesktop) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: C.bg,
        padding: '16px 14px 32px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxSizing: 'border-box',
        width: '100%',
        overflowX: 'hidden',
      }}>
        {/* Mobile header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 17, color: C.accent }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Manager Portal
              </p>
              <h1 style={{ margin: '1px 0 0', fontSize: 16, fontWeight: 800, color: C.textPri }}>
                Schedule
              </h1>
            </div>
          </div>
          <button
            onClick={syncEnabled ? fetchEmsWeek : fetchLocalWeek}
            disabled={displayLoading}
            aria-label="Refresh schedule"
            title="Refresh"
            style={{
              width: 48, height: 48, borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: displayLoading ? 'wait' : 'pointer', opacity: displayLoading ? 0.65 : 1,
              flexShrink: 0, touchAction: 'manipulation',
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 17, color: C.textSec, animation: displayLoading ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* Week controls */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 10, marginBottom: 14, display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) 48px', gap: 8, alignItems: 'center',
        }}>
          <button onClick={() => setCurrentDate(d => addDays(d, -7))}
            style={{ width: 48, height: 48, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textSec, touchAction: 'manipulation' }}
            aria-label="Previous week">
            <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} />
          </button>
          <div style={{ minWidth: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {weekLabel(weekStart)}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: syncEnabled ? C.info : C.primaryLt, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {syncEnabled ? 'EMS Read-Only' : 'Local Scheduling'}
            </p>
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, 7))}
            style={{ width: 48, height: 48, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textSec, touchAction: 'manipulation' }}
            aria-label="Next week">
            <ChevronRightOutlinedIcon sx={{ fontSize: 18 }} />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            style={{ height: 48, gridColumn: !syncEnabled ? '1 / span 1' : '1 / -1', borderRadius: 8, border: `1px solid ${C.primary}30`, background: C.primary, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}>
            Today
          </button>
          {!syncEnabled && (
            <button
              onClick={() => { setBulkTab('copy'); setBulkSyncDate(toYMD(weekStart)); setBulkOpen(true); }}
              style={{ height: 48, gridColumn: '2 / -1', borderRadius: 8, border: `1px solid ${C.primary}30`, background: `${C.primary}10`, color: C.primary, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, touchAction: 'manipulation' }}>
              <ContentCopyOutlinedIcon sx={{ fontSize: 15 }} />
              Bulk Ops
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
          <StatCard label="Schedules"   value={displaySchedules.length}     icon={CalendarMonthOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.09)" />
          <StatCard label="Employees"   value={displayEmployees.length}     icon={PeopleOutlinedIcon}        color={C.primary} iconBg="rgba(62,39,35,0.09)" />
          <div style={{ gridColumn: '1 / -1' }}>
            <StatCard label="Total Hours" value={`${totalHours.toFixed(1)}h`} icon={AccessTimeOutlinedIcon}   color={C.success} iconBg="rgba(46,125,79,0.09)" />
          </div>
        </div>

        {/* Context banner */}
        {syncEnabled && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: C.info, flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#01579B', fontWeight: 600, lineHeight: '18px' }}>
              Read-only schedules are sourced from Staffing Betit.
            </p>
          </div>
        )}

        {displayError && !displayLoading && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: C.error, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error, lineHeight: '18px' }}>{displayError}</p>
          </div>
        )}

        {/* Active shifts / missed checkouts */}
        <div style={{ marginBottom: 14 }}>
          <ShiftStatusSection
            activeShifts={activeShifts}
            missedCheckouts={missedCheckouts}
            loading={shiftStatusLoading}
            onForceCheckout={setForceCheckoutTarget}
            isDesktop={false}
          />
        </div>

        <ForceCheckoutDialog
          shift={forceCheckoutTarget}
          token={token}
          onClose={() => setForceCheckoutTarget(null)}
          onDone={() => { setForceCheckoutTarget(null); loadShiftStatus(); }}
        />

        {/* Mobile roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
          {displayLoading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 5, minHeight: 220, background: 'rgba(245,243,241,0.72)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${C.elevated}`, borderTop: `3px solid ${C.primary}`, animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!displayLoading && displayEmployees.length === 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '36px 18px', textAlign: 'center' }}>
              <EventBusyOutlinedIcon sx={{ fontSize: 30, color: C.primary }} />
              <p style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 800, color: C.textPri }}>
                {syncEnabled ? 'No schedules this week' : 'No active employees found'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: C.textSec, lineHeight: '18px' }}>
                {syncEnabled ? 'No shifts are published in EMS for this week.' : 'Add employees before creating schedules.'}
              </p>
            </div>
          )}

          {displayEmployees.map((emp) => (
            <div key={emp._id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 12px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.elevated, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 900, color: C.primary, textTransform: 'uppercase' }}>
                  {(emp.name ?? '?').charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.name ?? '—'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.email ?? ''}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.primary, background: `${C.primary}12`, border: `1px solid ${C.primary}25`, borderRadius: 6, padding: '4px 7px', whiteSpace: 'nowrap' }}>
                  {weeklyHours(emp._id)}
                </span>
              </div>

              <div className="staffing-mobile-hscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', padding: '12px 16px 14px', scrollPaddingInline: 16, scrollSnapType: 'x mandatory' }}>
                {weekDays.map((day, idx) => {
                  const ymd = toYMD(day);
                  const dayShifts = shiftsFor(emp._id, ymd);
                  const clickable = !syncEnabled;
                  const todayCell = isToday(day);

                  return (
                    <div key={idx} style={{ minWidth: 146, width: 146, flexShrink: 0, scrollSnapAlign: 'start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: todayCell ? C.primary : C.textDim, letterSpacing: '0.1em' }}>{DAYS[day.getDay()]}</span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: todayCell ? C.primary : C.textPri }}>{day.getDate()}</span>
                      </div>
                      {dayShifts.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {dayShifts.map((shift) => {
                            const accent = shift.color ?? C.primary;
                            return (
                              <button
                                key={shift.scheduleId}
                                type="button"
                                onClick={clickable ? () => openEditModal(shift) : undefined}
                                disabled={!clickable}
                                style={{
                                  minHeight: 74, width: '100%', textAlign: 'left', borderRadius: 8,
                                  border: `1px solid ${accent}35`, borderLeft: `4px solid ${accent}`,
                                  background: `${accent}12`, padding: '8px 9px', cursor: clickable ? 'pointer' : 'default',
                                  touchAction: 'manipulation', opacity: 1,
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                  <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: accent, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, fontWeight: 900, color: accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {fmtLocal12(shift.startUtc, shift.startTime)} – {fmtLocal12(shift.endUtc, shift.endTime)}
                                  </span>
                                </span>
                                <span style={{ display: 'block', marginTop: 5, fontSize: 11, fontWeight: 700, color: accent, opacity: 0.86, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {shift.title ?? 'Regular Shift'}{shift.isOvernight ? ' (+1)' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={clickable ? () => openCreateModal(ymd, emp._id) : undefined}
                          disabled={!clickable}
                          style={{
                            minHeight: 74, width: '100%', borderRadius: 8,
                            border: `1.5px dashed ${clickable ? `${C.primary}35` : C.border}`,
                            background: todayCell ? `${C.primary}05` : C.bg, color: clickable ? C.primary : C.textDim,
                            cursor: clickable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
                            touchAction: 'manipulation', opacity: 1,
                          }}
                        >
                          {clickable ? <AddOutlinedIcon sx={{ fontSize: 20, color: `${C.primary}70` }} /> : 'No Schedule'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!displayLoading && displaySchedules.length > 0 && (
          <p style={{ margin: '12px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textAlign: 'right', letterSpacing: '0.04em' }}>
            {displaySchedules.length} schedule{displaySchedules.length !== 1 ? 's' : ''} · {totalHours.toFixed(1)}h total
          </p>
        )}

        {sharedOverlays}
      </div>
    );
  }

  /* ── Render ── */
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

        {/* Title + nav row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Manager Portal
              </p>
              <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
                Staffing Schedule
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
                {syncEnabled ? 'Read-only view sourced from Staffing Betit (EMS)' : 'Local schedule management — create and edit shifts directly'}
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '6px 8px', flexWrap: 'wrap',
          }}>
            <button onClick={() => setCurrentDate(d => addDays(d, -7))}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textSec, flexShrink: 0 }}
              aria-label="Previous week">
              <ChevronLeftOutlinedIcon sx={{ fontSize: 16 }} />
            </button>

            <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri, minWidth: 160, textAlign: 'center', whiteSpace: 'nowrap' }}>
              {weekLabel(weekStart)}
            </span>

            <button onClick={() => setCurrentDate(d => addDays(d, 7))}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textSec, flexShrink: 0 }}
              aria-label="Next week">
              <ChevronRightOutlinedIcon sx={{ fontSize: 16 }} />
            </button>

            <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

            <button onClick={() => setCurrentDate(new Date())}
              style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.primary, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
              Today
            </button>

            {/* Refresh */}
            <button
              onClick={syncEnabled ? fetchEmsWeek : fetchLocalWeek}
              disabled={displayLoading}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textSec, opacity: displayLoading ? 0.5 : 1, flexShrink: 0 }}
              aria-label="Refresh">
              <RefreshOutlinedIcon sx={{ fontSize: 15, animation: displayLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {/* Bulk Ops (local mode only) */}
            {!syncEnabled && (
              <button
                onClick={() => { setBulkTab('copy'); setBulkSyncDate(toYMD(weekStart)); setBulkOpen(true); }}
                style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.primary}30`, background: `${C.primary}10`, color: C.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                <ContentCopyOutlinedIcon sx={{ fontSize: 13 }} />
                Bulk Ops
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatCard label="Schedules"   value={displaySchedules.length}         icon={CalendarMonthOutlinedIcon} color={C.info}    iconBg="rgba(2,119,189,0.09)"  />
          <StatCard label="Employees"   value={displayEmployees.length}         icon={PeopleOutlinedIcon}        color={C.primary} iconBg="rgba(62,39,35,0.09)"   />
          <StatCard label="Total Hours" value={`${totalHours.toFixed(1)}h`}     icon={AccessTimeOutlinedIcon}   color={C.success} iconBg="rgba(46,125,79,0.09)"  />
        </div>
      </div>

      {/* ── Context banner ── */}
      {syncEnabled ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 14px' }}>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: C.info, flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: 12, color: '#01579B', fontWeight: 500, lineHeight: '18px' }}>
            <strong>Read-only view</strong> — schedules are sourced from Staffing Betit (EMS). To create or modify schedules, visit the{' '}
            <a href="https://staffingbetit.com/admin/scheduling" target="_blank" rel="noopener noreferrer"
              style={{ color: '#0277BD', fontWeight: 700, textDecoration: 'underline' }}>
              Staffing Betit admin portal
            </a>. To switch to local scheduling, go to <strong>Settings › Sync Data</strong>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: `${C.primary}06`, border: `1px solid ${C.primary}20`, borderRadius: 10, padding: '10px 14px' }}>
          <EditOutlinedIcon sx={{ fontSize: 16, color: C.primary, flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: 12, color: C.primaryLt, fontWeight: 500, lineHeight: '18px' }}>
            <strong>Local scheduling active.</strong> Click any empty cell to add a shift. Click an existing shift to edit or delete it. Use <strong>Bulk Ops</strong> to replicate or clear schedules across weeks. To sync with EMS, go to <strong>Settings › Sync Data</strong>.
          </p>
        </div>
      )}

      {/* ── Error banner ── */}
      {displayError && !displayLoading && (
        <div style={{ background: '#FFF5F5', border: `1px solid #FECACA`, borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: C.error, flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>{displayError}</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#7F1D1D', lineHeight: '17px' }}>
              {syncEnabled
                ? 'Make sure the EMS server is running and STAFFING_API_TOKEN is correctly configured.'
                : 'Check the POS backend is running and the schedule API is accessible.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Active shifts / missed checkouts ── */}
      <ShiftStatusSection
        activeShifts={activeShifts}
        missedCheckouts={missedCheckouts}
        loading={shiftStatusLoading}
        onForceCheckout={setForceCheckoutTarget}
        isDesktop={true}
      />

      <ForceCheckoutDialog
        shift={forceCheckoutTarget}
        token={token}
        onClose={() => setForceCheckoutTarget(null)}
        onDone={() => { setForceCheckoutTarget(null); loadShiftStatus(); }}
      />

      {/* ── Roster table ── */}
      <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 320, position: 'relative' }}>

        {/* Table header bar */}
        <div style={{ padding: '7px 14px', borderBottom: `1px solid ${C.border}`, background: C.tableHdr, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Scroll → to see all days
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.primaryLt }}>
            {displayEmployees.length} employee{displayEmployees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading overlay */}
        {displayLoading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.elevated}`, borderTop: `3px solid ${C.primary}`, animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'separate', borderSpacing: 0 }}>

            {/* Sticky column headers */}
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, top: 0, zIndex: 40, background: C.surface, borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '10px 14px', textAlign: 'left', width: 190, minWidth: 190 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PeopleOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Team Member</span>
                  </div>
                </th>
                {weekDays.map((day, idx) => {
                  const today = isToday(day);
                  return (
                    <th key={idx} style={{ position: 'sticky', top: 0, zIndex: 30, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 6px', width: 110, minWidth: 100 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 8px', borderRadius: 8, background: today ? `${C.primary}10` : 'transparent', border: today ? `1px solid ${C.primary}25` : '1px solid transparent' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: today ? C.primary : C.textDim, textTransform: 'uppercase' }}>{DAYS[day.getDay()]}</span>
                        <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1, marginTop: 1, color: today ? C.primary : C.textPri }}>{day.getDate()}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Employee rows */}
            <tbody>
              {!displayLoading && displayEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <EventBusyOutlinedIcon sx={{ fontSize: 26, color: C.primary }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>
                        {syncEnabled ? 'No schedules this week' : 'No active employees found'}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: C.textSec, maxWidth: 280, lineHeight: '18px' }}>
                        {syncEnabled
                          ? (displayError ? 'Connection to EMS failed — see the error above.' : 'No shifts published in Staffing Betit for this week.')
                          : 'Add employees from the Employee section, then come back to schedule their shifts.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {displayEmployees.map((emp) => (
                <tr key={emp._id} style={{ transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Sticky employee cell */}
                  <td style={{ position: 'sticky', left: 0, zIndex: 20, background: 'inherit', borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '10px 14px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.elevated, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800, color: C.primary, textTransform: 'uppercase' }}>
                        {(emp.name ?? '?').charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                          {emp.name ?? '—'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <p style={{ margin: 0, fontSize: 10, color: C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                            {emp.email ?? ''}
                          </p>
                          <span style={{ fontSize: 9, fontWeight: 800, color: C.primary, background: `${C.primary}12`, border: `1px solid ${C.primary}25`, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                            {weeklyHours(emp._id)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {weekDays.map((day, idx) => {
                    const ymd       = toYMD(day);
                    const dayShifts = shiftsFor(emp._id, ymd);
                    const todayCell = isToday(day);
                    const clickable = !syncEnabled;

                    return (
                      <td
                        key={idx}
                        onClick={clickable && dayShifts.length === 0 ? () => openCreateModal(ymd, emp._id) : undefined}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          borderLeft: `1px solid ${C.border}`,
                          padding: '6px',
                          verticalAlign: 'top',
                          height: 88,
                          background: todayCell ? `${C.primary}05` : 'transparent',
                          cursor: (clickable && dayShifts.length === 0) ? 'pointer' : 'default',
                        }}
                      >
                        {dayShifts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                            {dayShifts.map((shift) => {
                              const accent = shift.color ?? C.primary;
                              return (
                                <div
                                  key={shift.scheduleId}
                                  onClick={clickable ? (e) => { e.stopPropagation(); openEditModal(shift); } : undefined}
                                  style={{
                                    flex: 1, padding: '5px 7px', borderRadius: 7,
                                    border: `1px solid ${accent}35`,
                                    borderLeft: `3px solid ${accent}`,
                                    background: `${accent}12`,
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
                                    overflow: 'hidden', minHeight: 0,
                                    cursor: clickable ? 'pointer' : 'default',
                                    transition: 'box-shadow 0.12s',
                                  }}
                                  onMouseEnter={e => { if (clickable) e.currentTarget.style.boxShadow = `0 2px 8px ${accent}30`; }}
                                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <AccessTimeOutlinedIcon sx={{ fontSize: 12, color: accent, flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: '0.01em', lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {fmtLocal12(shift.startUtc, shift.startTime)} – {fmtLocal12(shift.endUtc, shift.endTime)}
                                    </span>
                                    {shift.isOvernight && (
                                      <span style={{ fontSize: 8, fontWeight: 900, color: accent, background: `${accent}25`, borderRadius: 3, padding: '1px 3px', flexShrink: 0, letterSpacing: '0.02em' }}>+1</span>
                                    )}
                                  </div>
                                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: accent, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {shift.title ?? 'Regular Shift'}
                                  </p>
                                  {/* Edit hint */}
                                  {clickable && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                                      <EditOutlinedIcon sx={{ fontSize: 9, color: accent, opacity: 0.55 }} />
                                      <span style={{ fontSize: 8, color: accent, opacity: 0.55, fontWeight: 700 }}>Edit</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Empty cell */
                          <div style={{
                            height: '100%', width: '100%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            border: `1.5px dashed ${clickable ? `${C.primary}30` : C.border}`,
                            borderRadius: 7, background: C.bg,
                            transition: 'border-color 0.12s, background 0.12s',
                          }}
                            onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = `${C.primary}08`; } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = clickable ? `${C.primary}30` : C.border; e.currentTarget.style.background = C.bg; }}
                          >
                            {clickable ? (
                              <AddOutlinedIcon sx={{ fontSize: 18, color: `${C.primary}40` }} />
                            ) : (
                              <span style={{ fontSize: 8, fontWeight: 800, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                No Schedule
                              </span>
                            )}
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
      {!displayLoading && displaySchedules.length > 0 && (
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textAlign: 'right', letterSpacing: '0.04em' }}>
          {displaySchedules.length} schedule{displaySchedules.length !== 1 ? 's' : ''} ·{' '}
          {displayEmployees.length} employee{displayEmployees.length !== 1 ? 's' : ''} ·{' '}
          {totalHours.toFixed(1)}h total · week of {weekLabel(weekStart)}
        </p>
      )}

      {sharedOverlays}
    </div>
  );
}
