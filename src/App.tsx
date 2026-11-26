import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import JurusanDetailPage from './pages/JurusanDetailPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/app/DashboardPage';
import EmployeeAttendancePage from './pages/app/EmployeeAttendancePage';
import EmployeeRecapPage from './pages/app/EmployeeRecapPage';
import StudentAttendancePage from './pages/app/StudentAttendancePage';
import StudentRecapPage from './pages/app/StudentRecapPage';
import StudentsDataPage from './pages/app/StudentsDataPage';
import UserManagementPage from './pages/app/UserManagementPage';
import type { UserRole } from './types';

function RoleGuard({ allowed, children }: { allowed: UserRole[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/jurusan/:kode" element={<JurusanDetailPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<EmployeeAttendancePage />} />
            <Route
              path="absensi-siswa"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentAttendancePage />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/karyawan"
              element={
                <RoleGuard allowed={['admin']}>
                  <EmployeeRecapPage />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/siswa"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentRecapPage />
                </RoleGuard>
              }
            />
            <Route
              path="data-siswa"
              element={
                <RoleGuard allowed={['admin']}>
                  <StudentsDataPage />
                </RoleGuard>
              }
            />
            <Route
              path="user-management"
              element={
                <RoleGuard allowed={['admin']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
