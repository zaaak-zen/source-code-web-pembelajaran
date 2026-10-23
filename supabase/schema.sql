-- Skema CodeSpring untuk Supabase (PostgreSQL)
--
-- Jalankan di SQL Editor dashboard Supabase, sekali, pada proyek baru.
-- Peran guru/admin diberikan manual lewat dashboard Supabase:
--   update public.profiles set peran = 'guru' where id = '<uuid pengguna>';

-- 1. Profil pengguna ---------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null default '',
  peran text not null default 'siswa'
    check (peran in ('siswa', 'guru', 'admin')),
  dibuat_pada timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Pengguna hanya dapat membaca profilnya sendiri. Tidak ada kebijakan update:
-- nama dan peran diubah lewat dashboard Supabase oleh admin.
drop policy if exists "profil sendiri" on public.profiles;
create policy "profil sendiri"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 2. Profil otomatis saat pendaftaran --------------------------------------

create or replace function public.buat_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nama', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.buat_profil();

-- 3. Hasil kuis -------------------------------------------------------------

create table if not exists public.kuis_hasil (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kelas text not null,
  materi text not null,
  skor integer not null check (skor >= 0),
  total integer not null check (total > 0),
  dibuat_pada timestamptz not null default now()
);

create index if not exists kuis_hasil_user_idx
  on public.kuis_hasil (user_id, dibuat_pada desc);

alter table public.kuis_hasil enable row level security;

drop policy if exists "lihat hasil sendiri" on public.kuis_hasil;
create policy "lihat hasil sendiri"
  on public.kuis_hasil
  for select
  using (auth.uid() = user_id);

drop policy if exists "tambah hasil sendiri" on public.kuis_hasil;
create policy "tambah hasil sendiri"
  on public.kuis_hasil
  for insert
  with check (auth.uid() = user_id);

-- Guru dan admin boleh membaca hasil semua siswa (untuk rekap kelas).
drop policy if exists "guru melihat semua hasil" on public.kuis_hasil;
create policy "guru melihat semua hasil"
  on public.kuis_hasil
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.peran in ('guru', 'admin')
    )
  );

-- 4. Peran pengguna ----------------------------------------------------------

-- Fungsi security definer agar kebijakan RLS pada profiles tidak memanggil
-- tabelnya sendiri secara rekursif. Dipakai juga oleh kebijakan absensi.
create or replace function public.peran_saya()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select peran from public.profiles where id = auth.uid();
$$;

-- Guru dan admin perlu melihat daftar siswa (nama) untuk mencatat absensi.
drop policy if exists "guru melihat semua profil" on public.profiles;
create policy "guru melihat semua profil"
  on public.profiles
  for select
  using (public.peran_saya() in ('guru', 'admin'));

-- 5. Absensi siswa -----------------------------------------------------------

-- Satu baris per siswa per tanggal. Absensi dicatat oleh guru/admin, bukan
-- oleh siswa sendiri, agar kehadiran tidak bisa diklaim sepihak.
create table if not exists public.absensi (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tanggal date not null default current_date,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'alfa')),
  dicatat_oleh uuid references auth.users (id) on delete set null,
  dibuat_pada timestamptz not null default now(),
  unique (user_id, tanggal)
);

create index if not exists absensi_tanggal_idx
  on public.absensi (tanggal, user_id);

alter table public.absensi enable row level security;

-- Siswa hanya membaca kehadirannya sendiri.
drop policy if exists "absensi sendiri" on public.absensi;
create policy "absensi sendiri"
  on public.absensi
  for select
  using (auth.uid() = user_id);

-- Guru dan admin membaca kehadiran semua siswa.
drop policy if exists "guru melihat absensi" on public.absensi;
create policy "guru melihat absensi"
  on public.absensi
  for select
  using (public.peran_saya() in ('guru', 'admin'));

-- Guru dan admin mencatat kehadiran baru.
drop policy if exists "guru mencatat absensi" on public.absensi;
create policy "guru mencatat absensi"
  on public.absensi
  for insert
  with check (public.peran_saya() in ('guru', 'admin'));

-- Guru dan admin memperbaiki kehadiran yang sudah ada.
drop policy if exists "guru mengubah absensi" on public.absensi;
create policy "guru mengubah absensi"
  on public.absensi
  for update
  using (public.peran_saya() in ('guru', 'admin'))
  with check (public.peran_saya() in ('guru', 'admin'));
