import React from 'react';
import { useMediaQuery } from '@mui/material';
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
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const biometricCard = (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FingerprintOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Biometric Login</p>
          <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>Fingerprint &amp; Face ID authentication</p>
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <BiometricSetup />
      </div>
    </div>
  );

  const preferencesCard = (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SettingsOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Display Preferences</p>
          <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>Notification and display options</p>
        </div>
      </div>
      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.textSec, margin: 0, maxWidth: 260, lineHeight: '20px' }}>
          Notification and display preferences will be available here soon.
        </p>
      </div>
    </div>
  );

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (!isDesktop) return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingsOutlinedIcon sx={{ fontSize: 20, color: C.primary }} />
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>Settings</h1>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
          Manage your account preferences and security settings.
        </p>
      </div>

      {/* mobile biometric card (original layout) */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12 }}>
        <div style={{ padding: '14px 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FingerprintOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Biometric Login</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>Fingerprint &amp; Face ID authentication</p>
            </div>
          </div>
          <BiometricSetup />
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT, background: C.bg, minHeight: '100dvh' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SettingsOutlinedIcon sx={{ fontSize: 19, color: '#D4A373' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Settings</h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec }}>
          Manage your account preferences and security settings.
        </p>
      </div>

      {/* Two-column settings grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start', maxWidth: 900 }}>
        {biometricCard}
        {preferencesCard}
      </div>
    </div>
  );
}
