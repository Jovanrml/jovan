import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  DashboardSummary,
  EmployeeAttendanceRecord,
  EmployeeAttendanceStatus,
  JurusanKode,
  KelasRecord,
  Student,
  StudentAttendanceRecord,
  StudentAttendanceSheetRow,
  StudentAttendanceStatus,
  UserProfile,
  UserRole,
} from '../src/types.ts';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_SERVICE_ROLE_KEY &&
    !SUPABASE_URL.includes('your-project-id') &&
    !SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase-service-role-key')
);

let supabaseAdmin: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdmin(): SupabaseClient | null {
  return supabaseAdmin;
}

export function getTodayJakartaDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getJakartaTimeParts(): { hour: number; minute: number } {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  const [h, m] = formatted.split(':').map((n) => Number.parseInt(n, 10));
  return { hour: Number.isNaN(h) ? 7 : h, minute: Number.isNaN(m) ? 0 : m };
}

function inferTingkat(namaKelas: string): 'X' | 'XI' | 'XII' {
  const upper = namaKelas.trim().toUpperCase();
  if (upper.startsWith('XII ')) return 'XII';
  if (upper.startsWith('XI ')) return 'XI';
  return 'X';
}

// ---------------------------------------------------------------------------
// Local SQLite Store (node:sqlite) mirroring Supabase relational schema
// ---------------------------------------------------------------------------

let sqliteInstance: DatabaseSync | null = null;

function resolveWritableSqlitePath(): string {
  const localDir = path.resolve(process.cwd(), '.data');
  const localDb = path.join(localDir, 'prima_unggul.db');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    if (fs.existsSync(localDb)) {
      fs.accessSync(localDb, fs.constants.W_OK);
    }
    return localDb;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'smk_prima_unggul_data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tmpDb = path.join(tmpDir, 'prima_unggul.db');
    if (fs.existsSync(localDb) && !fs.existsSync(tmpDb)) {
      try {
        fs.copyFileSync(localDb, tmpDb);
      } catch {
        // Ignore copy failure and initialize fresh DB in tmp
      }
    }
    return tmpDb;
  }
}

function getSqlite(): DatabaseSync {
  if (sqliteInstance) return sqliteInstance;
  const dbPath = resolveWritableSqlitePath();
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      nip TEXT,
      jabatan TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'tenaga_kependidikan')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jurusan (
      kode TEXT PRIMARY KEY CHECK (kode IN ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
      nama_jurusan TEXT NOT NULL,
      bidang_keahlian TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kelas (
      id TEXT PRIMARY KEY,
      nama_kelas TEXT UNIQUE NOT NULL,
      tingkat TEXT NOT NULL CHECK (tingkat IN ('X', 'XI', 'XII')),
      jurusan_kode TEXT NOT NULL REFERENCES jurusan(kode) ON UPDATE CASCADE ON DELETE RESTRICT,
      wali_kelas_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      nis TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      kelas_id TEXT REFERENCES kelas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      kelas TEXT NOT NULL,
      jurusan TEXT NOT NULL REFERENCES jurusan(kode) ON UPDATE CASCADE ON DELETE RESTRICT,
      created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employee_attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      attendance_date TEXT NOT NULL,
      check_in_time TEXT,
      check_out_time TEXT,
      status TEXT NOT NULL CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS student_attendance (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      kelas_id TEXT REFERENCES kelas(id) ON DELETE SET NULL,
      attendance_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'alpa')),
      notes TEXT,
      recorded_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(student_id, attendance_date)
    );
  `);

  // Safe migration for existing SQLite databases created prior to relational kelas_id
  const studentCols = db.prepare('PRAGMA table_info(students)').all() as Array<{ name: string }>;
  if (!studentCols.some((c) => c.name === 'kelas_id')) {
    db.exec('ALTER TABLE students ADD COLUMN kelas_id TEXT REFERENCES kelas(id) ON DELETE RESTRICT;');
  }
  const stuAttCols = db
    .prepare('PRAGMA table_info(student_attendance)')
    .all() as Array<{ name: string }>;
  if (!stuAttCols.some((c) => c.name === 'kelas_id')) {
    db.exec('ALTER TABLE student_attendance ADD COLUMN kelas_id TEXT REFERENCES kelas(id) ON DELETE SET NULL;');
  }

  // Seed master jurusan (3 Bidang, 6 Konsentrasi) idempotently
  const now = new Date().toISOString();
  const upsertJurusan = db.prepare(`
    INSERT INTO jurusan (kode, nama_jurusan, bidang_keahlian, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(kode) DO UPDATE SET
      nama_jurusan = excluded.nama_jurusan,
      bidang_keahlian = excluded.bidang_keahlian
  `);
  const masterJurusan: Array<[JurusanKode, string, string]> = [
    ['TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi & Komunikasi'],
    ['DKV', 'Desain Komunikasi Visual', 'Teknologi Informasi & Komunikasi'],
    ['BC', 'Broadcasting dan Perfilman', 'Seni Kreatif & Penyiaran'],
    ['AK', 'Akuntansi dan Keuangan Lembaga', 'Bisnis & Manajemen'],
    ['MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'],
    ['BD', 'Bisnis Digital', 'Bisnis & Manajemen'],
  ];
  for (const [kode, namaJurusan, bidang] of masterJurusan) {
    upsertJurusan.run(kode, namaJurusan, bidang, now);
  }

  sqliteInstance = db;
  return db;
}

function resolveOrCreateKelasSqlite(
  db: DatabaseSync,
  namaKelas: string,
  jurusanKode: JurusanKode
): string {
  const cleanName = namaKelas.trim();
  const existing = db
    .prepare('SELECT id FROM kelas WHERE nama_kelas = ?')
    .get(cleanName) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO kelas (id, nama_kelas, tingkat, jurusan_kode, wali_kelas_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`
  ).run(id, cleanName, inferTingkat(cleanName), jurusanKode, now, now);
  return id;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

// ---------------------------------------------------------------------------
// Unified Repository Operations
// ---------------------------------------------------------------------------

export async function hasAnyUsers(): Promise<boolean> {
  if (supabaseAdmin) {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (!error) return (count ?? 0) > 0;
  }
  const db = getSqlite();
  const row = db.prepare('SELECT COUNT(*) as total FROM profiles').get() as { total: number };
  return (row?.total ?? 0) > 0;
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, nip, jabatan, role, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as UserProfile | null) ?? null;
  }
  const db = getSqlite();
  const row = db
    .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM profiles WHERE id = ?')
    .get(id) as UserProfile | undefined;
  return row ?? null;
}

