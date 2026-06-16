import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import useAuthStore from './store/authStore';
import apiClient from './services/axiosInstance';

// ── Public Pages ──────────────────────────────────────────────────────────────
import LandingPage         from './pages/landing/LandingPage';
import LoginPage           from './pages/auth/LoginPage';
import RegisterPage        from './pages/auth/RegisterPage';
import PendingApprovalPage from './pages/auth/PendingApprovalPage';

// ── Clinic Showcase ───────────────────────────────────────────────────────────
import PublicLayout  from './components/layout/PublicLayout';
import HomePage      from './pages/public/HomePage';
import ServicesPage  from './pages/public/ServicesPage';
import TeamPage      from './pages/public/TeamPage';
import LocationsPage from './pages/public/LocationsPage';
import ReviewsPage   from './pages/public/ReviewsPage';
import ContactPage   from './pages/public/ContactPage';

// ── Clinic Auth ───────────────────────────────────────────────────────────────
import ClinicLoginPage    from './pages/auth/ClinicLoginPage';
//import ClinicRegisterPage from './pages/auth/ClinicRegisterPage';

// ── Platform Admin ────────────────────────────────────────────────────────────
import PlatformLayout        from './components/layout/PlatformLayout';
import PlatformDashboard     from './pages/platform/Dashboard';
import PlatformClinics       from './pages/platform/Clinics';
import PlatformApprovals     from './pages/platform/Approvals';
import PlatformSubscriptions from './pages/platform/Subscriptions';
import PlatformUsers         from './pages/platform/Users';
import PlatformSettings      from './pages/platform/Settings';
import PlatformAuditLog      from './pages/platform/AuditLog';

// ── App Layout ────────────────────────────────────────────────────────────────
import AppLayout from './components/layout/AppLayout';

// ── Clinic Admin ──────────────────────────────────────────────────────────────
import AdminDashboard from './pages/admin/Dashboard';
import AdminBilling   from './pages/admin/Billing';
import AdminFinance   from './pages/admin/Finance';
import AdminInventory from './pages/admin/Inventory';
import AdminStaff     from './pages/admin/Staff';
import AdminBranches  from './pages/admin/Branches';
import AdminReports   from './pages/admin/Reports';
import AdminSettings  from './pages/admin/Settings';
import AdminAppointments from './pages/admin/Appointments';
import AdminAuditLog  from './pages/admin/AuditLog';
import AdminDentists  from './pages/admin/Dentists';
import AdminAuditLog  from './pages/admin/AuditLog';

// ── Branch Manager ────────────────────────────────────────────────────────────
import ManagerDashboard    from './pages/manager/Dashboard';
import ManagerPatients     from './pages/manager/Patients';
import ManagerAppointments from './pages/manager/Appointments';
import ManagerStaff        from './pages/manager/Staff';
import ManagerReport       from './pages/manager/Report';
import ManagerInventory    from './pages/manager/Inventory';
import ManagerWaitlist     from './pages/manager/Waitlist';
import ManagerSetting      from './pages/manager/Setting';

// ── Dentist ───────────────────────────────────────────────────────────────────
import DentistDashboard      from './pages/dentist/Dashboard';
import DentistMyAppointments from './pages/dentist/MyAppointments';
import DentistPatients       from './pages/dentist/Patients';
import DentistMedicalRecords from './pages/dentist/MedicalRecords';
import DentistSettings       from './pages/dentist/Settings';

// ── Accountant ────────────────────────────────────────────────────────────────
import AccountantDashboard from './pages/accountant/Dashboard';
import AccountantRevenue   from './pages/accountant/Revenue';
import AccountantExpenses  from './pages/accountant/Expenses';
import AccountantBilling   from './pages/accountant/Billing';
import AccountantReports   from './pages/accountant/Reports';
import AccountantSettings  from './pages/accountant/Settings';

// ── Receptionist ──────────────────────────────────────────────────────────────
import ReceptionistDashboard   from './pages/receptionist/Dashboard';
import ReceptionistPatient     from './pages/receptionist/Patient';
import ReceptionistAppointment from './pages/receptionist/Appointment';
import ReceptionistBilling     from './pages/receptionist/Billing';
import ReceptionistWaitlist    from './pages/receptionist/Waitlist';
import ReceptionistSettings    from './pages/receptionist/Settings';

