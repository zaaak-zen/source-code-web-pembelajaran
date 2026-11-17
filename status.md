# Warung Kode — Status Proyek

Dokumen ini mencatat kondisi proyek saat ini: apa yang sudah ada, apa yang belum,
dan cara mengedit konten. Panduan arsitektur tetap ada di `readme.md`; dokumen ini
hanya status implementasi.

Terakhir diperbarui: 15 November 2026

---

## 1. Ringkasan

| Aspek | Kondisi |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| Bahasa | JavaScript |
| Styling | CSS murni + CSS Modules (tanpa Tailwind) |
| Dependensi | `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr` |
| Jumlah halaman | 17 halaman + 4 route API |
| Akun pengguna | Tidak ada akun siswa. Login, daftar, reset sandi, dan dashboard siswa sudah dihapus. Satu akun guru (Supabase Auth, email + password) di `/guru/login` |
| Build | Berhasil (21 rute) |
| Data konten | Data sekolah di config; materi dikelola di `/guru/materi`. Kelas 10 berisi **4 materi, satu per bab** buku Informatika SMA/SMK Kelas X, masing-masing dengan lampiran PDF babnya (dipasang lewat `scripts/pasang-4-bab.mjs`); 4 biodata anggota Kelompok 5 sudah terisi nama lengkap dan medianya |
| Lingkup jenjang | SMK saja. Tidak ada halaman, tautan, maupun rencana untuk jenjang lain |
| Identitas visual | Arah **editorial grid / magazine**: latar kertas hangat, tinta gelap, satu aksen rust, garis tipis, sudut tajam, tanpa gradien, tanpa bayangan, dan card dikurangi. Judul memakai Libre Bodoni, teks Public Sans, label IBM Plex Mono. Logo sekolah sudah memakai berkas asli `public/logo smkn 2.png` |
| Galeri beranda | Carousel 3 foto, bergeser otomatis dari kiri ke kanan setiap ±5 detik; foto sudah memakai aset asli (`gedung.jpeg`, `perpustakaan.jpeg`, `siswa.jpeg`) |
| Video materi | Slot tersedia; ID YouTube diisi dari halaman `/guru/materi` |
| Video sosialisasi | Embed YouTube di beranda; ID `9jjRazRtUOU` sudah diisi di `school.videoSosialisasi.youtubeId` (`config/education.js`) |
| Berkas materi | Guru melampirkan PDF/DOCX/PPTX (maks. 4 MB lewat form, 5 berkas) di `/guru/materi`. Empat PDF bab buku Informatika Kelas X sudah terlampir di materi kelas 10, dipasang lewat `scripts/pasang-4-bab.mjs`. File di Supabase Storage bucket privat, metadata di kolom `materi.berkas`; PDF dipratinjau, Word/PPT diunduh |
| Kuis | Soal disusun guru sekali di `/guru/kuis` — dengan AI atau ditulis manual — lalu disimpan di tabel `kuis_bank`; setiap siswa menerima soal yang sama dengan urutan soal/pilihan diacak; kunci jawaban tetap di server; hasil dipakai menyusun papan skor. Siswa memilih namanya dari daftar kelas sebelum mulai, agar nama konsisten dengan absensi dan riwayat |
| Riwayat nilai siswa | Ada; `/smk/[kelas]/riwayat` menampilkan seluruh nilai kuis seorang siswa setelah memasukkan kode 6 karakter yang dibuat guru di `/guru/riwayat` |
| Tanya AI | Ada; pembantu belajar per materi, dibatasi per IP |
| Absensi | Ada; dibuka lewat login guru; daftar siswa disimpan di tabel `siswa`, bisa ditambah dan dihapus (dengan konfirmasi dampak). Siswa juga mengisi kehadiran sendiri sekali per hari setelah token kelas |
| Panel guru | Ada; login dengan akun Supabase Auth (email + password) di `/guru/login`; menu Materi, Soal kuis, Absensi, Rekap nilai, Token kelas, dan Keamanan |
| Token kelas | Dibuat guru di `/guru/token` dan disimpan di tabel `token_kelas`; siswa memasukkannya di `/smk` |
| Database | Supabase diakses hanya dari server memakai service role key |
| ESLint | Terpasang (`eslint` 8 + `eslint-config-next` 14); pemeriksaan bersih |
| Git | Sudah diinisialisasi; commit pertama dibuat |

---

## 2. Struktur File

```
D:\web pembelajaran\
├── app/
│   ├── layout.jsx                     # kerangka HTML + Navbar + Footer + metadata/favicon
│   ├── page.jsx                       # landing page (hero, video sosialisasi, galeri, profil, sejarah, 4 pembuat)
│   ├── globals.css                    # token desain editorial + styling halaman, form, tabel
│   ├── not-found.jsx                  # halaman 404
│   ├── guru/
│   │   ├── page.jsx                   # panel guru: menu materi, soal, absensi, rekap, kode riwayat, token
│   │   ├── login/page.jsx             # login guru (email + password Supabase Auth, layar penuh)
│   │   ├── keamanan/page.jsx          # ganti password lewat email Supabase Auth
│   │   ├── absen/page.jsx             # absensi siswa (sesi guru + daftar siswa, tambah & hapus)
│   │   ├── materi/page.jsx            # daftar & hapus materi + impor dari config
│   │   ├── materi/baru/page.jsx       # form tambah materi
│   │   ├── materi/berkas/route.js     # unggah/hapus berkas materi (POST/DELETE)
│   │   ├── materi/[kelas]/[materi]/page.jsx  # form ubah materi
│   │   ├── kuis/page.jsx              # susun bank soal (AI) + tautan editor manual
│   │   ├── kuis/[kelas]/[materi]/page.jsx    # editor soal manual
│   │   ├── nilai/page.jsx             # rekap nilai kuis (agregat per materi)
│   │   ├── token/page.jsx             # buat/ganti/cabut token masuk kelas
│   │   └── riwayat/page.jsx           # buat/ganti/cabut kode riwayat nilai per siswa
│   ├── api/
│   │   ├── kuis/route.js              # kirim soal dari bank (urutan acak, tanpa kunci)
│   │   ├── kuis/nilai/route.js        # nilai jawaban + simpan nama/skor + papan skor
│   │   └── tanya/route.js             # AI pembantu belajar per materi
│   └── smk/
│       ├── page.jsx                   # pintu masuk: formulir token kelas
│       └── [kelas]/
│           ├── page.jsx               # daftar materi per kelas (butuh token)
│           ├── absen/page.jsx         # absensi mandiri siswa (butuh token)
│           ├── riwayat/page.jsx       # riwayat nilai siswa (butuh token + kode guru)
│           └── [materi]/
│               ├── page.jsx           # isi materi (butuh token)
│               └── kuis/page.jsx      # kuis materi, halaman terpisah (butuh token)
├── components/
│   ├── Navbar/                        # Navbar.jsx + Navbar.module.css
│   ├── Footer/                        # Footer.jsx + Footer.module.css
│   ├── Galeri/                        # carousel foto beranda
│   ├── SchoolLogo/                    # logo sekolah + fallback ikon
│   ├── Kuis/                          # Kuis.jsx + Kuis.module.css
│   ├── Guru/                          # TombolProses, FormMateri, UnggahBerkas, EditorSoal (+ CSS)
│   ├── Tanya/                         # Tanya.jsx + Tanya.module.css
│   └── Icons/                         # kumpulan ikon SVG inline
├── lib/
│   ├── guru/akses.js                  # login Supabase Auth + batas sesi 2 jam
│   ├── guru/sesi.js                   # cookie penanda `sesi_guru_mulai` + hitung sisa sesi
│   ├── guru/absen.js                  # server action hapus siswa dari /guru/absen
│   ├── kelas/akses.js                 # token kelas + cookie akses /smk
│   ├── kelas/absensi.js               # absensi mandiri siswa + cookie absen harian
│   ├── kelas/riwayat.js               # kode riwayat nilai + cookie sidik /smk
│   ├── kuis/ai.js                     # panggil AI untuk menyusun soal (panel guru)
│   ├── kuis/bank.js                   # baca/tulis bank soal `kuis_bank`
│   ├── kuis/soal.js                   # validasi soal + pengacakan urutan
│   ├── kuis/token.js                  # enkripsi token soal (AES-256-GCM)
│   ├── materi/konten.js               # slug, ID YouTube, validasi blok konten (fungsi murni)
│   ├── materi/berkas.js               # format, batas, validasi metadata berkas (fungsi murni)
│   ├── materi/storage.js              # unggah/hapus/signed URL berkas di Supabase Storage
│   ├── materi/kelas.js                # baca/tulis materi ke tabel `materi`
│   ├── materi/aksi.js                 # server action tambah/ubah/hapus/impor materi
│   └── supabase/server.js             # klien server (service role, tanpa sesi)
├── scripts/
│   ├── pasang-4-bab.mjs               # pasang 4 bab buku sebagai materi kelas 10 (dry run / --jalankan)
│   ├── siapkan-bab.py                 # ekstrak teks bab -> blok konten (data/bab-teks.json)
│   ├── banding-ekstraksi.py           # bandingkan mesin ekstraksi teks (pypdf/pdfplumber/pymupdf)
│   ├── cek-bab-pdf.py                 # periksa PDF per bab: halaman, nomor folio, gambar
│   └── skrip-materi.mjs               # periksa isi tabel `materi` + bucket Storage
├── materi/                            # 4 PDF bab siap pasang (sumber lampiran materi)
├── supabase/schema.sql                # tabel `materi` (+ berkas), `siswa`, `kuis_hasil`, `kuis_bank`, `absensi`, `token_kelas`, `kode_riwayat`, bucket `materi`
├── middleware.js                      # segarkan cookie Supabase Auth + tegakkan sesi guru 2 jam
├── public/
│   ├── logo smkn 2.png                # logo sekolah (dipakai school.logo)
│   ├── logo-sekolah.svg               # logo lama, tidak lagi dirujuk config
│   ├── galeri/                        # gedung.jpeg, perpustakaan.jpeg, siswa.jpeg
│   └── tim/                           # foto/lagu/video tiap anggota (aditya, hamdan, rivana, tirtarakha)
├── config/
│   ├── site.js                        # nama situs, tagline, deskripsi, bahasa
│   ├── navigation.js                  # menu navbar
│   └── education.js                   # profil sekolah, logo, galeri, sejarah, jenjang, kelas, materi awal
├── .gitignore                         # node_modules, .next, .env*.local, dll.
├── jsconfig.json                       # alias "@/..." -> root
├── next.config.mjs
├── package.json
├── readme.md                          # standar struktur & tanggung jawab file
├── rencana.md                         # rencana kerja & keputusan fitur
├── testing.md                         # panduan pengujian fitur (manual)
├── fungsi.md                          # catatan laporan lama (tidak dipakai kode)
└── status.md                          # dokumen ini
```

