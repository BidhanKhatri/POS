import React, { useEffect, useState } from 'react';
import PinDialog from './PinDialog';
import { API_URL as API } from '../config/api';

const C = {
  bg: '#F5F3F1', border: '#DDD2CC', textDim: '#A09490', textPri: '#2B1D1A',
};

/**
 * Manager PIN-gated "Force Checkout" action for a shift flagged as a missed
 * checkout (still OPEN past its scheduled end). Shared between the Manager
 * Dashboard's Missed Checkouts widget and the Scheduling page's Active
 * Shifts / Missed Checkouts section.
 *
 * `shift` shape: { _id, employee: { name, ... }, scheduledEnd, ... } — pass
 * `null` to keep the dialog closed.
 */
export default function ForceCheckoutDialog({ shift, token, onClose, onDone }) {
  const [checkoutTime, setCheckoutTime] = useState('');
  const [error, setError]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    if (shift) {
      setError('');
      // datetime-local input needs "YYYY-MM-DDTHH:mm" in local time
      const d = new Date(shift.scheduledEnd);
      const pad = (n) => String(n).padStart(2, '0');
      setCheckoutTime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, [shift]);

  const handleConfirm = async (pin) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/shifts/${shift._id}/force-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pin,
          checkoutTime: checkoutTime ? new Date(checkoutTime).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to force checkout');
      onDone();
    } catch (e) {
      setError(e.message || 'Failed to force checkout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PinDialog
      open={!!shift}
      title="Force Checkout"
      subtitle="Manager PIN Verification"
      danger
      confirmLabel="Force Checkout"
      maxWidth={860}
      error={error}
      submitting={submitting}
      onClose={onClose}
      onConfirm={handleConfirm}
      contextContent={shift && (
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Shift Details
          </p>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
            <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{shift.employee?.name ?? 'Unknown'}</p>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Checkout Time
            </label>
            <input
              type="datetime-local"
              value={checkoutTime}
              onChange={(e) => setCheckoutTime(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box' }}
            />
          </div>
        </div>
      )}
    />
  );
}
