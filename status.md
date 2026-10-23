# CodeSpring — Status Proyek

Dokumen ini mencatat kondisi proyek saat ini: apa yang sudah ada, apa yang belum,
dan cara mengedit konten. Panduan arsitektur tetap ada di `readme.md`; dokumen ini
hanya status implementasi.

Terakhir diperbarui: 23 Oktober 2026

---

## 1. Ringkasan

| Aspek | Kondisi |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| Bahasa | JavaScript |
| Styling | CSS murni + CSS Modules (tanpa Tailwind) |
| Dependensi | `next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js` |
| Jumlah halaman | 10 halaman + 4 route server |
| Build | Berhasil |
| Data konten | Data sekolah terisi; biodata 4 anggota masih `TODO`; 3 materi per kelas |
| Identitas visual | Logo sekolah dipasang di navbar, hero, profil, footer, halaman akun, dan favicon; file masih placeholder |
| Galeri beranda | Carousel 3 foto, bergeser otomatis dari kiri ke kanan setiap ±5 detik; foto masih ilustrasi |
| Video materi | Slot tersedia; ID YouTube belum diisi |
| Kuis AI | Ada; kunci jawaban disimpan di server |
| Tanya AI | Ada; pembantu belajar per materi, dibatasi per IP |
| Absensi | Ada; guru/admin menandai siswa per tanggal (skema perlu dijalankan) |
| Autentikasi / database | Supabase; kredensial terisi, skema belum dijalankan |
| ESLint | Terpasang (`eslint` 8 + `eslint-config-next` 14); pemeriksaan bersih |
| Git | Sudah diinisialisasi; commit pertama dibuat |

---

## 2. Struktur File

```
D:\web pembelajaran\
├── app/
│   ├── layout.jsx                     # kerangka HTML + Navbar + Footer + metadata/favicon
│   ├── page.jsx                       # landing page (hero, galeri, profil, sejarah, 4 pembuat)
│   ├── globals.css                    # token desain + styling halaman, form, dashboard
│   ├── (auth)/
│   │   ├── login/page.jsx             # halaman masuk
│   │   ├── register/page.jsx          # halaman daftar akun
│   │   ├── lupa-sandi/page.jsx        # minta tautan reset
│   │   └── reset-sandi/page.jsx       # atur kata sandi baru
│   ├── auth/callback/route.js         # tukar kode email -> sesi
│   ├── dashboard/page.jsx             # dashboard siswa (Server Component)
│   ├── guru/
│   │   └── absen/page.jsx             # absensi siswa oleh guru/admin
│   ├── api/
│   │   ├── kuis/route.js              # buat soal (tanpa kunci jawaban)
│   │   ├── kuis/nilai/route.js        # nilai jawaban + simpan hasil
│   │   └── tanya/route.js             # AI pembantu belajar per materi
│   └── smk/
│       ├── page.jsx                   # daftar kelas SMK
│       └── [kelas]/
│           ├── page.jsx               # daftar materi per kelas
│           └── [materi]/page.jsx      # isi materi
├── components/
│   ├── Navbar/                        # Navbar.jsx + Navbar.module.css
│   ├── Footer/                        # Footer.jsx + Footer.module.css
│   ├── Galeri/                        # carousel foto beranda
│   ├── SchoolLogo/                    # logo sekolah + fallback ikon
│   ├── Kuis/                          # Kuis.jsx + Kuis.module.css
│   ├── Tanya/                         # Tanya.jsx + Tanya.module.css
│   └── Icons/                         # kumpulan ikon SVG inline
├── lib/
│   ├── kuis/token.js                  # enkripsi token soal (AES-256-GCM)
│   └── supabase/
│       ├── client.js                  # klien browser
│       └── server.js                  # klien server + cookie sesi
├── middleware.js                      # penyegaran sesi + proteksi /dashboard
├── supabase/schema.sql                # tabel, trigger, dan kebijakan RLS
├── public/
│   ├── logo-sekolah.svg               # placeholder logo sekolah
│   └── galeri/                        # placeholder foto galeri beranda
├── config/
│   ├── site.js                        # nama situs, tagline, deskripsi, bahasa
│   ├── navigation.js                  # menu navbar
│   └── education.js                   # profil sekolah, logo, galeri, sejarah, jenjang, kelas, materi
├── .gitignore                         # node_modules, .next, .env*.local, dll.
├── jsconfig.json                       # alias "@/..." -> root
├── next.config.mjs
├── package.json
├── readme.md                          # standar struktur & tanggung jawab file
├── fungsi.md                          # catatan laporan lama (tidak dipakai kode)
└── status.md                          # dokumen ini
```

