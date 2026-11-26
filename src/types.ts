export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type JurusanKode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';

export type EmployeeAttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit';

export type StudentAttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  jabatan: string | null;
  role: UserRole;
  created_at: string;
}

export interface KelasRecord {
  id: string;
  nama_kelas: string;
  tingkat: 'X' | 'XI' | 'XII';
  jurusan_kode: JurusanKode;
  nama_jurusan?: string;
  wali_kelas_id: string | null;
  wali_kelas_name?: string | null;
  student_count: number;
  created_at: string;
}

export interface Student {
  id: string;
  nis: string;
  nama: string;
  kelas_id?: string | null;
  kelas: string;
  jurusan: JurusanKode;
  created_at: string;
}

export interface EmployeeAttendanceRecord {
  id: string;
  user_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: EmployeeAttendanceStatus;
  notes: string | null;
  created_at: string;
  employee_name?: string;
  employee_email?: string;
  employee_nip?: string | null;
  employee_role?: UserRole;
  employee_jabatan?: string | null;
}

export interface StudentAttendanceRecord {
  id: string;
  student_id: string;
  kelas_id?: string | null;
  attendance_date: string;
  status: StudentAttendanceStatus;
  notes: string | null;
  recorded_by: string | null;
  recorded_by_name?: string | null;
  nis?: string;
  nama?: string;
  kelas?: string;
  jurusan?: JurusanKode;
}

export interface StudentAttendanceSheetRow {
  student: Student;
  attendance: {
    id?: string;
    status: StudentAttendanceStatus | null;
    notes: string;
    recorded_by_name?: string | null;
  };
}

export interface DashboardSummary {
  todayDate: string;
  myTodayAttendance: EmployeeAttendanceRecord | null;
  myMonthStats: {
    hadir: number;
    terlambat: number;
    izin: number;
    sakit: number;
    total: number;
  };
  schoolStats?: {
    totalEmployees: number;
    employeesPresentToday: number;
    totalStudents: number;
    studentsPresentToday: number;
    studentsAbsentToday: number;
    studentsUnmarkedToday: number;
  };
  recentEmployeeLogs: EmployeeAttendanceRecord[];
  recentStudentLogs: StudentAttendanceRecord[];
}