---

## 3. Rute yang Tersedia

| URL | Isi | Status data |
|---|---|---|
| `/` | Landing page: hero, video sosialisasi, galeri otomatis, profil sekolah, sejarah & tahun berdiri, 4 kartu pembuat | 4 anggota Kelompok 5 sudah bernama lengkap; foto galeri, logo, dan ID video sudah asli |
| `/smk` | Formulir token kelas (tanpa daftar kelas di halaman publik) | Butuh token yang dibuat guru |
| `/smk/10`, `/smk/11`, `/smk/12` | Daftar materi per kelas dari database | Butuh token kelas yang sesuai; jumlah mengikuti `/guru/materi` |
| `/smk/[kelas]/[materi]` | Isi materi, video, tautan kuis, dan tanya AI | Butuh token kelas; materi dari database |
| `/smk/[kelas]/[materi]/kuis` | Kuis materi di halaman terpisah: pilih nama, soal, skor, papan skor | Butuh token kelas + bank soal guru (tanpa AI di sisi siswa) |
| `/smk/[kelas]/riwayat` | Riwayat nilai siswa: formulir kode, lalu tabel nilai seluruh kuis di kelas itu | Butuh token kelas + kode riwayat dari guru |
| `/guru/login` | Login guru: akun Supabase Auth (email + password) | Publik; pengguna yang sudah masuk dialihkan ke `/guru` |
| `/guru` | Panel guru: menu Materi, Soal kuis, Absensi, Rekap nilai, Kode riwayat, Token kelas, Keamanan | Butuh login guru |
| `/guru/keamanan` | Kirim email ganti password lewat Supabase Auth | Butuh login guru + Supabase |
| `/guru/absen` | Guru mencatat kehadiran siswa per tanggal | Butuh login guru + Supabase |
| `/guru/materi` | Daftar materi, hapus, dan impor awal dari `config/education.js` | Butuh login guru + Supabase |
| `/guru/materi/baru` | Form tambah materi: isi, video, jumlah soal | Butuh login guru + Supabase |
| `/guru/materi/[kelas]/[materi]` | Form ubah materi (slug tetap) | Butuh login guru + Supabase |
| `POST /guru/materi/berkas` | Unggah PDF/DOCX/PPTX ke Storage, balas metadata | Butuh cookie guru + Storage |
| `DELETE /guru/materi/berkas` | Hapus berkas yang dibatalkan dari form | Butuh cookie guru + Storage |
| `/guru/kuis` | Menyusun soal AI atau membuka editor manual per materi | Butuh login guru + Supabase; AI butuh environment AI |
| `/guru/kuis/[kelas]/[materi]` | Editor soal manual: pertanyaan, 4 pilihan, kunci, pembahasan | Butuh login guru + Supabase |
| `/guru/nilai` | Rekap nilai kuis per materi (agregat) | Butuh login guru + Supabase |
| `/guru/token` | Buat, ganti, dan cabut token masuk kelas | Butuh login guru + Supabase |
| `/guru/riwayat` | Buat, ganti, dan cabut kode riwayat nilai per siswa | Butuh login guru + Supabase |
| `POST /api/kuis` | Mengirim bank soal materi dengan urutan soal/pilihan diacak per siswa | Butuh bank soal guru + `KUIS_SECRET` + token kelas |
| `POST /api/kuis/nilai` | Menilai jawaban, menyimpan nama + skor, dan mengembalikan papan skor | Butuh `KUIS_SECRET`; simpan butuh Supabase |
| `POST /api/tanya` | Menjawab pertanyaan siswa tentang satu materi | Butuh environment AI; materi dari database |
| URL lain | Halaman 404 | — |

Catatan: lingkup proyek hanya jenjang SMK. Tidak ada akun siswa, pendaftaran,
reset sandi, maupun dashboard siswa; satu-satunya akun adalah akun guru.

---

## 4. Cara Mengedit Konten

Semua konten berbasis data, tidak perlu menyentuh markup. Cari komentar `EDIT:`
di file terkait.

