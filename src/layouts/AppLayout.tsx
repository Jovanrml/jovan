import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../data/schoolData';

const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/absensi-karyawan': 'Absensi Karyawan',
  '/app/absensi-siswa': 'Absensi Siswa',
  '/app/rekap/karyawan': 'Rekap Absensi Karyawan',
  '/app/rekap/siswa': 'Rekap Absensi Siswa',
  '/app/data-siswa': 'Data Siswa',
  '/app/user-management': 'User Management',
};

export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm font-medium text-zinc-600">Memuat portal absensi...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'admin';
  const isGuru = user.role === 'guru';
  const canStudentAttendance = isAdmin || isGuru;
  const hasRekapMenu = isAdmin || isGuru;

  const currentTitle = PAGE_TITLES[location.pathname] || 'Portal Aplikasi';

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
      active
        ? 'bg-red-700 text-white'
        : 'text-zinc-700 hover:bg-red-50 hover:text-red-800'
    }`;

  const subLinkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-xs font-semibold transition-colors whitespace-nowrap ${
      active
        ? 'bg-red-50 text-red-800 border border-red-200'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
    }`;

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        {/* Brand Block */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-700 text-xs font-extrabold text-white">
              PU
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-zinc-900">
                SMK Prima Unggul
              </p>
              <p className="truncate text-[11px] font-medium text-red-700">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Left Side Navigation */}
        <nav className="space-y-1 p-3" aria-label="Menu Utama Aplikasi">
          <Link
            to="/app/dashboard"
            className={navLinkClass(location.pathname === '/app/dashboard')}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/app/absensi-karyawan"
            className={navLinkClass(location.pathname === '/app/absensi-karyawan')}
          >
            <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Absensi Karyawan</span>
          </Link>

          {canStudentAttendance && (
            <Link
              to="/app/absensi-siswa"
              className={navLinkClass(location.pathname === '/app/absensi-siswa')}
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Absensi Siswa</span>
            </Link>
          )}

          {hasRekapMenu && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRekapOpen((prev) => !prev)}
                aria-expanded={rekapOpen}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  location.pathname.startsWith('/app/rekap')
                    ? 'text-red-800 bg-red-50/70'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Rekap Absensi</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    rekapOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {rekapOpen && (
                <div className="mt-1 space-y-1">
                  {isAdmin && (
                    <Link
                      to="/app/rekap/karyawan"
                      className={subLinkClass(location.pathname === '/app/rekap/karyawan')}
                    >
                      <span>Absensi Karyawan</span>
                    </Link>
                  )}
                  <Link
                    to="/app/rekap/siswa"
                    className={subLinkClass(location.pathname === '/app/rekap/siswa')}
                  >
                    <span>Absensi Siswa</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {isAdmin && (
            <>
              <Link
                to="/app/data-siswa"
                className={navLinkClass(location.pathname === '/app/data-siswa')}
              >
                <Database className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Data Siswa</span>
              </Link>

              <Link
                to="/app/user-management"
                className={navLinkClass(location.pathname === '/app/user-management')}
              >
                <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>User Management</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Bottom User Identity */}
      <div className="border-t border-zinc-200 px-5 py-4">
        <p className="truncate text-xs font-bold text-zinc-900">{user.full_name}</p>
        <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-[260px] shrink-0 border-r border-zinc-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-[260px] border-r border-zinc-200 bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar with Breadcrumb (Left) and Logout Button (Top Right) */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-100 lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden text-zinc-400 sm:inline whitespace-nowrap">
                SMK Prima Unggul
              </span>
              <span className="hidden text-zinc-300 sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-bold text-zinc-900">{currentTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-zinc-900">{user.full_name}</p>
              <p className="text-[11px] text-zinc-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{loggingOut ? 'Keluar...' : 'Logout'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <div className="mx-auto max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
