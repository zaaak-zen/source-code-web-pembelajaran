# Rencana Pengembangan — Warung Kode

Dokumen kerja untuk hal-hal yang **belum** diputuskan atau belum dikerjakan.
Status implementasi ada di `status.md`; aturan struktur ada di `readme.md`.

Terakhir diperbarui: 17 November 2026
Status proyek saat ini: tanpa akun siswa (login, daftar, reset sandi, dan
dashboard siswa sudah dihapus). Panel guru memakai akun **Supabase Auth**
(email + password) di `/guru/login`, dengan sesi berakhir 2 jam setelah login.
Panel guru, rekap nilai agregat, papan
skor kuis, halaman kuis terpisah, bank soal kuis, dan token masuk kelas sudah
dikerjakan. Token kelas dan soal kuis
dibuat guru dari panel guru lalu disimpan di database, bukan di `.env.local`;
soal yang sama dipakai semua siswa dengan urutan acak per siswa.

**Materi juga sudah pindah ke database.** Sejak 2 November 2026 materi tidak lagi
dibaca dari `config/education.js`, melainkan dari tabel `materi` dan dikelola
guru di `/guru/materi`. Satu materi per kelas kini diidentifikasi oleh kunci
`kelas` + `slug`, dan URL-nya menjadi `/smk/<kelas>/<slug>` (tanpa segmen
jenjang). `config/education.js` hanya disisakan sebagai bahan tombol **Impor
dari config** — tidak pernah dibaca langsung saat halaman dibuka.

---

## 1. Cara Menambah Materi

Sejak 2 November 2026 materi **tidak lagi diisi lewat config**. Seluruh materi
disimpan di tabel `materi` dan dikelola guru dari panel guru. Tidak perlu
menyentuh `app/` maupun `config/`.

### Jalur utama — panel guru

1. Masuk ke `/guru/login`.
2. Buka menu **Materi** (`/guru/materi`), lalu tekan **Tambah materi**
   (`/guru/materi/baru`).
3. Isi: kelas, judul, slug, durasi, jumlah soal kuis, deskripsi singkat, video
   (opsional), blok konten, dan berkas lampiran (opsional).
4. Simpan. Materi langsung tampil di halaman siswa; tidak perlu build ulang.

Mengubah materi: tekan **Ubah** pada baris materi. **Slug tidak dapat diubah**
saat mengedit karena slug adalah bagian dari URL dan kunci baris.

### Jalur impor — tombol "Impor dari config"

Tombol **Impor dari config** di `/guru/materi` menyalin materi awal dari
`config/education.js` (`kelas[].materi`) ke tabel `materi`. Impor bersifat
**tidak menimpa** (`ignoreDuplicates`): baris dengan `kelas` + `slug` yang sudah
ada dibiarkan apa adanya, jadi tombol ini aman ditekan berulang kali.

Config hanya dipakai sebagai **bahan impor sekali jalan**. Setelah materi ada di
database, mengedit `config/education.js` tidak mengubah apa pun di halaman
siswa.

### Bentuk satu materi di database

| Kolom | Isi |
|---|---|
| `kelas` + `slug` | Kunci unik; URL menjadi `/smk/<kelas>/<slug>` |
| `judul`, `deskripsi`, `durasi` | Teks yang tampil di halaman siswa |
| `video_judul`, `video_youtube_id` | Video opsional; ID atau URL YouTube diurai otomatis |
| `kuis_jumlah` | 0–20. Bila `0`, materi tidak menampilkan kuis; tombolnya tidak dihasilkan, sehingga `POST /api/kuis` tidak pernah dipanggil untuk materi itu |
| `konten` | Array blok JSON (lihat tabel tipe blok di bawah) |
| `berkas` | Array metadata lampiran `{id, nama, path, tipe, mime, ukuran}`; file asli di Supabase Storage |
| `urutan` | Urutan tampil dalam satu kelas |