export async function ensureSupabaseUserProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<UserProfile> {
  if (!supabaseAdmin) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
  const existing = await getProfileById(authUser.id);
  if (existing) {
    return existing;
  }
  const { count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  const isFirst = (count ?? 0) === 0;
  const metaRole = authUser.user_metadata?.role;
  const validRole: UserRole = isFirst
    ? 'admin'
    : metaRole === 'admin' || metaRole === 'guru' || metaRole === 'tenaga_kependidikan'
      ? metaRole
      : 'tenaga_kependidikan';

  const email = authUser.email || '';
  const fullName =
    (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name.trim()) ||
    email.split('@')[0] ||
    'Pengguna';
  const nip = typeof authUser.user_metadata?.nip === 'string' ? authUser.user_metadata.nip : null;
  const jabatan =
    typeof authUser.user_metadata?.jabatan === 'string' ? authUser.user_metadata.jabatan : null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authUser.id,
      email,
      full_name: fullName,
      nip,
      jabatan,
      role: validRole,
    })
    .select('id, email, full_name, nip, jabatan, role, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as UserProfile;
}

export async function registerUserLocal(input: {
  email: string;
  password: string;
  full_name: string;
  nip?: string | null;
  jabatan?: string | null;
}): Promise<UserProfile> {
  const db = getSqlite();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new Error('Email sudah terdaftar.');
  }
  const countRow = db.prepare('SELECT COUNT(*) as total FROM profiles').get() as { total: number };
  const role: UserRole = (countRow?.total ?? 0) === 0 ? 'admin' : 'tenaga_kependidikan';
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(input.password);

  db.prepare('INSERT INTO auth_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    normalizedEmail,
    passwordHash,
    now
  );
  db.prepare(
    `INSERT INTO profiles (id, email, full_name, nip, jabatan, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    normalizedEmail,
    input.full_name.trim(),
    input.nip?.trim() || null,
    input.jabatan?.trim() || null,
    role,
    now,
    now
  );

  return {
    id,
    email: normalizedEmail,
    full_name: input.full_name.trim(),
    nip: input.nip?.trim() || null,
    jabatan: input.jabatan?.trim() || null,
    role,
    created_at: now,
  };
}

export async function verifyUserLocal(email: string, password: string): Promise<UserProfile | null> {
  const db = getSqlite();
  const normalizedEmail = email.trim().toLowerCase();
  const authRow = db
    .prepare('SELECT id, password_hash FROM auth_users WHERE email = ?')
    .get(normalizedEmail) as { id: string; password_hash: string } | undefined;

  if (!authRow) return null;
  if (!verifyPassword(password, authRow.password_hash)) return null;
  return getProfileById(authRow.id);
}

// ---------------------------------------------------------------------------
// Admin User Management (Full Sync with Auth + Hard Delete)
// ---------------------------------------------------------------------------

export async function listAllUsers(): Promise<UserProfile[]> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, nip, jabatan, role, created_at')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as UserProfile[]) || [];
  }
  const db = getSqlite();
  return db
    .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM profiles ORDER BY created_at ASC')
    .all() as unknown as UserProfile[];
}

export async function listGuruProfiles(): Promise<UserProfile[]> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, nip, jabatan, role, created_at')
      .eq('role', 'guru')
      .order('full_name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as UserProfile[]) || [];
  }
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, email, full_name, nip, jabatan, role, created_at
       FROM profiles WHERE role = 'guru' ORDER BY full_name ASC`
    )
    .all() as unknown as UserProfile[];
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  nip?: string | null;
  jabatan?: string | null;
}): Promise<UserProfile> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim();
  const nip = input.nip?.trim() || null;
  const jabatan = input.jabatan?.trim() || null;

  if (supabaseAdmin) {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: input.role,
        nip,
        jabatan,
      },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message || 'Gagal membuat user di Supabase Auth.');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: created.user.id,
          email: normalizedEmail,
          full_name: fullName,
          nip,
          jabatan,
          role: input.role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, email, full_name, nip, jabatan, role, created_at')
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id, false);
      throw new Error(profileError.message);
    }
    return profile as UserProfile;
  }

  const db = getSqlite();
  const existing = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new Error('Email sudah digunakan oleh pengguna lain.');
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO auth_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    normalizedEmail,
    hashPassword(input.password),
    now
  );
  db.prepare(
    `INSERT INTO profiles (id, email, full_name, nip, jabatan, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, normalizedEmail, fullName, nip, jabatan, input.role, now, now);

  return {
    id,
    email: normalizedEmail,
    full_name: fullName,
    nip,
    jabatan,
    role: input.role,
    created_at: now,
  };
}

export async function adminUpdateUser(
  userId: string,
  input: {
    email?: string;
    password?: string;
    full_name?: string;
    role?: UserRole;
    nip?: string | null;
    jabatan?: string | null;
  }
): Promise<UserProfile> {
  const current = await getProfileById(userId);
  if (!current) {
    throw new Error('Pengguna tidak ditemukan.');
  }

  const nextEmail = input.email ? input.email.trim().toLowerCase() : current.email;
  const nextName = input.full_name ? input.full_name.trim() : current.full_name;
  const nextRole = input.role ?? current.role;
  const nextNip = input.nip !== undefined ? input.nip?.trim() || null : current.nip;
  const nextJabatan = input.jabatan !== undefined ? input.jabatan?.trim() || null : current.jabatan;

  if (supabaseAdmin) {
    const authPayload: {
      email?: string;
      password?: string;
      email_confirm?: boolean;
      user_metadata: Record<string, unknown>;
    } = {
      email: nextEmail,
      email_confirm: true,
      user_metadata: {
        full_name: nextName,
        role: nextRole,
        nip: nextNip,
        jabatan: nextJabatan,
      },
    };
    if (input.password && input.password.trim().length > 0) {
      authPayload.password = input.password;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authPayload);
    if (authError) {
      throw new Error(authError.message);
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        email: nextEmail,
        full_name: nextName,
        role: nextRole,
        nip: nextNip,
        jabatan: nextJabatan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, email, full_name, nip, jabatan, role, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data as UserProfile;
  }

  const db = getSqlite();
  const conflict = db
    .prepare('SELECT id FROM auth_users WHERE email = ? AND id != ?')
    .get(nextEmail, userId);
  if (conflict) {
    throw new Error('Email sudah digunakan oleh pengguna lain.');
  }

  const now = new Date().toISOString();
  if (input.password && input.password.trim().length > 0) {
    db.prepare('UPDATE auth_users SET email = ?, password_hash = ? WHERE id = ?').run(
      nextEmail,
      hashPassword(input.password),
      userId
    );
  } else {
    db.prepare('UPDATE auth_users SET email = ? WHERE id = ?').run(nextEmail, userId);
  }

  db.prepare(
    `UPDATE profiles
     SET email = ?, full_name = ?, role = ?, nip = ?, jabatan = ?, updated_at = ?
     WHERE id = ?`
  ).run(nextEmail, nextName, nextRole, nextNip, nextJabatan, now, userId);

  const updated = await getProfileById(userId);
  if (!updated) throw new Error('Gagal memperbarui pengguna.');
  return updated;
}

export async function adminHardDeleteUser(userId: string): Promise<void> {
  if (supabaseAdmin) {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId, false);
    if (authError) {
      throw new Error(authError.message);
    }
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    return;
  }

  const db = getSqlite();
  const existing = db.prepare('SELECT id FROM auth_users WHERE id = ?').get(userId);
  if (!existing) {
    throw new Error('Pengguna tidak ditemukan.');
  }
  db.prepare('DELETE FROM auth_users WHERE id = ?').run(userId);
}

// ---------------------------------------------------------------------------
// Relational Kelas & Wali Kelas Management (jurusan <-> kelas <-> profiles)
// ---------------------------------------------------------------------------

export async function listKelas(): Promise<KelasRecord[]> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('kelas')
      .select(
        `id, nama_kelas, tingkat, jurusan_kode, wali_kelas_id, created_at,
         jurusan:jurusan_kode (nama_jurusan),
         wali:wali_kelas_id (full_name),
         students (id)`
      )
      .order('nama_kelas', { ascending: true });
    if (error) throw new Error(error.message);

    interface RawKelas {
      id: string;
      nama_kelas: string;
      tingkat: 'X' | 'XI' | 'XII';
      jurusan_kode: JurusanKode;
      wali_kelas_id: string | null;
      created_at: string;
      jurusan?: { nama_jurusan: string } | null;
      wali?: { full_name: string } | null;
      students?: Array<{ id: string }> | null;
    }

    return ((data as unknown as RawKelas[]) || []).map((k) => ({
      id: k.id,
      nama_kelas: k.nama_kelas,
      tingkat: k.tingkat,
      jurusan_kode: k.jurusan_kode,
      nama_jurusan: k.jurusan?.nama_jurusan,
      wali_kelas_id: k.wali_kelas_id,
      wali_kelas_name: k.wali?.full_name ?? null,
      student_count: k.students?.length ?? 0,
      created_at: k.created_at,
    }));
  }

  const db = getSqlite();
  return db
    .prepare(
      `SELECT k.id, k.nama_kelas, k.tingkat, k.jurusan_kode, k.wali_kelas_id, k.created_at,
              j.nama_jurusan,
              p.full_name as wali_kelas_name,
              COUNT(s.id) as student_count
       FROM kelas k
       JOIN jurusan j ON j.kode = k.jurusan_kode
       LEFT JOIN profiles p ON p.id = k.wali_kelas_id
       LEFT JOIN students s ON s.kelas_id = k.id OR (s.kelas_id IS NULL AND s.kelas = k.nama_kelas)
       GROUP BY k.id
       ORDER BY k.nama_kelas ASC`
    )
    .all() as unknown as KelasRecord[];
}

export async function createKelas(input: {
  nama_kelas: string;
  tingkat: 'X' | 'XI' | 'XII';
  jurusan_kode: JurusanKode;
  wali_kelas_id?: string | null;
}): Promise<KelasRecord> {
  const namaKelas = input.nama_kelas.trim();
  const waliId = input.wali_kelas_id || null;

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('kelas')
      .insert({
        nama_kelas: namaKelas,
        tingkat: input.tingkat,
        jurusan_kode: input.jurusan_kode,
        wali_kelas_id: waliId,
      })
      .select('id, nama_kelas, tingkat, jurusan_kode, wali_kelas_id, created_at')
      .single();
    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        throw new Error(`Kelas ${namaKelas} sudah terdaftar.`);
      }
      throw new Error(error.message);
    }
    return { ...(data as KelasRecord), student_count: 0 };
  }

  const db = getSqlite();
  const exists = db.prepare('SELECT id FROM kelas WHERE nama_kelas = ?').get(namaKelas);
  if (exists) throw new Error(`Kelas ${namaKelas} sudah terdaftar.`);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO kelas (id, nama_kelas, tingkat, jurusan_kode, wali_kelas_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, namaKelas, input.tingkat, input.jurusan_kode, waliId, now, now);

  const list = await listKelas();
  const created = list.find((k) => k.id === id);
  if (!created) throw new Error('Gagal membuat kelas.');
  return created;
}

export async function updateKelas(
  id: string,
  input: {
    nama_kelas: string;
    tingkat: 'X' | 'XI' | 'XII';
    jurusan_kode: JurusanKode;
    wali_kelas_id?: string | null;
  }
): Promise<KelasRecord> {
  const namaKelas = input.nama_kelas.trim();
  const waliId = input.wali_kelas_id || null;

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from('kelas')
      .update({
        nama_kelas: namaKelas,
        tingkat: input.tingkat,
        jurusan_kode: input.jurusan_kode,
        wali_kelas_id: waliId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    // Sync denormalized kelas label on linked students
    await supabaseAdmin
      .from('students')
      .update({ kelas: namaKelas, jurusan: input.jurusan_kode })
      .eq('kelas_id', id);

    const all = await listKelas();
    const updated = all.find((k) => k.id === id);
    if (!updated) throw new Error('Kelas tidak ditemukan.');
    return updated;
  }

  const db = getSqlite();
  const conflict = db
    .prepare('SELECT id FROM kelas WHERE nama_kelas = ? AND id != ?')
    .get(namaKelas, id);
  if (conflict) throw new Error(`Nama kelas ${namaKelas} sudah digunakan.`);

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE kelas
     SET nama_kelas = ?, tingkat = ?, jurusan_kode = ?, wali_kelas_id = ?, updated_at = ?
     WHERE id = ?`
  ).run(namaKelas, input.tingkat, input.jurusan_kode, waliId, now, id);

  db.prepare('UPDATE students SET kelas = ?, jurusan = ?, updated_at = ? WHERE kelas_id = ?').run(
    namaKelas,
    input.jurusan_kode,
    now,
    id
  );

  const all = await listKelas();
  const updated = all.find((k) => k.id === id);
  if (!updated) throw new Error('Kelas tidak ditemukan.');
  return updated;
}

