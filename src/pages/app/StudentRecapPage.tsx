import { Download, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { StatusText } from '../../components/StatusText';
import { JURUSAN_LIST } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import { downloadCsv, formatDateId, getTodayJakartaIso } from '../../lib/format';
import type { StudentAttendanceRecord } from '../../types';

export default function StudentRecapPage() {
  const today = getTodayJakartaIso();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [kelasFilter, setKelasFilter] = useState('');
  const [jurusanFilter, setJurusanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (kelasFilter) params.set('kelas', kelasFilter);
      if (jurusanFilter) params.set('jurusan', jurusanFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<{
        records: StudentAttendanceRecord[];
        classes: string[];
      }>(`/api/attendance/students/recap?${params.toString()}`);
      setRecords(res.records);
      setClasses(res.classes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, kelasFilter, jurusanFilter, statusFilter, search]);

  useEffect(() => {
    void loadRecap();
  }, [loadRecap]);

  const counts = {
    hadir: records.filter((r) => r.status === 'hadir').length,
    sakit: records.filter((r) => r.status === 'sakit').length,
    izin: records.filter((r) => r.status === 'izin').length,
    alpa: records.filter((r) => r.status === 'alpa').length,
  };
  const attendancePct =
    records.length > 0 ? Math.round((counts.hadir / records.length) * 100) : 0;

  function handleExportCsv() {
    downloadCsv(
      `rekap-absensi-siswa-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Status', 'Catatan', 'Dicatat Oleh'],
      records.map((r) => [
        r.attendance_date,
        r.nis || '-',
        r.nama || '-',
        r.kelas || '-',
        r.jurusan || '-',
        r.status,
        r.notes || '',
        r.recorded_by_name || '-',
      ])
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-zinc-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900">Rekap Absensi Siswa</h2>
            <p className="text-xs text-zinc-500">
              Pantau persentase kehadiran siswa berdasarkan kelas, jurusan, dan rentang tanggal.
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

        {/* Filter Bar */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label htmlFor="stuStart" className="block text-[11px] font-semibold text-zinc-600">
              Dari Tanggal
            </label>
            <input
              id="stuStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="stuEnd" className="block text-[11px] font-semibold text-zinc-600">
              Sampai Tanggal
            </label>
            <input
              id="stuEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="stuKelas" className="block text-[11px] font-semibold text-zinc-600">
              Kelas
            </label>
            <select
              id="stuKelas"
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            >
              <option value="">Semua Kelas</option>
              {classes.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stuJurusan" className="block text-[11px] font-semibold text-zinc-600">
              Jurusan
            </label>
            <select
              id="stuJurusan"
              value={jurusanFilter}
              onChange={(e) => setJurusanFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            >
              <option value="">Semua Jurusan</option>
              {JURUSAN_LIST.map((j) => (
                <option key={j.kode} value={j.kode}>
                  {j.kode}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stuStatus" className="block text-[11px] font-semibold text-zinc-600">
              Status
            </label>
            <select
              id="stuStatus"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
          <div>
            <label htmlFor="stuSearch" className="block text-[11px] font-semibold text-zinc-600">
              Cari Siswa
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                id="stuSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="NIS / Nama"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="mt-5 grid grid-cols-2 border border-zinc-200 bg-zinc-50 sm:grid-cols-5">
          <div className="border-b border-r border-zinc-200 p-3.5 sm:border-b-0">
            <p className="text-[11px] text-zinc-500">Persentase Hadir</p>
            <p className="mt-1 font-mono text-lg font-bold text-red-700 tabular-nums">
              {attendancePct}%
            </p>
          </div>
          <div className="border-b border-zinc-200 p-3.5 sm:border-b-0 sm:border-r">
            <p className="text-[11px] text-zinc-500">Hadir</p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
              {counts.hadir}
            </p>
          </div>
          <div className="border-r border-zinc-200 p-3.5">
            <p className="text-[11px] text-zinc-500">Sakit</p>
            <p className="mt-1 font-mono text-lg font-bold text-sky-700 tabular-nums">
              {counts.sakit}
            </p>
          </div>
          <div className="border-r border-zinc-200 p-3.5">
            <p className="text-[11px] text-zinc-500">Izin</p>
            <p className="mt-1 font-mono text-lg font-bold text-amber-700 tabular-nums">
              {counts.izin}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[11px] text-zinc-500">Alpa</p>
            <p className="mt-1 font-mono text-lg font-bold text-red-700 tabular-nums">
              {counts.alpa}
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
          <div className="p-10 text-center text-xs text-zinc-500">Memuat rekap siswa...</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500">
            Belum ada catatan absensi siswa untuk filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">NIS</th>
                  <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                  <th className="px-4 py-3 font-semibold">Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                      {formatDateId(r.attendance_date)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700 tabular-nums">
                      {r.nis || '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">{r.nama || '-'}</td>
                    <td className="px-4 py-3 text-zinc-600">{r.kelas || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusText status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{r.notes || '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.recorded_by_name || '—'}</td>
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