| Yang ingin diubah | File | Bagian |
|---|---|---|
| Nama situs, tagline, deskripsi | `config/site.js` | objek `siteConfig` |
| Menu navbar | `config/navigation.js` | array `links` |
| Nama sekolah, deskripsi, alamat | `config/education.js` | `school` |
| Logo sekolah | `config/education.js` + `public/logo smkn 2.png` | `school.logo`, `school.logoAlt` |
| Foto galeri beranda | `config/education.js` + `public/galeri/` | `galeri.foto[]` |
| Video sosialisasi beranda | `config/education.js` | `school.videoSosialisasi` (`judul`, `deskripsi`, `youtubeId`) |
| Judul & pengantar galeri | `config/education.js` | `galeri.judul`, `galeri.deskripsi` |
| Tahun berdiri | `config/education.js` | `tahunBerdiri` |
| Sejarah sekolah | `config/education.js` | `sejarah` |
| Deskripsi jenjang / kelas | `config/education.js` | `jenjang[0].deskripsi`, `kelas[].deskripsi` |
| Materi, isi, video, jumlah soal | Halaman `/guru/materi` | Tambah / Ubah / Hapus; data disimpan di tabel `materi` |
| Berkas materi (PDF/Word/PPT) | Halaman `/guru/materi` | Pilih berkas pada bagian **Berkas materi** di form tambah/ubah |
| Materi awal untuk impor | `config/education.js` | `kelas[].materi` (dipakai tombol **Impor dari config**, tidak menimpa materi yang sudah ada) |
| Soal kuis | Halaman `/guru/kuis` | **Buat soal** (AI) atau **Tulis manual** per materi |
| Kunci & model AI (kuis dan tanya) | `.env.local` (salin dari `.env.example`) | `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` |
| Rahasia token kuis | `.env.local` | `KUIS_SECRET` |
| Proyek Supabase | `.env.local` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Akun guru | Supabase Dashboard → Authentication → Users | Buat user + centang *Auto Confirm User*, lalu set `app_metadata` = `{"role":"guru"}` |
| Kunci Supabase Auth | `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Ganti password guru | Halaman `/guru/keamanan` | Kirim tautan ganti password ke email akun |
| Token masuk kelas | Halaman `/guru/token` (butuh login guru) | tombol Buat / Ganti / Cabut per kelas |
| Daftar siswa untuk absensi | Halaman `/guru/absen` | formulir "Tambah siswa"; tombol **Hapus** di kolom Aksi untuk menghapus permanen |
| Data pembuat website | `app/page.jsx` | `creatorGroup` → `members` (4 anggota) |
| Warna, radius, font, garis | `app/globals.css` | blok `:root` (Libre Bodoni, Public Sans, IBM Plex Mono) |
| Font Google yang dimuat | `app/layout.jsx` | `<link>` ke Google Fonts |
| Tampilan navbar | `components/Navbar/Navbar.module.css` | — |
| Tampilan footer | `components/Footer/Footer.module.css` | — |
| Tampilan galeri | `components/Galeri/Galeri.module.css` | — |
| Tampilan logo | `components/SchoolLogo/SchoolLogo.module.css` | — |

---

## 5. Format Data Materi

Materi **tidak lagi diisi lewat config**. Guru menambah dan mengubahnya di
`/guru/materi`. Setiap baris tabel `materi` berisi:

| Kolom | Isi |
|---|---|
| `kelas` + `slug` | Kunci unik; URL menjadi `/smk/<kelas>/<slug>` |
| `judul`, `deskripsi`, `durasi` | Teks yang tampil di halaman siswa |
| `video_judul`, `video_youtube_id` | Video opsional; ID/URL YouTube diurai otomatis |
| `kuis_jumlah` | 0–20. 0 berarti materi tidak menampilkan kuis |
| `konten` | Array blok JSON (lihat tabel di bawah) |
| `berkas` | Array metadata lampiran `{id, nama, path, tipe, mime, ukuran}`; file asli di Storage |
| `urutan` | Urutan tampil dalam satu kelas |

Untuk memindahkan materi awal dari `config/education.js` (saat ini empat materi
kelas 10, satu per bab buku Informatika Kelas X), buka `/guru/materi` lalu tekan
**Impor dari config**. Impor bersifat tidak menimpa: baris dengan kelas + slug
yang sudah ada dibiarkan.

Keempat bab sudah terpasang di database lewat
`node scripts/pasang-4-bab.mjs --jalankan`: setiap bab menjadi satu baris
`materi` dengan PDF bab itu sebagai lampiran, dan `kuis_jumlah` masih **0**.
Pemasangan langsung ke Storage dipakai agar tidak melewati form unggah; metadata
berkasnya disimpan di kolom `berkas` dan dibaca dengan batas
`MAKS_UKURAN_SIMPAN` (25 MB), terpisah dari batas unggah form 4 MB.

**PDF bab masih sementara dan akan diganti.** Ada dua cara mengganti, dan
akibatnya berbeda:

| Cara | Yang berubah |
|---|---|
| `/guru/materi/[kelas]/[materi]` → lepas PDF lama, unggah yang baru | Hanya `berkas`. Konten, jumlah soal, dan bank soal tidak tersentuh. **Dianjurkan** bila materi sudah disunting. |
| `node scripts/pasang-4-bab.mjs --jalankan` (ulang) | `konten` dan `kuis_jumlah` **ditimpa** dari skrip, berkas lama di Storage dibuang. Cocok hanya bila materi belum disunting. Dry run menampilkan peringatan berisi nilai lama → nilai baru. |

Sebelum mengganti lewat skrip, pastikan berkas baru di `materi/` memakai nama
yang sama seperti yang tertulis di `BAB[]` dalam skrip, lalu jalankan tanpa
`--jalankan` dulu untuk melihat rencananya.

Kuis belum menyala karena bank soal disusun dari blok `konten`, sedangkan blok
`konten` tiap bab baru berisi pengantar dan daftar subbab. Ada dua jalan:

1. **Manual** — tulis soal di `/guru/kuis/[kelas]/[materi]`, lalu ubah
   `kuis_jumlah` menjadi 5 di `/guru/materi/[kelas]/[materi]`.
2. **Dari teks bab** — ekstrak teks PDF lewat `scripts/siapkan-bab.py --simpan`,
   lalu jalankan ulang `node scripts/pasang-4-bab.mjs --jalankan --pakai-teks`.
   Perhatikan dulu mutunya: `scripts/banding-ekstraksi.py` membandingkan mesin
   ekstraksi, karena pypdf bawaan memecah kata pada teks yang dijustify
   (`pent ing`, `teknolo gi`).

Verifikasi lampiran: `node scripts/skrip-materi.mjs` (menampilkan isi tabel
`materi` dan jumlah berkas di bucket) dan `python -I scripts/cek-bab-pdf.py`
(memeriksa jumlah halaman serta gambar pada PDF per bab).

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
- [x] Landing page: profil sekolah, sejarah & tahun berdiri, 4 kartu biodata Kelompok 5.
- [x] Navbar responsif (desktop + menu mobile) dengan penanda halaman aktif.
- [x] Footer global untuk semua halaman.
- [x] Halaman daftar kelas SMK.
- [x] Halaman daftar materi per kelas dengan kondisi kosong.
- [x] Halaman isi materi dengan 5 tipe blok konten dan navigasi antar materi.
- [x] Struktur konfigurasi terpisah: site, navigation, education.
- [x] Aksesibilitas dasar: skip-link, `aria-current`, `aria-label`, fokus keyboard.
- [x] Sejarah sekolah + tahun berdiri menggantikan visi & misi. Email/telepon dihapus.
- [x] Video materi: embed YouTube responsif, tautan fallback, dan empty state.
- [x] Kuis AI: soal dibuat dari isi materi, skor, pembahasan, ulangi, dan acak ulang urutan.
- [x] Validasi soal di server. Cache 1 jam dan pembatas per IP pada `/api/kuis` dihapus saat pembuatan soal dipindah ke panel guru; pembatasan tetap tidak diperlukan karena siswa hanya membaca bank soal.
- [x] `.env.example` untuk konfigurasi layanan AI (tanpa kredensial asli).
- [x] Penilaian kuis dipindah ke server: kunci jawaban tidak lagi dikirim ke browser (token AES-256-GCM).
- [x] Tanya AI: panel pembantu belajar di setiap materi, jawaban dibatasi pada isi materi, maksimal 10 pesan dan 8.000 karakter riwayat per permintaan.
- [x] Pembersihan otomatis entri cache soal dan catatan IP yang kedaluwarsa pada `/api/kuis`; `/api/tanya` juga membersihkan catatan IP-nya.
- [x] Logo sekolah: komponen `SchoolLogo` dengan fallback ikon, dipasang di navbar, hero, profil sekolah, footer, dan favicon.
- [x] Galeri beranda: carousel 3 foto, bergeser otomatis dari kiri ke kanan (±5 detik), tombol panah/titik, tombol jeda, serta berhenti saat hover, fokus keyboard, tab tidak aktif, atau `prefers-reduced-motion`.
- [x] Materi kelas 10 disusun ulang menjadi **4 materi, satu per bab** buku Informatika SMA/SMK Kelas X. Tiap bab punya PDF-nya sendiri sebagai lampiran (26/84/76/53 halaman); keempatnya lolos pemeriksaan `scripts/cek-bab-pdf.py` — jumlah halaman cocok dengan Daftar Isi dan gambarnya utuh. Dipasang lewat `scripts/pasang-4-bab.mjs --jalankan`; materi buku-utuh `informatika-kelas-x` dari percobaan sebelumnya ikut dihapus. Kuis masih 0 di keempat bab. Buku asli 272 halaman sudah tidak ada di repo, sumber lampiran tinggal `materi/`.
- [x] ESLint terpasang (`eslint` 8.57.1 + `eslint-config-next` 14.2.35, sesuai Next 14.2.35) dengan `.eslintrc.json`; `npm run lint` bersih tanpa peringatan.
- [x] Lingkup dikunci ke SMK: tagline dan deskripsi situs tidak lagi menyebut jenjang lain, dan `readme.md` menyatakan jenjang lain di luar cakupan.
- [x] Nama 4 anggota Kelompok 5 terisi di `app/page.jsx`; teks panduan developer di bagian pembuat sudah dihapus dari halaman publik.
- [x] **Login dihapus:** halaman `/login`, `/register`, `/lupa-sandi`, `/reset-sandi`, `/dashboard`, `/auth/callback`, `middleware.js`, dan klien Supabase browser dihapus. Dependensi `@supabase/ssr` dilepas.
- [x] Navbar dan footer tidak lagi memeriksa sesi; CTA navbar langsung menuju `/smk`, kolom "Jelajahi" di footer memuat tautan **Dashboard Guru** ke `/guru`.
- [x] **Login guru:** `/guru/login` adalah pintu masuk panel guru memakai akun Supabase Auth (email + password). Pesan untuk email salah dan password salah sama. Ada tombol keluar. *(Catatan: sempat memakai akun username + password dengan hash scrypt di tabel `pengaturan_guru`; tabel itu sudah dihapus dari skema.)*
- [x] **Daftar siswa** disimpan di tabel `siswa` (nama + kelas) dan bisa ditambah dari halaman absensi; absensi memakai filter kelas dan tanggal.
- [x] **Kuis tanpa akun:** hasil dinilai di server lalu disimpan (nama, kelas, materi, skor, total) ke `kuis_hasil`.
- [x] **Nama sebelum kuis:** siswa wajib mengisi nama (1–60 karakter) sebelum mulai; nama divalidasi ulang di server — karakter kontrol dibuang dan spasi dirapikan.
- [x] **Papan skor:** setelah dinilai, siswa melihat 10 skor teratas materi itu (satu baris per nama, skor terbaik) beserta peringkatnya sendiri.
- [x] **Panel guru:** `/guru` sebagai halaman induk dengan menu Absensi dan Rekap nilai; akses memakai akun guru dan cookie yang sama, berlaku untuk seluruh `/guru`.
- [x] **Rekap nilai:** `/guru/nilai` menampilkan agregat per kelas dan materi (jumlah pengerjaan, rata-rata persentase, nilai terendah/tertinggi), diurutkan dari rata-rata terendah.
- [x] Pemeriksaan akun guru dipindah ke `lib/guru/akses.js` agar dipakai bersama oleh panel, absensi, materi, kuis, nilai, dan token.
- [x] **Kuis dipisah ke halaman sendiri:** `/smk/[kelas]/[materi]/kuis`. Halaman materi hanya menampilkan ringkasan kuis dan tombol menuju halaman itu.
- [x] **Akses kelas dengan token:** `/smk` menjadi formulir token (bukan daftar card). Token per kelas dibaca dari tabel `token_kelas`, ditukar dengan cookie HttpOnly berisi sidik HMAC (`Path=/`, 8 jam). Kelas, materi, kuis, dan `/api/kuis` menolak permintaan tanpa token kelas yang sesuai.
- [x] **Token dibuat guru:** halaman `/guru/token` menampilkan token aktif per kelas dan tombol Buat / Ganti / Cabut. Token 8 karakter tanpa huruf I/O dan angka 0/1, disimpan di tabel `token_kelas`. Mengganti atau mencabut token membuat cookie siswa yang lama otomatis tidak sah. `TOKEN_KELAS_*` dihapus dari `.env.example`.
- [x] **Batas percobaan token:** 10 percobaan gagal per IP dalam 10 menit; hanya percobaan gagal yang dihitung agar satu kelas dengan IP sekolah yang sama tetap bisa masuk.
- [x] **Bank soal di panel guru:** `/guru/kuis` menyusun soal AI sekali per materi lalu menyimpannya di tabel `kuis_bank` (kelas + materi sebagai kunci). Guru dapat membuat ulang atau menghapus bank; soal lama diganti seluruhnya.
- [x] **Soal sama, urutan berbeda:** `/api/kuis` membaca bank yang sama untuk semua siswa, lalu mengacak urutan soal dan pilihan dengan Fisher-Yates (`randomInt`). Kunci jawaban digeser mengikuti urutan baru dan tetap disimpan di token terenkripsi, tidak pernah dikirim ke browser.
- [x] **Materi dikelola di dashboard:** `/guru/materi` menampilkan daftar materi, form tambah/ubah dengan editor blok, hapus materi (sekaligus bank soalnya), dan tombol **Impor dari config**. Slug tidak dapat diubah saat mengedit.
- [x] **Materi di database:** seluruh halaman siswa, `/api/kuis`, `/api/tanya`, `/guru/kuis`, `/guru/nilai`, dan hitungan di beranda membaca tabel `materi`, bukan lagi `config/education.js`.
- [x] **Editor soal manual:** `/guru/kuis/[kelas]/[materi]` menyediakan slot soal sesuai jumlah soal materi; guru mengisi pertanyaan, empat pilihan, kunci, dan pembahasan tanpa AI. Hasilnya disimpan ke `kuis_bank` dengan bentuk yang sama seperti hasil AI.
- [x] **Build & lint akhir:** `npm run lint` bersih dan `npm run build` berhasil (21 rute).
- [x] **Tombol keluar kelas:** `Keluar kelas` di `/smk/[kelas]` dan `Keluar dari semua kelas` di `/smk` menghapus cookie `akses_kelas`.
- [x] **Card kelas 10/11/12 dihapus** dari beranda dan `/smk`, sesuai keputusan pemilik proyek.
- [x] Variabel lingkungan di `.env.local` sudah terisi: layanan AI, `KUIS_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Akun guru dibuat di Supabase Auth (*Auto Confirm User* + `app_metadata.role = "guru"`), bukan lewat environment.
- [x] **Skema Supabase dijalankan** — `supabase/schema.sql` sudah diterapkan; kolom `kuis_hasil.nama`, tabel `siswa`, dan kolom `absensi.siswa_id` ada.
- [x] **Uji simpan nilai dan papan skor** — kuis 5 soal berhasil dibuat, jawaban tersimpan, dan papan skor menampilkan satu peserta dengan peringkat. Percobaan ulang dengan nama sama (beda huruf besar/kecil) tetap dihitung satu peserta dan memakai skor terbaik.
- [x] **Uji validasi nama** — nama kosong dan nama 61 karakter ditolak (400); nama berisi zero-width space dibersihkan dan tersimpan sebagai teks biasa.
- [x] **Uji rekap nilai** — `/guru/nilai` menampilkan materi beserta rata-rata persentase yang benar setelah ada data.
- [x] Data uji dihapus kembali; tabel `kuis_hasil` bersih.
- [x] Supabase diakses hanya dari server memakai `SUPABASE_SERVICE_ROLE_KEY`; anon key tidak dipakai lagi.
- [x] Verifikasi setelah login dihapus: `npm run lint` bersih dan `npm run build` berhasil (23 halaman). `/`, `/smk`, `/smk/10`, dan halaman materi membalas 200; `/login`, `/register`, dan `/dashboard` membalas 404.
- [x] Verifikasi panel & rekap: `npm run lint` bersih, `npm run build` berhasil, `/guru` dan `/guru/nilai` mengalihkan ke `/guru/login` bila cookie belum ada.
- [x] Alur login guru diuji: kredensial salah dialihkan ke `?galat=kredensial`; kredensial benar mengeset cookie sesi Supabase Auth lalu mengalihkan ke panel guru. *(Versi lama memakai cookie `akses_guru` HMAC; skema itu sudah tidak dipakai.)*
- [x] **Halaman login guru dibuat ulang** sebagai layar penuh: navbar dan footer disembunyikan hanya di `/guru/login` lewat style inline, kartu form di tengah, logo sekolah, toggle lihat password (`FormLoginGuru.jsx`), tautan "Lupa password?" ke bantuan, dan ikon tombol memakai `IconLogin` (sebelumnya ikon amplop). Komponen `FormLoginGuru` adalah klien terpisah, tetapi autentikasi tetap lewat server action `masukGuru`.
- [x] **Batas sesi guru 2 jam sejak login:** `lib/guru/sesi.js` menulis cookie `sesi_guru_mulai` saat login berhasil; `middleware.js` membuang cookie sesi Supabase dan mengalihkan ke `/guru/login?galat=sesi` setelah lewat. Cookie yang disegarkan Supabase dipotong `maxAge`-nya ke sisa sesi. *(Belum diuji di browser: buktikan dengan sementara menurunkan `MASA_SESI_GURU_DETIK` ke 20.)*
- [x] **Perbaikan bug path cookie kelas:** `akses_kelas` memakai `Path=/smk` sehingga tidak ikut terkirim ke `POST /api/kuis`; akibatnya pembuatan soal selalu ditolak 403. Path diubah menjadi `/` di `lib/kelas/akses.js`. Dampak tambahan: `keluarKelas()` kini menghapus cookie dengan path yang sama (sebelumnya tidak efektif).
- [x] **Rombak UI/UX total ke arah editorial grid:** seluruh `globals.css` dan CSS module komponen ditulis ulang. Tidak ada gradien, bayangan, atau sudut membulat; card dikurangi menjadi baris, daftar, dan tabel bergaris. Beranda memakai indeks kelas, langkah bernomor, dan daftar fitur, bukan kumpulan card.
- [x] **Tipografi baru:** Libre Bodoni untuk judul, Public Sans untuk teks, IBM Plex Mono untuk label; dimuat dari Google Fonts di `app/layout.jsx` dan dipetakan lewat token di `:root`.
- [x] **Target sentuh 44 px:** tombol, input, tautan navigasi, panah/dot galeri, dan pilihan status absensi dinaikkan ke minimal 44×44 px agar nyaman di layar sentuh.
- [x] **Verifikasi UI tanpa gambar:** halaman publik diperiksa lewat Edge headless pada lebar 360, 414, 768, 1024, dan 1440 px; panel guru pada 360, 768, dan 1440 px. Hasil: tidak ada scroll horizontal, tidak ada gradien, kontras teks lolos, font benar, target sentuh ≥44 px, menu mobile terbuka, dan galeri berpindah slide. `npm run lint` bersih dan `npm run build` berhasil.
- [x] **Berkas materi:** guru dapat melampirkan PDF/DOCX/PPTX (maks. 4 MB, 5 berkas) di form tambah/ubah materi. File disimpan di bucket privat `materi` pada Supabase Storage; metadata di kolom `materi.berkas`. Unggah lewat `POST /guru/materi/berkas` dengan validasi ekstensi + magic bytes. Halaman siswa memakai signed URL 2 jam: PDF dipratinjau, Word/PPTX diunduh. Menghapus materi atau melepas berkas ikut membersihkan Storage.
- [x] **Video sosialisasi beranda:** slot embed YouTube (`youtube-nocookie.com`) muncul di beranda setelah hero bila `school.videoSosialisasi.youtubeId` berisi ID valid; ID kosong menyembunyikan bagian itu. Tidak ada tautan keluar, hanya embed.
- [x] **Akun guru satu pintu:** semua halaman `/guru/*` mengalihkan pengunjung tanpa sesi ke `/guru/login`. Halaman login memakai `noindex`, dan halaman Keamanan dapat mengirim email ganti password. *(Versi lama: mengganti username serta password dari halaman itu; tidak lagi berlaku sejak pindah ke Supabase Auth.)*
- [x] Verifikasi fitur berkas: `npm run lint` bersih dan `npm run build` berhasil; rute `/guru/materi/berkas` ikut terbangun dan membalas 401 tanpa cookie guru.
- [x] **Nama kuis dipilih dari daftar kelas:** halaman kuis membaca tabel `siswa` dan mengirimkannya ke komponen `Kuis`. Siswa memilih namanya dari daftar (bukan mengetik bebas) agar ejaan sama dengan absensi; bila namanya belum terdaftar, ada tombol "Nama saya belum ada di daftar" yang membuka kolom ketik. Ini memperbaiki pencocokan riwayat nilai yang sebelumnya rapuh karena nama bebas.
- [x] **Riwayat nilai siswa dengan kode akses:** tabel `kode_riwayat` menyimpan satu kode 6 karakter per siswa (tanpa huruf I/O dan angka 0/1). Guru membuat/mengganti/mencabut kode di `/guru/riwayat`; siswa memasukkan kode di `/smk/[kelas]/riwayat` dan melihat seluruh nilai kuisnya di kelas itu beserta rata-rata dan nilai tertinggi. Cookie `riwayat_kelas` berisi sidik HMAC (bukan kode asli), berlaku 30 hari. Halaman guru ini sengaja terpisah dari `/guru/nilai` agar rekap tetap agregat tanpa nama. Batas 10 percobaan gagal per IP per 10 menit. Mengganti atau mencabut kode otomatis membuat cookie lama tidak sah.
- [x] Verifikasi riwayat nilai: `npm run lint` bersih dan `npm run build` berhasil (24 rute, dari 22). Rute `/guru/riwayat` dan `/smk/[kelas]/riwayat` terbangun.
- [x] **Perbaikan celah absensi siswa:** server action `catatKehadiranSiswa` kini memeriksa apakah perangkat sudah mencatat kehadiran hari ini sebelum menulis ke database. Sebelumnya pemeriksaan hanya ada di tampilan, sehingga identitas siswa lain bisa dikirim berulang untuk menandai satu kelas hadir sekaligus. Cookie `absen_kelas` kini menyimpan UUID siswa (`slug.tanggal.siswaId.sidik`) agar aturan "satu perangkat hanya mencatat satu siswa per kelas per hari" bisa ditegakkan; sidik naik ke versi v2 sehingga cookie lama otomatis tidak berlaku.
- [x] **Hapus siswa dari panel guru:** `/guru/absen` mendapat kolom **Aksi** dengan tombol hapus. Penghapusan dua langkah — klik **Hapus** membuka panel konfirmasi berisi nama, kelas, jumlah catatan absensi, dan jumlah kode riwayat yang ikut terhapus; data baru berubah setelah tombol **Ya, hapus permanen** ditekan. Menghapus siswa ikut menghapus `absensi` dan `kode_riwayat` (`on delete cascade`), sedangkan nilai kuis di `kuis_hasil` tetap tersimpan karena dicocokkan lewat nama. Server action `hapusSiswa` ada di `lib/guru/absen.js` dan memeriksa cookie guru sendiri.
- [x] **Siswa yang dihapus tidak membuat perangkatnya buntu:** halaman absensi siswa menampilkan formulir lagi bila baris siswanya sudah tidak ada, dan `catatKehadiranSiswa` membersihkan cookie lama dalam kasus itu. Tanpa penanganan ini, siswa terjebak di kartu "sudah tercatat" dengan nama kosong.

