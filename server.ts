import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import type { JurusanKode, StudentAttendanceStatus, UserProfile, UserRole } from './src/types.ts';
import {
  adminCreateUser,
  adminHardDeleteUser,
  adminUpdateUser,
  bulkCreateStudents,
  createKelas,
  createStudent,
  deleteKelas,
  deleteStudent,
  employeeCheckIn,
  employeeCheckOut,
  ensureSupabaseUserProfile,
  getDashboardSummary,
  getEmployeeAttendanceRecap,
  getMyEmployeeAttendance,
  getProfileById,
  getStudentAttendanceRecap,
  getStudentAttendanceSheet,
  getSupabaseAdmin,
  getTodayJakartaDate,
  hasAnyUsers,
  isSupabaseConfigured,
  listAllUsers,
  listGuruProfiles,
  listKelas,
  listStudents,
  registerUserLocal,
  saveStudentAttendanceBatch,
  updateKelas,
  updateStudent,
  verifyUserLocal,
} from './server/db.ts';

const PORT =
  process.env.NODE_ENV === 'production'
    ? Number.parseInt(process.env.PORT || '3000', 10)
    : 3000;
const SESSION_COOKIE_NAME = 'smk_pu_session';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_smk_prima_unggul').digest('hex');

interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

function signSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.exp || Date.now() > parsed.exp) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

async function resolveCurrentUser(req: Request): Promise<UserProfile | null> {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin && bearerToken) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
    if (!error && data.user) {
      return ensureSupabaseUserProfile({
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      });
    }
    return null;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = bearerToken || cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const userId = verifySessionToken(token);
  if (!userId) return null;
  return getProfileById(userId);
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sesi tidak valid atau belum masuk.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Gagal memverifikasi sesi.',
    });
  }
}

function requireRoles(allowed: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki izin akses untuk fitur ini.' });
      return;
    }
    next();
  };
}

