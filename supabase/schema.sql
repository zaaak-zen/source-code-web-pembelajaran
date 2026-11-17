-- Skema Warung Kode untuk Supabase (PostgreSQL) — tanpa akun pengguna
--
-- Jalankan di SQL Editor dashboard Supabase. Aman dijalankan ulang, dan aman
-- dijalankan pada proyek yang sebelumnya memakai skema berakun.
--
-- Model akses:
-- - Browser tidak pernah menghubungi database Supabase.
-- - Semua akses database dari server Next.js memakai service role key, yang
--   melewati RLS. RLS tetap aktif dan tanpa kebijakan, sehingga anon key tidak
--   bisa membaca atau menulis apa pun.
-- - Panel guru dibuka dengan akun Supabase Auth (email + password) yang
--   `app_metadata.role`-nya "guru". Akun dibuat di Dashboard ->
--   Authentication -> Users; tidak ada tabel akun di skema ini.

-- 1. Daftar siswa -----------------------------------------------------------
-- Menggantikan peran tabel `profiles` dalam absensi: siswa tidak lagi punya
-- akun, jadi nama dan kelas disimpan sebagai data master.

create table if not exists public.siswa (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) between 1 and 80),
  kelas text not null,
  dibuat_pada timestamptz not null default now()
);

create index if not exists siswa_kelas_idx
  on public.siswa (kelas, nama);

alter table public.siswa enable row level security;

-- 2. Materi -----------------------------------------------------------------
-- Materi belajar dikelola guru dari dashboard (/guru/materi): judul, konten,
-- video, dan jumlah soal kuis. Materi lama diimpor dari config/education.js
-- lewat tombol "Impor dari config" di halaman itu.
--
-- `konten` berisi array blok JSON:
-- [{"tipe":"tujuan","items":["..."]},
--  {"tipe":"teks","judul":"...","isi":"..."},
--  {"tipe":"daftar","judul":"...","terurut":true,"items":["..."]},
--  {"tipe":"kode","judul":"...","bahasa":"js","isi":"..."},
--  {"tipe":"catatan","isi":"..."}]
--
-- `berkas` berisi lampiran PDF/DOCX/PPTX. File aslinya disimpan di Supabase
-- Storage (bucket privat `materi`), sedangkan kolom ini hanya menyimpan
-- metadata:
-- [{"id":"uuid","nama":"modul.pdf","path":"materi/uuid.pdf",
--   "tipe":"pdf","mime":"application/pdf","ukuran":123456}]

create table if not exists public.materi (
  id uuid primary key default gen_random_uuid(),
  kelas text not null,
  slug text not null,
  judul text not null check (length(btrim(judul)) between 1 and 120),
  deskripsi text not null default '',
  durasi text not null default '',
  video_judul text not null default '',
  video_youtube_id text not null default '',
  kuis_jumlah integer not null default 0 check (kuis_jumlah between 0 and 20),
  konten jsonb not null default '[]'::jsonb
    check (jsonb_typeof(konten) = 'array'),
  berkas jsonb not null default '[]'::jsonb
    constraint materi_berkas_check check (jsonb_typeof(berkas) = 'array'),
  urutan integer not null default 0,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now(),
  constraint materi_kelas_slug_uniq unique (kelas, slug),
  constraint materi_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists materi_kelas_urutan_idx
  on public.materi (kelas, urutan);

alter table public.materi enable row level security;

-- Untuk database yang tabelnya sudah dibuat sebelum fitur berkas (2 November
-- 2026): tambahkan kolom dan constraint-nya tanpa menyentuh data lama.
alter table public.materi
  add column if not exists berkas jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'materi_berkas_check'
  ) then
    alter table public.materi
      add constraint materi_berkas_check
      check (jsonb_typeof(berkas) = 'array');
  end if;
end $$;

-- 3. Hasil kuis -------------------------------------------------------------
-- Tanpa akun, hasil disimpan sebagai catatan anonim per materi.

create table if not exists public.kuis_hasil (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  nama text,
  kelas text not null,
  materi text not null,
  skor integer not null check (skor >= 0),
  total integer not null check (total > 0),
  dibuat_pada timestamptz not null default now()
);

-- Proyek lama mewajibkan user_id. Baris baru tidak memilikinya.
alter table public.kuis_hasil alter column user_id drop not null;

-- Nama untuk papan skor. Baris lama tetap boleh kosong (null).
alter table public.kuis_hasil add column if not exists nama text;

alter table public.kuis_hasil
  drop constraint if exists kuis_hasil_nama_check;
alter table public.kuis_hasil
  add constraint kuis_hasil_nama_check
  check (nama is null or length(btrim(nama)) between 1 and 60);

