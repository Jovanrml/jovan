import { Download, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { StatusText } from '../../components/StatusText';
import { ROLE_LABELS } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import { downloadCsv, formatDateId, formatTimeWib, getTodayJakartaIso } from '../../lib/format';
import type { EmployeeAttendanceRecord } from '../../types';

export default function EmployeeRecapPage() {
  const today = getTodayJakartaIso();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<{ records: EmployeeAttendanceRecord[] }>(
        `/api/attendance/employees/recap?${params.toString()}`
      );
      setRecords(res.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi karyawan.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, roleFilter, statusFilter, search]);

  useEffect(() => {
    void loadRecap();
  }, [loadRecap]);

  const counts = {
    hadir: records.filter((r) => r.status === 'hadir').length,
    terlambat: records.filter((r) => r.status === 'terlambat').length,
    izin: records.filter((r) => r.status === 'izin').length,
    sakit: records.filter((r) => r.status === 'sakit').length,
  };

  function handleExportCsv() {
    downloadCsv(
      `rekap-absensi-karyawan-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'Nama Karyawan', 'NIP', 'Role', 'Jam Masuk', 'Jam Pulang', 'Status', 'Catatan'],
      records.map((r) => [
        r.attendance_date,
        r.employee_name || '-',
        r.employee_nip || '-',
        r.employee_role ? ROLE_LABELS[r.employee_role] : '-',
        formatTimeWib(r.check_in_time),
        formatTimeWib(r.check_out_time),
        r.status,
        r.notes || '',
      ])
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-zinc-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900">Rekap Absensi Karyawan</h2>
            <p className="text-xs text-zinc-500">
              Laporan kehadiran seluruh Admin, Guru, dan Tenaga Kependidikan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Unduh CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="empStart" className="block text-[11px] font-semibold text-zinc-600">
              Dari Tanggal
            </label>
            <input
              id="empStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="empEnd" className="block text-[11px] font-semibold text-zinc-600">
              Sampai Tanggal
            </label>
            <input
              id="empEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="empRole" className="block text-[11px] font-semibold text-zinc-600">
              Role
            </label>
            <select
              id="empRole"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            >
              <option value="">Semua Role</option>
              <option value="admin">Administrator</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>
          <div>
            <label htmlFor="empStatus" className="block text-[11px] font-semibold text-zinc-600">
              Status
            </label>
            <select
              id="empStatus"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
            </select>
          </div>
          <div>
            <label htmlFor="empSearch" className="block text-[11px] font-semibold text-zinc-600">
              Cari Karyawan
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                id="empSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / NIP / Email"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="mt-5 grid grid-cols-2 border border-zinc-200 bg-zinc-50 sm:grid-cols-4">
          <div className="border-b border-r border-zinc-200 p-3.5 sm:border-b-0">
            <p className="text-[11px] text-zinc-500">Hadir</p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
              {counts.hadir}
            </p>
          </div>
          <div className="border-b border-zinc-200 p-3.5 sm:border-b-0 sm:border-r">
            <p className="text-[11px] text-zinc-500">Terlambat</p>
            <p className="mt-1 font-mono text-lg font-bold text-red-700 tabular-nums">
              {counts.terlambat}
            </p>
          </div>
          <div className="border-r border-zinc-200 p-3.5">
            <p className="text-[11px] text-zinc-500">Izin</p>
            <p className="mt-1 font-mono text-lg font-bold text-amber-700 tabular-nums">
              {counts.izin}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[11px] text-zinc-500">Sakit</p>
            <p className="mt-1 font-mono text-lg font-bold text-sky-700 tabular-nums">
              {counts.sakit}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Table */}
      <section className="border border-zinc-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-xs text-zinc-500">Memuat rekap karyawan...</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500">
            Tidak ada data absensi karyawan untuk filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Nama Karyawan</th>
                  <th className="px-4 py-3 font-semibold">NIP</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Masuk</th>
                  <th className="px-4 py-3 font-semibold">Pulang</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                      {formatDateId(r.attendance_date)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      {r.employee_name || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-600 tabular-nums">
                      {r.employee_nip || '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {r.employee_role ? ROLE_LABELS[r.employee_role] : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700 tabular-nums whitespace-nowrap">
                      {formatTimeWib(r.check_in_time)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700 tabular-nums whitespace-nowrap">
                      {formatTimeWib(r.check_out_time)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusText status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{r.notes || '—'}</td>
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