### Aturan yang perlu diperhatikan

| Hal | Aturan |
|---|---|
| `slug` | Unik di dalam kelas itu, huruf kecil, tanpa spasi. Nilai ini menjadi URL dan tidak bisa diubah setelah materi dibuat. |
| Urutan | Ditentukan otomatis dari jumlah baris kelas itu saat materi baru dibuat (`urutan` terakhir + 1). |
| `konten` | Guru menyusun soal di `/guru/kuis` **hanya** dari blok ini. Materi tanpa konten tidak bisa membuat soal. |
| Video | ID 11 karakter dari `watch?v=` pada URL YouTube, boleh juga URL lengkap. Kosongkan bila belum ada. |
| `kuis_jumlah` | 0–20. Mengubahnya tidak menghapus bank soal yang sudah ada; bank soal mengikuti saat guru menekan Buat ulang. |
| Blok tak dikenal | Dilewati otomatis, tidak membuat halaman error. |

### Tipe blok konten yang didukung

| Tipe | Bentuk | Tampilan |
|---|---|---|
| `tujuan` | `{ tipe: "tujuan", items: ["..."] }` | Kotak biru berisi tujuan bernomor |
| `teks` | `{ tipe: "teks", judul, isi }` | Subjudul + paragraf |
| `daftar` | `{ tipe: "daftar", judul, terurut, items }` | Daftar berbutir atau bernomor |
| `kode` | `{ tipe: "kode", judul, bahasa, isi }` | Blok kode gelap, bisa di-scroll |
| `catatan` | `{ tipe: "catatan", isi }` | Kotak catatan bergaris aksen |

Halaman `/smk/<kelas>/<slug>` dibuat otomatis dari isi tabel. Menambah **kelas
baru** masih lewat `config/education.js` (array `kelas`), karena kelas
di-hardcode di beberapa halaman; tambah kelas baru perlu persetujuan pemilik
proyek karena menyentuh struktur.

---

## 2. Kondisi Halaman Guru Saat Ini

Halaman guru terdiri dari satu panel dan lima menu:

| URL | Isi | Akses |
|---|---|---|
| `/guru/login` | Login guru (email + password Supabase Auth) | Publik |
| `/guru` | Panel guru: menu Materi, Soal kuis, Absensi, Rekap nilai, Token kelas, dan Keamanan | Login guru |
| `/guru/materi` | Daftar, tambah, ubah, hapus materi dan impor dari config | Login guru |
| `/guru/kuis` | Susun soal AI sekali per materi dan simpan ke `kuis_bank` | Login guru |
| `/guru/absen` | Tambah siswa, filter kelas/tanggal, tabel kehadiran | Login guru |
| `/guru/nilai` | Rekap agregat hasil kuis per materi | Login guru |
| `/guru/token` | Buat, ganti, dan cabut token masuk kelas | Login guru |
| `/guru/keamanan` | Kirim email ganti password lewat Supabase Auth | Login guru |

Yang sudah tidak ada:

- `/dashboard` (dashboard siswa) — sekarang membalas **404**.
- Riwayat nilai per siswa, riwayat kehadiran per siswa, profil akun.

Tautan ke panel ada di footer, kolom "Jelajahi" → **Dashboard Guru** (`/guru`).
Panel meminta login terlebih dahulu bila cookie belum ada.

---

## 3. Panel Guru, Rekap Nilai, dan Papan Skor (sudah dikerjakan)

Keputusan yang diambil pada 28 Oktober 2026:

| Hal | Keputusan |
|---|---|
| Panel guru | Dibuat: `/guru` sebagai halaman induk berisi menu Absensi, Rekap nilai, dan Token kelas. |
| Rekap nilai | **Agregat saja** per kelas + materi: jumlah pengerjaan, rata-rata persentase, nilai terendah/tertinggi. Tidak menampilkan nama di rekap guru. |
| Kelola siswa | **Tidak dibuat.** Siswa baru tetap ditambah dari `/guru/absen`; ubah/hapus nama masih lewat SQL Editor bila benar-benar perlu. |
| Nama siswa | **Diketik bebas** sebelum kuis (1–60 karakter). Divalidasi ulang di server dan disimpan di kolom `nama` pada `kuis_hasil`. |
| Papan skor | Muncul **setelah kuis dinilai**: 10 skor teratas materi itu, **satu baris per nama berisi skor terbaik**, plus peringkat siswa sendiri. |

### Dampak struktur yang sudah diterapkan

- Halaman baru: `app/guru/page.jsx`, `app/guru/nilai/page.jsx`.
- Helper bersama: `lib/guru/akses.js` (akun guru, cookie, aksi masuk/keluar).
- Kolom baru `nama` di `kuis_hasil` dan indeks `kuis_hasil_papan_skor_idx`
  pada `supabase/schema.sql`.
- `/api/kuis/nilai` menerima `nama` dan mengembalikan `papanSkor`.
- Komponen `Kuis` mendapat langkah nama dan tabel papan skor.
- Tidak ada dependensi baru.

### Batasan yang perlu diketahui

- Nama tidak diverifikasi sebagai identitas resmi. Dua siswa bisa memakai nama
  yang sama, dan ejaan berbeda menghasilkan baris berbeda.
- Rekap guru tetap tidak bisa menampilkan nilai per siswa.
- Papan skor membaca maksimal 500 baris terbaru per materi.
- Belum ada pembatas permintaan khusus di `/api/kuis/nilai`; token soal tetap
  wajib dan berlaku 2 jam.

---

## 4. Akses Kelas dengan Token (diperbarui 1 November 2026)

Daftar card kelas di beranda dan `/smk` dihapus. Sebagai gantinya, siswa harus
memasukkan token kelas seperti token ujian sebelum materi bisa dibuka. Token
dibuat dan dikelola guru dari panel guru, bukan dari `.env.local`.

| Hal | Keputusan |
|---|---|
| Halaman `/smk` | Hanya formulir token; tidak ada daftar kelas publik. |
| Pembuat token | Guru, lewat `/guru/token` (butuh login guru). |
| Penyimpanan | Tabel `token_kelas` di Supabase: satu baris per kelas. |
| Bentuk token | 8 karakter tanpa huruf I/O dan angka 0/1, tidak membedakan huruf besar/kecil. |
| Ganti / cabut | Tombol Ganti dan Cabut di `/guru/token`; cookie siswa lama otomatis tidak sah. |
| Setelah token benar | Siswa langsung dibawa ke `/smk/<kelas>` sesuai tokennya. |
| Masa berlaku | Cookie `akses_kelas` berlaku 8 jam (satu hari sekolah); token sendiri berlaku sampai diganti guru. |
| Halaman yang dijaga | `/smk/[kelas]`, `/smk/[kelas]/[materi]`, `/smk/[kelas]/[materi]/kuis`, dan `POST /api/kuis`. |
| Keluar | Tombol `Keluar kelas` di halaman kelas dan `Keluar dari semua kelas` di `/smk`. |
| Batas percobaan | 10 percobaan gagal per IP per 10 menit. |
| Halaman kuis | Kuis dipisah dari materi: `/smk/[kelas]/[materi]/kuis`. |

Catatan: token ini gate tampilan, bukan kerahasiaan data. Isi materi tetap
tersimpan di database. Token tidak sama dengan akun guru karena akun guru juga
membuka panel absensi, rekap nilai, dan pengelolaan token.

---

## 4a. Bank Soal Kuis (ditambahkan 1 November 2026)

Sebelumnya soal dibuat AI saat siswa mulai mengerjakan, dengan cache 1 jam.
Akibatnya siswa yang datang di luar jendela cache bisa mendapat soal berbeda.
Sekarang soal disusun **sekali oleh guru**, sehingga semua siswa mengerjakan
isi soal yang sama.

