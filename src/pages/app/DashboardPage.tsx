import { ArrowRight, CheckCircle2, ClipboardCheck, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusText } from '../../components/StatusText';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import { formatDateId, formatLongDateId, formatTimeWib } from '../../lib/format';
import type { DashboardSummary } from '../../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowText, setNowText] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setNowText(
        new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta',
        }).format(new Date()) + ' WIB'
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await apiFetch<DashboardSummary>('/api/dashboard');
        if (active) setSummary(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error || 'Data dashboard tidak tersedia.'}
      </div>
    );
  }

  const todayRec = summary.myTodayAttendance;

  return (
    <div className="space-y-8">
      {/* Welcome Banner + Live WIB Clock */}
      <section className="flex flex-col justify-between gap-6 border border-zinc-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold text-red-700">
            {ROLE_LABELS[user!.role]} · {formatLongDateId(summary.todayDate)}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">
            Selamat Datang, {user?.full_name}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {todayRec
              ? `Status presensi Anda hari ini tercatat (${todayRec.status.toUpperCase()}).`
              : 'Anda belum mencatat absensi karyawan untuk hari ini.'}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end shrink-0">
          <div className="font-mono text-xl font-bold text-zinc-900 tabular-nums">{nowText}</div>
          <Link
            to="/app/absensi-karyawan"
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 transition-colors whitespace-nowrap"
          >
            <span>{todayRec ? 'Lihat Absensi Saya' : 'Isi Absensi Karyawan'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Role-specific KPI Grid */}
      {user?.role === 'admin' && summary.schoolStats && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Total Karyawan Terdaftar</p>
            <p className="mt-2 font-mono text-3xl font-bold text-zinc-900 tabular-nums">
              {summary.schoolStats.totalEmployees}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Admin, Guru &amp; Tendik</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Karyawan Hadir Hari Ini</p>
            <p className="mt-2 font-mono text-3xl font-bold text-red-700 tabular-nums">
              {summary.schoolStats.employeesPresentToday}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Masuk tepat waktu / terlambat</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Total Siswa Terdaftar</p>
            <p className="mt-2 font-mono text-3xl font-bold text-zinc-900 tabular-nums">
              {summary.schoolStats.totalStudents}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Seluruh rombel kelas</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Siswa Hadir Hari Ini</p>
            <p className="mt-2 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
              {summary.schoolStats.studentsPresentToday}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.schoolStats.studentsUnmarkedToday} belum diabsen
            </p>
          </div>
        </section>
      )}

      {user?.role === 'guru' && summary.schoolStats && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Absen Saya Bulan Ini</p>
            <p className="mt-2 font-mono text-3xl font-bold text-red-700 tabular-nums">
              {summary.myMonthStats.hadir + summary.myMonthStats.terlambat}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Hari masuk kerja</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Total Siswa Sekolah</p>
            <p className="mt-2 font-mono text-3xl font-bold text-zinc-900 tabular-nums">
              {summary.schoolStats.totalStudents}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Siap diabsen per kelas</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Siswa Hadir Hari Ini</p>
            <p className="mt-2 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
              {summary.schoolStats.studentsPresentToday}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Tercatat hari ini</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Siswa Belum Diabsen</p>
            <p className="mt-2 font-mono text-3xl font-bold text-zinc-900 tabular-nums">
              {summary.schoolStats.studentsUnmarkedToday}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Menunggu pencatatan</p>
          </div>
        </section>
      )}

      {user?.role === 'tenaga_kependidikan' && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Status Hari Ini</p>
            <div className="mt-3">
              <StatusText status={todayRec?.status} />
            </div>
            <p className="mt-2 font-mono text-xs text-zinc-500 tabular-nums">
              Masuk: {formatTimeWib(todayRec?.check_in_time)}
            </p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Hadir Tepat Waktu (Bulan Ini)</p>
            <p className="mt-2 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
              {summary.myMonthStats.hadir}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Hari tercatat</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Terlambat (Bulan Ini)</p>
            <p className="mt-2 font-mono text-3xl font-bold text-red-700 tabular-nums">
              {summary.myMonthStats.terlambat}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Setelah 07:30 WIB</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium text-zinc-500">Izin &amp; Sakit (Bulan Ini)</p>
            <p className="mt-2 font-mono text-3xl font-bold text-zinc-900 tabular-nums">
              {summary.myMonthStats.izin + summary.myMonthStats.sakit}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Pengajuan tidak masuk</p>
          </div>
        </section>
      )}

      {/* Quick Actions & Recent Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Employee Logs */}
        <section className="border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-700" aria-hidden="true" />
              <h3 className="text-sm font-bold text-zinc-900">
                {user?.role === 'admin'
                  ? 'Aktivitas Absensi Karyawan Hari Ini'
                  : 'Riwayat Absensi Saya'}
              </h3>
            </div>
            <Link
              to={user?.role === 'admin' ? '/app/rekap/karyawan' : '/app/absensi-karyawan'}
              className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
            >
              Selengkapnya
            </Link>
          </div>

          {summary.recentEmployeeLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              Belum ada catatan absensi karyawan yang masuk.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">
                      {user?.role === 'admin' ? 'Karyawan' : 'Tanggal'}
                    </th>
                    <th className="px-4 py-2.5 font-semibold">Jam Masuk</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {summary.recentEmployeeLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5 font-medium text-zinc-900">
                        {user?.role === 'admin'
                          ? row.employee_name || '-'
                          : formatDateId(row.attendance_date)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-zinc-600 tabular-nums">
                        {formatTimeWib(row.check_in_time)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusText status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Student Logs or Personal Guide */}
        {user?.role === 'tenaga_kependidikan' ? (
          <section className="flex flex-col justify-between border border-zinc-200 bg-white p-6">
            <div>
              <div className="flex items-center gap-2 text-red-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <h3 className="text-sm font-bold text-zinc-900">Panduan Presensi Karyawan</h3>
              </div>
              <ul className="mt-4 space-y-3 text-xs leading-relaxed text-zinc-600">
                <li>
                  1. Lakukan <strong>Absen Masuk</strong> setiap hari kerja melalui menu Absensi
                  Karyawan. Batas hadir tepat waktu sekolah adalah pukul 07:30 WIB.
                </li>
                <li>
                  2. Jangan lupa menekan tombol <strong>Absen Pulang</strong> sebelum meninggalkan
                  area sekolah agar jam keluar tercatat lengkap.
                </li>
                <li>
                  3. Apabila berhalangan hadir karena sakit atau keperluan resmi, ajukan status{' '}
                  <strong>Izin</strong> atau <strong>Sakit</strong> beserta keterangan singkat.
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-zinc-100 pt-4">
              <Link
                to="/app/absensi-karyawan"
                className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 hover:underline"
              >
                <span>Buka Halaman Absensi Karyawan</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : (
          <section className="border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div className="flex items-center gap-2">
                {user?.role === 'admin' ? (
                  <Users className="h-4 w-4 text-red-700" aria-hidden="true" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 text-red-700" aria-hidden="true" />
                )}
                <h3 className="text-sm font-bold text-zinc-900">Absensi Siswa Hari Ini</h3>
              </div>
              <Link
                to="/app/absensi-siswa"
                className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
              >
                Catat Absensi
              </Link>
            </div>

            {summary.recentStudentLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Belum ada data absensi siswa tercatat hari ini.{' '}
                <Link to="/app/absensi-siswa" className="font-semibold text-red-700 hover:underline">
                  Mulai absen kelas
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Siswa</th>
                      <th className="px-4 py-2.5 font-semibold">Kelas</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {summary.recentStudentLogs.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-2.5 font-medium text-zinc-900">
                          {row.nama || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-600">{row.kelas || '-'}</td>
                        <td className="px-4 py-2.5">
                          <StatusText status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