---

## 7. Yang Belum Selesai

- [ ] **Pesan profil tiga anggota** — Rakha, Rivana, dan Aditya masih memakai kalimat seragam "Terima kasih sudah mampir ke profil saya. Semoga karyanya bermanfaat."; hanya Hamdan yang sudah ditulis personal. Ketiganya juga belum punya `tandaTangan`.
- [ ] **ID video YouTube per materi** — slot tersedia di `/guru/materi`, tetapi materi awal belum diisi ID-nya (baris `video:` di `config/education.js` masih `null`).
- [ ] **Jalankan ulang `supabase/schema.sql`** — pastikan tabel `materi` (termasuk kolom `berkas`), `token_kelas`, `kuis_bank`, dan `kode_riwayat` sudah ada, serta bucket Storage `materi` terbentuk. Tanpa `materi`, halaman siswa dan dashboard materi kosong; tanpa `token_kelas`, tidak ada kelas yang bisa dibuka; tanpa `kuis_bank`, guru belum bisa menyimpan soal; tanpa `kode_riwayat`, halaman riwayat menampilkan pesan galat; tanpa kolom/bucket, unggah berkas gagal.
- [ ] **Uji riwayat nilai end-to-end** — buat kode di `/guru/riwayat`, kerjakan satu kuis sebagai siswa dengan nama dari daftar, lalu buka `/smk/<kelas>/riwayat` dan pastikan nilainya muncul. Uji juga Ganti dan Cabut kode.
- [ ] **Tambah siswa yang belum terdaftar** — siswa yang memilih "Nama saya belum ada di daftar" di halaman kuis tidak otomatis masuk tabel `siswa` (keputusan: route penilaian tidak menulis ke tabel `siswa`). Guru perlu menambahkannya lewat `/guru/absen` bila ingin permanen.
- [ ] **Bank soal kuis per bab** — keempat materi kelas 10 masih `kuis_jumlah: 0`, jadi `/smk/10` tidak punya tautan kuis. Dua jalan: tulis soal manual di `/guru/kuis/[kelas]/[materi]` lalu naikkan `kuis_jumlah` ke 5, atau ekstrak teks bab ke `konten` lebih dulu (lihat poin berikut).
- [ ] **Ganti PDF bab dengan versi final** — keempat PDF di `materi/` masih sementara. Setelah versi final siap, ganti lewat `/guru/materi/[kelas]/[materi]` (aman, tidak menyentuh konten) atau jalankan ulang `node scripts/pasang-4-bab.mjs --jalankan` (menimpa konten, lihat tabel di bagian materi).
- [ ] **Uji alur materi & soal manual** — tambah satu materi, isi satu blok, set jumlah soal, lalu tulis soal manual di `/guru/kuis/[kelas]/[materi]` dan kerjakan sebagai siswa.
- [ ] **Uji unggah berkas end-to-end** — unggah PDF + DOCX + PPTX, simpan materi, buka sebagai siswa, cek pratinjau PDF dan unduhan Word/PPT, lalu hapus materi dan pastikan file hilang dari Storage.
- [ ] **Uji absensi end-to-end** — alur login guru sudah lolos, tetapi tambah siswa, catat kehadiran, dan perbaikan status pada tanggal yang sama belum diuji. Alur absensi mandiri siswa (poin 4.5 di `testing.md`) juga belum dijalankan, termasuk tombol **Bukan saya, pilih ulang nama** dan aturan satu perangkat satu siswa per hari.
- [ ] **Pemeriksaan visual akhir oleh manusia** — audit otomatis hanya mengukur overflow, kontras, font, dan target sentuh; keputusan estetika (ritme, potongan foto, rasa tipografi) tetap perlu dilihat langsung di browser.
- [ ] **Hapus tabel/skema lama (opsional)** — `profiles`, `peran_saya()`, dan trigger `buat_profil()` sudah tidak dipakai; perintah drop ada di komentar `supabase/schema.sql`.

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

