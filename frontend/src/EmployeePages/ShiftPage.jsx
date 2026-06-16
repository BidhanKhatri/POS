import React, { useState, useEffect } from 'react';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import useAuthStore from '../store/useAuthStore';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export default function ShiftPage() {
  const token = useAuthStore((s) => s.token);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [shift, setShift]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [cashInput, setCashInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const loadShift = () => {
    setLoading(true);
    fetch(`${API}/api/shifts/active`, { headers })
      .then((r) => r.json())
      .then((data) => setShift(data && data._id ? data : null))
      .catch(() => setError('Failed to load shift status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadShift(); }, []);

  const handleClockIn = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/shifts/clock-in`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ openingCash: Number(cashInput) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock in');
      setShift(data);
      setCashInput('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/shifts/clock-out`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ closingCash: Number(cashInput) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock out');
      setShift(null);
      setCashInput('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isOpen = !!shift;

  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          Employee
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', margin: 0, letterSpacing: '-0.2px' }}>
          Shift
        </h1>
      </div>

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #DDD2CC',
          borderRadius: 12,
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: isOpen ? 'rgba(46,125,79,0.10)' : '#F5F0EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AccessTimeOutlinedIcon sx={{ fontSize: 28, color: isOpen ? '#2E7D4F' : '#3E2723' }} />
        </div>

        {loading ? (
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6B5B57', margin: 0 }}>Loading shift status…</p>
        ) : (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#2B1D1A', margin: 0 }}>
              {isOpen ? 'Shift Open' : 'No Active Shift'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#6B5B57', margin: 0, maxWidth: 280, lineHeight: '20px' }}>
              {isOpen
                ? `Clocked in at ${new Date(shift.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Enter your closing cash count to end the shift.`
                : 'Enter your opening cash count and clock in to start processing sales.'}
            </p>

            <input
              type="number"
              inputMode="decimal"
              placeholder={isOpen ? 'Closing cash amount' : 'Opening cash amount'}
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              style={{
                width: '100%', maxWidth: 240, padding: '10px 14px',
                borderRadius: 8, border: '1px solid #DDD2CC',
                fontSize: 14, color: '#2B1D1A', textAlign: 'center',
                outline: 'none', boxSizing: 'border-box',
              }}
            />

            {error && (
              <p style={{ fontSize: 12, fontWeight: 600, color: '#B71C1C', margin: 0 }}>{error}</p>
            )}

            <button
              onClick={isOpen ? handleClockOut : handleClockIn}
              disabled={submitting}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', maxWidth: 240, padding: '12px 20px',
                borderRadius: 10, border: 'none',
                background: isOpen ? '#B71C1C' : '#3E2723',
                color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {isOpen ? <LogoutOutlinedIcon sx={{ fontSize: 18 }} /> : <LoginOutlinedIcon sx={{ fontSize: 18 }} />}
              {submitting ? 'Please wait…' : isOpen ? 'Clock Out' : 'Clock In'}
            </button>
          </>
        )}
      </div>

    </div>
  );
}