| Hal | Keputusan |
|---|---|
| Pembuat soal | Guru, lewat `/guru/kuis` (butuh login guru dan environment AI). |
| Penyimpanan | Tabel `kuis_bank`: satu baris per kelas + materi, kolom `soal` berupa JSONB berisi soal lengkap dengan kunci dan pembahasan. |
| Jumlah soal | Diambil dari kolom `materi.kuis_jumlah` saat guru menekan Buat soal (dulu dari `config/education.js`). Hanya materi dengan jumlah soal 1–20 yang bisa disusun soalnya. |
| Urutan per siswa | `/api/kuis` mengacak urutan soal **dan** pilihan jawaban dengan Fisher-Yates, lalu menggeser indeks kunci. Nomor soal dan huruf jawaban bisa berbeda tiap siswa. |
| Kunci jawaban | Tetap tidak dikirim ke browser; urutan acak dienkripsi ke token AES-256-GCM (2 jam). |
| Tanpa bank | Halaman kuis menampilkan "Soal belum disiapkan"; `POST /api/kuis` membalas 409. |
| Buat ulang / hapus | Tombol di `/guru/kuis`. Soal lama diganti seluruhnya atau dihapus. |
| Environment AI | Hanya dipakai server saat guru menyusun soal; siswa tidak memicu AI. |
| Cache & batas per IP | Dihapus dari `/api/kuis` karena tidak lagi memanggil AI. |

Dampak struktur: halaman `app/guru/kuis/page.jsx`, tabel `kuis_bank` di
`supabase/schema.sql`, modul `lib/kuis/ai.js`, `lib/kuis/bank.js`,
`lib/kuis/soal.js`, dan komponen `components/Guru/TombolProses.jsx`.
`app/api/kuis/route.js` sekarang hanya membaca bank dan mengacak urutan.

Soal juga bisa ditulis guru secara manual tanpa AI di
`/guru/kuis/[kelas]/[materi]` (`components/Guru/EditorSoal.jsx`), dengan bentuk
data yang sama seperti hasil AI. Menyimpan dari editor manual menimpa seluruh
bank lama, bukan menambah.

### Keputusan terkait materi pindah ke database (2 November 2026)

| Hal | Keputusan |
|---|---|
| Sumber materi | Tabel `materi`, dikelola guru dari `/guru/materi`. `config/education.js` hanya bahan impor. |
| Kunci materi | `kelas` + `slug` (dulu `slug` saja di dalam array kelas). |
| URL | `/smk/<kelas>/<slug>` — segmen jenjang dihapus. |
| Berkas | Metadata di kolom `materi.berkas`, file di bucket Storage `materi`. |
| Impor | Tombol sekali tekan di `/guru/materi`, `ignoreDuplicates` agar tidak menimpa. |
| Hapus | Menghapus materi juga menghapus bank soal dan seluruh berkasnya di Storage. |

---

## 4b. Arah Desain Editorial (diputuskan 1 November 2026)

Seluruh tampilan dirombak dari kartu mengambang menjadi tata letak editorial
seperti majalah: konten disusun sebagai baris, daftar bernomor, dan tabel
dengan garis pemisah. Keputusan ini menggantikan tampilan sebelumnya yang
banyak memakai card, gradien, dan sudut membulat.