1. Buka proyek Supabase yang sudah ada, atau buat proyek baru.
2. Salin **Project URL** ke `.env.local` sebagai `SUPABASE_URL` dan
   `NEXT_PUBLIC_SUPABASE_URL` (nilainya sama).
3. Salin **service_role key** (Project Settings → API) ke `.env.local` sebagai
   `SUPABASE_SERVICE_ROLE_KEY`. Kunci ini hanya untuk server.
4. Salin **anon public key** (Project Settings → API) ke `.env.local` sebagai
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Kunci ini dipakai login/logout saja.
5. Isi `KUIS_SECRET` dengan nilai acak panjang (`openssl rand -base64 32`).
6. Jalankan isi `supabase/schema.sql` di SQL Editor Supabase. Aman dijalankan
   ulang. Berkas ini tidak membuat akun guru.
7. Buat akun guru di **Authentication → Users → Add user**, centang *Auto
   Confirm User*, lalu buka user tersebut dan isi **Raw App Meta Data** dengan
   `{"role":"guru"}`. Tanpa `app_metadata` itu, login akan langsung ditolak.
8. Login dengan **email**, bukan username.

### Akun guru

- Akun guru adalah user Supabase Auth. Aplikasi tidak menyimpan password dan
  tidak punya tabel akun sendiri.
