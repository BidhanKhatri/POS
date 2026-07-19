import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import OfflineScreen from './components/OfflineScreen';
import { SocketProvider } from './context/SocketContext';
import { ShiftGateProvider } from './context/ShiftGateContext';
import { useLoading } from './context/LoadingContext';
import useAuthStore from './store/useAuthStore';

// Route-level code splitting — every page/layout is its own lazy chunk
// instead of one ~2.4MB bundle. `SplashScreen` is a full-screen overlay
// (mounted eagerly above, controlled via LoadingContext) that already
// covers the entire cold-start loading window, so a Suspense fallback of
// `null` is safe here: there is nothing else to mask. This matters most on
// a first-time PWA launch (no service worker cache yet) — the JS needed to
// paint the very first screen (usually just the login screen or terminal)
// is now a small fraction of the previous single bundle.
const LoginScreen               = lazy(() => import('./AuthPages/LoginScreen'));
const SignupPage                = lazy(() => import('./AuthPages/SignupPage'));
const VerifiedPage              = lazy(() => import('./AuthPages/VerifiedPage'));
const BiometricOnboardingPage   = lazy(() => import('./AuthPages/BiometricOnboardingPage'));
const POSLockScreen             = lazy(() => import('./AuthPages/POSLockScreen'));

const EmployeeLayout            = lazy(() => import('./layouts/EmployeeLayout'));
const TerminalPage              = lazy(() => import('./EmployeePages/TerminalPage'));
const TenderPage                = lazy(() => import('./EmployeePages/TenderPage'));
const PriceVariancePage         = lazy(() => import('./EmployeePages/PriceVariancePage'));
const ShiftPage                 = lazy(() => import('./EmployeePages/ShiftPage'));
const DashboardPage             = lazy(() => import('./EmployeePages/DashboardPage'));
const InventoryPage             = lazy(() => import('./EmployeePages/InventoryPage'));
const OverridesPage             = lazy(() => import('./EmployeePages/OverridesPage'));
const SettingsPage              = lazy(() => import('./EmployeePages/SettingsPage'));
const ProfilePage               = lazy(() => import('./EmployeePages/ProfilePage'));
const TransactionsPage          = lazy(() => import('./EmployeePages/TransactionsPage'));
const TransactionDetailPage     = lazy(() => import('./EmployeePages/TransactionDetailPage'));
// const BarcodeScannerPage      = lazy(() => import('./EmployeePages/BarcodeScannerPage')); // disabled for now — re-enable when barcode feature returns

const ManagerLayout                 = lazy(() => import('./layouts/ManagerLayout'));
const ManagerShiftPage              = lazy(() => import('./ManagerPages/ManagerShiftPage'));
const ManagerDashboardPage          = lazy(() => import('./ManagerPages/ManagerDashboardPage'));
const ManagerInventoryPage          = lazy(() => import('./ManagerPages/ManagerInventoryPage'));
const ManagerOverridePage           = lazy(() => import('./ManagerPages/ManagerOverridePage'));
const ManagerOverrideHistoryPage    = lazy(() => import('./ManagerPages/ManagerOverrideHistoryPage'));
const ManagerOverallReportPage      = lazy(() => import('./ManagerPages/ManagerOverallReportPage'));
const ManagerIndividualReportPage   = lazy(() => import('./ManagerPages/ManagerIndividualReportPage'));
const ManagerGroupReportPage        = lazy(() => import('./ManagerPages/ManagerGroupReportPage'));
const ManagerTransactionPage        = lazy(() => import('./ManagerPages/ManagerTransactionPage'));
const ManagerTransactionDetailPage  = lazy(() => import('./ManagerPages/ManagerTransactionDetailPage'));
// const ManagerBarcodePage      = lazy(() => import('./ManagerPages/ManagerBarcodePage')); // disabled for now — re-enable when barcode feature returns
const ManagerStaffingPage       = lazy(() => import('./ManagerPages/ManagerStaffingPage'));
const ManagerEmployeePage       = lazy(() => import('./ManagerPages/ManagerEmployeePage'));
const ManagerSettingsPage       = lazy(() => import('./ManagerPages/ManagerSettingsPage'));
const ManagerGroupsPage         = lazy(() => import('./ManagerPages/ManagerGroupsPage'));

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
        <Route path="price-variance"  element={<PriceVariancePage />} />
        <Route path="shift"     element={<ShiftPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="overrides" element={<OverridesPage />} />
        <Route path="settings"      element={<SettingsPage />} />
        <Route path="profile"       element={<ProfilePage />} />
        <Route path="transactions"      element={<TransactionsPage />} />
        <Route path="transactions/:id"  element={<TransactionDetailPage />} />
        {/* <Route path="barcode"           element={<BarcodeScannerPage />} /> disabled for now — re-enable when barcode feature returns */}
      </Route>

      {/* Manager routes */}
      <Route path="/manager" element={<ManagerLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="reports"            element={<Navigate to="reports/overall" replace />} />
        <Route path="reports/overall"    element={<ManagerOverallReportPage />} />
        <Route path="reports/individual" element={<ManagerIndividualReportPage />} />
        <Route path="reports/group"      element={<ManagerGroupReportPage />} />
        <Route path="price-variance" element={<PriceVariancePage />} />
        <Route path="shift"          element={<ManagerShiftPage />} />
        <Route path="overrides" element={<ManagerOverridePage />} />
        <Route path="overrides/history" element={<ManagerOverrideHistoryPage />} />
        <Route path="inventory" element={<ManagerInventoryPage />} />
        <Route path="transactions"      element={<ManagerTransactionPage />} />
        <Route path="transactions/:id"  element={<ManagerTransactionDetailPage />} />
        {/* <Route path="barcodes"          element={<ManagerBarcodePage />} /> disabled for now — re-enable when barcode feature returns */}
        <Route path="scheduling"        element={<ManagerStaffingPage />} />
        <Route path="groups"            element={<ManagerGroupsPage />} />
        <Route path="employee"           element={<ManagerEmployeePage />} />
        <Route path="settings"          element={<ManagerSettingsPage />} />
      </Route>

      <Route path="/login"              element={<Navigate to={home} replace />} />
      <Route path="/signup"             element={<Navigate to={home} replace />} />
      <Route path="/signup/verified"    element={<VerifiedPage />} />
      <Route path="/signup/biometric"   element={<BiometricOnboardingPage />} />
      <Route path="*"                   element={<Navigate to={home} replace />} />
    </Routes>
  );
}

