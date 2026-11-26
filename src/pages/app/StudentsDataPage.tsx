import { Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { JURUSAN_LIST, buildDefaultClassOptions } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import type { JurusanKode, KelasRecord, Student, UserProfile } from '../../types';

const CLASS_SUGGESTIONS = buildDefaultClassOptions();

export default function StudentsDataPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'kelas'>('students');

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [kelasList, setKelasList] = useState<KelasRecord[]>([]);
  const [guruList, setGuruList] = useState<UserProfile[]>([]);

  const [kelasFilter, setKelasFilter] = useState('');
  const [jurusanFilter, setJurusanFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Student Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('X TKJ 1');
  const [jurusan, setJurusan] = useState<JurusanKode>('TKJ');
  const [submitting, setSubmitting] = useState(false);

  // Bulk import modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Delete student confirmation
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  // Kelas Modal state
  const [kelasModalOpen, setKelasModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<KelasRecord | null>(null);
  const [namaKelasInput, setNamaKelasInput] = useState('X TKJ 1');
  const [tingkatInput, setTingkatInput] = useState<'X' | 'XI' | 'XII'>('X');
  const [jurusanKelasInput, setJurusanKelasInput] = useState<JurusanKode>('TKJ');
  const [waliKelasInput, setWaliKelasInput] = useState('');
  const [deleteKelasTarget, setDeleteKelasTarget] = useState<KelasRecord | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (kelasFilter) params.set('kelas', kelasFilter);
      if (jurusanFilter) params.set('jurusan', jurusanFilter);
      if (search.trim()) params.set('search', search.trim());

      const [stuRes, kelasRes] = await Promise.all([
        apiFetch<{ students: Student[]; classes: string[] }>(
          `/api/students?${params.toString()}`
        ),
        apiFetch<{ kelas: KelasRecord[]; gurus: UserProfile[] }>('/api/kelas'),
      ]);

      setStudents(stuRes.students);
      setClasses(stuRes.classes);
      setKelasList(kelasRes.kelas);
      setGuruList(kelasRes.gurus);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa dan kelas.',
      });
    } finally {
      setLoading(false);
    }
  }, [kelasFilter, jurusanFilter, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openAddModal() {
    setEditingStudent(null);
    setNis('');
    setNama('');
    setKelas(kelasList[0]?.nama_kelas || 'X TKJ 1');
    setJurusan(kelasList[0]?.jurusan_kode || 'TKJ');
    setModalOpen(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setNis(student.nis);
    setNama(student.nama);
    setKelas(student.kelas);
    setJurusan(student.jurusan);
    setModalOpen(true);
  }

  function inferJurusanFromKelas(kelasVal: string): JurusanKode | null {
    const upper = kelasVal.toUpperCase();
    for (const j of JURUSAN_LIST) {
      if (upper.includes(j.kode)) return j.kode;
    }
    return null;
  }

  function inferTingkatFromKelas(kelasVal: string): 'X' | 'XI' | 'XII' {
    const upper = kelasVal.trim().toUpperCase();
    if (upper.startsWith('XII ')) return 'XII';
    if (upper.startsWith('XI ')) return 'XI';
    return 'X';
  }

  async function handleSaveStudent(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      if (editingStudent) {
        await apiFetch(`/api/students/${editingStudent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ nis, nama, kelas, jurusan }),
        });
        setFeedback({ type: 'ok', text: `Data siswa ${nama} berhasil diperbarui.` });
      } else {
        await apiFetch('/api/students', {
          method: 'POST',
          body: JSON.stringify({ nis, nama, kelas, jurusan }),
        });
        setFeedback({ type: 'ok', text: `Siswa ${nama} berhasil ditambahkan.` });
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkImport(e: FormEvent) {
    e.preventDefault();
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const items: Array<{ nis: string; nama: string; kelas: string; jurusan: JurusanKode }> = [];
    for (const line of lines) {
      const parts = line.split(/[,\t;]/).map((p) => p.trim());
      if (parts.length < 3) continue;
      const [rowNis, rowNama, rowKelas, rowJurusan] = parts;
      const guessed =
        (rowJurusan?.toUpperCase() as JurusanKode) ||
        inferJurusanFromKelas(rowKelas) ||
        'TKJ';
      const validJurusan = JURUSAN_LIST.some((j) => j.kode === guessed) ? guessed : 'TKJ';
      items.push({ nis: rowNis, nama: rowNama, kelas: rowKelas, jurusan: validJurusan });
    }

    if (items.length === 0) {
      setFeedback({
        type: 'err',
        text: 'Format tidak terbaca. Gunakan format: NIS, Nama Lengkap, Kelas (satu siswa per baris).',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ inserted: number; skipped: number }>('/api/students/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      setBulkOpen(false);
      setBulkText('');
      setFeedback({
        type: 'ok',
        text: `Import selesai: ${res.inserted} siswa ditambahkan, ${res.skipped} dilewati (duplikat/tidak valid).`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mengimpor siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStudent() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/students/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({ type: 'ok', text: `Siswa ${deleteTarget.nama} berhasil dihapus.` });
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menghapus siswa.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openAddKelasModal() {
    setEditingKelas(null);
    setNamaKelasInput('X TKJ 1');
    setTingkatInput('X');
    setJurusanKelasInput('TKJ');
    setWaliKelasInput('');
    setKelasModalOpen(true);
  }

  function openEditKelasModal(k: KelasRecord) {
    setEditingKelas(k);
    setNamaKelasInput(k.nama_kelas);
    setTingkatInput(k.tingkat);
    setJurusanKelasInput(k.jurusan_kode);
    setWaliKelasInput(k.wali_kelas_id || '');
    setKelasModalOpen(true);
  }

  async function handleSaveKelas(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        nama_kelas: namaKelasInput,
        tingkat: tingkatInput,
        jurusan_kode: jurusanKelasInput,
        wali_kelas_id: waliKelasInput || null,
      };
      if (editingKelas) {
        await apiFetch(`/api/kelas/${editingKelas.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setFeedback({ type: 'ok', text: `Kelas ${namaKelasInput} berhasil diperbarui.` });
      } else {
        await apiFetch('/api/kelas', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback({ type: 'ok', text: `Kelas ${namaKelasInput} berhasil ditambahkan.` });
      }
      setKelasModalOpen(false);
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data kelas.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteKelas() {
    if (!deleteKelasTarget) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/kelas/${deleteKelasTarget.id}`, { method: 'DELETE' });
      setFeedback({ type: 'ok', text: `Kelas ${deleteKelasTarget.nama_kelas} berhasil dihapus.` });
      setDeleteKelasTarget(null);
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menghapus kelas.',
      });
      setDeleteKelasTarget(null);
    } finally {
      setSubmitting(false);
    }
  }

  const allClassOptions = Array.from(
    new Set([...kelasList.map((k) => k.nama_kelas), ...classes, ...CLASS_SUGGESTIONS])
  );

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <section className="border border-zinc-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900">Data Induk Siswa &amp; Relasi Kelas</h2>
            <p className="text-xs text-zinc-500">
              Kelola data siswa (NIS, nama, kelas) serta relasi kelas, jurusan, dan wali kelas
              guru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'students' ? (
              <>
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Import Massal</span>
                </button>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tambah Siswa</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openAddKelasModal}
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tambah Kelas</span>
              </button>
            )}
          </div>
        </div>

        {/* Segmented View Switcher */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-red-700 text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Daftar Siswa ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kelas')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'kelas'
                  ? 'bg-red-700 text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Kelas &amp; Wali Kelas ({kelasList.length})
            </button>
          </div>
        </div>

        {activeTab === 'students' && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="dsKelas" className="block text-[11px] font-semibold text-zinc-600">
                Filter Kelas
              </label>
              <select
                id="dsKelas"
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
              <label htmlFor="dsJurusan" className="block text-[11px] font-semibold text-zinc-600">
                Filter Jurusan
              </label>
              <select
                id="dsJurusan"
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
              <label htmlFor="dsSearch" className="block text-[11px] font-semibold text-zinc-600">
                Cari NIS / Nama
              </label>
              <div className="relative mt-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  id="dsSearch"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari siswa..."
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

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

      {/* Active Tab Content */}
      {activeTab === 'students' ? (
        <section className="border border-zinc-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-xs text-zinc-500">Memuat data siswa...</div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-zinc-900">Belum Ada Data Siswa</p>
              <p className="mt-1 text-xs text-zinc-500">
                Tambahkan siswa baru agar guru dapat melakukan absensi siswa per kelas.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tambah Siswa Pertama</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">NIS</th>
                    <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                    <th className="px-4 py-3 font-semibold">Kelas</th>
                    <th className="px-4 py-3 font-semibold">Jurusan</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-800 tabular-nums">
                        {s.nis}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">{s.nama}</td>
                      <td className="px-4 py-3 text-zinc-700">{s.kelas}</td>
                      <td className="px-4 py-3 font-mono font-medium text-red-700">{s.jurusan}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            aria-label={`Edit ${s.nama}`}
                            className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            aria-label={`Hapus ${s.nama}`}
                            className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="border border-zinc-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-xs text-zinc-500">Memuat relasi kelas...</div>
          ) : kelasList.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-zinc-900">Belum Ada Rombel Kelas</p>
              <p className="mt-1 text-xs text-zinc-500">
                Buat kelas untuk menghubungkan jurusan dan wali kelas guru, atau tambahkan siswa
                secara langsung.
              </p>
              <button
                type="button"
                onClick={openAddKelasModal}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tambah Kelas Pertama</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama Kelas</th>
                    <th className="px-4 py-3 font-semibold">Tingkat</th>
                    <th className="px-4 py-3 font-semibold">Jurusan</th>
                    <th className="px-4 py-3 font-semibold">Wali Kelas (Guru)</th>
                    <th className="px-4 py-3 text-right font-semibold">Jumlah Siswa</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {kelasList.map((k) => (
                    <tr key={k.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-semibold text-zinc-900">{k.nama_kelas}</td>
                      <td className="px-4 py-3 font-mono text-zinc-700">{k.tingkat}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-red-700">
                          {k.jurusan_kode}
                        </span>
                        {k.nama_jurusan ? (
                          <span className="text-zinc-500"> · {k.nama_jurusan}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {k.wali_kelas_name || (
                          <span className="text-zinc-400">Belum ditetapkan</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 tabular-nums">
                        {k.student_count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditKelasModal(k)}
                            aria-label={`Edit kelas ${k.nama_kelas}`}
                            className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteKelasTarget(k)}
                            aria-label={`Hapus kelas ${k.nama_kelas}`}
                            className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-md border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <h3 className="text-base font-bold text-zinc-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup modal"
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="mt-5 space-y-4">
              <div>
                <label htmlFor="stuNis" className="block text-xs font-semibold text-zinc-700">
                  NIS
                </label>
                <input
                  id="stuNis"
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 20261001"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="stuNama" className="block text-xs font-semibold text-zinc-700">
                  Nama Lengkap
                </label>
                <input
                  id="stuNama"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap siswa"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="stuKelasIn" className="block text-xs font-semibold text-zinc-700">
                    Kelas
                  </label>
                  <input
                    id="stuKelasIn"
                    type="text"
                    required
                    list="kelas-options"
                    value={kelas}
                    onChange={(e) => {
                      setKelas(e.target.value);
                      const inferred = inferJurusanFromKelas(e.target.value);
                      if (inferred) setJurusan(inferred);
                    }}
                    placeholder="Contoh: X TKJ 1"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                  />
                  <datalist id="kelas-options">
                    {allClassOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="stuJurIn" className="block text-xs font-semibold text-zinc-700">
                    Jurusan
                  </label>
                  <select
                    id="stuJurIn"
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value as JurusanKode)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                  >
                    {JURUSAN_LIST.map((j) => (
                      <option key={j.kode} value={j.kode}>
                        {j.kode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-lg border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <h3 className="text-base font-bold text-zinc-900">Import Data Siswa Massal</h3>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                aria-label="Tutup modal"
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleBulkImport} className="mt-4 space-y-4">
              <p className="text-xs leading-relaxed text-zinc-600">
                Masukkan satu siswa per baris dengan format{' '}
                <code className="font-mono text-red-700">NIS, Nama Lengkap, Kelas</code> (dipisah
                koma atau titik koma). Contoh:
              </p>
              <textarea
                rows={6}
                required
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  '20261001, Andi Pratama, X TKJ 1\n20261002, Sinta Dewi, X DKV 1\n20261003, Bagas Saputra, XI AK 1'
                }
                className="w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs text-zinc-900 focus:border-red-700 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {submitting ? 'Mengimpor...' : 'Import Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-sm border border-zinc-200 bg-white p-6">
            <h3 className="text-base font-bold text-zinc-900">Hapus Data Siswa?</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Anda akan menghapus <strong>{deleteTarget.nama}</strong> (NIS {deleteTarget.nis})
              beserta riwayat absensinya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleDeleteStudent()}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {submitting ? 'Menghapus...' : 'Hapus Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Kelas Modal */}
      {kelasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-md border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <h3 className="text-base font-bold text-zinc-900">
                {editingKelas ? 'Edit Relasi Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setKelasModalOpen(false)}
                aria-label="Tutup modal"
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveKelas} className="mt-5 space-y-4">
              <div>
                <label htmlFor="klName" className="block text-xs font-semibold text-zinc-700">
                  Nama Kelas
                </label>
                <input
                  id="klName"
                  type="text"
                  required
                  value={namaKelasInput}
                  onChange={(e) => {
                    setNamaKelasInput(e.target.value);
                    setTingkatInput(inferTingkatFromKelas(e.target.value));
                    const inferredJur = inferJurusanFromKelas(e.target.value);
                    if (inferredJur) setJurusanKelasInput(inferredJur);
                  }}
                  placeholder="Contoh: X TKJ 1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="klTingkat" className="block text-xs font-semibold text-zinc-700">
                    Tingkat
                  </label>
                  <select
                    id="klTingkat"
                    value={tingkatInput}
                    onChange={(e) => setTingkatInput(e.target.value as 'X' | 'XI' | 'XII')}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                  >
                    <option value="X">X</option>
                    <option value="XI">XI</option>
                    <option value="XII">XII</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="klJur" className="block text-xs font-semibold text-zinc-700">
                    Jurusan
                  </label>
                  <select
                    id="klJur"
                    value={jurusanKelasInput}
                    onChange={(e) => setJurusanKelasInput(e.target.value as JurusanKode)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                  >
                    {JURUSAN_LIST.map((j) => (
                      <option key={j.kode} value={j.kode}>
                        {j.kode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="klWali" className="block text-xs font-semibold text-zinc-700">
                  Wali Kelas (Guru)
                </label>
                <select
                  id="klWali"
                  value={waliKelasInput}
                  onChange={(e) => setWaliKelasInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                >
                  <option value="">Belum ditetapkan</option>
                  {guruList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setKelasModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Kelas Confirmation */}
      {deleteKelasTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-sm border border-zinc-200 bg-white p-6">
            <h3 className="text-base font-bold text-zinc-900">Hapus Kelas?</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Anda akan menghapus kelas <strong>{deleteKelasTarget.nama_kelas}</strong>. Kelas yang
              masih memiliki siswa tidak dapat dihapus sebelum siswanya dipindahkan.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteKelasTarget(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleDeleteKelas()}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {submitting ? 'Menghapus...' : 'Hapus Kelas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
