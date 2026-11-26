import { CheckSquare, Save, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { JURUSAN_LIST } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import { getTodayJakartaIso } from '../../lib/format';
import type { StudentAttendanceSheetRow, StudentAttendanceStatus } from '../../types';

const STATUS_CHOICES: Array<{ key: StudentAttendanceStatus; label: string }> = [
  { key: 'hadir', label: 'Hadir' },
  { key: 'sakit', label: 'Sakit' },
  { key: 'izin', label: 'Izin' },
  { key: 'alpa', label: 'Alpa' },
];

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [date, setDate] = useState(getTodayJakartaIso());
  const [kelasFilter, setKelasFilter] = useState('');
  const [jurusanFilter, setJurusanFilter] = useState('');
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [rows, setRows] = useState<StudentAttendanceSheetRow[]>([]);

  const [draftStatus, setDraftStatus] = useState<Record<string, StudentAttendanceStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadSheet = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ date });
      if (kelasFilter) params.set('kelas', kelasFilter);
      if (jurusanFilter) params.set('jurusan', jurusanFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<{
        date: string;
        rows: StudentAttendanceSheetRow[];
        classes: string[];
      }>(`/api/attendance/students?${params.toString()}`);

      setRows(res.rows);
      setClasses(res.classes);

      const nextStatus: Record<string, StudentAttendanceStatus> = {};
      const nextNotes: Record<string, string> = {};
      for (const r of res.rows) {
        if (r.attendance.status) {
          nextStatus[r.student.id] = r.attendance.status;
        }
        nextNotes[r.student.id] = r.attendance.notes || '';
      }
      setDraftStatus(nextStatus);
      setDraftNotes(nextNotes);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat lembar absensi siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, [date, kelasFilter, jurusanFilter, search]);

  useEffect(() => {
    void loadSheet();
  }, [loadSheet]);

  function markAllPresent() {
    const next: Record<string, StudentAttendanceStatus> = { ...draftStatus };
    for (const r of rows) {
      next[r.student.id] = 'hadir';
    }
    setDraftStatus(next);
  }

  async function handleSaveAll() {
    const records = rows
      .filter((r) => Boolean(draftStatus[r.student.id]))
      .map((r) => ({
        student_id: r.student.id,
        status: draftStatus[r.student.id],
        notes: draftNotes[r.student.id] || '',
      }));

    if (records.length === 0) {
      setFeedback({
        type: 'err',
        text: 'Pilih status kehadiran minimal untuk satu siswa sebelum menyimpan.',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ saved: number }>('/api/attendance/students/batch', {
        method: 'POST',
        body: JSON.stringify({ date, records }),
      });
      setFeedback({
        type: 'ok',
        text: `Berhasil menyimpan absensi untuk ${res.saved} siswa pada tanggal ${date}.`,
      });
      await loadSheet();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <section className="border border-zinc-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900">Pencatatan Absensi Siswa</h2>
            <p className="text-xs text-zinc-500">
              Pilih tanggal dan kelas untuk menandai kehadiran siswa secara langsung.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={markAllPresent}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 whitespace-nowrap"
            >
              <CheckSquare className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
              <span>Tandai Semua Hadir</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSaveAll()}
              disabled={saving || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60 whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Absensi'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="attDate" className="block text-[11px] font-semibold text-zinc-600">
              Tanggal Absensi
            </label>
            <input
              id="attDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="attKelas" className="block text-[11px] font-semibold text-zinc-600">
              Kelas
            </label>
            <select
              id="attKelas"
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
            <label htmlFor="attJurusan" className="block text-[11px] font-semibold text-zinc-600">
              Jurusan
            </label>
            <select
              id="attJurusan"
              value={jurusanFilter}
              onChange={(e) => setJurusanFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
            >
              <option value="">Semua Jurusan</option>
              {JURUSAN_LIST.map((j) => (
                <option key={j.kode} value={j.kode}>
                  {j.kode} — {j.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="attSearch" className="block text-[11px] font-semibold text-zinc-600">
              Cari NIS / Nama
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                id="attSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-2.5 text-xs font-medium ${
              feedback.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </section>

      {/* Student Sheet Table */}
      <section className="border border-zinc-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-xs text-zinc-500">Memuat daftar siswa...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-900">Belum Ada Data Siswa</p>
            <p className="mt-1 text-xs text-zinc-500">
              {user?.role === 'admin'
                ? 'Tambahkan data siswa terlebih dahulu melalui menu Data Siswa.'
                : 'Admin belum menambahkan data siswa untuk filter yang dipilih.'}
            </p>
            {user?.role === 'admin' && (
              <Link
                to="/app/data-siswa"
                className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
              >
                Kelola Data Siswa
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">NIS</th>
                  <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Status Kehadiran</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const selected = draftStatus[row.student.id];
                  return (
                    <tr key={row.student.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-mono text-zinc-700 tabular-nums">
                        {row.student.nis}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        {row.student.nama}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{row.student.kelas}</td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                          {STATUS_CHOICES.map((opt) => {
                            const active = selected === opt.key;
                            let activeStyle = 'bg-red-700 text-white';
                            if (opt.key === 'hadir') activeStyle = 'bg-emerald-700 text-white';
                            if (opt.key === 'sakit') activeStyle = 'bg-sky-700 text-white';
                            if (opt.key === 'izin') activeStyle = 'bg-amber-600 text-white';
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() =>
                                  setDraftStatus((prev) => ({
                                    ...prev,
                                    [row.student.id]: opt.key,
                                  }))
                                }
                                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                                  active
                                    ? activeStyle
                                    : 'text-zinc-600 hover:bg-white hover:text-zinc-900'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={draftNotes[row.student.id] || ''}
                          onChange={(e) =>
                            setDraftNotes((prev) => ({
                              ...prev,
                              [row.student.id]: e.target.value,
                            }))
                          }
                          placeholder="Keterangan opsional"
                          className="w-full min-w-[160px] rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