---

## 3. Rute yang Tersedia

| URL | Isi | Status data |
|---|---|---|
| `/` | Landing page: hero, galeri otomatis, profil sekolah, sejarah & tahun berdiri, 4 kartu pembuat | Biodata anggota masih `TODO`; foto galeri masih ilustrasi |
| `/smk` | Daftar kelas SMK (10, 11, 12) | Terisi |
| `/smk/10`, `/smk/11`, `/smk/12` | Daftar materi per kelas | 3 materi per kelas |
| `/smk/[kelas]/[materi]` | Isi materi, video, dan kuis | Aktif untuk 9 materi yang terdaftar |
| `/login` | Masuk dengan email dan kata sandi | Butuh Supabase |
| `/register` | Daftar akun siswa + verifikasi email | Butuh Supabase + email |
| `/lupa-sandi` | Minta tautan reset kata sandi | Butuh Supabase + email |
| `/reset-sandi` | Atur kata sandi baru dari tautan email | Butuh sesi pemulihan |
| `/dashboard` | Identitas, skor terbaik per materi, riwayat kuis, riwayat kehadiran | Butuh login |
| `/guru/absen` | Guru/admin mencatat kehadiran siswa per tanggal | Butuh login + peran guru/admin |
| `GET /auth/callback` | Menukar kode email menjadi sesi | Butuh Supabase |
| `POST /api/kuis` | Membuat soal kuis lewat layanan AI | Butuh environment AI + `KUIS_SECRET` |
| `POST /api/kuis/nilai` | Menilai jawaban dan menyimpan hasil | Butuh `KUIS_SECRET`; simpan butuh login |
| `POST /api/tanya` | Menjawab pertanyaan siswa tentang satu materi | Butuh environment AI |
| URL lain | Halaman 404 | — |

Catatan: hanya jenjang SMK yang dikerjakan. SMP tidak termasuk lingkup proyek.

---

## 4. Cara Mengedit Konten

Semua konten berbasis data, tidak perlu menyentuh markup. Cari komentar `EDIT:`
di file terkait.