export async function deleteKelas(id: string): Promise<void> {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('kelas').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        throw new Error('Kelas masih memiliki siswa terdaftar. Pindahkan atau hapus siswa terlebih dahulu.');
      }
      throw new Error(error.message);
    }
    return;
  }
  const db = getSqlite();
  const countRow = db
    .prepare('SELECT COUNT(*) as total FROM students WHERE kelas_id = ?')
    .get(id) as { total: number };
  if ((countRow?.total ?? 0) > 0) {
    throw new Error('Kelas masih memiliki siswa terdaftar. Pindahkan atau hapus siswa terlebih dahulu.');
  }
  db.prepare('DELETE FROM kelas WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Students Management (NIS, Nama, Kelas, Jurusan + FK kelas_id)
// ---------------------------------------------------------------------------

export async function listStudents(filters?: {
  kelas?: string;
  jurusan?: string;
  search?: string;
}): Promise<Student[]> {
  if (supabaseAdmin) {
    let query = supabaseAdmin
      .from('students')
      .select('id, nis, nama, kelas_id, kelas, jurusan, created_at')
      .order('kelas', { ascending: true })
      .order('nama', { ascending: true });

    if (filters?.kelas) query = query.eq('kelas', filters.kelas);
    if (filters?.jurusan) query = query.eq('jurusan', filters.jurusan);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    let rows = (data as Student[]) || [];
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.kelas.toLowerCase().includes(q)
      );
    }
    return rows;
  }

  const db = getSqlite();
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.kelas) {
    clauses.push('kelas = ?');
    params.push(filters.kelas);
  }
  if (filters?.jurusan) {
    clauses.push('jurusan = ?');
    params.push(filters.jurusan);
  }
  if (filters?.search) {
    clauses.push('(LOWER(nama) LIKE ? OR LOWER(nis) LIKE ? OR LOWER(kelas) LIKE ?)');
    const q = `%${filters.search.trim().toLowerCase()}%`;
    params.push(q, q, q);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT id, nis, nama, kelas_id, kelas, jurusan, created_at FROM students ${whereSql} ORDER BY kelas ASC, nama ASC`
    )
    .all(...params) as unknown as Student[];
}

export async function createStudent(
  input: { nis: string; nama: string; kelas: string; jurusan: JurusanKode },
  createdBy: string
): Promise<Student> {
  const nis = input.nis.trim();
  const nama = input.nama.trim();
  const kelas = input.kelas.trim();

  if (supabaseAdmin) {
    // Trigger trg_students_sync_kelas on Supabase Postgres automatically resolves/creates kelas_id
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        nis,
        nama,
        kelas,
        jurusan: input.jurusan,
        created_by: createdBy,
      })
      .select('id, nis, nama, kelas_id, kelas, jurusan, created_at')
      .single();
    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        throw new Error(`NIS ${nis} sudah terdaftar.`);
      }
      throw new Error(error.message);
    }
    return data as Student;
  }

  const db = getSqlite();
  const existing = db.prepare('SELECT id FROM students WHERE nis = ?').get(nis);
  if (existing) {
    throw new Error(`NIS ${nis} sudah terdaftar.`);
  }
  const kelasId = resolveOrCreateKelasSqlite(db, kelas, input.jurusan);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO students (id, nis, nama, kelas_id, kelas, jurusan, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, nis, nama, kelasId, kelas, input.jurusan, createdBy, now, now);

  return { id, nis, nama, kelas_id: kelasId, kelas, jurusan: input.jurusan, created_at: now };
}

export async function bulkCreateStudents(
  items: Array<{ nis: string; nama: string; kelas: string; jurusan: JurusanKode }>,
  createdBy: string
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const item of items) {
    try {
      await createStudent(item, createdBy);
      inserted += 1;
    } catch {
      skipped += 1;
    }
  }
  return { inserted, skipped };
}

export async function updateStudent(
  id: string,
  input: { nis: string; nama: string; kelas: string; jurusan: JurusanKode }
): Promise<Student> {
  const nis = input.nis.trim();
  const nama = input.nama.trim();
  const kelas = input.kelas.trim();

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .update({
        nis,
        nama,
        kelas_id: null,
        kelas,
        jurusan: input.jurusan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, nis, nama, kelas_id, kelas, jurusan, created_at')
      .single();
    if (error) throw new Error(error.message);
    return data as Student;
  }

  const db = getSqlite();
  const conflict = db.prepare('SELECT id FROM students WHERE nis = ? AND id != ?').get(nis, id);
  if (conflict) {
    throw new Error(`NIS ${nis} sudah digunakan siswa lain.`);
  }
  const kelasId = resolveOrCreateKelasSqlite(db, kelas, input.jurusan);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE students SET nis = ?, nama = ?, kelas_id = ?, kelas = ?, jurusan = ?, updated_at = ? WHERE id = ?`
  ).run(nis, nama, kelasId, kelas, input.jurusan, now, id);
  const row = db
    .prepare('SELECT id, nis, nama, kelas_id, kelas, jurusan, created_at FROM students WHERE id = ?')
    .get(id) as Student | undefined;
  if (!row) throw new Error('Siswa tidak ditemukan.');
  return row;
}