| Hal | Keputusan |
|---|---|
| Gaya | Editorial grid / magazine, bukan claymorphism atau glassmorphism. |
| Warna | Latar kertas hangat `#f4f0e6`, permukaan `#fbf8f1`, tinta `#171512`, aksen rust `#a8431f`, hijau tua `#2f5a45` untuk status berhasil. |
| Tipografi | Judul **Libre Bodoni**, teks **Public Sans**, label/angka **IBM Plex Mono**. |
| Gradien | Dihapus dari seluruh CSS. |
| Bayangan | Dihapus; kedalaman dibangun dari garis, ruang, dan ukuran huruf. |
| Sudut | Tajam 0 px pada tombol dan input; radius token maksimal 6 px. |
| Card | Dikurangi drastis. Beranda memakai indeks kelas, langkah bernomor, dan daftar fitur. Panel guru memakai baris menu. Materi, kuis, tanya AI, dan formulir memakai garis pemisah, bukan kotak. |
| Target sentuh | Minimal 44×44 px untuk tombol, input, tautan navigasi, kontrol galeri, dan pilihan status absensi. |
| Gerak | Transisi 160 ms; hormati `prefers-reduced-motion`. |
| Cakupan | Seluruh halaman publik, panel guru, halaman siswa, kuis, absensi, token, dan 404. |
| Verifikasi | Audit otomatis lewat Edge headless pada 360/414/768/1024/1440 px: tanpa scroll horizontal, tanpa gradien, kontras teks lolos, font benar, target ≥44 px, menu mobile dan galeri bekerja. |

Dampak struktur: `app/globals.css` ditulis ulang (token + seluruh kelas), font
dimuat di `app/layout.jsx`, dan CSS module `Navbar`, `Footer`, `Galeri`,
`SchoolLogo`, `Kuis`, `Tanya`, `Guru/FormMateri`, serta `Guru/EditorSoal`
diselaraskan. Tidak ada dependensi baru.

Batasan: audit otomatis tidak bisa menilai estetika. Logo dan foto galeri
masih placeholder, sehingga rasa akhir halaman baru terasa setelah aset asli
dipasang dan diperiksa langsung di browser.

---

## 4c. Berkas Materi (diputuskan 2 November 2026)

Guru dapat melampirkan berkas pada materi. Berkas disimpan di Supabase
Storage, sedangkan metadatanya disimpan di kolom `materi.berkas`.

| Hal | Keputusan |
|---|---|
| Format | **PDF, DOCX, PPTX.** `.doc`/`.ppt` lama ditolak karena sulit divalidasi. |
| Batas ukuran | **4 MB per berkas**, di bawah batas body Vercel (±4,5 MB). |
| Jumlah | Maksimal **5 berkas** per materi. |
| Penyimpanan | Bucket privat `materi` di Supabase Storage; file memakai nama UUID. |
| Metadata | Kolom `berkas jsonb` di tabel `materi` (array `{id, nama, path, tipe, mime, ukuran}`). |
| Unggah | Route handler `POST /guru/materi/berkas`, bukan server action, agar tidak terkena batas body server action. |
| Akses siswa | Signed URL buatan server, berlaku **2 jam**; bucket tidak pernah dibuka publik. |
| Tampilan | PDF dapat dipratinjau di iframe dan diunduh. Word/PowerPoint hanya diunduh karena browser tidak merendernya. |
| Hapus | Berkas yang dilepas dari form dihapus setelah materi tersimpan; menghapus materi ikut menghapus semua berkasnya. |
| AI | Isi berkas **tidak** dikirim ke AI kuis maupun Tanya AI (butuh library ekstraksi PDF, ditunda). |
| Konversi | **Tidak ada konversi otomatis.** Word/PPT tetap diunduh; hanya PDF yang dipratinjau. Keputusan 2 November 2026: konversi butuh layanan/API berbayar atau LibreOffice di server sendiri, dan hasil PPT sering berubah tata letaknya. |
| Validasi | Ekstensi + beberapa byte pertama (magic bytes): `%PDF` untuk PDF, `PK` untuk DOCX/PPTX. Nama tampilan dibersihkan; path tidak dapat diisi dari browser. |

### Dampak struktur

