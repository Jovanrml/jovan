import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, loading, hasUsers, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (hasUsers === false) {
      setMode('register');
    }
  }, [hasUsers]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/app/dashboard', { replace: true });
      } else {
        if (!fullName.trim()) {
          throw new Error('Nama lengkap wajib diisi.');
        }
        if (password.length < 6) {
          throw new Error('Kata sandi minimal 6 karakter.');
        }
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi kata sandi tidak cocok.');
        }
        await register({
          email,
          password,
          full_name: fullName,
          nip,
          jabatan,
        });
        navigate('/app/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat autentikasi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 lg:grid lg:grid-cols-12">
      {/* Left Crimson Brand Panel */}
      <aside className="flex flex-col justify-between bg-red-800 px-8 py-10 text-white lg:col-span-5 lg:px-12 lg:py-12">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-red-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Profil Sekolah</span>
          </Link>

          <div className="mt-10">
            <p className="text-xs font-semibold tracking-wide text-red-200">
              Portal Presensi Digital
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              SMK Prima Unggul
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-red-100">
              Masuk menggunakan akun terdaftar untuk melakukan absensi mandiri karyawan, mencatat
              presensi harian siswa, serta memantau rekapitulasi kehadiran sekolah.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-red-700/70 pt-6">
          <p className="text-xs font-semibold text-white">Kebijakan Akses Peran</p>
          <p className="mt-1.5 text-xs leading-relaxed text-red-100">
            Pengguna pertama yang didaftarkan pada sistem autentikasi otomatis ditetapkan sebagai
            Administrator. Akun Guru dan Tenaga Kependidikan selanjutnya dikelola melalui menu User
            Management.
          </p>
        </div>
      </aside>

      {/* Right Auth Form */}
      <main className="flex items-center justify-center px-6 py-12 lg:col-span-7 lg:px-12">
        <div className="w-full max-w-md border border-zinc-200 bg-white p-8">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                {mode === 'login' ? 'Masuk ke Aplikasi' : 'Buat Akun Pertama'}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {mode === 'login'
                  ? 'Gunakan email dan kata sandi akun sekolah Anda.'
                  : hasUsers === false
                    ? 'Belum ada pengguna terdaftar — akun pertama menjadi Admin.'
                    : 'Daftarkan akun karyawan baru ke sistem.'}
              </p>
            </div>
          </div>

          {/* Segmented Mode Switch */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                mode === 'login' ? 'bg-red-700 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-red-700 text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {hasUsers === false && mode === 'register' && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <span>
                Sistem mendeteksi belum ada pengguna. Akun yang Anda daftarkan sekarang otomatis
                memiliki peran <strong>Admin</strong>.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-zinc-700">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Drs. Ahmad Suryana"
                    className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nip" className="block text-xs font-semibold text-zinc-700">
                      NIP / NUPTK
                    </label>
                    <input
                      id="nip"
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="Opsional"
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-900 placeholder:font-sans placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="jabatan" className="block text-xs font-semibold text-zinc-700">
                      Jabatan
                    </label>
                    <input
                      id="jabatan"
                      type="text"
                      value={jabatan}
                      onChange={(e) => setJabatan(e.target.value)}
                      placeholder={hasUsers === false ? 'Kepala Tata Usaha / Admin' : 'Staf Sekolah'}
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-700">
                Alamat Email
              </label>
              <div className="relative mt-1.5">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@smkprimaunggul.sch.id"
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-700">
                Kata Sandi
              </label>
              <div className="relative mt-1.5">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-zinc-700"
                >
                  Konfirmasi Kata Sandi
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:opacity-60"
            >
              {mode === 'login' ? (
                <>
                  <span>{submitting ? 'Memproses...' : 'Masuk ke Portal'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? 'Mendaftarkan...' : 'Daftar & Masuk'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