const VALID_ROLES: UserRole[] = ['admin', 'guru', 'tenaga_kependidikan'];
const VALID_JURUSAN: JurusanKode[] = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'];
const VALID_STUDENT_STATUS: StudentAttendanceStatus[] = ['hadir', 'sakit', 'izin', 'alpa'];

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // -------------------------------------------------------------------------
  // Auth Routes
  // -------------------------------------------------------------------------
  app.get('/api/auth/bootstrap-status', async (_req: Request, res: Response) => {
    try {
      const hasUsers = await hasAnyUsers();
      res.json({
        hasUsers,
        provider: isSupabaseConfigured ? 'supabase' : 'local',
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal memeriksa status awal.',
      });
    }
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const user = await resolveCurrentUser(req);
      res.json({ user });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal memuat profil pengguna.',
      });
    }
  });

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, full_name, nip, jabatan } = req.body as {
        email?: string;
        password?: string;
        full_name?: string;
        nip?: string;
        jabatan?: string;
      };

      if (!email || !password || !full_name) {
        res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        return;
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const usersExist = await hasAnyUsers();
        const assignedRole: UserRole = usersExist ? 'tenaga_kependidikan' : 'admin';
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name.trim(),
            nip: nip?.trim() || null,
            jabatan: jabatan?.trim() || null,
            role: assignedRole,
          },
        });
        if (error || !created.user) {
          res.status(400).json({ error: error?.message || 'Gagal mendaftarkan akun.' });
          return;
        }
        const profile = await ensureSupabaseUserProfile({
          id: created.user.id,
          email: created.user.email,
          user_metadata: created.user.user_metadata,
        });
        res.status(201).json({ user: profile });
        return;
      }

      const profile = await registerUserLocal({
        email,
        password,
        full_name,
        nip,
        jabatan,
      });
      const token = signSessionToken(profile.id);
      setSessionCookie(res, token);
      res.status(201).json({ user: profile });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal mendaftarkan akun.',
      });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
        return;
      }
      const user = await verifyUserLocal(email, password);
      if (!user) {
        res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
        return;
      }
      const token = signSessionToken(user.id);
      setSessionCookie(res, token);
      res.json({ user });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal masuk ke sistem.',
      });
    }
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  app.get('/api/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await getDashboardSummary(req.user!);
      res.json(summary);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.',
      });
    }
  });

  // -------------------------------------------------------------------------
  // Employee Self-Attendance (All Roles)
  // -------------------------------------------------------------------------
  app.get(
    '/api/attendance/employees/me',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const month = typeof req.query.month === 'string' ? req.query.month : undefined;
        const data = await getMyEmployeeAttendance(req.user!.id, month);
        res.json({ ...data, todayDate: getTodayJakartaDate() });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat absensi karyawan.',
        });
      }
    }
  );

  app.post(
    '/api/attendance/employees/check-in',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { status, notes } = req.body as {
          status?: 'hadir' | 'izin' | 'sakit';
          notes?: string;
        };
        const validStatus = status === 'izin' || status === 'sakit' ? status : 'hadir';
        const record = await employeeCheckIn(req.user!.id, validStatus, notes);
        res.status(201).json({ record });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal mencatat absensi masuk.',
        });
      }
    }
  );

  app.post(
    '/api/attendance/employees/check-out',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const record = await employeeCheckOut(req.user!.id);
        res.json({ record });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal mencatat absensi pulang.',
        });
      }
    }
  );

  app.get(
    '/api/attendance/employees/recap',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const records = await getEmployeeAttendanceRecap({
          startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
          endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
          role: typeof req.query.role === 'string' ? req.query.role : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        });
        res.json({ records });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat rekap absensi karyawan.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // Relational Kelas & Wali Kelas (jurusan <-> kelas <-> profiles)
  // -------------------------------------------------------------------------
  app.get(
    '/api/kelas',
    requireAuth,
    requireRoles(['admin', 'guru']),
    async (_req: AuthenticatedRequest, res: Response) => {
      try {
        const [kelas, gurus] = await Promise.all([listKelas(), listGuruProfiles()]);
        res.json({ kelas, gurus });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat daftar kelas.',
        });
      }
    }
  );

  app.post(
    '/api/kelas',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { nama_kelas, tingkat, jurusan_kode, wali_kelas_id } = req.body as {
          nama_kelas?: string;
          tingkat?: 'X' | 'XI' | 'XII';
          jurusan_kode?: JurusanKode;
          wali_kelas_id?: string | null;
        };
        if (
          !nama_kelas ||
          !tingkat ||
          !['X', 'XI', 'XII'].includes(tingkat) ||
          !jurusan_kode ||
          !VALID_JURUSAN.includes(jurusan_kode)
        ) {
          res.status(400).json({ error: 'Nama kelas, tingkat, dan jurusan wajib diisi.' });
          return;
        }
        const record = await createKelas({
          nama_kelas,
          tingkat,
          jurusan_kode,
          wali_kelas_id: wali_kelas_id || null,
        });
        res.status(201).json({ kelas: record });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menambahkan kelas.',
        });
      }
    }
  );

  app.patch(
    '/api/kelas/:id',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { nama_kelas, tingkat, jurusan_kode, wali_kelas_id } = req.body as {
          nama_kelas?: string;
          tingkat?: 'X' | 'XI' | 'XII';
          jurusan_kode?: JurusanKode;
          wali_kelas_id?: string | null;
        };
        if (
          !nama_kelas ||
          !tingkat ||
          !['X', 'XI', 'XII'].includes(tingkat) ||
          !jurusan_kode ||
          !VALID_JURUSAN.includes(jurusan_kode)
        ) {
          res.status(400).json({ error: 'Nama kelas, tingkat, dan jurusan wajib diisi.' });
          return;
        }
        const record = await updateKelas(String(req.params.id), {
          nama_kelas,
          tingkat,
          jurusan_kode,
          wali_kelas_id: wali_kelas_id || null,
        });
        res.json({ kelas: record });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal memperbarui data kelas.',
        });
      }
    }
  );

  app.delete(
    '/api/kelas/:id',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        await deleteKelas(String(req.params.id));
        res.json({ success: true });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menghapus kelas.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // Students Master Data (Admin CRUD, Guru Read)
  // -------------------------------------------------------------------------
  app.get(
    '/api/students',
    requireAuth,
    requireRoles(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const students = await listStudents({
          kelas: typeof req.query.kelas === 'string' ? req.query.kelas : undefined,
          jurusan: typeof req.query.jurusan === 'string' ? req.query.jurusan : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        });
        const allStudents = await listStudents();
        const classes = Array.from(new Set(allStudents.map((s) => s.kelas))).sort();
        res.json({ students, classes });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
        });
      }
    }
  );

  app.post(
    '/api/students',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { nis, nama, kelas, jurusan } = req.body as {
          nis?: string;
          nama?: string;
          kelas?: string;
          jurusan?: JurusanKode;
        };
        if (!nis || !nama || !kelas || !jurusan || !VALID_JURUSAN.includes(jurusan)) {
          res.status(400).json({ error: 'NIS, nama, kelas, dan jurusan valid wajib diisi.' });
          return;
        }
        const student = await createStudent({ nis, nama, kelas, jurusan }, req.user!.id);
        res.status(201).json({ student });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menambahkan siswa.',
        });
      }
    }
  );

  app.post(
    '/api/students/bulk',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { items } = req.body as {
          items?: Array<{ nis?: string; nama?: string; kelas?: string; jurusan?: JurusanKode }>;
        };
        if (!Array.isArray(items) || items.length === 0) {
          res.status(400).json({ error: 'Daftar siswa tidak boleh kosong.' });
          return;
        }
        const sanitized = items.filter(
          (i): i is { nis: string; nama: string; kelas: string; jurusan: JurusanKode } =>
            Boolean(i.nis && i.nama && i.kelas && i.jurusan && VALID_JURUSAN.includes(i.jurusan))
        );
        if (sanitized.length === 0) {
          res.status(400).json({ error: 'Tidak ada baris data siswa yang valid.' });
          return;
        }
        const result = await bulkCreateStudents(sanitized, req.user!.id);
        res.status(201).json(result);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal mengimpor data siswa.',
        });
      }
    }
  );

  app.patch(
    '/api/students/:id',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { nis, nama, kelas, jurusan } = req.body as {
          nis?: string;
          nama?: string;
          kelas?: string;
          jurusan?: JurusanKode;
        };
        if (!nis || !nama || !kelas || !jurusan || !VALID_JURUSAN.includes(jurusan)) {
          res.status(400).json({ error: 'NIS, nama, kelas, dan jurusan valid wajib diisi.' });
          return;
        }
        const student = await updateStudent(String(req.params.id), { nis, nama, kelas, jurusan });
        res.json({ student });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal memperbarui data siswa.',
        });
      }
    }
  );

  app.delete(
    '/api/students/:id',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        await deleteStudent(String(req.params.id));
        res.json({ success: true });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menghapus data siswa.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // Student Attendance (Admin & Guru)
  // -------------------------------------------------------------------------
  app.get(
    '/api/attendance/students',
    requireAuth,
    requireRoles(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const date =
          typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
            ? req.query.date
            : getTodayJakartaDate();
        const rows = await getStudentAttendanceSheet({
          date,
          kelas: typeof req.query.kelas === 'string' ? req.query.kelas : undefined,
          jurusan: typeof req.query.jurusan === 'string' ? req.query.jurusan : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        });
        const allStudents = await listStudents();
        const classes = Array.from(new Set(allStudents.map((s) => s.kelas))).sort();
        res.json({ date, rows, classes });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat lembar absensi siswa.',
        });
      }
    }
  );

  app.post(
    '/api/attendance/students/batch',
    requireAuth,
    requireRoles(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { date, records } = req.body as {
          date?: string;
          records?: Array<{ student_id: string; status: StudentAttendanceStatus; notes?: string }>;
        };
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          res.status(400).json({ error: 'Format tanggal absensi tidak valid.' });
          return;
        }
        if (!Array.isArray(records) || records.length === 0) {
          res.status(400).json({ error: 'Minimal satu status siswa harus dipilih.' });
          return;
        }
        const validRecords = records.filter(
          (r) => r.student_id && VALID_STUDENT_STATUS.includes(r.status)
        );
        const result = await saveStudentAttendanceBatch(date, validRecords, req.user!.id);
        res.json(result);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
        });
      }
    }
  );

  app.get(
    '/api/attendance/students/recap',
    requireAuth,
    requireRoles(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const records = await getStudentAttendanceRecap({
          startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
          endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
          kelas: typeof req.query.kelas === 'string' ? req.query.kelas : undefined,
          jurusan: typeof req.query.jurusan === 'string' ? req.query.jurusan : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        });
        const allStudents = await listStudents();
        const classes = Array.from(new Set(allStudents.map((s) => s.kelas))).sort();
        res.json({ records, classes });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // User Management (Admin Only, Synced with Auth + Hard Delete)
  // -------------------------------------------------------------------------
  app.get(
    '/api/users',
    requireAuth,
    requireRoles(['admin']),
    async (_req: AuthenticatedRequest, res: Response) => {
      try {
        const users = await listAllUsers();
        res.json({ users });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.',
        });
      }
    }
  );

  app.post(
    '/api/users',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { email, password, full_name, role, nip, jabatan } = req.body as {
          email?: string;
          password?: string;
          full_name?: string;
          role?: UserRole;
          nip?: string;
          jabatan?: string;
        };
        if (!email || !password || !full_name || !role || !VALID_ROLES.includes(role)) {
          res
            .status(400)
            .json({ error: 'Nama lengkap, email, kata sandi, dan role wajib diisi.' });
          return;
        }
        if (password.length < 6) {
          res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
          return;
        }
        const user = await adminCreateUser({
          email,
          password,
          full_name,
          role,
          nip,
          jabatan,
        });
        res.status(201).json({ user });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menambahkan pengguna.',
        });
      }
    }
  );

  app.patch(
    '/api/users/:id',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { email, password, full_name, role, nip, jabatan } = req.body as {
          email?: string;
          password?: string;
          full_name?: string;
          role?: UserRole;
          nip?: string | null;
          jabatan?: string | null;
        };
        if (role && !VALID_ROLES.includes(role)) {
          res.status(400).json({ error: 'Role tidak valid.' });
          return;
        }
        if (password && password.length > 0 && password.length < 6) {
          res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
          return;
        }
        const targetId = String(req.params.id);
        if (targetId === req.user!.id && role && role !== 'admin') {
          res.status(400).json({ error: 'Anda tidak dapat menurunkan role akun Anda sendiri.' });
          return;
        }
        const user = await adminUpdateUser(targetId, {
          email,
          password,
          full_name,
          role,
          nip,
          jabatan,
        });
        res.json({ user });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal memperbarui data pengguna.',
        });
      }
    }
  );

  app.delete(
    '/api/users/:id',
    requireAuth,
    requireRoles(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const targetId = String(req.params.id);
        if (targetId === req.user!.id) {
          res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' });
          return;
        }
        await adminHardDeleteUser(targetId);
        res.json({ success: true });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menghapus pengguna secara permanen.',
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // Frontend Serving (Vite Dev Middleware or Static Production Build)
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output tidak ditemukan.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMK Prima Unggul server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