- Peran dibaca dari `user.app_metadata.role`. Field ini hanya bisa diubah lewat
  Dashboard/Admin API, sehingga pemilik akun tidak bisa menaikkan perannya
  sendiri.
- `email` salah dan password salah memberi pesan yang sama.
- Maksimal 5 percobaan gagal per IP per 10 menit (disimpan di memori proses).
- Sesi berakhir **2 jam setelah login**, bukan 2 jam setelah aktivitas terakhir.
  Penanda waktunya cookie `sesi_guru_mulai` (HttpOnly), sengaja dipisah dari
  cookie Supabase supaya penyegaran token tidak memperpanjangnya. Middleware
  membuang cookie sesi Supabase begitu penanda kedaluwarsa.
- Ganti password lewat `/guru/keamanan`, yang meminta Supabase mengirim email
  tautan ganti password. Reset sebelum masuk dilakukan dari Dashboard.

---

## 9. Catatan Teknis

- **Satu akun guru:** tidak ada akun siswa maupun tabel `profiles`.
  `/guru/login` menerbitkan sesi Supabase Auth; seluruh `/guru/*` memerlukan sesi
  itu; `/smk` di bawah halaman token memerlukan cookie token kelas.
- **Akses database hanya dari server.** `lib/supabase/server.js` memakai
  `SUPABASE_SERVICE_ROLE_KEY`; kunci ini tidak pernah dikirim ke browser dan
  tidak memakai prefix `NEXT_PUBLIC_`.
- **RLS tetap aktif tanpa kebijakan** pada `siswa`, `kuis_hasil`, dan `absensi`.
  Service role melewati RLS, sedangkan anon key tidak bisa membaca apa pun.
- **Akun guru:** memakai Supabase Auth (email + password). `lib/supabase/klien.js`
  membuat klien anon key untuk login/logout; password tidak pernah disimpan
  aplikasi. Sesi berupa cookie bawaan Supabase (`sb-*-auth-token`, HttpOnly,
  SameSite=Lax) yang disegarkan `middleware.js`, ditambah cookie penanda
  `sesi_guru_mulai` sebagai acuan batas 2 jam. Detail di bagian
  "Akun guru" pada langkah konfigurasi.
- **Setiap server action absensi memeriksa ulang cookie**, karena server action
  dapat dipanggil langsung tanpa membuka halaman.
- **Token kelas** dibaca dari tabel `token_kelas` (dibuat guru di
  `/guru/token`) dan dibandingkan dengan `timingSafeEqual` tanpa membedakan
  huruf besar/kecil. Satu token hanya membuka satu kelas. Cookie `akses_kelas`
  berisi daftar `slug.sidikHMAC` yang dipisah `|`, bukan token asli; berlaku 8
  jam dan `Path=/`. Sidik memakai token sebagai kunci HMAC, sehingga mengganti
  atau mencabut token otomatis membuat cookie lama tidak sah.
- **Token disimpan apa adanya** di `token_kelas` agar guru dapat melihatnya
  kembali untuk dibagikan. Tabel hanya dapat dibaca lewat service role; RLS
  aktif tanpa kebijakan.
