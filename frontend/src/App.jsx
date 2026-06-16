import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { UserButton, useAuth, useUser } from '@clerk/react';
import LoginScreen from './AuthPages/LoginScreen';
import SignupPage from './AuthPages/SignupPage';
import EmployeeLayout from './layouts/EmployeeLayout';
import TerminalPage from './EmployeePages/TerminalPage';
import TenderPage from './EmployeePages/TenderPage';
import RefundFlowPage from './EmployeePages/RefundFlowPage';
import ShiftPage from './EmployeePages/ShiftPage';
import DashboardPage from './EmployeePages/DashboardPage';
import InventoryPage from './EmployeePages/InventoryPage';
import OverridesPage from './EmployeePages/OverridesPage';
import SettingsPage from './EmployeePages/SettingsPage';
import ProfilePage from './EmployeePages/ProfilePage';
import ManagerLayout from './layouts/ManagerLayout';
import ManagerShiftPage from './ManagerPages/ManagerShiftPage';
import ManagerDashboardPage from './ManagerPages/ManagerDashboardPage';
import ManagerInventoryPage from './ManagerPages/ManagerInventoryPage';
import ManagerOverridePage from './ManagerPages/ManagerOverridePage';
import ManagerReportPage   from './ManagerPages/ManagerReportPage';
import useAuthStore from './store/useAuthStore';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

function AuthPage() {
  return <LoginScreen />;
}

function ClerkUserSync() {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const [status, setStatus] = React.useState('idle');
  const [syncError, setSyncError] = React.useState('');

  React.useEffect(() => {
    let ignore = false;

    async function syncUser() {
      if (!isSignedIn) return;

      try {
        setStatus('syncing');
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/api/auth/clerk/sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Unable to sync Clerk user');
        }

        if (!ignore) {
          setStatus('synced');
          navigate('/employee-dashboard', { replace: true });
        }
      } catch (error) {
        if (!ignore) {
          setSyncError(error.message);
          setStatus('error');
        }
      }
    }

    syncUser();

    return () => {
      ignore = true;
    };
  }, [getToken, isSignedIn, navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background text-on-surface flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-divider-tone bg-white p-6">
          <h1 className="text-xl font-bold text-primary-container">Account Sync Failed</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            {syncError || 'Your Clerk login worked, but the POS user record could not be created.'}
          </p>
          <p className="mt-3 text-xs font-semibold text-on-surface-variant">
            Confirm the backend is running and restart it after updating Clerk keys.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center">
      <div className="rounded-lg border border-divider-tone bg-white px-6 py-5 text-sm font-semibold text-on-surface-variant">
        Syncing Employee Account…
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Employee';

  const metrics = [
    { label: 'Open Shift', value: 'Ready', icon: <AccessTimeIcon aria-hidden="true" /> },
    { label: 'Today Sales', value: '$0.00', icon: <ReceiptLongOutlinedIcon aria-hidden="true" /> },
    { label: 'Reports', value: 'Live', icon: <BarChartOutlinedIcon aria-hidden="true" /> },
  ];

  return (
    <main className="min-h-screen bg-background text-on-surface">
      <header className="border-b border-divider-tone bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-accent text-primary-container">
              <PointOfSaleIcon aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-primary-container">Employee Dashboard</p>
              <p className="truncate text-xs font-semibold text-on-surface-variant">{displayName}</p>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-lg border border-divider-tone bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-on-surface-variant">{metric.label}</p>
              <span className="text-primary-container">{metric.icon}</span>
            </div>
            <p className="mt-4 text-2xl font-extrabold text-on-surface">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="rounded-lg border border-divider-tone bg-white p-6">
          <h1 className="text-2xl font-extrabold text-primary-container">POS Workspace</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-on-surface-variant">
            Clerk login is active and this user is synced to the POS database. Shift controls and sales workflows can attach to this dashboard next.
          </p>
        </div>
      </section>
    </main>
  );
}

function SignedOutRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function SignedInRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ClerkUserSync />} />
      <Route path="/login" element={<ClerkUserSync />} />
      <Route path="/signup" element={<ClerkUserSync />} />
      <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
      <Route path="*" element={<Navigate to="/employee-dashboard" replace />} />
    </Routes>
  );
}

// Routes for local-auth (email + PIN) users
function LocalAuthRoutes({ role }) {
  const isManager = role === 'Manager' || role === 'Admin';
  const home = isManager ? '/manager/dashboard' : '/employee/terminal';

  return (
    <Routes>
      {/* Employee routes */}
      <Route path="/employee" element={<EmployeeLayout />}>
        <Route index element={<Navigate to="terminal" replace />} />
        <Route path="terminal"  element={<TerminalPage />} />
        <Route path="tender"    element={<TenderPage />} />
        <Route path="refund"    element={<RefundFlowPage />} />
        <Route path="shift"     element={<ShiftPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="overrides" element={<OverridesPage />} />
        <Route path="settings"  element={<SettingsPage />} />
        <Route path="profile"   element={<ProfilePage />} />
      </Route>

      {/* Manager routes */}
      <Route path="/manager" element={<ManagerLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="reports"   element={<ManagerReportPage />} />
        <Route path="shift"     element={<ManagerShiftPage />} />
        <Route path="overrides" element={<ManagerOverridePage />} />
        <Route path="inventory" element={<ManagerInventoryPage />} />
      </Route>

      <Route path="/login"  element={<Navigate to={home} replace />} />
      <Route path="/signup" element={<Navigate to={home} replace />} />
      <Route path="*"       element={<Navigate to={home} replace />} />
    </Routes>
  );
}

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const localUser = useAuthStore((s) => s.user);

  // Local-auth session takes priority over Clerk
  if (localUser) {
    return <LocalAuthRoutes role={localUser.role} />;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex items-center justify-center">
        <div className="rounded-lg border border-divider-tone bg-white px-6 py-5 text-sm font-semibold text-on-surface-variant">
          Loading Secure Session…
        </div>
      </div>
    );
  }

  return isSignedIn ? <SignedInRoutes /> : <SignedOutRoutes />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}

export default App;