| Yang ingin diubah | File | Bagian |
|---|---|---|
| Nama situs, tagline, deskripsi | `config/site.js` | objek `siteConfig` |
| Menu navbar | `config/navigation.js` | array `links` |
| Nama sekolah, deskripsi, alamat | `config/education.js` | `school` |
| Logo sekolah | `config/education.js` + `public/logo-sekolah.svg` | `school.logo`, `school.logoAlt` |
| Foto galeri beranda | `config/education.js` + `public/galeri/` | `galeri.foto[]` |
| Judul & pengantar galeri | `config/education.js` | `galeri.judul`, `galeri.deskripsi` |
| Tahun berdiri | `config/education.js` | `tahunBerdiri` |
| Sejarah sekolah | `config/education.js` | `sejarah` |
| Deskripsi jenjang / kelas | `config/education.js` | `jenjang[0].deskripsi`, `kelas[].deskripsi` |
| Materi | `config/education.js` | `kelas[].materi` (lihat contoh di komentar) |
| Video materi | `config/education.js` | `kelas[].materi[].video` |
| Jumlah soal kuis | `config/education.js` | `kelas[].materi[].kuis.jumlahSoal` |
| Kunci & model AI (kuis dan tanya) | `.env.local` (salin dari `.env.example`) | `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` |
| Rahasia token kuis | `.env.local` | `KUIS_SECRET` |
| Proyek Supabase | `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Peran guru/admin (syarat absensi) | Dashboard Supabase | `update public.profiles set peran = ...` |
| Data pembuat website | `app/page.jsx` | `creatorGroup` → `members` (4 anggota) |
| Warna, radius, font | `app/globals.css` | blok `:root` |
| Tampilan navbar | `components/Navbar/Navbar.module.css` | — |
| Tampilan footer | `components/Footer/Footer.module.css` | — |
| Tampilan galeri | `components/Galeri/Galeri.module.css` | — |
| Tampilan logo | `components/SchoolLogo/SchoolLogo.module.css` | — |

---

## 5. Format Data Materi

Materi diisi di `config/education.js` pada `jenjang → smk → kelas → materi`:

```js
materi: [
  {
    slug: "algoritma",              // URL: /smk/10/algoritma (tanpa spasi)
    judul: "Algoritma & Pemrograman",
    deskripsi: "Konsep dasar algoritma.",
    durasi: "2 jam",                // boleh "" jika tidak perlu
    video: {                        // null jika video belum ada
      judul: "Video: Algoritma",
      youtubeId: "xxxxxxxxxxx",     // 11 karakter ID YouTube
    },
    kuis: {
      jumlahSoal: 5,                // ditentukan guru, 1-20
    },
    konten: [ ...blok... ],
  },
],
```

Blok konten yang didukung:

| Tipe | Bentuk | Tampilan |
|---|---|---|
| `tujuan` | `{ tipe: "tujuan", items: ["..."] }` | Kotak biru berisi daftar tujuan bernomor |
| `teks` | `{ tipe: "teks", judul: "...", isi: "..." }` | Subjudul + paragraf |
| `daftar` | `{ tipe: "daftar", judul, terurut: true, items: ["..."] }` | Daftar berbutir/nomor |
| `kode` | `{ tipe: "kode", judul, bahasa, isi: "..." }` | Blok kode gelap, bisa di-scroll |
| `catatan` | `{ tipe: "catatan", isi: "..." }` | Kotak catatan dengan garis aksen |

Tipe yang tidak dikenali akan dilewati tanpa membuat halaman error.

---

## 6. Yang Sudah Selesai

- [x] Scaffold Next.js App Router, JavaScript, CSS murni.
- [x] Landing page: profil sekolah, sejarah & tahun berdiri, 4 kartu biodata Kelompok 6.
- [x] Navbar responsif (desktop + menu mobile) dengan penanda halaman aktif.
- [x] Footer global untuk semua halaman.
- [x] Halaman daftar kelas SMK.
- [x] Halaman daftar materi per kelas dengan kondisi kosong.
- [x] Halaman isi materi dengan 5 tipe blok konten dan navigasi antar materi.
- [x] Struktur konfigurasi terpisah: site, navigation, education.
- [x] Aksesibilitas dasar: skip-link, `aria-current`, `aria-label`, fokus keyboard.
- [x] Sejarah sekolah + tahun berdiri menggantikan visi & misi. Email/telepon dihapus.
- [x] 1 materi per kelas: Berpikir Komputasional (10), Algoritma & Pemrograman (11), Analisis Data (12).
- [x] Judul halaman `/smk` tidak lagi generik.
- [x] Video materi: embed YouTube responsif, tautan fallback, dan empty state.
- [x] Kuis AI: soal dibuat dari isi materi, skor, pembahasan, ulangi, dan buat soal baru.
- [x] Validasi soal di server, cache 1 jam, dan pembatas permintaan per IP.
- [x] `.env.example` untuk konfigurasi layanan AI (tanpa kredensial asli).
- [x] Kuis AI diuji langsung: 5 soal untuk kelas 10 dan 11, cache bekerja.
- [x] `.gitignore` dibuat dan repositori git diinisialisasi (file di-stage, belum di-commit).
- [x] Tinjauan kuis AI: IP diambil dari entri proxy terdekat, kunci cache mengikuti isi materi, dan cache hit tidak lagi memotong kuota per IP.
- [x] Supabase: klien browser/server, middleware sesi, callback email, halaman masuk, daftar, lupa sandi, dan reset sandi.
- [x] Dashboard siswa: profil, skor terbaik per materi, riwayat kuis, dan tombol keluar.
- [x] Penilaian kuis dipindah ke server: kunci jawaban tidak lagi dikirim ke browser (token AES-256-GCM).
- [x] Skema database Supabase: `profiles`, `kuis_hasil`, trigger profil otomatis, dan kebijakan RLS.
- [x] Tanya AI: panel pembantu belajar di setiap materi, jawaban dibatasi pada isi materi, maksimal 10 pesan dan 8.000 karakter riwayat per permintaan.
- [x] Absensi oleh guru/admin: halaman `/guru/absen`, pemilihan tanggal, status hadir/izin/sakit/alfa, dan riwayat kehadiran siswa di dashboard.
- [x] Kebijakan RLS absensi: siswa hanya melihat kehadiran sendiri; guru/admin membaca dan mencatat semua; fungsi `peran_saya()` menjaga agar kebijakan `profiles` tidak rekursif.
- [x] Proteksi `/guru` di middleware dan pemeriksaan peran ulang di halaman serta server action.
- [x] Pembersihan otomatis entri cache soal dan catatan IP yang kedaluwarsa pada `/api/kuis`; `/api/tanya` juga membersihkan catatan IP-nya.
- [x] Uji langsung: `/api/kuis` menghasilkan 5 soal tanpa kunci jawaban; `/api/kuis/nilai` menilai dan menolak token palsu; `/api/tanya` menjawab sesuai materi; `/dashboard` dan `/guru/absen` mengalihkan pengunjung tanpa sesi ke `/login`.
- [x] Logo sekolah: komponen `SchoolLogo` dengan fallback ikon, dipasang di navbar, hero, profil sekolah, footer, halaman akun, dan favicon.
- [x] Galeri beranda: carousel 3 foto, bergeser otomatis dari kiri ke kanan (±5 detik), tombol panah/titik, tombol jeda, serta berhenti saat hover, fokus keyboard, tab tidak aktif, atau `prefers-reduced-motion`.
- [x] Materi lanjutan: total 3 materi per kelas — kelas 10 (Berpikir Komputasional, Sistem Komputer, Jaringan Komputer & Internet), kelas 11 (Algoritma & Pemrograman, Struktur Data, Basis Data), kelas 12 (Analisis Data, Dampak Sosial Informatika, Proyek Lintas Bidang).
- [x] Deskripsi kelas 11 dan 12 disesuaikan dengan daftar materi baru.
- [x] ESLint terpasang (`eslint` 8.57.1 + `eslint-config-next` 14.2.35, sesuai Next 14.2.35) dengan `.eslintrc.json`; `npm run lint` bersih tanpa peringatan.

---

## 7. Yang Belum Selesai

- [ ] **Biodata 4 anggota** — nama dan peran setiap anggota Kelompok 6 masih `TODO`.
- [ ] **Logo & foto asli sekolah** — `public/logo-sekolah.svg` dan `public/galeri/*.svg` masih placeholder; ganti dengan logo resmi dan foto kegiatan sekolah.
- [ ] **ID video YouTube** — isi `video.youtubeId` untuk 9 materi.
- [ ] **Skema Supabase** — `supabase/schema.sql` (termasuk tabel `absensi` dan fungsi `peran_saya`) belum dijalankan di SQL Editor.
- [ ] **Uji alur akun dengan kredensial nyata** — daftar, verifikasi email, masuk, reset sandi, simpan nilai, dan absensi belum diuji end-to-end.
- [ ] **Uji absensi dengan akun guru** — peran guru/admin harus diberikan lewat dashboard Supabase sebelum `/guru/absen` dapat dibuka.
- [ ] **Halaman kelola guru/admin** — belum ada UI untuk mengubah peran; masih lewat dashboard Supabase.
- [ ] **Halaman jenjang SMP** — tidak dikerjakan; lingkup proyek hanya SMK.

---

## 8. Perintah

```bash
npm install     # pasang dependensi
npm run dev     # server pengembangan, http://localhost:3000
npm run build   # build produksi
npm run start   # jalankan hasil build
npm run lint    # periksa kode dengan ESLint
```

### Konfigurasi kuis AI

```bash
cp .env.example .env.local   # lalu isi nilainya
```

Variabel yang dibutuhkan: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`. Semuanya
hanya dibaca di server. Jangan commit `.env.local`.

### Konfigurasi Supabase

1. Buat proyek di dashboard Supabase.
2. Salin **Project URL** dan **anon public key** ke `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Isi `KUIS_SECRET` dengan nilai acak panjang
   (`openssl rand -base64 32`).
4. Jalankan isi `supabase/schema.sql` di SQL Editor Supabase.
5. Atur **Site URL** dan **Redirect URLs** di Authentication → URL
   Configuration ke `http://localhost:3000` dan
   `http://localhost:3000/auth/callback`.
6. Untuk verifikasi email dan reset sandi di produksi, pasang SMTP sendiri;
   email bawaan Supabase dibatasi untuk pengujian.

---

## 9. Catatan Teknis

- **Server vs Client Component:** `Navbar`, `Galeri`, `Kuis`, dan `Tanya` adalah
  Client Component karena memakai state/interaksi browser. Halaman dan komponen
  lain Server Component.
- **Menu mobile** dikelola state React di `Navbar` dan tertutup otomatis saat
  halaman berganti.
- **Logo sekolah** diambil dari `school.logo` dan ditampilkan lewat komponen
  `SchoolLogo`. Bila nilainya dikosongkan, komponen memakai ikon wisuda sebagai
  fallback agar tata letak tidak rusak. Path logo juga dipakai sebagai favicon.
- **Galeri beranda** memakai satu track flex dengan slide kembaran di kedua
  ujung agar perpindahan dari foto terakhir ke pertama tetap mulus. Gerakan
  otomatis berhenti saat hover, fokus keyboard, tab tidak aktif, atau pengguna
  memilih "kurangi gerakan"; tombol jeda tersedia. Gambar memakai
  `next/image` dengan `unoptimized` agar file SVG placeholder dan foto JPG/PNG
  sama-sama bisa dipakai.
- **Tahun footer** dihitung saat build, bukan saat halaman dibuka di browser.
- **Tautan materi** hanya aktif jika materi sudah didaftarkan di konfigurasi,
  mencegah navigasi ke halaman 404.
- **Kuis AI** memakai route server `app/api/kuis/route.js`. API key tidak pernah
  dikirim ke browser. Jumlah soal diambil dari config, bukan dari request siswa.
- **Cache & batas kuis** disimpan di memori proses: cache soal 1 jam dan batas
  120 permintaan per IP per jam. Keduanya bersifat sementara dan bukan pengganti
  autentikasi.
- **Kunci cache** menyertakan sidik jari isi materi, sehingga soal lama tidak
  dipakai lagi setelah materi diedit.
- **Batas permintaan** hanya dihitung saat permintaan benar-benar memanggil
  layanan AI; jawaban dari cache tidak memotong kuota.
- **Alamat IP** diambil dari entri paling kanan `X-Forwarded-For` (ditambahkan
  proxy terdekat), dengan fallback `X-Real-IP`. Asumsinya deployment berada di
  belakang reverse proxy; tanpa proxy, header ini bisa dipalsukan klien.
- **Kunci jawaban tidak dikirim ke browser.** `/api/kuis` mengembalikan soal
  tanpa kunci plus token terenkripsi (AES-256-GCM, `KUIS_SECRET`, berlaku 2
  jam). `/api/kuis/nilai` membuka token, menilai, dan menyimpan hasil.
- **Nilai hanya tersimpan untuk pengguna yang masuk**; tamu tetap bisa
  mengerjakan kuis tetapi hasilnya tidak disimpan.
- **Peran akun** disimpan di `profiles`; akun baru selalu `siswa`, dan peran
  guru/admin diberikan manual lewat dashboard Supabase.
- **RLS** membatasi siswa hanya membaca hasilnya sendiri; guru dan admin dapat
  membaca semua hasil. Tanpa login, `/dashboard` dialihkan ke `/login`.
- **Catatan:** `/dashboard` bergantung pada `profiles` yang dibuat trigger saat
  pendaftaran. Jika trigger belum ada, halaman tetap tampil dengan peran
  `siswa` dan nama kosong.
- **Waktu pembuatan soal** bervariasi (13–56 detik pada pengujian). Timeout
  server 120 detik; jika gagal, siswa melihat pesan dan tombol coba lagi.
- **Tanya AI** memakai route `app/api/tanya/route.js` dan API key yang sama
  dengan kuis. Materi diambil dari `config/education.js` berdasarkan slug;
  client tidak mengirim isi materi. Batas: 40 permintaan per IP per jam, 10
  pesan terakhir, 1.200 karakter per pesan, 8.000 karakter total riwayat,
  jawaban maksimal sekitar 700 token, timeout 60 detik.
- **AI dua peran:** `/api/kuis` menyusun soal (kunci jawaban tetap di server),
  sedangkan `/api/tanya` menjadi pembantu belajar dan tidak memberikan kunci
  jawaban kuis.
- **Absensi** hanya dapat dicatat guru/admin. Siswa membaca kehadirannya
  sendiri di `/dashboard`; tidak ada tombol check-in siswa. Satu baris per
  siswa per tanggal (`unique (user_id, tanggal)`), disimpan dengan upsert
  sehingga guru dapat memperbaiki status pada tanggal yang sama.
- **RLS absensi** memakai fungsi `public.peran_saya()` yang `security definer`.
  Ini mencegah kebijakan pada `profiles` memanggil tabelnya sendiri secara
  rekursif. Fungsi ini harus dibuat sebelum kebijakan absensi.
- **Tanggal absensi** mengikuti zona waktu `Asia/Jakarta`, bukan zona waktu
  server.
- **Server action absensi** memeriksa ulang sesi dan peran, karena endpoint
  server action dapat dipanggil langsung tanpa membuka halaman.
- **Struktur proyek** mengikuti `readme.md`. Setiap penambahan file atau
  dependensi baru memerlukan persetujuan pemilik proyek.

---

## 10. Langkah Berikutnya (usulan)

1. Isi nama dan peran 4 anggota Kelompok 6 di `app/page.jsx`.
2. Isi `video.youtubeId` untuk 9 materi.
3. Jalankan `supabase/schema.sql` di SQL Editor Supabase, lalu atur Site URL
   dan Redirect URL.
4. Berikan peran `guru` pada satu akun, lalu uji `/guru/absen` dan riwayat
   kehadiran siswa.
5. Uji alur daftar, verifikasi email, masuk, reset sandi, simpan nilai, dan
   tanya AI.
6. Tambah UI kelola guru/admin bila diperlukan.
7. Ganti logo dan foto galeri placeholder dengan aset resmi sekolah.