- **Batas percobaan token** disimpan di memori proses: 10 percobaan gagal per
  IP per 10 menit, dan hanya kegagalan yang dihitung. Pada jaringan sekolah
  yang berbagi satu IP, kegagalan beberapa siswa ikut terhitung; batas ini
  mencegah tebak-tebakan biasa, bukan pengamanan penuh.
- **Pembacaan token per permintaan** dibungkus cache React agar satu halaman
  hanya membaca tabel `token_kelas` sekali meski beberapa pemeriksaan akses
  dipanggil.
- **Gate kelas bersifat UI + API**: `/smk/<kelas>`, halaman materi, halaman
  kuis, dan `POST /api/kuis` menolak permintaan tanpa cookie kelas. Isi materi
  kini tersimpan di database; token membatasi tampilan, bukan kerahasiaan data.
- **Kuis terpisah dari materi.** `/api/kuis` hanya membaca bank soal yang sudah
  dibuat guru; halaman kuis membungkus komponen `Kuis` dengan kerangka halaman.
- **Siswa tidak punya akun**, jadi kehadiran tidak bisa dilihat siswa sendiri;
  hanya guru yang melihat dan mencatatnya.
- **Absensi** menyimpan satu baris per siswa per tanggal
  (`unique (siswa_id, tanggal)`) dan memakai upsert, sehingga guru dapat
  memperbaiki status pada tanggal yang sama. Tanggal mengikuti zona waktu
  `Asia/Jakarta`.
- **Menghapus siswa bersifat permanen dan berantai.** `absensi` dan
  `kode_riwayat` memakai `on delete cascade` ke `siswa`, jadi menghapus satu
  siswa ikut menghapus seluruh catatan absensinya dan kode riwayat nilainya.
  Nilai kuis di `kuis_hasil` **tidak** ikut terhapus karena tabel itu tidak
  menyimpan `siswa_id` — pencocokannya lewat nama. Karena absensi yang hilang
  tidak dapat dikembalikan, `/guru/absen` memakai dua langkah: tombol **Hapus**
  hanya membuka panel konfirmasi berisi jumlah data yang akan ikut terhapus,
  dan penghapusan sebenarnya berjalan lewat server action `hapusSiswa`
  (`lib/guru/absen.js`).
- **Absensi mandiri siswa** (`/smk/[kelas]/absen`) meminta kehadiran sekali per
  hari sebelum materi dibuka. Cookie `absen_kelas` berbentuk
  `slug.tanggal.siswaId.sidik`; UUID siswa ikut ditandatangani karena dipakai
  untuk menegakkan aturan **satu perangkat = satu siswa per kelas per hari**
  dan untuk menentukan baris mana yang boleh dibatalkan siswa.
- **Aturan satu siswa per hari diperiksa di server action**, bukan hanya di
  tampilan: server action dapat dipanggil langsung tanpa membuka halaman.
  Tanpa pemeriksaan ini, satu siswa dapat mengirim `siswaId` berulang dan
  menandai seluruh kelas hadir.
- **Salah pilih nama bisa diperbaiki siswa** lewat tombol "Bukan saya, pilih
  ulang nama". Server menghapus baris `hadir` hari itu (hanya milik siswa di
  cookie, dan hanya bila statusnya masih `hadir`), lalu formulir muncul lagi.
  Status izin/sakit/alfa yang sudah ditetapkan guru tidak dapat dihapus siswa;
  bila itu yang terjadi, siswa melihat pesan `galat=kunci`.
- **Cookie absensi versi lama** (tanpa UUID siswa) tidak lagi berlaku setelah
  pembaruan ini, sehingga siswa mengisi absensi sekali lagi pada hari
  pembaruan. Sidik memakai versi pesan v2 agar perubahan ini eksplisit.
- **Nilai kuis memakai nama siswa.** Sejak 6 November 2026 nama dipilih dari
  daftar kelas (tabel `siswa`) di halaman kuis, bukan diketik bebas, supaya
  ejaannya konsisten dengan absensi dan riwayat bisa dicocokkan. Siswa yang
  belum terdaftar tetap boleh mengetik namanya; nama itu **tidak** otomatis
  masuk tabel `siswa`. Kolom `user_id` di `kuis_hasil` dibiarkan kosong karena
  tidak ada akun.
- **Riwayat nilai dicocokkan lewat nama, bukan ID.** Karena `kuis_hasil` tidak
  menyimpan `siswa_id`, halaman riwayat mencari baris dengan `nama` yang sama
  persis. Inilah alasan nama kuis dipilih dari daftar kelas. Bila guru
  mengubah nama siswa di absensi setelah kuis dikerjakan, baris lama tidak
  ikut berubah dan tidak muncul lagi di riwayat.
- **Kode riwayat tidak memakai data pribadi.** Tanggal lahir tidak pernah
  disimpan, sehingga kode acak 6 karakter (tanpa huruf I/O dan angka 0/1)
  menjadi pengganti identitas. Siapa pun yang tahu kodenya dapat membuka
  riwayat itu; karena itu kode hanya dibagikan kepada siswa bersangkutan dan
  dapat dicabut guru kapan saja.
- **Papan skor** menampilkan 10 baris teratas per materi, satu baris per nama
  (skor terbaik, perbandingan nama tanpa membedakan huruf besar/kecil).
  Peringkat dihitung dari seluruh nama yang terbaca, lalu dikirim terpisah
  meski siswa berada di luar 10 besar.
- **Batas papan skor:** hanya 500 baris terbaru per materi yang dibaca untuk
  menyusun papan skor. Jumlah pengerjaan di rekap guru juga dibatasi 5.000
  baris per permintaan; pada skala satu sekolah batas ini jauh di atas
  kebutuhan.
- **Nama divalidasi di server:** harus string, karakter kontrol dibuang, spasi
  dirapikan, panjang 1–60 karakter. React merender nama sebagai teks sehingga
  tidak bisa menjadi HTML/script. Database juga memasang
  `check (nama is null or length(btrim(nama)) between 1 and 60)`.
- **Server vs Client Component:** `Navbar`, `Galeri`, `Kuis`, dan `Tanya` adalah
  Client Component karena memakai state/interaksi browser. Halaman dan komponen
  lain Server Component.
- **Logo sekolah** diambil dari `school.logo` dan ditampilkan lewat komponen
  `SchoolLogo`. Bila nilainya dikosongkan, komponen memakai ikon wisuda sebagai
  fallback. Path logo juga dipakai sebagai favicon.
- **Galeri beranda** memakai satu track flex dengan slide kembaran di kedua
  ujung agar perpindahan dari foto terakhir ke pertama tetap mulus.
- **Media anggota tim** diperiksa keberadaannya di server lewat `berkasPublik()`
  (`existsSync`, hanya stat berkas). Path yang tidak ada menjadi `null`, sehingga
  fitur terkait mati sendiri tanpa membuat gambar rusak; bila `foto` tidak ada,
  dialog menampilkan inisial. Dukungan GIF profil sudah dihapus (6 November 2026)
  karena tidak ada berkas GIF di `public/tim/`.
- **Tahun footer** dihitung saat build, bukan saat halaman dibuka di browser.
- **Tautan materi** mengikuti isi tabel `materi` per kelas; materi baru langsung
  muncul tanpa mengubah config.
- **Materi** disimpan di tabel `materi` (`lib/materi/kelas.js`). Form tambah/ubah
  memakai server action di `lib/materi/aksi.js`; validasi konten ada di
  `lib/materi/konten.js` yang tidak menyentuh database sehingga aman dipakai di
  Client Component.
- **Bank soal kuis** disusun guru di `/guru/kuis` lewat AI (`lib/kuis/ai.js`)
  atau ditulis manual di `/guru/kuis/[kelas]/[materi]`, lalu disimpan di tabel
  `kuis_bank` oleh `lib/kuis/bank.js`. Jumlah soal diambil dari kolom
  `materi.kuis_jumlah`, bukan dari request siswa.
