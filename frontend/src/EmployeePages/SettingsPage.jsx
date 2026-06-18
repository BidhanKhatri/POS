import React from 'react';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import BiometricSetup from '../components/BiometricSetup/BiometricSetup';

export default function SettingsPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          Employee
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', margin: 0, letterSpacing: '-0.2px' }}>
          Settings
        </h1>
      </div>

      {/* Biometric / Passkey section */}
      <div style={{
        background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 12, padding: '20px 18px', marginBottom: 16,
      }}>
        <BiometricSetup />
      </div>

      {/* Placeholder for future preferences */}
      <div style={{
        background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 12,
        padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: '#F5F0EC',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SettingsOutlinedIcon sx={{ fontSize: 24, color: '#3E2723' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#2B1D1A', margin: 0 }}>Display Preferences</p>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#6B5B57', margin: 0, maxWidth: 260, lineHeight: '18px' }}>
          Notification and display preferences will be available here soon.
        </p>
      </div>
    </div>
  );
}
