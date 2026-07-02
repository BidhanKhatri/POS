import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import { SocketProvider } from './context/SocketContext';
import { useLoading } from './context/LoadingContext';
import LoginScreen from './AuthPages/LoginScreen';
import SignupPage from './AuthPages/SignupPage';
import VerifiedPage from './AuthPages/VerifiedPage';
import BiometricOnboardingPage from './AuthPages/BiometricOnboardingPage';
import EmployeeLayout from './layouts/EmployeeLayout';
import TerminalPage from './EmployeePages/TerminalPage';
import TenderPage from './EmployeePages/TenderPage';
import RefundFlowPage from './EmployeePages/RefundFlowPage';
import DiscountPage from './EmployeePages/DiscountPage';
import PriceVariancePage from './EmployeePages/PriceVariancePage';
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
import ManagerOverallReportPage    from './ManagerPages/ManagerOverallReportPage';
import ManagerIndividualReportPage from './ManagerPages/ManagerIndividualReportPage';
import ManagerGroupReportPage      from './ManagerPages/ManagerGroupReportPage';
import ManagerTransactionPage       from './ManagerPages/ManagerTransactionPage';
import ManagerTransactionDetailPage from './ManagerPages/ManagerTransactionDetailPage';
import ManagerCustomersPage         from './ManagerPages/ManagerCustomersPage';
import ManagerCustomerDetailPage    from './ManagerPages/ManagerCustomerDetailPage';
import TransactionsPage        from './EmployeePages/TransactionsPage';
import TransactionDetailPage   from './EmployeePages/TransactionDetailPage';
import CustomerSearchPage      from './EmployeePages/CustomerSearchPage';
import CustomerProfilePage     from './EmployeePages/CustomerProfilePage';
import BarcodeScannerPage      from './EmployeePages/BarcodeScannerPage';
import ManagerBarcodePage      from './ManagerPages/ManagerBarcodePage';
import ManagerStaffingPage     from './ManagerPages/ManagerStaffingPage';
import ManagerEmployeePage     from './ManagerPages/ManagerEmployeePage';
import ManagerSettingsPage     from './ManagerPages/ManagerSettingsPage';
import ManagerGroupsPage       from './ManagerPages/ManagerGroupsPage';
import useAuthStore from './store/useAuthStore';
import POSLockScreen from './AuthPages/POSLockScreen';

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
        <Route path="discount"        element={<DiscountPage />} />
        <Route path="price-variance"  element={<PriceVariancePage />} />
        <Route path="refund"          element={<RefundFlowPage />} />
        <Route path="shift"     element={<ShiftPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="overrides" element={<OverridesPage />} />
        <Route path="settings"      element={<SettingsPage />} />
        <Route path="profile"       element={<ProfilePage />} />
        <Route path="transactions"      element={<TransactionsPage />} />
        <Route path="transactions/:id"  element={<TransactionDetailPage />} />
        <Route path="customers"         element={<CustomerSearchPage />} />
        <Route path="customers/:id"     element={<CustomerProfilePage />} />
        <Route path="barcode"           element={<BarcodeScannerPage />} />
      </Route>

      {/* Manager routes */}
      <Route path="/manager" element={<ManagerLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="reports"            element={<Navigate to="reports/overall" replace />} />
        <Route path="reports/overall"    element={<ManagerOverallReportPage />} />
        <Route path="reports/individual" element={<ManagerIndividualReportPage />} />
        <Route path="reports/group"      element={<ManagerGroupReportPage />} />
        <Route path="discount"       element={<DiscountPage />} />
        <Route path="price-variance" element={<PriceVariancePage />} />
        <Route path="shift"          element={<ManagerShiftPage />} />
        <Route path="overrides" element={<ManagerOverridePage />} />
        <Route path="inventory" element={<ManagerInventoryPage />} />
        <Route path="transactions"      element={<ManagerTransactionPage />} />
        <Route path="transactions/:id"  element={<ManagerTransactionDetailPage />} />
        <Route path="customers"         element={<ManagerCustomersPage />} />
        <Route path="customers/:id"     element={<ManagerCustomerDetailPage />} />
        <Route path="barcodes"          element={<ManagerBarcodePage />} />
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
      // Enforce lock screen on every app start / page refresh when a trusted
      // device session exists — user must PIN or biometric to proceed.
      lock();
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
      <SplashScreen />
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