export async function deleteStudent(id: string): Promise<void> {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const db = getSqlite();
  db.prepare('DELETE FROM students WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Employee Attendance (All Roles Self-Service + Admin Recap)
// ---------------------------------------------------------------------------

export async function getMyEmployeeAttendance(userId: string, month?: string): Promise<{
  today: EmployeeAttendanceRecord | null;
  history: EmployeeAttendanceRecord[];
}> {
  const todayDate = getTodayJakartaDate();

  if (supabaseAdmin) {
    const { data: todayData, error: todayError } = await supabaseAdmin
      .from('employee_attendance')
      .select('id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at')
      .eq('user_id', userId)
      .eq('attendance_date', todayDate)
      .maybeSingle();
    if (todayError) throw new Error(todayError.message);

    let historyQuery = supabaseAdmin
      .from('employee_attendance')
      .select('id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at')
      .eq('user_id', userId)
      .order('attendance_date', { ascending: false })
      .limit(60);

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${month}-${String(lastDay).padStart(2, '0')}`;
      historyQuery = historyQuery.gte('attendance_date', start).lte('attendance_date', end);
    }

    const { data: historyData, error: historyError } = await historyQuery;
    if (historyError) throw new Error(historyError.message);

    return {
      today: (todayData as EmployeeAttendanceRecord | null) ?? null,
      history: (historyData as EmployeeAttendanceRecord[]) || [],
    };
  }

  const db = getSqlite();
  const today = db
    .prepare(
      `SELECT id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at
       FROM employee_attendance WHERE user_id = ? AND attendance_date = ?`
    )
    .get(userId, todayDate) as EmployeeAttendanceRecord | undefined;

  let history: EmployeeAttendanceRecord[];
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    history = db
      .prepare(
        `SELECT id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at
         FROM employee_attendance
         WHERE user_id = ? AND attendance_date LIKE ?
         ORDER BY attendance_date DESC`
      )
      .all(userId, `${month}%`) as unknown as EmployeeAttendanceRecord[];
  } else {
    history = db
      .prepare(
        `SELECT id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at
         FROM employee_attendance
         WHERE user_id = ?
         ORDER BY attendance_date DESC
         LIMIT 60`
      )
      .all(userId) as unknown as EmployeeAttendanceRecord[];
  }

  return { today: today ?? null, history };
}

export async function employeeCheckIn(
  userId: string,
  requestedStatus: 'hadir' | 'izin' | 'sakit',
  notes?: string
): Promise<EmployeeAttendanceRecord> {
  const todayDate = getTodayJakartaDate();
  const nowIso = new Date().toISOString();

  let finalStatus: EmployeeAttendanceStatus = requestedStatus;
  if (requestedStatus === 'hadir') {
    const { hour, minute } = getJakartaTimeParts();
    if (hour > 7 || (hour === 7 && minute > 30)) {
      finalStatus = 'terlambat';
    }
  }

  const checkInTime = requestedStatus === 'hadir' ? nowIso : null;

  if (supabaseAdmin) {
    const { data: existing } = await supabaseAdmin
      .from('employee_attendance')
      .select('id')
      .eq('user_id', userId)
      .eq('attendance_date', todayDate)
      .maybeSingle();

    if (existing) {
      throw new Error('Anda sudah mencatat absensi untuk hari ini.');
    }

    const { data, error } = await supabaseAdmin
      .from('employee_attendance')
      .insert({
        user_id: userId,
        attendance_date: todayDate,
        check_in_time: checkInTime,
        status: finalStatus,
        notes: notes?.trim() || null,
      })
      .select('id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data as EmployeeAttendanceRecord;
  }

  const db = getSqlite();
  const existing = db
    .prepare('SELECT id FROM employee_attendance WHERE user_id = ? AND attendance_date = ?')
    .get(userId, todayDate);
  if (existing) {
    throw new Error('Anda sudah mencatat absensi untuk hari ini.');
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO employee_attendance
     (id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`
  ).run(id, userId, todayDate, checkInTime, finalStatus, notes?.trim() || null, nowIso, nowIso);

  return {
    id,
    user_id: userId,
    attendance_date: todayDate,
    check_in_time: checkInTime,
    check_out_time: null,
    status: finalStatus,
    notes: notes?.trim() || null,
    created_at: nowIso,
  };
}

export async function employeeCheckOut(userId: string): Promise<EmployeeAttendanceRecord> {
  const todayDate = getTodayJakartaDate();
  const nowIso = new Date().toISOString();

  if (supabaseAdmin) {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('employee_attendance')
      .select('id, status, check_out_time')
      .eq('user_id', userId)
      .eq('attendance_date', todayDate)
      .maybeSingle();

    if (findError) throw new Error(findError.message);
    if (!existing) throw new Error('Anda belum melakukan absen masuk hari ini.');
    if (existing.status === 'izin' || existing.status === 'sakit') {
      throw new Error('Status izin/sakit tidak memerlukan absen pulang.');
    }
    if (existing.check_out_time) {
      throw new Error('Anda sudah melakukan absen pulang hari ini.');
    }

    const { data, error } = await supabaseAdmin
      .from('employee_attendance')
      .update({ check_out_time: nowIso, updated_at: nowIso })
      .eq('id', existing.id)
      .select('id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data as EmployeeAttendanceRecord;
  }

  const db = getSqlite();
  const existing = db
    .prepare(
      'SELECT id, status, check_out_time FROM employee_attendance WHERE user_id = ? AND attendance_date = ?'
    )
    .get(userId, todayDate) as { id: string; status: string; check_out_time: string | null } | undefined;

  if (!existing) throw new Error('Anda belum melakukan absen masuk hari ini.');
  if (existing.status === 'izin' || existing.status === 'sakit') {
    throw new Error('Status izin/sakit tidak memerlukan absen pulang.');
  }
  if (existing.check_out_time) {
    throw new Error('Anda sudah melakukan absen pulang hari ini.');
  }

  db.prepare('UPDATE employee_attendance SET check_out_time = ?, updated_at = ? WHERE id = ?').run(
    nowIso,
    nowIso,
    existing.id
  );
  return db
    .prepare(
      'SELECT id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at FROM employee_attendance WHERE id = ?'
    )
    .get(existing.id) as unknown as EmployeeAttendanceRecord;
}

export async function getEmployeeAttendanceRecap(filters?: {
  startDate?: string;
  endDate?: string;
  role?: string;
  status?: string;
  search?: string;
}): Promise<EmployeeAttendanceRecord[]> {
  if (supabaseAdmin) {
    let query = supabaseAdmin
      .from('employee_attendance')
      .select(
        `id, user_id, attendance_date, check_in_time, check_out_time, status, notes, created_at,
         profiles:user_id (full_name, email, nip, role, jabatan)`
      )
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.startDate) query = query.gte('attendance_date', filters.startDate);
    if (filters?.endDate) query = query.lte('attendance_date', filters.endDate);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    interface RawRow {
      id: string;
      user_id: string;
      attendance_date: string;
      check_in_time: string | null;
      check_out_time: string | null;
      status: EmployeeAttendanceStatus;
      notes: string | null;
      created_at: string;
      profiles?: {
        full_name: string;
        email: string;
        nip: string | null;
        role: UserRole;
        jabatan: string | null;
      } | null;
    }

    let mapped: EmployeeAttendanceRecord[] = ((data as unknown as RawRow[]) || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      attendance_date: row.attendance_date,
      check_in_time: row.check_in_time,
      check_out_time: row.check_out_time,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      employee_name: row.profiles?.full_name || '-',
      employee_email: row.profiles?.email || '-',
      employee_nip: row.profiles?.nip ?? null,
      employee_role: row.profiles?.role,
      employee_jabatan: row.profiles?.jabatan ?? null,
    }));

    if (filters?.role) {
      mapped = mapped.filter((r) => r.employee_role === filters.role);
    }
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      mapped = mapped.filter(
        (r) =>
          (r.employee_name || '').toLowerCase().includes(q) ||
          (r.employee_email || '').toLowerCase().includes(q) ||
          (r.employee_nip || '').toLowerCase().includes(q)
      );
    }
    return mapped;
  }

  const db = getSqlite();
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.startDate) {
    clauses.push('ea.attendance_date >= ?');
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    clauses.push('ea.attendance_date <= ?');
    params.push(filters.endDate);
  }
  if (filters?.status) {
    clauses.push('ea.status = ?');
    params.push(filters.status);
  }
  if (filters?.role) {
    clauses.push('p.role = ?');
    params.push(filters.role);
  }
  if (filters?.search) {
    clauses.push('(LOWER(p.full_name) LIKE ? OR LOWER(p.email) LIKE ? OR LOWER(COALESCE(p.nip, "")) LIKE ?)');
    const q = `%${filters.search.trim().toLowerCase()}%`;
    params.push(q, q, q);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT ea.id, ea.user_id, ea.attendance_date, ea.check_in_time, ea.check_out_time,
              ea.status, ea.notes, ea.created_at,
              p.full_name as employee_name, p.email as employee_email,
              p.nip as employee_nip, p.role as employee_role, p.jabatan as employee_jabatan
       FROM employee_attendance ea
       JOIN profiles p ON p.id = ea.user_id
       ${whereSql}
       ORDER BY ea.attendance_date DESC, ea.created_at DESC`
    )
    .all(...params) as unknown as EmployeeAttendanceRecord[];
}

// ---------------------------------------------------------------------------
// Student Attendance (Guru & Admin)
// ---------------------------------------------------------------------------

export async function getStudentAttendanceSheet(filters: {
  date: string;
  kelas?: string;
  jurusan?: string;
  search?: string;
}): Promise<StudentAttendanceSheetRow[]> {
  const students = await listStudents({
    kelas: filters.kelas,
    jurusan: filters.jurusan,
    search: filters.search,
  });

  if (students.length === 0) return [];

  if (supabaseAdmin) {
    const studentIds = students.map((s) => s.id);
    const { data, error } = await supabaseAdmin
      .from('student_attendance')
      .select('id, student_id, status, notes, recorded_by, profiles:recorded_by(full_name)')
      .eq('attendance_date', filters.date)
      .in('student_id', studentIds);

    if (error) throw new Error(error.message);

    interface RawAttendance {
      id: string;
      student_id: string;
      status: StudentAttendanceStatus;
      notes: string | null;
      profiles?: { full_name: string } | null;
    }

    const byStudent = new Map<string, RawAttendance>();
    for (const row of (data as unknown as RawAttendance[]) || []) {
      byStudent.set(row.student_id, row);
    }

    return students.map((student) => {
      const rec = byStudent.get(student.id);
      return {
        student,
        attendance: {
          id: rec?.id,
          status: rec?.status ?? null,
          notes: rec?.notes ?? '',
          recorded_by_name: rec?.profiles?.full_name ?? null,
        },
      };
    });
  }

  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT sa.id, sa.student_id, sa.status, sa.notes, p.full_name as recorded_by_name
       FROM student_attendance sa
       LEFT JOIN profiles p ON p.id = sa.recorded_by
       WHERE sa.attendance_date = ?`
    )
    .all(filters.date) as Array<{
    id: string;
    student_id: string;
    status: StudentAttendanceStatus;
    notes: string | null;
    recorded_by_name: string | null;
  }>;

  const byStudent = new Map(rows.map((r) => [r.student_id, r]));
  return students.map((student) => {
    const rec = byStudent.get(student.id);
    return {
      student,
      attendance: {
        id: rec?.id,
        status: rec?.status ?? null,
        notes: rec?.notes ?? '',
        recorded_by_name: rec?.recorded_by_name ?? null,
      },
    };
  });
}

