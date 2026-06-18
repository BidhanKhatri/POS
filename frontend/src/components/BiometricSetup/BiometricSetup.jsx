import React, { useState, useEffect, useCallback } from 'react';
import FingerprintIcon        from '@mui/icons-material/Fingerprint';
import DevicesOutlinedIcon    from '@mui/icons-material/DevicesOutlined';
import DeleteOutlinedIcon     from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon       from '@mui/icons-material/EditOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CloseOutlinedIcon       from '@mui/icons-material/CloseOutlined';
import AddOutlinedIcon         from '@mui/icons-material/AddOutlined';
import { useWebAuthn } from '../../hooks/useWebAuthn';

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1', elevated: '#EFE7E2',
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.textDim,
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
};

function DeviceTypeLabel({ deviceType, backedUp }) {
  const isMulti = deviceType === 'multiDevice';
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
      background: isMulti ? 'rgba(46,125,79,0.10)' : 'rgba(178,106,0,0.10)',
      color: isMulti ? C.success : C.warning,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>
      {isMulti ? (backedUp ? 'Cloud Synced' : 'Multi-Device') : 'This Device Only'}
    </span>
  );
}

function CredentialCard({ cred, onRevoke, onRename, revoking }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cred.deviceName);
  const [saving, setSaving] = useState(false);

  const lastUsed = cred.lastUsedAt
    ? new Date(cred.lastUsedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  const added = new Date(cred.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === cred.deviceName) { setEditing(false); return; }
    setSaving(true);
    try { await onRename(cred._id, name.trim()); setEditing(false); }
    catch { /* parent shows error */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(62,39,35,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FingerprintIcon sx={{ fontSize: 22, color: C.primary }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false); }}
                style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.textPri, border: `1px solid ${C.primary}`, borderRadius: 6, padding: '4px 8px', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              />
              <button onClick={handleSaveName} disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: C.primary, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {saving ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                <CloseOutlinedIcon sx={{ fontSize: 16, color: C.textDim }} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cred.deviceName}
              </p>
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                <EditOutlinedIcon sx={{ fontSize: 13, color: C.textDim }} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <DeviceTypeLabel deviceType={cred.deviceType} backedUp={cred.backedUp} />
            <span style={{ fontSize: 10, color: C.textDim }}>Added {added}</span>
          </div>
        </div>
        <button
          onClick={() => onRevoke(cred._id)}
          disabled={revoking}
          title="Remove this passkey"
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            border: `1px solid rgba(183,28,28,0.25)`, background: 'rgba(183,28,28,0.06)',
            cursor: revoking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: revoking ? 0.5 : 1,
          }}
        >
          <DeleteOutlinedIcon sx={{ fontSize: 16, color: C.error }} />
        </button>
      </div>
      <div style={{ padding: '8px 16px 10px', background: C.bg, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 20 }}>
        <span style={{ fontSize: 11, color: C.textDim }}>Last used: <strong style={{ color: C.textSec }}>{lastUsed}</strong></span>
        {cred.transports?.includes('internal') && <span style={{ fontSize: 11, color: C.textDim }}>Built-in biometric</span>}
      </div>
    </div>
  );
}

/**
 * BiometricSetup — rendered inside any authenticated page/settings panel.
 * Shows currently registered passkeys and allows the user to add new ones or revoke existing ones.
 */
export default function BiometricSetup() {
  const { supported, registering, error, setError, registerBiometric, fetchCredentials, revokeCredential, renameCredential } = useWebAuthn();

  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deviceName, setDeviceName] = useState('');
  const [revoking, setRevoking] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setCredentials(await fetchCredentials()); }
    catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [fetchCredentials]);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    setError(null);
    setSuccessMsg('');
    try {
      await registerBiometric(deviceName || 'My Device');
      setSuccessMsg('Passkey registered! You can now sign in with biometrics.');
      setDeviceName('');
      await load();
    } catch {
      // error already set in hook
    }
  };

  const handleRevoke = async (id) => {
    setRevoking(id);
    try { await revokeCredential(id); await load(); }
    catch (e) { setError(e.message); }
    finally { setRevoking(null); }
  };

  const handleRename = async (id, name) => {
    await renameCredential(id, name);
    await load();
  };

  if (!supported) {
    return (
      <div style={{ background: 'rgba(178,106,0,0.08)', border: `1px solid rgba(178,106,0,0.25)`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <WarningAmberOutlinedIcon sx={{ fontSize: 20, color: C.warning, flexShrink: 0, mt: '1px' }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Biometric login not supported</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.textSec }}>Your browser or device does not support passkeys. Try Chrome, Safari, or Edge on a device with a biometric sensor.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FingerprintIcon sx={{ fontSize: 18, color: C.accent }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>Biometric Login (Passkeys)</p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textDim }}>Sign in using Face ID, Touch ID, fingerprint, or Windows Hello</p>
        </div>
      </div>

      {/* Feedback banners */}
      {error && (
        <div style={{ background: 'rgba(183,28,28,0.08)', border: `1px solid rgba(183,28,28,0.22)`, borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: C.error, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error, flex: 1 }}>{error}</p>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><CloseOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} /></button>
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(46,125,79,0.08)', border: `1px solid rgba(46,125,79,0.22)`, borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: C.success, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.success }}>{successMsg}</p>
        </div>
      )}

      {/* Registered devices */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Registered Passkeys <span style={{ color: C.textDim, fontWeight: 500 }}>({credentials.length})</span>
        </p>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: C.textDim, fontSize: 12 }}>Loading…</div>
        ) : credentials.length === 0 ? (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
            <DevicesOutlinedIcon sx={{ fontSize: 28, color: C.textDim, display: 'block', margin: '0 auto 6px' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textSec }}>No passkeys registered yet</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: C.textDim }}>Add one below to enable biometric login.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {credentials.map(cred => (
              <CredentialCard
                key={cred._id}
                cred={cred}
                onRevoke={handleRevoke}
                onRename={handleRename}
                revoking={revoking === cred._id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add new passkey */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: C.textPri }}>Register This Device</p>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Device Name (optional)</label>
          <input
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            placeholder='e.g. "iPhone 15", "Work Laptop"'
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={registering}
          style={{
            width: '100%', padding: '11px', borderRadius: 9, border: 'none',
            background: registering ? C.elevated : C.primary,
            color: registering ? C.textDim : '#fff',
            fontSize: 13, fontWeight: 700, cursor: registering ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'background 0.15s',
          }}
        >
          {registering ? (
            <>Waiting for biometric…</>
          ) : (
            <><AddOutlinedIcon sx={{ fontSize: 16 }} /> Add Passkey</>
          )}
        </button>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: C.textDim, lineHeight: '16px' }}>
          Your biometric data never leaves your device. Only a cryptographic key is stored on our servers.
        </p>
      </div>
    </div>
  );
}