- **`/api/kuis` tidak memanggil AI.** Route ini membaca bank soal dari database,
  mengacak urutan soal dan pilihan per permintaan (`lib/kuis/soal.js`), lalu
  mengirim soal tanpa kunci. Semua siswa mengerjakan isi soal yang sama.
- **Kunci jawaban tidak pernah dikirim ke browser.** Setiap urutan acak
  dienkripsi menjadi token AES-256-GCM (`KUIS_SECRET`) dan dibuka kembali saat
  penilaian, sehingga indeks jawaban selalu sesuai urutan yang dilihat siswa.
- **Alamat IP** dari `X-Forwarded-For` masih dipakai untuk pembatas percobaan
  token kelas; `/api/kuis` sendiri tidak lagi memakai pembatas per IP.
- **Kunci jawaban tidak dikirim ke browser.** `/api/kuis` mengembalikan soal
  tanpa kunci plus token terenkripsi (AES-256-GCM, `KUIS_SECRET`, berlaku 2
  jam). `/api/kuis/nilai` membuka token, menilai, lalu menyimpan hasil.
- **Tanya AI** memakai route `app/api/tanya/route.js` dan API key yang sama
  dengan kuis. Batas: 40 permintaan per IP per jam, 10 pesan terakhir, 1.200
  karakter per pesan, 8.000 karakter total riwayat, jawaban maksimal sekitar
  700 token, timeout 60 detik.
- **AI tidak menerima foto atau video.** Prompt kuis dan tanya AI hanya
  menyusun teks dari blok `tujuan`, `teks`, `daftar`, `kode`, dan `catatan`.
  ID video YouTube, foto galeri, dan isi berkas materi tidak pernah dikirim ke
  layanan AI, sehingga model tidak perlu kemampuan vision maupun ekstraksi PDF.
  Konsekuensinya: **PDF buku tidak bisa dijadikan bahan soal secara langsung.**
  Materi yang hanya berisi lampiran PDF tidak punya bank soal sampai guru
  menulis soal manual atau teks babnya dimasukkan ke `konten`.
- **Berkas materi disimpan di Supabase Storage** (bucket privat `materi`),
  bukan di database. Kolom `materi.berkas` hanya menyimpan metadata. Berkas
  diunggah lewat route handler `POST /guru/materi/berkas`, bukan server action,
  agar tidak terkena batas body server action Next.js; batas 4 MB dibuat agar
  tetap di bawah batas body Vercel (±4,5 MB). Berkas yang lebih besar (misalnya
  buku pegangan sekolah) dipasang langsung ke bucket lewat skrip, dan batas
  baca metadata `MAKS_UKURAN_SIMPAN` (25 MB) sengaja dibuat terpisah agar
  metadata berkas besar tidak dibuang saat halaman membaca database. Keempat PDF
  bab (0,59–1,50 MB) memasang lewat jalur skrip ini agar pemasangannya sekali
  jalan bersama baris `materi`-nya, bisa diulang, dan tidak bergantung pada
  form browser.
- **Ekstraksi teks PDF buku bermasalah.** pypdf bawaan memecah kata pada teks
  yang dijustify (`pent ing`, `teknolo gi`, `dasar-das ar`), dan pemisahnya
  spasi di dalam baris — bukan baris baru — sehingga aturan penyambungan baris
  tidak menolong. Karena itu teks buku belum dipakai sebagai `konten`;
  keputusan mesin ekstraksi ditunda dan tinggal dibandingkan lewat
  `scripts/banding-ekstraksi.py`.
- **Validasi berkas** memakai ekstensi + magic bytes (`%PDF` untuk PDF, `PK`
  untuk DOCX/PPTX), nama tampilan dibersihkan, dan path penyimpanan dibuat
  server dari UUID sehingga tidak bisa diisi dari browser. Jumlah maksimal 5
  berkas per materi.
- **Signed URL berlaku 2 jam.** Bucket privat; siswa tidak pernah memakai
  service key dan tidak menghubungi Supabase langsung. Tautan unduhan memakai
  opsi `download` Supabase karena atribut `download` HTML tidak berlaku lintas
  domain. PDF mendapat tautan pratinjau tambahan tanpa opsi unduhan.
- **Berkas ikut terhapus** saat materi dihapus atau berkas dilepas dari form
  (dibersihkan setelah materi berhasil disimpan, bukan saat tombol hapus
  ditekan). Berkas yang diunggah lalu form ditinggalkan tanpa disimpan belum
  dibersihkan otomatis.
- **Kolom `berkas` bersifat opsional saat membaca.** Bila database belum
  dijalankan ulang dan kolom belum ada, query otomatis jatuh ke kolom dasar
  sehingga halaman materi tetap tampil (tanpa berkas) alih-alih kosong.
- **Waktu pembuatan soal** bervariasi (13–62 detik pada pengujian). Timeout
  server 120 detik; jika gagal, siswa melihat pesan dan tombol coba lagi.
- **CSS lama** untuk halaman akun dan dashboard masih ada di `globals.css`
  karena sebagian kelasnya dipakai halaman absensi (form, tabel, chip).
- **Arah desain** terkunci pada editorial grid: kertas hangat (`#f4f0e6`),
  tinta (`#171512`), aksen rust (`#a8431f`), sudut 2–6 px, tanpa bayangan dan
  tanpa gradien. Semua warna, font, radius, dan garis diambil dari token
  `:root`; komponen tidak boleh menulis warna mentah kecuali untuk teks di atas
  latar gelap.
- **Font dimuat dari Google Fonts** lewat `<link>` di `app/layout.jsx`
  (Libre Bodoni, Public Sans, IBM Plex Mono). Bila koneksi ke Google Fonts
  gagal, tumpukan fallback sistem di token tetap dipakai.
- **Card dikurangi.** Beranda, panel guru, materi, kuis, dan tanya AI memakai
  baris/daftar dengan garis pemisah. Kotak `card` yang tersisa hanya untuk
  formulir dan blok yang memang perlu dibatasi.
- **Target sentuh** minimal 44×44 px diterapkan pada tombol, input, tautan
  navigasi, kontrol galeri, dan pilihan status absensi.
- **Audit UI tanpa gambar** memakai Edge headless lewat Chrome DevTools
  Protocol untuk mengukur overflow, gradien, font, kontras, dan ukuran target.
  Alat ini tidak menyimpan tangkapan layar dan tidak mengirim gambar ke model.
- **Struktur proyek** mengikuti `readme.md`. Setiap penambahan file atau
  dependensi baru memerlukan persetujuan pemilik proyek.

---

## 10. Langkah Berikutnya (usulan)

1. Jalankan ulang `supabase/schema.sql` untuk membuat tabel `materi` (tabel
   `token_kelas` dan `kuis_bank` ikut dipastikan ada).
2. Buka `/guru/materi` → **Impor dari config** untuk mengisi materi awal
   (empat bab buku Informatika Kelas X), atau langsung pasang lewat
   `node scripts/pasang-4-bab.mjs --jalankan` bila materi belum ada.
3. Buka `/guru` → Token kelas, buat token untuk tiap kelas, lalu uji alur:
   token kelas 10 masuk ke `/smk/10`, token kelas 11 tidak membuka kelas 10,
   dan mengganti token membuat sesi lama harus masuk ulang.
4. Uji `/guru/materi`: tambah materi, ubah blok, hapus materi.
5. Uji `/guru/kuis`: buat soal AI dan tulis manual, lalu kerjakan sebagai siswa.
6. Uji `/guru/absen`: tambah siswa, simpan absensi, dan pastikan status bisa
   diperbaiki pada tanggal yang sama.
7. Uji berkas materi: unggah PDF, DOCX, dan PPTX di `/guru/materi`, lalu buka
   materinya sebagai siswa dan cek pratinjau/unduhan.
8. Isi ID video YouTube tiap materi lewat `/guru/materi`.
9. Lengkapi pesan profil Rakha, Rivana, dan Aditya di `app/page.jsx`.
