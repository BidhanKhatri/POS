import React from 'react';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import FingerprintOutlinedIcon from '@mui/icons-material/FingerprintOutlined';
import BiometricSetup from '../components/BiometricSetup/BiometricSetup';

const C = {
  primary:  '#3E2723',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  border:   '#DDD2CC',
  surface:  '#ffffff',
  bg:       '#F5F3F1',
  elevated: '#EFE7E2',
};

const FONT = "'Plus Jakarta Sans', sans-serif";

export default function SettingsPage() {
  return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingsOutlinedIcon sx={{ fontSize: 20, color: C.primary }} />
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
            Settings
          </h1>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
          Manage your account preferences and security settings.
        </p>
      </div>

      {/* ── Biometric Login card ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12 }}>
        <div style={{ padding: '14px 16px 4px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            paddingBottom: 12, borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FingerprintOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Biometric Login</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>
                Fingerprint &amp; Face ID authentication
              </p>
            </div>
          </div>
          <BiometricSetup />
        </div>
      </div>

      {/* ── Display Preferences placeholder ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <div style={{
          padding: '32px 24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10, textAlign: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: C.elevated,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SettingsOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: 0 }}>Display Preferences</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: 0, maxWidth: 260, lineHeight: '18px' }}>
            Notification and display preferences will be available here soon.
          </p>
        </div>
      </div>

    </div>
  );
}
