-- ============================================================================
-- SMK PRIMA UNGGUL — SKEMA DATABASE RELASIONAL SUPABASE (POSTGRESQL)
-- Relasi penuh antar tabel:
--   auth.users (Supabase Auth)
--     └── 1:1 ──> public.profiles (role: admin | guru | tenaga_kependidikan)
--                    ├── 1:N ──> public.employee_attendance (user_id)
--                    ├── 1:N ──> public.kelas (wali_kelas_id)
--                    ├── 1:N ──> public.students (created_by)
--                    └── 1:N ──> public.student_attendance (recorded_by)
--   public.jurusan (kode PK: TKJ, DKV, AK, BC, MPLB, BD)
--     ├── 1:N ──> public.kelas (jurusan_kode)
--     └── 1:N ──> public.students (jurusan_kode)
--   public.kelas (id PK)
--     ├── 1:N ──> public.students (kelas_id)
--     └── 1:N ──> public.student_attendance (kelas_id)
--   public.students (id PK)
--     └── 1:N ──> public.student_attendance (student_id)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 0. Utility Trigger Function: Auto-update kolom updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Tabel Profiles (Relasi 1:1 langsung ke auth.users Supabase Authentication)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  nip text,
  jabatan text,
  role text not null default 'tenaga_kependidikan'
    check (role in ('admin', 'guru', 'tenaga_kependidikan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Trigger: User pertama yang dibuat di Supabase Authentication otomatis menjadi 'admin'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  existing_count integer;
  assigned_role text;
begin
  select count(*) into existing_count from public.profiles;

  if existing_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(
      nullif(new.raw_user_meta_data->>'role', ''),
      'tenaga_kependidikan'
    );
    if assigned_role not in ('admin', 'guru', 'tenaga_kependidikan') then
      assigned_role := 'tenaga_kependidikan';
    end if;
  end if;

  insert into public.profiles (id, email, full_name, nip, jabatan, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'nip', ''),
    nullif(new.raw_user_meta_data->>'jabatan', ''),
    assigned_role
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        nip = excluded.nip,
        jabatan = excluded.jabatan,
        role = case
          when (select count(*) from public.profiles) <= 1 then 'admin'
          else excluded.role
        end,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Tabel Master Jurusan SMK Prima Unggul (3 Bidang, 6 Konsentrasi Keahlian)
-- ----------------------------------------------------------------------------
create table if not exists public.jurusan (
  kode text primary key check (kode in ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
  nama_jurusan text not null,
  bidang_keahlian text not null,
  created_at timestamptz not null default now()
);

insert into public.jurusan (kode, nama_jurusan, bidang_keahlian)
values
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi & Komunikasi'),
  ('DKV', 'Desain Komunikasi Visual', 'Teknologi Informasi & Komunikasi'),
  ('BC', 'Broadcasting dan Perfilman', 'Seni Kreatif & Penyiaran'),
  ('AK', 'Akuntansi dan Keuangan Lembaga', 'Bisnis & Manajemen'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'),
  ('BD', 'Bisnis Digital', 'Bisnis & Manajemen')
on conflict (kode) do update
  set nama_jurusan = excluded.nama_jurusan,
      bidang_keahlian = excluded.bidang_keahlian;

-- ----------------------------------------------------------------------------
-- 3. Tabel Kelas (Relasi ke public.jurusan dan wali kelas di public.profiles)
-- ----------------------------------------------------------------------------
create table if not exists public.kelas (
  id uuid primary key default gen_random_uuid(),
  nama_kelas text unique not null,
  tingkat text not null check (tingkat in ('X', 'XI', 'XII')),
  jurusan_kode text not null references public.jurusan(kode) on update cascade on delete restrict,
  wali_kelas_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_kelas_jurusan on public.kelas(jurusan_kode);
create index if not exists idx_kelas_wali on public.kelas(wali_kelas_id);

drop trigger if exists trg_kelas_updated_at on public.kelas;
create trigger trg_kelas_updated_at
  before update on public.kelas
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Tabel Data Siswa (Relasi ke public.kelas, public.jurusan, & public.profiles)
-- ----------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text unique not null,
  nama text not null,
  kelas_id uuid references public.kelas(id) on update cascade on delete restrict,
  kelas text not null,
  jurusan text not null references public.jurusan(kode) on update cascade on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_kelas_id on public.students(kelas_id);
create index if not exists idx_students_jurusan on public.students(jurusan);
create index if not exists idx_students_nis on public.students(nis);

-- Trigger otomatis memastikan setiap siswa terhubung ke baris public.kelas via kelas_id
create or replace function public.sync_student_kelas_relation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resolved_kelas_id uuid;
  inferred_tingkat text;
begin
  if new.kelas_id is not null then
    select nama_kelas, jurusan_kode into new.kelas, new.jurusan
    from public.kelas
    where id = new.kelas_id;
    return new;
  end if;

  select id into resolved_kelas_id
  from public.kelas
  where nama_kelas = trim(new.kelas)
  limit 1;

  if resolved_kelas_id is null then
    inferred_tingkat := case
      when upper(trim(new.kelas)) like 'XII %' then 'XII'
      when upper(trim(new.kelas)) like 'XI %' then 'XI'
      else 'X'
    end;

    insert into public.kelas (nama_kelas, tingkat, jurusan_kode)
    values (trim(new.kelas), inferred_tingkat, new.jurusan)
    on conflict (nama_kelas) do update set jurusan_kode = excluded.jurusan_kode
    returning id into resolved_kelas_id;
  end if;

  new.kelas := trim(new.kelas);
  new.kelas_id := resolved_kelas_id;
  return new;
end;
$$;

drop trigger if exists trg_students_sync_kelas on public.students;
create trigger trg_students_sync_kelas
  before insert or update on public.students
  for each row execute procedure public.sync_student_kelas_relation();

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
  before update on public.students
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Tabel Absensi Karyawan (Relasi N:1 ke public.profiles, semua role)
-- ----------------------------------------------------------------------------
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null default current_date,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text not null check (status in ('hadir', 'terlambat', 'izin', 'sakit')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, attendance_date)
);

create index if not exists idx_emp_att_date on public.employee_attendance(attendance_date desc);
create index if not exists idx_emp_att_user_date on public.employee_attendance(user_id, attendance_date desc);

drop trigger if exists trg_emp_att_updated_at on public.employee_attendance;
create trigger trg_emp_att_updated_at
  before update on public.employee_attendance
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Tabel Absensi Siswa (Relasi ke public.students, public.kelas, & public.profiles)
-- ----------------------------------------------------------------------------
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  kelas_id uuid references public.kelas(id) on delete set null,
  attendance_date date not null default current_date,
  status text not null check (status in ('hadir', 'sakit', 'izin', 'alpa')),
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, attendance_date)
);

create index if not exists idx_stu_att_date on public.student_attendance(attendance_date desc);
create index if not exists idx_stu_att_student_date on public.student_attendance(student_id, attendance_date desc);
create index if not exists idx_stu_att_kelas_date on public.student_attendance(kelas_id, attendance_date desc);

create or replace function public.sync_student_attendance_kelas()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.kelas_id is null then
    select kelas_id into new.kelas_id
    from public.students
    where id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stu_att_sync_kelas on public.student_attendance;
create trigger trg_stu_att_sync_kelas
  before insert or update on public.student_attendance
  for each row execute procedure public.sync_student_attendance_kelas();

drop trigger if exists trg_stu_att_updated_at on public.student_attendance;
create trigger trg_stu_att_updated_at
  before update on public.student_attendance
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Views Relasional untuk Rekapitulasi Cepat
-- ----------------------------------------------------------------------------
create or replace view public.v_rekap_absensi_karyawan as
select
  ea.id,
  ea.attendance_date,
  ea.check_in_time,
  ea.check_out_time,
  ea.status,
  ea.notes,
  p.id as user_id,
  p.full_name as employee_name,
  p.email as employee_email,
  p.nip as employee_nip,
  p.role as employee_role,
  p.jabatan as employee_jabatan
from public.employee_attendance ea
join public.profiles p on p.id = ea.user_id;

create or replace view public.v_rekap_absensi_siswa as
select
  sa.id,
  sa.attendance_date,
  sa.status,
  sa.notes,
  s.id as student_id,
  s.nis,
  s.nama as student_name,
  coalesce(k.nama_kelas, s.kelas) as kelas,
  coalesce(k.jurusan_kode, s.jurusan) as jurusan,
  j.nama_jurusan,
  j.bidang_keahlian,
  sa.recorded_by,
  rec.full_name as recorded_by_name
from public.student_attendance sa
join public.students s on s.id = sa.student_id
left join public.kelas k on k.id = coalesce(sa.kelas_id, s.kelas_id)
left join public.jurusan j on j.kode = coalesce(k.jurusan_kode, s.jurusan)
left join public.profiles rec on rec.id = sa.recorded_by;

-- ----------------------------------------------------------------------------
-- 8. Helper Function & Row Level Security (RLS)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.jurusan enable row level security;
alter table public.kelas enable row level security;
alter table public.students enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.student_attendance enable row level security;

-- Profiles RLS
drop policy if exists "User melihat profil sendiri atau admin melihat semua" on public.profiles;
create policy "User melihat profil sendiri atau admin melihat semua"
  on public.profiles for select
  using (auth.uid() = id or public.current_user_role() = 'admin');

drop policy if exists "Guru dan admin dapat melihat daftar guru untuk wali kelas" on public.profiles;
create policy "Guru dan admin dapat melihat daftar guru untuk wali kelas"
  on public.profiles for select
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin dapat mengelola profil" on public.profiles;
create policy "Admin dapat mengelola profil"
  on public.profiles for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Jurusan RLS (dibaca semua pengguna terautentikasi)
drop policy if exists "Pengguna terautentikasi melihat jurusan" on public.jurusan;
create policy "Pengguna terautentikasi melihat jurusan"
  on public.jurusan for select
  using (auth.uid() is not null);

-- Kelas RLS
drop policy if exists "Admin dan guru melihat kelas" on public.kelas;
create policy "Admin dan guru melihat kelas"
  on public.kelas for select
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin mengelola kelas" on public.kelas;
create policy "Admin mengelola kelas"
  on public.kelas for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Students RLS
drop policy if exists "Admin dan guru dapat membaca data siswa" on public.students;
create policy "Admin dan guru dapat membaca data siswa"
  on public.students for select
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Hanya admin yang mengelola data siswa" on public.students;
create policy "Hanya admin yang mengelola data siswa"
  on public.students for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Employee Attendance RLS
drop policy if exists "Karyawan melihat absensi sendiri dan admin melihat semua" on public.employee_attendance;
create policy "Karyawan melihat absensi sendiri dan admin melihat semua"
  on public.employee_attendance for select
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Karyawan melakukan absensi mandiri" on public.employee_attendance;
create policy "Karyawan melakukan absensi mandiri"
  on public.employee_attendance for insert
  with check (user_id = auth.uid());

drop policy if exists "Karyawan memperbarui absensi hari ini atau admin" on public.employee_attendance;
create policy "Karyawan memperbarui absensi hari ini atau admin"
  on public.employee_attendance for update
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- Student Attendance RLS
drop policy if exists "Admin dan guru melihat absensi siswa" on public.student_attendance;
create policy "Admin dan guru melihat absensi siswa"
  on public.student_attendance for select
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin dan guru mencatat absensi siswa" on public.student_attendance;
create policy "Admin dan guru mencatat absensi siswa"
  on public.student_attendance for insert
  with check (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin dan guru memperbarui absensi siswa" on public.student_attendance;
create policy "Admin dan guru memperbarui absensi siswa"
  on public.student_attendance for update
  using (public.current_user_role() in ('admin', 'guru'));