create index if not exists kuis_hasil_materi_idx
  on public.kuis_hasil (kelas, materi, dibuat_pada desc);

-- Dipakai papan skor per materi.
create index if not exists kuis_hasil_papan_skor_idx
  on public.kuis_hasil (kelas, materi, skor desc, total asc);

alter table public.kuis_hasil enable row level security;

-- Kebijakan lama bergantung pada auth.uid(); tidak relevan lagi.
drop policy if exists "lihat hasil sendiri" on public.kuis_hasil;
drop policy if exists "tambah hasil sendiri" on public.kuis_hasil;
drop policy if exists "guru melihat semua hasil" on public.kuis_hasil;

-- 4. Absensi ----------------------------------------------------------------
-- Satu baris per siswa per tanggal, dicatat oleh guru yang memegang kode.
--
-- Kolom `perangkat_hash` mengunci kehadiran ke satu perangkat (lihat bagian 4b):
-- berisi sidik HMAC dari token perangkat yang disimpan guru, bukan token asli.
-- Baris lama dan baris yang dicatat guru bernilai null.
--
-- `diperbarui_pada` dipakai guru untuk mengubah status siswa, dan ikut berubah
-- saat siswa mencatat kehadirannya sendiri. `catatanSiswaMemilihSekarang` di
-- aplikasi membandingkan nilainya dengan waktu guru mencatat sebelumnya, supaya
-- perubahan siswa yang terjadi setelah guru menyimpan status tidak tertimpa.

create table if not exists public.absensi (
  id bigint generated always as identity primary key,
  siswa_id uuid not null references public.siswa (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  tanggal date not null default current_date,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'alfa')),
  dicatat_oleh uuid references auth.users (id) on delete set null,
  perangkat_hash text check (length(perangkat_hash) = 64),
  diperbarui_pada timestamptz not null default now(),
  dibuat_pada timestamptz not null default now()
);

-- Proyek lama belum punya siswa_id; tambahkan tanpa menghapus data lama.
alter table public.absensi
  add column if not exists siswa_id uuid references public.siswa (id)
  on delete cascade;

alter table public.absensi alter column user_id drop not null;

-- 4a. Kolom baru untuk kunci per perangkat (2 November 2026) ---------------
-- `perangkat_hash` dan `diperbarui_pada` sudah ada di definisi tabel di atas;
-- di sini hanya ditambahkan untuk proyek lama yang tabelnya sudah terbentuk
-- sebelum kolom tersebut ada. Aman dijalankan ulang.

alter table public.absensi
  add column if not exists perangkat_hash text;

alter table public.absensi
  add column if not exists diperbarui_pada timestamptz not null default now();

-- Constraint panjang sidik ditambahkan terpisah karena `if not exists` pada
-- add constraint baru tersedia di PostgreSQL 16.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'absensi_perangkat_hash_check'
  ) then
    alter table public.absensi
      add constraint absensi_perangkat_hash_check
      check (perangkat_hash is null or length(perangkat_hash) = 64);
  end if;
end $$;

-- Hanya satu catatan per siswa per tanggal. Diperlukan untuk `upsert`
-- `onConflict: "siswa_id,tanggal"` milik halaman absensi guru dan siswa.
create unique index if not exists absensi_siswa_tanggal_uniq
  on public.absensi (siswa_id, tanggal);
-- 4b. Token perangkat guru ---------------------------------------------------
-- Satu token untuk seluruh sekolah, dipegang guru dan dimasukkan siswa sekali
-- per perangkat di halaman /smk sebelum absensi. Token ini hanya KUNCI
-- perangkat: token tidak membuka materi dan tidak memberi apa pun bila siswa
-- belum memasukkan token kelasnya.
--
-- Kunci per siswa berbunyi: satu siswa hanya bisa dicatat hadir dari satu
-- perangkat per tanggal. Saat siswa tercatat, aplikasi menyimpan
-- `perangkat_hash` = HMAC(token, tanggal + siswa_id). Perangkat lain yang
-- mencoba mencatat siswa itu pada tanggal yang sama ditolak, karena dihitung
-- dari token yang berbeda. Menghapus cookie atau memakai mode incognito tidak
-- melewatinya.
--
-- Mengganti token mengubah perangkat_hash semua baris baru (baris lama tidak
-- lagi cocok), sehingga perangkat siswa perlu memasukkan token baru. Itu
-- disengaja: guru memutar token saat ada perangkat dipakai bersama.
--
-- Diatur dari /guru/token. Satu baris saja (id = 1).

create table if not exists public.pengaturan_absensi (
  id integer primary key check (id = 1),
  token_perangkat text not null check (length(token_perangkat) between 8 and 64),
  diperbarui_pada timestamptz not null default now()
);

alter table public.pengaturan_absensi enable row level security;