// ── Patient Portal ────────────────────────────────────────────────────────────
import PatientDashboard      from './pages/patient/Dashboard';
import PatientAppointments   from './pages/patient/Appointments';
import PatientMedicalRecords from './pages/patient/MedicalRecords';
import PatientBilling from './pages/patient/Billing';
import PatientSettings       from './pages/patient/Settings';

// ── Lab Technician ────────────────────────────────────────────────────────────
import LabDashboard from './pages/lab-technician/Dashboard';
import LabOrders    from './pages/lab-technician/Orders';
import LabSettings  from './pages/lab-technician/Settings';


// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

// ── AuthGate ──────────────────────────────────────────────────────────────────
// Rehydrates the auth store from the httpOnly cookie on protected route entry.
// Shows a spinner until /auth/me resolves.
function AuthGate({ children }) {
  const setAuth    = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [checked, setChecked] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const { data } = await apiClient.get('/auth/me');
        if (data?.success && data?.data?.user) {
          const { user: userData, clinic, branch } = data.data;
          setAuth(userData, clinic, branch);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      } finally {
        setChecked(true);
      }
    })();
  }, [setAuth, setLoading]);

  if (!checked) return <Spinner />;
  return children;
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles = [] }) {
  const user         = useAuthStore((s) => s.user);
  const isLoggingOut = useAuthStore((s) => s.isLoggingOut);

  console.log('ProtectedRoute render:', { user: !!user, isLoggingOut, path: window.location.pathname });

  if (isLoggingOut) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const slug = user?.clinic?.slug;
    if (slug && user.role !== 'platform_admin') {
      return <Navigate to={`/clinic/${slug}/login`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ── ProtectedGroup ────────────────────────────────────────────────────────────
// Combines AuthGate (rehydration) + ProtectedRoute (authorization).
function ProtectedGroup({ children, allowedRoles = [] }) {
  return (
    <AuthGate>
      <ProtectedRoute allowedRoles={allowedRoles}>
        {children}
      </ProtectedRoute>
    </AuthGate>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/*
          ── PUBLIC ROUTES ──────────────────────────────────────────────────
          No auth required. Rendered immediately without any API call.
        */}
        <Route path="/"                        element={<LandingPage />} />
        <Route path="/login"                   element={<LoginPage />} />
        <Route path="/register"                element={<RegisterPage />} />
        <Route path="/clinic/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/clinic/:slug/login"      element={<ClinicLoginPage />} />
        {/* <Route path="/clinic/:slug/register"   element={<ClinicRegisterPage />} /> */}

        {/* Clinic public showcase */}
        <Route path="/clinic/:slug" element={<PublicLayout />}>
          <Route index              element={<HomePage />} />
          <Route path="services"    element={<ServicesPage />} />
          <Route path="team"        element={<TeamPage />} />
          <Route path="locations"   element={<LocationsPage />} />
          <Route path="reviews"     element={<ReviewsPage />} />
          <Route path="contact"     element={<ContactPage />} />
        </Route>

        {/*
          ── PROTECTED ROUTES ────────────────────────────────────────────────
          Each group calls /auth/me on entry, shows a spinner, then renders
          the layout only if the user has the required role.
        */}

        {/* Platform Admin */}
        <Route
          path="/platform"
          element={
            <ProtectedGroup allowedRoles={['platform_admin']}>
              <PlatformLayout />
            </ProtectedGroup>
          }
        >
          <Route index             element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"  element={<PlatformDashboard />} />
          <Route path="clinics"    element={<PlatformClinics />} />
          <Route path="approvals"  element={<PlatformApprovals />} />
          <Route path="subscriptions" element={<PlatformSubscriptions />} />
          <Route path="users"      element={<PlatformUsers />} />
          <Route path="audit-log"  element={<PlatformAuditLog />} />
          <Route path="settings"   element={<PlatformSettings />} />
        </Route>

        {/* Clinic Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedGroup allowedRoles={['clinic_admin']}>
              <AppLayout />
            </ProtectedGroup>
          }
        >
          <Route index             element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"  element={<AdminDashboard />} />
          <Route path="billing"    element={<AdminBilling />} />
          <Route path="finance"    element={<AdminFinance />} />
          <Route path="inventory"  element={<AdminInventory />} />
          <Route path="staff"      element={<AdminStaff />} />
          <Route path="dentists"   element={<AdminDentists />} />
          <Route path="branches"   element={<AdminBranches />} />
          <Route path="reports"    element={<AdminReports />} />
          <Route path="settings"   element={<AdminSettings />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="audit-log"  element={<AdminAuditLog />} />
          <Route path="audit-log"  element={<AdminAuditLog />} />
        </Route>

        {/* Branch Manager */}
        <Route
          path="/manager"
          element={
            <ProtectedGroup allowedRoles={['branch_manager']}>
              <AppLayout />
            </ProtectedGroup>
          }
        >
          <Route index             element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"  element={<ManagerDashboard />} />
          <Route path="patients"   element={<ManagerPatients />} />
          <Route path="appointments" element={<ManagerAppointments />} />
          <Route path="staff"      element={<ManagerStaff />} />
          <Route path="report"     element={<ManagerReport />} />
          <Route path="inventory"  element={<ManagerInventory />} />
          <Route path="waitlist"   element={<ManagerWaitlist />} />
          <Route path="setting"    element={<ManagerSetting />} />
        </Route>

        {/* Dentist */}
        <Route
          path="/dentist"
          element={
            <ProtectedGroup allowedRoles={['dentist']}>
              <AppLayout />
            </ProtectedGroup>
          }
        >
          <Route index               element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"    element={<DentistDashboard />} />
          <Route path="appointments" element={<DentistMyAppointments />} />
          <Route path="patients"     element={<DentistPatients />} />
          <Route path="medical-records" element={<DentistMedicalRecords />} />
          <Route path="settings"     element={<DentistSettings />} />
        </Route>

        {/* Accountant */}
        <Route
          path="/accountant"
          element={
            <ProtectedGroup allowedRoles={['accountant']}>
              <AppLayout />
            </ProtectedGroup>
          }
        >
          <Route index             element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"  element={<AccountantDashboard />} />
          <Route path="revenue"    element={<AccountantRevenue />} />
          <Route path="expenses"   element={<AccountantExpenses />} />
          <Route path="billing"    element={<AccountantBilling />} />
          <Route path="reports"    element={<AccountantReports />} />
          <Route path="settings"   element={<AccountantSettings />} />
        </Route>

        {/* Receptionist */}
        <Route
          path="/receptionist"
          element={
            <ProtectedGroup allowedRoles={['receptionist']}>
              <AppLayout />
            </ProtectedGroup>
          }
        >
          <Route index             element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"  element={<ReceptionistDashboard />} />
          <Route path="waitlist"   element={<ReceptionistWaitlist />} />
          <Route path="patients"   element={<ReceptionistPatient />} />
          <Route path="appointments" element={<ReceptionistAppointment />} />
          <Route path="billing"    element={<ReceptionistBilling />} />
          <Route path="settings"   element={<ReceptionistSettings />} />
        </Route>

        {/* Patient Portal */}
        <Route
          path="/patient"
          element={
            <ProtectedGroup allowedRoles={['patient']}>
              <AppLayout />
            </ProtectedGroup>
          }
        >
          <Route index               element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"    element={<PatientDashboard />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="billing"      element={<PatientBilling />} />
          <Route path="medical-records" element={<PatientMedicalRecords />} />
          <Route path="settings"     element={<PatientSettings />} />
        </Route>

        {/* Lab Technician */}
        <Route
          path="/lab"
          element={
            <ProtectedGroup allowedRoles={['lab_technician']}>
              <AppLayout />
            </ProtectedGroup>
          }
        >
          <Route index            element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<LabDashboard />} />
          <Route path="orders"    element={<LabOrders />} />
          <Route path="settings"  element={<LabSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}