- `lib/materi/berkas.js` — fungsi murni (format, batas, validasi metadata).
- `lib/materi/storage.js` — unggah/hapus/signed URL ke Supabase Storage.
- `app/guru/materi/berkas/route.js` — `POST` dan `DELETE` berkas.
- `components/Guru/UnggahBerkas.jsx` + CSS — input berkas di form materi.
- `app/smk/[kelas]/[materi]/page.jsx` — section "Berkas materi".
- `supabase/schema.sql` — kolom `berkas`, constraint, dan bucket `materi`.
- Tidak ada dependensi npm baru.

### Batasan

- Word/PPT tidak dapat dipratinjau; guru perlu mengonversi ke PDF bila ingin
  tampil di halaman.
- Berkas yang diunggah lalu form ditinggalkan tanpa disimpan dapat menjadi
  berkas yatim di Storage (tidak dirujuk materi). Pembersihan otomatis belum
  dibuat.
- Signed URL kedaluwarsa setelah 2 jam; siswa perlu memuat ulang halaman.
- Tautan berkas hanya dibatasi token kelas, sama seperti isi materi lainnya.

---

## 4d. Login Guru (diputuskan 2 November 2026, direvisi jadi Supabase Auth)

Kode guru tunggal diganti dengan login berpassword. Alasannya: satu nilai
rahasia yang dibagikan mudah bocor, tidak bisa dibedakan per pengguna, dan
tidak nyaman diganti. Login juga memberi tempat yang jelas untuk mengubah
kredensial.

Versi pertama memakai satu akun username + password dengan hash scrypt di tabel
`pengaturan_guru`. Keputusan itu **dibatalkan**: tabel tersebut sudah dihapus
dari `supabase/schema.sql`, dan login sekarang memakai **Supabase Auth**. Yang
dipertahankan hanya bentuk luarnya (satu akun, satu halaman login, guard
`/guru/*`, `noindex`, pembatas percobaan).

| Hal | Keputusan |
|---|---|
| Akun | **Satu akun** guru Informatika, dibuat di Supabase Dashboard → Authentication → Users. |
| Peran | `app_metadata.role = "guru"`. Field ini hanya bisa diubah lewat Dashboard/Admin API, jadi pemilik akun tidak bisa menaikkan perannya sendiri. |
| Halaman | `/guru/login` terpisah, layar penuh tanpa navbar/footer; semua `/guru/*` mengalihkan ke sana bila sesi tidak sah. |
| Penyimpanan | Tidak ada tabel akun. Password ditangani Supabase; aplikasi tidak pernah menyimpannya. |
| Bootstrap | Tidak ada bootstrap lewat environment. Akun dibuat sekali secara manual di Dashboard. |
| Ganti password | `/guru/keamanan` meminta Supabase mengirim email tautan ganti password. Reset sebelum masuk dilakukan dari Dashboard. |
| Sesi | Cookie bawaan Supabase (`sb-*-auth-token`, HttpOnly, SameSite=Lax) yang disegarkan `middleware.js`, plus cookie penanda `sesi_guru_mulai`. |
| Masa sesi | **2 jam sejak login**, bukan sejak aktivitas terakhir. Middleware membuang cookie sesi Supabase setelah lewat; cookie yang disegarkan dipotong `maxAge`-nya ke sisa sesi. |
| Pembatas | Maksimal 5 percobaan gagal per IP per 10 menit (memori proses). |
| Anti-enumerasi | Email salah dan password salah memberi pesan yang sama. |
| Footer | Item "Absensi Guru" diganti **Dashboard Guru** ke `/guru`. |
| Indeks mesin pencari | Halaman login memakai `noindex, nofollow`. |

### Dampak struktur