create index if not exists absensi_tanggal_idx
  on public.absensi (tanggal, siswa_id);

alter table public.absensi enable row level security;

drop policy if exists "absensi sendiri" on public.absensi;
drop policy if exists "guru melihat absensi" on public.absensi;
drop policy if exists "guru mencatat absensi" on public.absensi;
drop policy if exists "guru mengubah absensi" on public.absensi;

-- 5. Bank soal kuis ---------------------------------------------------------
-- Soal disusun guru dari panel guru (/guru/kuis) memakai AI, lalu disimpan di
-- sini satu baris per kelas + materi. Siswa membaca bank yang sama; /api/kuis
-- hanya mengacak urutan soal dan pilihan untuk setiap pengerjaan.
--
-- `soal` berisi array JSON:
-- [{"pertanyaan":"...","pilihan":["...","..."],"jawaban":0,"pembahasan":"..."}]
-- Kunci jawaban hanya dibaca server; browser menerima token terenkripsi.

create table if not exists public.kuis_bank (
  kelas text not null,
  materi text not null,
  soal jsonb not null,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now(),
  primary key (kelas, materi),
  constraint kuis_bank_soal_check
    check (jsonb_typeof(soal) = 'array' and jsonb_array_length(soal) > 0)
);

alter table public.kuis_bank enable row level security;

-- 6. Token kelas ------------------------------------------------------------
-- Dibuat dan diganti oleh guru dari panel guru (/guru/token). Satu baris per
-- kelas. Token tidak punya masa berlaku sendiri; guru yang menggantinya, dan
-- sidik cookie siswa otomatis tidak sah setelah token berganti.

create table if not exists public.token_kelas (
  kelas text primary key,
  token text not null check (length(token) between 4 and 32),
  diperbarui_pada timestamptz not null default now()
);

create unique index if not exists token_kelas_token_uniq
  on public.token_kelas (token);

alter table public.token_kelas enable row level security;

-- 7. (Dihapus) Akun guru usang ----------------------------------------------
-- Tabel `pengaturan_guru` (username + sandi_hash scrypt) sudah tidak dipakai.
-- Akun guru sekarang memakai Supabase Auth: pengguna dibuat di Dashboard ->
-- Authentication -> Users, dengan `app_metadata.role = "guru"`. Login memeriksa
-- email + password lewat `signInWithPassword`, tanpa menyentuh tabel ini.
--
-- Bila database lama Anda masih memiliki tabel tersebut, hapus manual:
--
-- drop table if exists public.pengaturan_guru;

-- 8. Penyimpanan berkas materi ----------------------------------------------
-- Bucket privat untuk lampiran materi (PDF/DOCX/PPTX). File diunggah server
-- memakai service role, dan siswa menerima signed URL berumur pendek. Tidak
-- perlu policy: service role melewati RLS, sedangkan anon key tidak bisa
-- membaca bucket privat.

insert into storage.buckets (id, name, public)
values ('materi', 'materi', false)
on conflict (id) do nothing;

-- 9. Kode akses riwayat nilai -----------------------------------------------
-- Riwayat nilai siswa (/smk/<kelas>/riwayat) dibuka dengan kode 6 karakter
-- yang dibuat guru per siswa. Kode tidak butuh data pribadi siswa (tanggal
-- lahir tidak pernah disimpan), dan guru dapat mengganti atau mencabutnya
-- kapan saja. Satu kode hanya membuka riwayat satu siswa di satu kelas.
--
-- Kode disimpan apa adanya agar guru dapat melihatnya kembali untuk
-- dibagikan, sama seperti `token_kelas`. Tabel hanya dapat dibaca lewat
-- service role; RLS aktif tanpa kebijakan.

create table if not exists public.kode_riwayat (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.siswa (id) on delete cascade,
  kelas text not null,
  kode text not null check (length(kode) between 4 and 16),
  diperbarui_pada timestamptz not null default now()
);

-- Satu siswa hanya punya satu kode.
create unique index if not exists kode_riwayat_siswa_uniq
  on public.kode_riwayat (siswa_id);

-- Kode harus unik agar satu kode tidak membuka dua siswa.
create unique index if not exists kode_riwayat_kode_uniq
  on public.kode_riwayat (kode);

create index if not exists kode_riwayat_kelas_idx
  on public.kode_riwayat (kelas);

alter table public.kode_riwayat enable row level security;

-- 10. Sisa skema lama (opsional) --------------------------------------------
-- Tabel `profiles`, fungsi `peran_saya()`, dan trigger `buat_profil()` tidak
-- dipakai lagi karena tidak ada akun. Hapus manual bila sudah yakin:
--
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.buat_profil();
-- drop function if exists public.peran_saya();
-- drop table if exists public.profiles;
