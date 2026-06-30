import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import AddOutlinedIcon            from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon           from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon  from '@mui/icons-material/DeleteOutlineOutlined';
import CloseIcon                  from '@mui/icons-material/Close';
import CheckIcon                  from '@mui/icons-material/Check';
import useAuthStore from '../store/useAuthStore';

import { API_URL as API, EMS_URL } from '../config/api';
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
};

const EMS_AVATAR_BASE = EMS_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  return (name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, iconBg, skeleton }) {
  return (
    <div style={{
      position: 'relative', background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start',
      gap: 14, fontFamily: FONT,
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

function MemberAvatar({ name, imageUrl, profilePicture, size = 32 }) {
  const [imgErr, setImgErr] = useState(false);
  const src = imageUrl || profilePicture;
  const fullSrc = src
    ? (src.startsWith('http') ? src : `${EMS_AVATAR_BASE}${src}`)
    : null;

  if (fullSrc && !imgErr) {
    return (
      <img src={fullSrc} alt={name} onError={() => setImgErr(true)}
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
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color: C.primaryLt, fontFamily: FONT }}>{initials(name)}</span>
    </div>
  );
}

// ─── Score badge (EMS only) ───────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const color = score >= 80 ? C.success : score >= 50 ? C.warning : C.error;
  const bg    = score >= 80 ? C.successLt : score >= 50 ? C.warningLt : C.errorLt;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 6, padding: '2px 7px', fontFamily: FONT }}>
      {score}
    </span>
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

// ─── EMS GroupCard (read-only, sync ON) ──────────────────────────────────────

function EmsGroupCard({ group }) {
  const [expanded, setExpanded] = useState(false);
  const members  = group.employees ?? [];
  const avgScore = members.length
    ? Math.round(members.reduce((s, m) => s + (m.performanceScore ?? 0), 0) / members.length)
    : 0;
  const totalPts = members.reduce((s, m) => s + (m.totalPoints ?? 0), 0);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', fontFamily: FONT }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.elevated}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GroupsOutlinedIcon sx={{ fontSize: 20, color: C.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>{members.length} {members.length === 1 ? 'member' : 'members'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['Members', members.length, C.textPri], [`${avgScore}`, 'Avg Score', avgScore >= 80 ? C.success : avgScore >= 50 ? C.warning : C.error], [totalPts.toLocaleString(), 'Total Pts', C.accent]].map(([val, lbl, col], i) => (
            <div key={i} style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: i === 0 ? C.textPri : col }}>{i === 0 ? members.length : val}</p>
              <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{i === 0 ? 'Members' : lbl}</p>
            </div>
          ))}
        </div>
      </div>
      {members.length > 0 && (
        <>
          <button onClick={() => setExpanded(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: FONT }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{expanded ? 'Hide members' : 'View members'}</span>
            {expanded ? <KeyboardArrowUpIcon sx={{ fontSize: 16, color: C.textDim }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 16, color: C.textDim }} />}
          </button>
          {expanded && (
            <div style={{ borderTop: `1px solid ${C.elevated}` }}>
              {members.map((m, i) => (
                <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < members.length - 1 ? `1px solid ${C.elevated}` : 'none', background: i % 2 === 0 ? C.surface : C.bg }}>
                  <MemberAvatar name={m.name} profilePicture={m.profilePicture} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textDim }}>{m.email}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    <ScoreBadge score={m.performanceScore ?? 0} />
                    <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{(m.totalPoints ?? 0).toLocaleString()} pts</span>
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

// ─── POS GroupCard (editable, sync OFF) ──────────────────────────────────────

function PosGroupCard({ group, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const members = group.members ?? [];

  const handleDelete = async () => {
    if (!window.confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(group._id);
    setDeleting(false);
  };

  const revenue  = group.revenue ?? 0;
  const rank     = group.rank ?? '—';
  const fmtRev   = revenue >= 1000
    ? `$${(revenue / 1000).toFixed(1)}k`
    : `$${revenue.toFixed(2)}`;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>

      {/* Card header — mirrors EmsGroupCard exactly, plus action buttons */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.elevated}` }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GroupsOutlinedIcon sx={{ fontSize: 20, color: C.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>
              {group.description
                ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{group.description}</span>
                : <>{members.length} {members.length === 1 ? 'member' : 'members'}</>}
            </p>
          </div>
          {/* Edit / Delete — flush right, same row as title */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => onEdit(group)}
              title="Edit group"
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <EditOutlinedIcon sx={{ fontSize: 14, color: C.textSec }} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete group"
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid rgba(183,28,28,0.25)`, background: C.errorLt, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deleting ? 0.5 : 1 }}
            >
              <DeleteOutlineOutlinedIcon sx={{ fontSize: 14, color: C.error }} />
            </button>
          </div>
        </div>

        {/* Stats row — same 3-box layout as EmsGroupCard */}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Members */}
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri }}>{members.length}</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Members</p>
          </div>
          {/* Total Revenue */}
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.success }}>{fmtRev}</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Rev</p>
          </div>
          {/* Rank */}
          <div style={{ flex: 1, background: C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri }}>
              {rank === '—' ? '—' : `#${rank}`}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rank</p>
          </div>
        </div>
      </div>

      {/* Member list — same toggle + row pattern as EmsGroupCard */}
      {members.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: FONT }}
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
              {members.map((m, i) => (
                <div
                  key={m._id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < members.length - 1 ? `1px solid ${C.elevated}` : 'none', background: i % 2 === 0 ? C.surface : C.bg }}
                >
                  <MemberAvatar name={m.name} imageUrl={m.imageUrl} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email ?? m.employeeCode}</p>
                  </div>
                  {/* Employee code badge — same position/style as EMS score badge */}
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.primaryLt, background: C.accentLt, border: `1px solid rgba(212,163,115,0.4)`, borderRadius: 6, padding: '2px 8px', flexShrink: 0, fontFamily: 'monospace' }}>
                    {m.employeeCode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Group dialog (create / edit) ────────────────────────────────────────────

function GroupDialog({ open, group, employees, token, onClose, onSaved }) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [selected,    setSelected]    = useState(new Set());
  const [empSearch,   setEmpSearch]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // Populate when editing
  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setSelected(new Set((group?.members ?? []).map(m => m._id ?? m)));
    setEmpSearch('');
    setError('');
  }, [open, group]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const filtered = (employees ?? []).filter(e =>
    !empSearch.trim() ||
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.email ?? '').toLowerCase().includes(empSearch.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(empSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!name.trim()) { setError('Group name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { name: name.trim(), description: description.trim(), memberIds: [...selected] };
      const url    = group ? `${API}/api/groups/${group._id}` : `${API}/api/groups`;
      const method = group ? 'PUT' : 'POST';
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      onSaved(data.group);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 520, background: C.surface, borderRadius: 20, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', fontFamily: FONT, boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}>

        {/* Dialog header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GroupsOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>{group ? 'Edit Group' : 'Create Group'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <CloseIcon sx={{ fontSize: 20, color: C.textDim }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Group Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning Shift Team"
              style={{ width: '100%', height: 40, padding: '0 12px', border: `1.5px solid ${error && !name.trim() ? C.error : C.border}`, borderRadius: 9, fontSize: 13, fontFamily: FONT, color: C.textPri, outline: 'none', boxSizing: 'border-box', background: C.surface }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this group…"
              rows={2}
              style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: FONT, color: C.textPri, outline: 'none', boxSizing: 'border-box', resize: 'none', background: C.surface }}
            />
          </div>

          {/* Member selector */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
              Members <span style={{ fontWeight: 500, color: C.accent }}>({selected.size} selected)</span>
            </label>

            {/* Search within employees */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <SearchOutlinedIcon sx={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: C.textDim }} />
              <input
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                placeholder="Search employees…"
                style={{ width: '100%', height: 34, paddingLeft: 30, paddingRight: 10, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: FONT, color: C.textPri, outline: 'none', boxSizing: 'border-box', background: C.bg }}
              />
            </div>

            {/* Employee list */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <p style={{ margin: 0, padding: '20px 16px', fontSize: 12, color: C.textDim, textAlign: 'center' }}>No employees found</p>
              )}
              {filtered.map((e, i) => {
                const checked = selected.has(e._id);
                return (
                  <div
                    key={e._id}
                    onClick={() => toggle(e._id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderBottom: i < filtered.length - 1 ? `1px solid ${C.elevated}` : 'none',
                      background: checked ? 'rgba(212,163,115,0.08)' : (i % 2 === 0 ? C.surface : C.bg),
                      cursor: 'pointer',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${checked ? C.accent : C.border}`,
                      background: checked ? C.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {checked && <CheckIcon sx={{ fontSize: 12, color: '#fff' }} />}
                    </div>
                    <MemberAvatar name={e.name} imageUrl={e.imageUrl} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: C.textDim }}>{e.email ?? e.employeeCode} · {e.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 42, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, fontSize: 13, fontWeight: 700, color: C.textSec, cursor: 'pointer', fontFamily: FONT }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, height: 42, border: 'none', borderRadius: 10, background: saving ? C.textDim : C.primary, fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: FONT }}
          >
            {saving ? 'Saving…' : group ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ManagerGroupsPage() {
  const token    = useAuthStore(s => s.token);
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [search,      setSearch]      = useState('');
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);   // null = create, object = edit

  // ── Sync setting ─────────────────────────────────────────────────────────────
  const { data: syncData, isLoading: syncLoading } = useQuery({
    queryKey: ['settings-sync'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/settings/sync-staffing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { syncStaffingBetit: false };
      return res.json();
    },
    enabled:   !!token,
    staleTime: 0,
  });
  const syncEnabled = syncData?.syncStaffingBetit ?? false;

  // ── EMS groups (sync ON) ──────────────────────────────────────────────────────
  const { data: emsResp, isLoading: emsLoading, isError: emsError, error: emsErr, refetch: emsRefetch, isFetching: emsFetching } = useQuery({
    queryKey: ['ems-groups'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/staffing/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || `Failed (${res.status})`); }
      return res.json();
    },
    enabled: !!token && syncEnabled,
    staleTime: 5 * 60 * 1000,
  });
  const emsGroups = emsResp?.data ?? [];

  // ── POS groups (sync OFF) ─────────────────────────────────────────────────────
  const { data: posResp, isLoading: posLoading, isError: posError, error: posErr, refetch: posRefetch, isFetching: posFetching } = useQuery({
    queryKey: ['pos-groups'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || `Failed (${res.status})`); }
      return res.json();
    },
    enabled: !!token && !syncLoading && !syncEnabled,
    staleTime: 0,
  });
  const posGroups = posResp?.groups ?? [];

  // ── Employees list for dialog ─────────────────────────────────────────────────
  const { data: empData } = useQuery({
    queryKey: ['pos-group-employees'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/groups/employees`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token && !syncEnabled,
    staleTime: 5 * 60 * 1000,
  });
  const employees = empData?.employees ?? [];

  // ── Derived values ────────────────────────────────────────────────────────────
  const groups  = syncEnabled ? emsGroups : posGroups;
  const loading = syncEnabled ? emsLoading : posLoading;
  const isError = syncEnabled ? emsError   : posError;
  const err     = syncEnabled ? emsErr     : posErr;

  const filtered = search.trim()
    ? groups.filter(g => {
        const q = search.toLowerCase();
        const members = syncEnabled ? (g.employees ?? []) : (g.members ?? []);
        return g.name.toLowerCase().includes(q) ||
          members.some(m => m.name.toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q));
      })
    : groups;

  const totalMembers = groups.reduce((s, g) => s + ((syncEnabled ? g.memberCount : g.members?.length) ?? 0), 0);

  // EMS: avg performance score across all members
  const allEmsMembers = emsGroups.flatMap(g => g.employees ?? []);
  const avgScore = allEmsMembers.length
    ? Math.round(allEmsMembers.reduce((s, m) => s + (m.performanceScore ?? 0), 0) / allEmsMembers.length)
    : 0;

  // POS: avg members per group
  const avgGroupSize = posGroups.length
    ? (totalMembers / posGroups.length).toFixed(1).replace(/\.0$/, '')
    : 0;

  // ── POS group actions ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    await fetch(`${API}/api/groups/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    qc.invalidateQueries({ queryKey: ['pos-groups'] });
  }, [token, qc]);

  const handleSaved = useCallback(() => {
    setDialogOpen(false);
    setEditTarget(null);
    qc.invalidateQueries({ queryKey: ['pos-groups'] });
  }, [qc]);

  const openCreate = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit   = (g)  => { setEditTarget(g);   setDialogOpen(true); };

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
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textDim }}>
              {syncEnabled ? 'Employee groups from staffing portal — read only' : 'Manage your POS employee groups'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Refresh */}
          <button
            onClick={() => syncEnabled ? emsRefetch() : posRefetch()}
            disabled={syncEnabled ? emsFetching : posFetching}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: FONT }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 15, color: C.textSec, animation: (syncEnabled ? emsFetching : posFetching) ? 'spin 1s linear infinite' : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Refresh</span>
          </button>

          {/* Create group — only when sync is OFF */}
          {!syncLoading && !syncEnabled && (
            <button
              onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', background: C.primary, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: FONT }}
            >
              <AddOutlinedIcon sx={{ fontSize: 15, color: '#fff' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Create Group</span>
            </button>
          )}
        </div>
      </div>

      {/* ── EMS sync OFF: show POS UI ─────────────────────────────────────── */}
      {!syncLoading && !syncEnabled && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(212,163,115,0.08)', border: `1px solid rgba(212,163,115,0.35)`, borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: C.accent, flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: 12, color: C.textSec, fontWeight: 500, lineHeight: '18px', fontFamily: FONT }}>
            <strong>POS-native groups</strong> — Staffing Betit sync is off. Groups created here are stored in the POS database and are used for group performance reports. To switch to EMS groups, enable the integration in{' '}
            <button onClick={() => navigate('/manager/settings')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.primary, fontWeight: 700, fontSize: 12, fontFamily: FONT, textDecoration: 'underline' }}>
              Settings › Sync Data
            </button>.
          </p>
        </div>
      )}

      {/* ── EMS sync ON: read-only notice ────────────────────────────────── */}
      {!syncLoading && syncEnabled && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: C.info, flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: 12, color: '#01579B', fontWeight: 500, lineHeight: '18px', fontFamily: FONT }}>
            <strong>Read-only view</strong> — groups are sourced from Staffing Betit (EMS). To create or modify groups, visit the{' '}
            <a href={EMS_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.info, fontWeight: 700, textDecoration: 'underline' }}>
              Staffing Betit portal
            </a>. To disable this sync, go to <strong>Settings › Sync Data</strong>.
          </p>
        </div>
      )}

      {/* KPI row */}
      {(syncLoading || (!syncLoading && (syncEnabled || posGroups.length >= 0))) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Groups"  value={loading ? '—' : groups.length}  icon={GroupsOutlinedIcon}  color={C.accent}  iconBg={C.accentLt}  skeleton={loading} />
          <KpiCard label="Total Members" value={loading ? '—' : totalMembers}   icon={PeopleOutlinedIcon}  color={C.info}    iconBg={C.infoLt}    skeleton={loading} />
          <KpiCard
            label={syncEnabled ? 'Avg Perf Score' : 'Avg Group Size'}
            value={loading ? '—' : (syncEnabled ? avgScore : avgGroupSize)}
            icon={StarOutlinedIcon}
            color={C.success}
            iconBg={C.successLt}
            skeleton={loading}
          />
        </div>
      )}

      {/* Search bar */}
      {!syncLoading && (
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
          <SearchOutlinedIcon sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: C.textDim }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups or members…"
            style={{ width: '100%', height: 36, paddingLeft: 34, paddingRight: 12, border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, fontSize: 13, fontFamily: FONT, color: C.textPri, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.errorLt, border: `1px solid #FFCDD2`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 20, color: C.error, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>Failed to load groups</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#C62828' }}>{err?.message}</p>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !isError && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: C.textDim }}>
          <GroupsOutlinedIcon sx={{ fontSize: 48, color: C.border }} />
          <p style={{ margin: '12px 0 4px', fontSize: 15, fontWeight: 700, color: C.textSec }}>
            {search ? 'No groups match your search' : 'No groups yet'}
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13 }}>
            {search ? 'Try a different search term.' : syncEnabled ? 'Groups created in the staffing portal will appear here.' : 'Create your first group to get started.'}
          </p>
          {!syncEnabled && !search && (
            <button onClick={openCreate} style={{ height: 38, padding: '0 20px', background: C.primary, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AddOutlinedIcon sx={{ fontSize: 15 }} /> Create Group
            </button>
          )}
        </div>
      )}

      {/* Groups grid */}
      {!loading && !isError && filtered.length > 0 && (
        <>
          {search && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: C.textDim, fontWeight: 600 }}>
              {filtered.length} of {groups.length} {groups.length === 1 ? 'group' : 'groups'} shown
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {syncEnabled
              ? filtered.map(g => <EmsGroupCard key={g._id} group={g} />)
              : filtered.map(g => <PosGroupCard key={g._id} group={g} onEdit={openEdit} onDelete={handleDelete} />)
            }
          </div>
        </>
      )}

      {/* Create / Edit dialog */}
      <GroupDialog
        open={dialogOpen}
        group={editTarget}
        employees={employees}
        token={token}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