function GuestRoutes() {
  return (
    <Routes>
      <Route path="/"              element={<LoginScreen />} />
      <Route path="/login"              element={<LoginScreen />} />
      <Route path="/signup"             element={<SignupPage />} />
      <Route path="/signup/verified"    element={<VerifiedPage />} />
      <Route path="/signup/biometric"   element={<BiometricOnboardingPage />} />
      <Route path="*"                   element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function AuthGate() {
  const localUser        = useAuthStore((s) => s.user);
  const refreshToken     = useAuthStore((s) => s.refreshToken);
  const isLocked         = useAuthStore((s) => s.isLocked);
  const lastLockDate     = useAuthStore((s) => s.lastLockDate);
  const isSessionExpired = useAuthStore((s) => s.isSessionExpired);
  const logout           = useAuthStore((s) => s.logout);
  const lock             = useAuthStore((s) => s.lock);
  const { stopLoading }  = useLoading();

  // Prevent any flash of app content on first render
  const [bootDone, setBootDone] = useState(false);

  const hasTrustedSession = !!refreshToken;
  const sessionExpired    = localUser && isSessionExpired();

  useEffect(() => {
    if (sessionExpired) {
      logout();
    } else if (hasTrustedSession && !isLocked) {
      // Re-show the lock screen on app start / refresh only once per day —
      // not on every single refresh. Idle-triggered locking (15 min) is
      // handled separately and continuously by SessionMonitor.
      const today = new Date().toDateString();
      if (lastLockDate !== today) {
        lock();
      }
    }
    // Guest path has no async data — dismiss splash immediately
    if (!localUser && !hasTrustedSession) stopLoading();
    setBootDone(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render anything until the boot check is done (prevents flash)
  if (!bootDone) return null;

  if (sessionExpired) return <GuestRoutes />;

  // Authenticated + locked (idle lock or returning visit) → lock screen overlay
  if (localUser && isLocked) {
    return (
      <>
        <LocalAuthRoutes role={localUser.role} />
        <POSLockScreen />
      </>
    );
  }

  // Trusted session but no active user (returning visit before refresh)
  // or after lock() was called but user object is still in store
  if (hasTrustedSession && isLocked) return <POSLockScreen />;

  // Normal authenticated session
  if (localUser) return <LocalAuthRoutes role={localUser.role} />;

  // No session at all → login
  return <GuestRoutes />;
}

function App() {
  return (
    <SocketProvider>
      <ShiftGateProvider>
        <SplashScreen />
        <OfflineScreen />
        <BrowserRouter>
          <Suspense fallback={null}>
            <AuthGate />
          </Suspense>
        </BrowserRouter>
      </ShiftGateProvider>
    </SocketProvider>
  );
}

export default App;