export async function saveStudentAttendanceBatch(
  date: string,
  records: Array<{ student_id: string; status: StudentAttendanceStatus; notes?: string }>,
  recordedBy: string
): Promise<{ saved: number }> {
  if (records.length === 0) return { saved: 0 };
  const now = new Date().toISOString();

  if (supabaseAdmin) {
    const payload = records.map((r) => ({
      student_id: r.student_id,
      attendance_date: date,
      status: r.status,
      notes: r.notes?.trim() || null,
      recorded_by: recordedBy,
      updated_at: now,
    }));

    const { error } = await supabaseAdmin
      .from('student_attendance')
      .upsert(payload, { onConflict: 'student_id,attendance_date' });
    if (error) throw new Error(error.message);
    return { saved: records.length };
  }

  const db = getSqlite();
  const getKelasIdStmt = db.prepare('SELECT kelas_id FROM students WHERE id = ?');
  const upsertStmt = db.prepare(`
    INSERT INTO student_attendance (id, student_id, kelas_id, attendance_date, status, notes, recorded_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, attendance_date) DO UPDATE SET
      kelas_id = excluded.kelas_id,
      status = excluded.status,
      notes = excluded.notes,
      recorded_by = excluded.recorded_by,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN');
  try {
    for (const r of records) {
      const stu = getKelasIdStmt.get(r.student_id) as { kelas_id: string | null } | undefined;
      upsertStmt.run(
        crypto.randomUUID(),
        r.student_id,
        stu?.kelas_id ?? null,
        date,
        r.status,
        r.notes?.trim() || null,
        recordedBy,
        now,
        now
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { saved: records.length };
}

export async function getStudentAttendanceRecap(filters?: {
  startDate?: string;
  endDate?: string;
  kelas?: string;
  jurusan?: string;
  status?: string;
  search?: string;
}): Promise<StudentAttendanceRecord[]> {
  if (supabaseAdmin) {
    let query = supabaseAdmin
      .from('student_attendance')
      .select(
        `id, student_id, kelas_id, attendance_date, status, notes, recorded_by,
         students:student_id (nis, nama, kelas, jurusan),
         profiles:recorded_by (full_name)`
      )
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.startDate) query = query.gte('attendance_date', filters.startDate);
    if (filters?.endDate) query = query.lte('attendance_date', filters.endDate);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    interface RawRow {
      id: string;
      student_id: string;
      kelas_id: string | null;
      attendance_date: string;
      status: StudentAttendanceStatus;
      notes: string | null;
      recorded_by: string | null;
      students?: { nis: string; nama: string; kelas: string; jurusan: JurusanKode } | null;
      profiles?: { full_name: string } | null;
    }

    let mapped: StudentAttendanceRecord[] = ((data as unknown as RawRow[]) || []).map((r) => ({
      id: r.id,
      student_id: r.student_id,
      kelas_id: r.kelas_id,
      attendance_date: r.attendance_date,
      status: r.status,
      notes: r.notes,
      recorded_by: r.recorded_by,
      recorded_by_name: r.profiles?.full_name ?? null,
      nis: r.students?.nis,
      nama: r.students?.nama,
      kelas: r.students?.kelas,
      jurusan: r.students?.jurusan,
    }));

    if (filters?.kelas) mapped = mapped.filter((r) => r.kelas === filters.kelas);
    if (filters?.jurusan) mapped = mapped.filter((r) => r.jurusan === filters.jurusan);
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      mapped = mapped.filter(
        (r) =>
          (r.nama || '').toLowerCase().includes(q) ||
          (r.nis || '').toLowerCase().includes(q) ||
          (r.kelas || '').toLowerCase().includes(q)
      );
    }
    return mapped;
  }

  const db = getSqlite();
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.startDate) {
    clauses.push('sa.attendance_date >= ?');
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    clauses.push('sa.attendance_date <= ?');
    params.push(filters.endDate);
  }
  if (filters?.status) {
    clauses.push('sa.status = ?');
    params.push(filters.status);
  }
  if (filters?.kelas) {
    clauses.push('s.kelas = ?');
    params.push(filters.kelas);
  }
  if (filters?.jurusan) {
    clauses.push('s.jurusan = ?');
    params.push(filters.jurusan);
  }
  if (filters?.search) {
    clauses.push('(LOWER(s.nama) LIKE ? OR LOWER(s.nis) LIKE ? OR LOWER(s.kelas) LIKE ?)');
    const q = `%${filters.search.trim().toLowerCase()}%`;
    params.push(q, q, q);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT sa.id, sa.student_id, sa.kelas_id, sa.attendance_date, sa.status, sa.notes, sa.recorded_by,
              p.full_name as recorded_by_name,
              s.nis, s.nama, s.kelas, s.jurusan
       FROM student_attendance sa
       JOIN students s ON s.id = sa.student_id
       LEFT JOIN profiles p ON p.id = sa.recorded_by
       ${whereSql}
       ORDER BY sa.attendance_date DESC, s.kelas ASC, s.nama ASC`
    )
    .all(...params) as unknown as StudentAttendanceRecord[];
}

