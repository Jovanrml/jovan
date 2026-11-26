import { Clock, LogIn, LogOut as LogOutIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { StatusText } from '../../components/StatusText';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import { formatDateId, formatLongDateId, formatTimeWib, getTodayJakartaIso } from '../../lib/format';
import type { EmployeeAttendanceRecord } from '../../types';

export default function EmployeeAttendancePage() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<EmployeeAttendanceRecord | null>(null);
  const [history, setHistory] = useState<EmployeeAttendanceRecord[]>([]);
  const [todayDate, setTodayDate] = useState(getTodayJakartaIso());
  const [monthFilter, setMonthFilter] = useState(getTodayJakartaIso().slice(0, 7));
  const [leaveStatus, setLeaveStatus] = useState<'izin' | 'sakit'>('izin');
  const [notes, setNotes] = useState('');
  const [showLeaveBox, setShowLeaveBox] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [clockText, setClockText] = useState('');

  useEffect(() => {
    const tick = () => {
      setClockText(
        new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta',
        }).format(new Date()) + ' WIB'
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{
        today: EmployeeAttendanceRecord | null;
        history: EmployeeAttendanceRecord[];
        todayDate: string;
      }>(`/api/attendance/employees/me?month=${encodeURIComponent(monthFilter)}`);
      setTodayRecord(res.today);
      setHistory(res.history);
      setTodayDate(res.todayDate);
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat data absensi.',
      });
    } finally {
      setLoading(false);
    }
  }, [monthFilter]);

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  async function handleCheckIn(status: 'hadir' | 'izin' | 'sakit') {
    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/api/attendance/employees/check-in', {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      });
      setNotes('');
      setShowLeaveBox(false);
      setMessage({
        type: 'ok',
        text:
          status === 'hadir'
            ? 'Absen masuk berhasil dicatat.'
            : `Pengajuan ${status} hari ini berhasil disimpan.`,
      });
      await fetchAttendance();
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mencatat absensi.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/api/attendance/employees/check-out', {
        method: 'POST',
      });
      setMessage({ type: 'ok', text: 'Absen pulang berhasil dicatat.' });
      await fetchAttendance();
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mencatat absen pulang.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Self-service Attendance Card */}
      <section className="border border-zinc-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-6 border-b border-zinc-200 pb-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold text-red-700">
              Presensi Mandiri Karyawan · {ROLE_LABELS[user!.role]}
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-zinc-900">{user?.full_name}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {formatLongDateId(todayDate)} · Batas masuk tepat waktu 07:30 WIB
            </p>
          </div>

          <div className="flex items-center gap-3 border border-zinc-200 bg-zinc-50 px-4 py-3">
            <Clock className="h-5 w-5 text-red-700" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Waktu Server (WIB)</p>
              <p className="font-mono text-lg font-bold text-zinc-900 tabular-nums">{clockText}</p>
            </div>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className={`mt-5 rounded-lg border px-4 py-3 text-xs font-medium ${
              message.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Status Summary Today */}
          <div className="grid grid-cols-3 gap-4 border border-zinc-200 bg-zinc-50 p-4 lg:col-span-6">
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Status Hari Ini</p>
              <div className="mt-1.5">
                <StatusText status={todayRecord?.status} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Jam Masuk</p>
              <p className="mt-1.5 font-mono text-sm font-bold text-zinc-900 tabular-nums">
                {formatTimeWib(todayRecord?.check_in_time)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Jam Pulang</p>
              <p className="mt-1.5 font-mono text-sm font-bold text-zinc-900 tabular-nums">
                {formatTimeWib(todayRecord?.check_out_time)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center gap-3 lg:col-span-6">
            {!todayRecord ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleCheckIn('hadir')}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:opacity-60"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    <span>{submitting ? 'Menyimpan...' : 'Absen Masuk Sekarang'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowLeaveBox((prev) => !prev)}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Ajukan Izin / Sakit
                  </button>
                </div>

                {showLeaveBox && (
                  <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLeaveStatus('izin')}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                          leaveStatus === 'izin'
                            ? 'bg-red-700 text-white'
                            : 'border border-zinc-200 bg-white text-zinc-700'
                        }`}
                      >
                        Izin
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveStatus('sakit')}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                          leaveStatus === 'sakit'
                            ? 'bg-red-700 text-white'
                            : 'border border-zinc-200 bg-white text-zinc-700'
                        }`}
                      >
                        Sakit
                      </button>
                    </div>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tuliskan alasan singkat izin / sakit..."
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleCheckIn(leaveStatus)}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                      Kirim Pengajuan {leaveStatus === 'izin' ? 'Izin' : 'Sakit'}
                    </button>
                  </div>
                )}
              </div>
            ) : (todayRecord.status === 'hadir' || todayRecord.status === 'terlambat') &&
              !todayRecord.check_out_time ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleCheckOut()}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
                >
                  <LogOutIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? 'Menyimpan...' : 'Absen Pulang Sekarang'}</span>
                </button>
                <span className="text-xs text-zinc-500">
                  Klik saat Anda selesai bertugas hari ini.
                </span>
              </div>
            ) : (
              <p className="text-sm font-medium text-zinc-600">
                Presensi Anda untuk hari ini sudah lengkap.
                {todayRecord.notes ? ` Catatan: ${todayRecord.notes}` : ''}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Personal Attendance History */}
      <section className="border border-zinc-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-zinc-200 px-6 py-4 sm:flex-row sm:items-center">
          <h3 className="text-sm font-bold text-zinc-900">Riwayat Kehadiran Pribadi</h3>
          <div className="flex items-center gap-2">
            <label htmlFor="monthFilter" className="text-xs font-medium text-zinc-500">
              Bulan:
            </label>
            <input
              id="monthFilter"
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Memuat riwayat absensi...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Belum ada catatan absensi pada bulan ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold">Jam Masuk</th>
                  <th className="px-5 py-3 font-semibold">Jam Pulang</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-900">
                      {formatDateId(item.attendance_date)}
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-700 tabular-nums">
                      {formatTimeWib(item.check_in_time)}
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-700 tabular-nums">
                      {formatTimeWib(item.check_out_time)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusText status={item.status} />
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
