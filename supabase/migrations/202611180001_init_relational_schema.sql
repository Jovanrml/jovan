-- Migration: 202611180001_init_relational_schema
-- Sinkronisasi dengan /supabase/schema.sql untuk Supabase CLI (`supabase db push`)

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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

create table if not exists public.kelas (
  id uuid primary key default gen_random_uuid(),
  nama_kelas text unique not null,
  tingkat text not null check (tingkat in ('X', 'XI', 'XII')),
  jurusan_kode text not null references public.jurusan(kode) on update cascade on delete restrict,
  wali_kelas_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