// ---------------------------------------------------------------------------
// Dashboard Summary
// ---------------------------------------------------------------------------

export async function getDashboardSummary(user: UserProfile): Promise<DashboardSummary> {
  const todayDate = getTodayJakartaDate();
  const currentMonth = todayDate.slice(0, 7);
  const myAttendance = await getMyEmployeeAttendance(user.id, currentMonth);

  const myMonthStats = {
    hadir: myAttendance.history.filter((h) => h.status === 'hadir').length,
    terlambat: myAttendance.history.filter((h) => h.status === 'terlambat').length,
    izin: myAttendance.history.filter((h) => h.status === 'izin').length,
    sakit: myAttendance.history.filter((h) => h.status === 'sakit').length,
    total: myAttendance.history.length,
  };

  if (user.role === 'tenaga_kependidikan') {
    return {
      todayDate,
      myTodayAttendance: myAttendance.today,
      myMonthStats,
      recentEmployeeLogs: myAttendance.history.slice(0, 8),
      recentStudentLogs: [],
    };
  }

  const allStudents = await listStudents();
  const todayStudentRecs = await getStudentAttendanceRecap({
    startDate: todayDate,
    endDate: todayDate,
  });

  const studentsPresentToday = todayStudentRecs.filter((r) => r.status === 'hadir').length;
  const studentsAbsentToday = todayStudentRecs.filter((r) => r.status !== 'hadir').length;
  const studentsUnmarkedToday = Math.max(0, allStudents.length - todayStudentRecs.length);

  if (user.role === 'guru') {
    return {
      todayDate,
      myTodayAttendance: myAttendance.today,
      myMonthStats,
      schoolStats: {
        totalEmployees: 0,
        employeesPresentToday: 0,
        totalStudents: allStudents.length,
        studentsPresentToday,
        studentsAbsentToday,
        studentsUnmarkedToday,
      },
      recentEmployeeLogs: myAttendance.history.slice(0, 6),
      recentStudentLogs: todayStudentRecs.slice(0, 8),
    };
  }

  const allUsers = await listAllUsers();
  const todayEmpRecs = await getEmployeeAttendanceRecap({
    startDate: todayDate,
    endDate: todayDate,
  });
  const employeesPresentToday = todayEmpRecs.filter(
    (r) => r.status === 'hadir' || r.status === 'terlambat'
  ).length;

  return {
    todayDate,
    myTodayAttendance: myAttendance.today,
    myMonthStats,
    schoolStats: {
      totalEmployees: allUsers.length,
      employeesPresentToday,
      totalStudents: allStudents.length,
      studentsPresentToday,
      studentsAbsentToday,
      studentsUnmarkedToday,
    },
    recentEmployeeLogs: todayEmpRecs.slice(0, 8),
    recentStudentLogs: todayStudentRecs.slice(0, 8),
  };
}