- `lib/guru/akses.js` — `masukGuru`, `punyaAkses`, `emailGuru`, `sidikGuru`, `mintaGantiSandi`.
- `lib/guru/sesi.js` — penanda `sesi_guru_mulai` dan hitung sisa sesi.
- `lib/supabase/klien.js` — klien Supabase Auth (anon key) untuk server dan browser.
- `middleware.js` — segarkan cookie sesi + tegakkan batas 2 jam.
- `app/guru/login/page.jsx` + `components/Guru/FormLoginGuru.jsx` — halaman dan form login.
- `app/guru/keamanan/page.jsx` — kirim email ganti password.
- `supabase/schema.sql` — **tidak lagi** memuat `pengaturan_guru`.
- `.env.example` — `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Batasan

- Belum ada pemulihan password mandiri dari halaman login. Bila password lupa,
  atur ulang dari Supabase Dashboard (Users → pilih user → Reset password).
- Kirim email ganti password bergantung pada SMTP Supabase; bila belum
  dikonfigurasi, email tidak sampai.
- Masa sesi 2 jam belum diuji di browser. Cara mengujinya: turunkan sementara
  `MASA_SESI_GURU_DETIK` di `lib/supabase/klien.js` ke 20, login, tunggu,
  lalu pastikan dialihkan ke `/guru/login?galat=sesi`.
- Pembatas percobaan disimpan di memori proses, jadi tidak berlaku lintas
  instance serverless.
- Tidak ada log audit login.

---

## 4e. Video Sosialisasi Beranda (diputuskan 2 November 2026)

| Hal | Keputusan |
|---|---|
| Lokasi | Beranda, tepat setelah hero dan sebelum galeri. |
| Sumber | `school.videoSosialisasi` di `config/education.js` (`judul`, `deskripsi`, `youtubeId`). |
| Bentuk | **Embed saja**, tanpa tautan keluar, memakai `youtube-nocookie.com`. |
| ID | Menerima ID 11 karakter atau URL YouTube lengkap (diurai dengan `uraiYoutubeId`). |
| Kosong | Bila ID kosong/tidak valid, bagian video tidak dirender. |
| Ukuran | Lebar maksimal 820 px, rasio 16:9, mengikuti gaya editorial. |

### Dampak struktur

- `config/education.js` — blok `school.videoSosialisasi`.
- `app/page.jsx` — section "Video sosialisasi" + iframe lazy.
- `app/globals.css` — `.videoSosialisasi`.

### Batasan

- Video pihak ketiga bergantung pada ketersediaan YouTube dan kebijakan
  penyemat; tidak ada fallback tautan.
- ID harus diisi manual; tidak ada unggah video ke Storage.

---

## 4f. Riwayat Nilai Siswa (diputuskan 6 November 2026)

Siswa tidak punya akun, jadi nilai kuis sebelumnya hanya terlihat sekali di
akhir pengerjaan. Riwayat nilai kini dapat dibuka sendiri oleh siswa, dilindungi
kode akses supaya tidak menjadi daftar nilai publik.

| Hal | Keputusan |
|---|---|
| Halaman siswa | `/smk/[kelas]/riwayat`, di dalam kelas sehingga tetap dijaga token kelas yang sudah ada. |
| Halaman guru | `/guru/riwayat`, **terpisah** dari `/guru/nilai` agar rekap nilai tetap agregat tanpa nama (menjaga keputusan 28 Oktober 2026). |
| Identitas | **Kode acak 6 karakter** per siswa, bukan tanggal lahir. Alasan: tanggal lahir tidak pernah disimpan di tabel `siswa`, dan meminta guru mengisi data itu untuk semua siswa terlalu berat. Kode tidak memakai data pribadi. |
| Penyimpanan | Tabel `kode_riwayat`: satu baris per siswa (`unique`), kode unik, kelas ikut dicatat. |
| Sesi | Cookie `riwayat_kelas` berisi sidik HMAC (bukan kode asli), 30 hari, `Path=/`. Mengganti/mencabut kode membatalkan cookie lama. |
| Pembatas | 10 percobaan gagal per IP per 10 menit (memori proses), sama seperti token kelas. |
| Cakupan | Hanya riwayat kelas itu (sesuai keputusan pemilik proyek), bukan lintas kelas. |
| Isi | Materi, skor, persentase, waktu, plus ringkasan rata-rata dan tertinggi. Bukan jawaban per soal. |
| Pencocokan | Lewat `nama` di `kuis_hasil`, karena tabel itu tidak menyimpan `siswa_id`. |
| Nama saat kuis | **Dipilih dari daftar kelas**, bukan diketik bebas, agar ejaannya sama dengan absensi dan riwayat selalu cocok. Siswa yang belum terdaftar boleh mengetik (tidak otomatis masuk tabel `siswa`). |

### Dampak struktur

- `lib/kelas/riwayat.js` — kode acak, cookie sidik, verifikasi, pembatas.
- `app/guru/riwayat/page.jsx` — buat/ganti/cabut kode per siswa.
- `app/smk/[kelas]/riwayat/page.jsx` — formulir kode + tabel riwayat.
- `app/smk/[kelas]/[materi]/kuis/page.jsx` — membaca daftar `siswa` dan mengirimkannya ke komponen `Kuis`.
- `components/Kuis/Kuis.jsx` — prop `daftarSiswa`, pemilihan nama, tombol nama baru.
- `supabase/schema.sql` — tabel `kode_riwayat` + tiga indeks.
- `app/guru/page.jsx` — menu "Kode riwayat".
- Tidak ada dependensi npm baru.

### Batasan

- Siapa pun yang tahu kodenya dapat membuka riwayat itu; kode harus dibagikan
  hanya kepada siswa bersangkutan.
- Mengubah nama siswa di absensi setelah kuis dikerjakan memutus pencocokan
  riwayat baris lama.
- Belum ada halaman untuk menambah siswa baru dari sisi kuis; guru menambahnya
  lewat `/guru/absen`.

---

## 5. Keputusan yang Masih Terbuka

1. Perlu ubah/hapus siswa di UI absensi suatu saat? Bila ya, perlu konfirmasi
   karena menghapus siswa ikut menghapus riwayat absensinya (`on delete cascade`).
2. Papan skor cukup per materi, atau perlu papan skor lintas materi per kelas?
3. ~~Apakah nama siswa perlu dicocokkan dengan daftar `siswa` supaya ejaannya
   konsisten?~~ **Selesai 6 November 2026:** nama di halaman kuis kini dipilih
   dari daftar kelas. Sisanya masih terbuka: siswa yang belum terdaftar boleh
   mengetik nama, dan nama itu belum otomatis masuk tabel `siswa`.
4. Apakah token perlu kedaluwarsa otomatis (mis. 24 jam) atau cukup diganti
   guru? Saat ini token berlaku sampai guru menekan Ganti atau Cabut.
5. Apakah guru perlu melihat token yang sudah dipakai (riwayat), atau cukup
   token aktif saja seperti sekarang?
6. Apakah berkas yatim (diunggah tetapi form tidak disimpan) perlu dibersihkan
   otomatis, mis. setelah 24 jam?
7. Apakah akun guru perlu pemulihan password mandiri dari halaman login
   (mis. formulir "lupa password" yang mengirim email Supabase), atau cukup
   reset lewat Dashboard seperti sekarang? Supabase Auth sudah menyediakan
   `resetPasswordForEmail`, jadi tinggal ditambahkan bila perlu.
8. Apakah video sosialisasi perlu diubah dari config ke panel guru agar dapat
   diganti tanpa deploy ulang?
9. Apakah urutan materi (`materi.urutan`) perlu bisa diatur manual (naik/turun
   atau seret), atau cukup mengikuti urutan penambahan seperti sekarang?
10. Apakah materi yang dihapus perlu diarsipkan alih-alih dihapus permanen,
    mengingat penghapusan saat ini juga membuang bank soal dan berkasnya?
11. Perlukah menambah kelas baru dari panel guru, atau cukup lewat
    `config/education.js` + perubahan struktur seperti sekarang?
