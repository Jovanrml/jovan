import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import { formatDateId } from '../../lib/format';
import type { UserProfile, UserRole } from '../../types';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hard Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ users: UserProfile[] }>('/api/users');
      setUsers(res.users);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openAddModal() {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('guru');
    setNip('');
    setJabatan('');
    setModalOpen(true);
  }

  function openEditModal(target: UserProfile) {
    setEditingUser(target);
    setFullName(target.full_name);
    setEmail(target.email);
    setPassword('');
    setRole(target.role);
    setNip(target.nip || '');
    setJabatan(target.jabatan || '');
    setModalOpen(true);
  }

  async function handleSaveUser(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      if (editingUser) {
        await apiFetch(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            full_name: fullName,
            email,
            role,
            nip: nip || null,
            jabatan: jabatan || null,
            ...(password.trim() ? { password } : {}),
          }),
        });
        setFeedback({
          type: 'ok',
          text: `Data pengguna ${fullName} berhasil diperbarui dan disinkronkan dengan Authentication.`,
        });
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            role,
            nip: nip || null,
            jabatan: jabatan || null,
          }),
        });
        setFeedback({
          type: 'ok',
          text: `Akun ${fullName} berhasil dibuat dan disinkronkan ke Authentication.`,
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data pengguna.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHardDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({
        type: 'ok',
        text: `Pengguna ${deleteTarget.full_name} berhasil dihapus permanen (hard delete) hingga ke Authentication.`,
      });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menghapus pengguna.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <section className="border border-zinc-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900">User Management</h2>
            <p className="text-xs text-zinc-500">
              Kelola akun Admin, Guru, dan Tenaga Kependidikan tersinkronisasi penuh dengan
              Authentication.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tambah User Baru</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="umRole" className="block text-[11px] font-semibold text-zinc-600">
              Filter Role
            </label>
            <select
              id="umRole"
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
            <label htmlFor="umSearch" className="block text-[11px] font-semibold text-zinc-600">
              Cari Pengguna
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                id="umSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / Email / NIP"
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

      <section className="border border-zinc-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-xs text-zinc-500">Memuat daftar pengguna...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500">
            Tidak ada pengguna yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">NIP / Jabatan</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Terdaftar</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        {u.full_name}
                        {isSelf && (
                          <span className="ml-2 text-[11px] font-medium text-red-700">(Anda)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{u.email}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <span className="font-mono tabular-nums">{u.nip || '—'}</span>
                        {u.jabatan ? ` · ${u.jabatan}` : ''}
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-700">
                        {ROLE_LABELS[u.role]}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {formatDateId(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            aria-label={`Edit ${u.full_name}`}
                            className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            aria-label={`Hapus permanen ${u.full_name}`}
                            title={
                              isSelf
                                ? 'Tidak dapat menghapus akun sendiri'
                                : 'Hapus permanen hingga ke Authentication'
                            }
                            className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-md border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <h3 className="text-base font-bold text-zinc-900">
                {editingUser ? 'Edit Pengguna' : 'Tambah User Baru'}
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

            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <div>
                <label htmlFor="umName" className="block text-xs font-semibold text-zinc-700">
                  Nama Lengkap
                </label>
                <input
                  id="umName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="umEmail" className="block text-xs font-semibold text-zinc-700">
                  Email (Authentication)
                </label>
                <input
                  id="umEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="umPass" className="block text-xs font-semibold text-zinc-700">
                  {editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
                </label>
                <input
                  id="umPass"
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="umRoleSelect" className="block text-xs font-semibold text-zinc-700">
                  Role Akses
                </label>
                <select
                  id="umRoleSelect"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={editingUser?.id === currentUser?.id}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none disabled:bg-zinc-100"
                >
                  <option value="admin">Administrator</option>
                  <option value="guru">Guru</option>
                  <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="umNip" className="block text-xs font-semibold text-zinc-700">
                    NIP / NUPTK
                  </label>
                  <input
                    id="umNip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Opsional"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="umJabatan" className="block text-xs font-semibold text-zinc-700">
                    Jabatan / Mapel
                  </label>
                  <input
                    id="umJabatan"
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Contoh: Wali Kelas TKJ"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none"
                  />
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
                  {submitting ? 'Menyimpan...' : 'Simpan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-md border border-zinc-200 bg-white p-6">
            <h3 className="text-base font-bold text-red-700">Hapus Permanen Pengguna?</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Anda akan melakukan <strong>hard delete</strong> terhadap akun{' '}
              <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email}). Akun ini akan
              dihapus secara permanen dari sistem <strong>Authentication</strong> dan database
              profil beserta seluruh catatan absensinya.
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
                onClick={() => void handleHardDelete()}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
