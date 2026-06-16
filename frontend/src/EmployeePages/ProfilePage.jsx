import React from 'react';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import useAuthStore from '../store/useAuthStore';

const ROW = [
  { key: 'employeeCode', label: 'Employee Code', icon: BadgeOutlinedIcon },
  { key: 'email',        label: 'Email',         icon: EmailOutlinedIcon },
  { key: 'role',         label: 'Role',           icon: WorkOutlineOutlinedIcon },
];

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          Employee
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', margin: 0, letterSpacing: '-0.2px' }}>
          Profile
        </h1>
      </div>

      <div style={{
        background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 12,
        padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: '#F5F0EC',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#3E2723',
        }}>
          {(user?.name || 'E').charAt(0).toUpperCase()}
        </div>
        <p style={{ fontSize: 17, fontWeight: 800, color: '#2B1D1A', margin: 0 }}>{user?.name || 'Employee'}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#A09490', margin: 0 }}>{user?.employeeCode}</p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 12, overflow: 'hidden' }}>
        {ROW.map(({ key, label, icon: Icon }, i) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            borderBottom: i === ROW.length - 1 ? 'none' : '1px solid #EFE7E2',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#F5F0EC', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon sx={{ fontSize: 18, color: '#3E2723' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2B1D1A' }}>{user?.[key] || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
