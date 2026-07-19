import { memo } from 'react';
import useCurrentTime from '../hooks/useCurrentTime';

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Compact "clocked in" work timer badge for the mobile employee header.
 * Ticks off the single shared clock (useCurrentTime) — only this small
 * component re-renders once a second, not the surrounding navbar/layout.
 * The caller is responsible for only rendering this when the employee is
 * actually clocked in with a valid checkInTime (see EmployeeLayout).
 */
function WorkTimer({ checkInTime }) {
  const now = useCurrentTime();
  const checkInMs = new Date(checkInTime).getTime();
  if (Number.isNaN(checkInMs)) return null;

  const elapsed = Math.max(0, now - checkInMs);

  return (
    <div
      title="Time since clock-in"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 9px', borderRadius: 7,
        background: 'rgba(46,125,79,0.22)',
        border: '1px solid rgba(46,125,79,0.40)',
        fontFamily: "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace",
        fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
        color: '#81C784', whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        style={{
          width: 6, height: 6, borderRadius: '50%', background: '#66BB6A',
          flexShrink: 0, animation: 'pos-live-pulse 1.8s ease-in-out infinite',
        }}
      />
      ⏱ {formatElapsed(elapsed)}
    </div>
  );
}

export default memo(WorkTimer);
