# CodeSpring — Project Structure & Component Standards

## 1. Project Overview

CodeSpring adalah platform pembelajaran berbasis website yang berfokus secara eksklusif pada mata pelajaran Informatika untuk siswa SMP dan SMK.

Platform dirancang untuk menyediakan:
- Materi Informatika berdasarkan jenjang dan kelas.
- Pembelajaran interaktif.
- Latihan soal dan kuis.
- Latihan algoritma dan pemrograman.
- Dashboard siswa.
- Pelacakan progres belajar.
- Autentikasi akun untuk penyimpanan progres.

### Technology Stack

- Framework: Next.js.
- Language: JavaScript sebagai pilihan awal.
- Styling: mengikuti teknologi dan pendekatan styling yang ditentukan pemilik proyek.
- UI: komponen modular dan reusable.
- Backend dan database: ditentukan secara terpisah sebelum implementasi.
- Deployment: ditentukan kemudian.

Jangan menginstal atau mengganti teknologi, dependensi, maupun library tanpa memeriksa kebutuhan dan memperoleh persetujuan pemilik proyek apabila perubahan tersebut memengaruhi konfigurasi atau arsitektur.

## 2. Ownership and Decision Authority

Pemilik proyek memiliki kendali penuh terhadap struktur dan arsitektur CodeSpring.

Pemilik proyek menentukan:
- Struktur folder.
- Nama dan lokasi file.
- Nama komponen.
- Tanggung jawab setiap komponen.
- Pembagian konfigurasi.
- Teknologi dan dependensi.
- Alur navigasi.
- Desain UI/UX.
- Aturan penamaan.
- Batas tanggung jawab setiap modul.

AI coding assistant bertindak sebagai implementer, bukan sebagai pengambil keputusan arsitektur secara sepihak.

AI boleh mengusulkan perbaikan, tetapi usulan tidak otomatis menjadi izin untuk menerapkannya.

## 3. Project Structure Rules

### 3.1 Manual Structure Ownership

Struktur proyek ditentukan secara manual oleh pemilik proyek.

AI tidak boleh secara sepihak:
- Membuat direktori baru.
- Membuat file baru.
- Menghapus file atau direktori.
- Memindahkan file.
- Mengganti nama file atau direktori.
- Menggabungkan beberapa file.
- Memecah satu file menjadi beberapa file.
- Mengubah pola arsitektur.
- Memindahkan tanggung jawab suatu komponen ke file lain.

Pengecualian hanya berlaku apabila pemilik proyek secara eksplisit memberikan izin untuk perubahan tertentu.

### 3.2 Working With Existing Files

Sebelum mengerjakan tugas:

1. Periksa struktur proyek yang sudah tersedia.
2. Baca file yang relevan, termasuk konfigurasi dan dokumentasi.
3. Identifikasi file yang secara eksplisit ditugaskan.
4. Pastikan perubahan dapat dilakukan tanpa memodifikasi struktur.
5. Jika file yang diperlukan belum tersedia, jelaskan kebutuhan tersebut dan minta persetujuan untuk membuatnya.

Jangan menganggap struktur contoh dalam dokumentasi sebagai struktur aktual proyek sebelum memeriksa isi direktori.

### 3.3 Structure Change Approval

Setiap perubahan struktur harus mendapat persetujuan pemilik proyek terlebih dahulu.

Persetujuan harus mencakup perubahan yang akan dilakukan, bukan hanya persetujuan umum untuk mengembangkan aplikasi.

Contoh perubahan yang membutuhkan persetujuan:
- Menambahkan `components/Navigation/`.
- Membuat file `theme.js`.
- Memindahkan `Navbar.jsx`.
- Menghapus komponen yang dianggap tidak terpakai.
- Mengubah App Router Next.js menjadi pola routing lain.
- Menambahkan library yang membutuhkan konfigurasi atau file tambahan.

Jika perubahan struktur diperlukan, AI harus:
1. Menjelaskan masalah yang ditemukan.
2. Menyebutkan file atau direktori yang ingin ditambahkan, diubah, dipindahkan, atau dihapus.
3. Menjelaskan alasan dan dampaknya.
4. Menunggu persetujuan.
5. Baru menerapkan perubahan setelah persetujuan diberikan.

## 4. File Responsibility Standards

Setiap file harus mempunyai tanggung jawab yang jelas dan terbatas.

Sebelum mengedit suatu file, AI harus memahami definisi tanggung jawab file tersebut dari README, dokumentasi proyek, komentar yang relevan, atau instruksi pemilik proyek.

Aturan:
- Jangan menambahkan fungsi yang tidak sesuai dengan tanggung jawab file.
- Jangan memindahkan fungsi ke file lain tanpa izin.
- Jangan menduplikasi konfigurasi yang sudah tersedia.
- Jangan menambahkan dependensi baru hanya untuk mempermudah tugas kecil tanpa evaluasi.
- Gunakan komponen yang sudah ada apabila sesuai.
- Pertahankan API, props, dan kontrak komponen yang sudah ditentukan kecuali perubahan diminta atau disetujui.
- Jika tanggung jawab suatu file belum jelas, tanyakan terlebih dahulu.

## 5. Component Standards

### 5.1 Component Definition

Komponen adalah bagian antarmuka atau fungsi UI yang memiliki tanggung jawab spesifik.

Setiap komponen harus memiliki:
- Nama yang konsisten.
- Tujuan yang jelas.
- Batas tanggung jawab.
- Props yang terdokumentasi apabila diperlukan.
- Perilaku dan state yang dapat dipahami.
- Penanganan kondisi normal dan kondisi khusus yang relevan.

### 5.2 Reusable Components

Komponen reusable hanya dibuat sesuai struktur dan keputusan pemilik proyek.

Komponen dapat digunakan kembali apabila:
- Memiliki pola tampilan atau perilaku yang berulang.
- Digunakan di beberapa halaman.
- Memiliki tanggung jawab yang cukup jelas.
- Penggunaannya tidak membuat abstraksi berlebihan.

AI tidak boleh membuat komponen reusable baru atau memindahkan komponen yang sudah ada ke lokasi lain tanpa persetujuan apabila tindakan tersebut mengubah struktur proyek.

### 5.3 Component Boundaries

Pisahkan tanggung jawab sesuai definisi proyek:
- Presentational UI: menampilkan antarmuka.
- Interaction logic: menangani interaksi pengguna.
- Data access: mengambil atau menyimpan data.
- Configuration: menyediakan nilai konfigurasi.
- Page composition: menyusun komponen untuk sebuah halaman.

Pembagian tersebut adalah prinsip tanggung jawab, bukan izin untuk membuat file atau direktori baru. Implementasinya harus mengikuti struktur yang sudah ditentukan pemilik proyek.

### 5.4 Component Change Rules

AI boleh memperbaiki isi komponen yang ditugaskan selama:
- Tujuan komponen tetap sesuai.
- Perubahan tidak merusak kontrak komponen lain.
- Struktur file tidak diubah.
- Tidak ada dependensi atau konfigurasi baru yang diterapkan tanpa persetujuan apabila memengaruhi arsitektur.
- Tidak ada fitur yang dihapus atau diubah perilakunya di luar cakupan tugas.

## 6. Configuration File Standards

CodeSpring menggunakan file konfigurasi terpisah berdasarkan kategori dan tanggung jawab.

Nama file dan lokasi setiap konfigurasi ditentukan oleh pemilik proyek. Daftar di bawah merupakan kategori yang dapat digunakan, bukan perintah untuk langsung membuat semua file.

| Kategori | Tanggung jawab |
|---|---|
| Site configuration | Nama website, deskripsi, informasi dasar, dan metadata umum. |
| Theme configuration | Warna, tipografi, token desain, dan nilai visual yang terpusat. |
| Navigation configuration | Struktur menu dan tautan navigasi apabila memang dikelola melalui konfigurasi. |
| Education configuration | Jenjang pendidikan, kelas, dan metadata kurikulum yang diperlukan. |
| Application configuration | Pengaturan aplikasi yang tidak termasuk kategori lainnya. |

### Configuration Rules

- Satu file konfigurasi hanya mengelola kategori yang telah ditetapkan.
- Jangan mencampurkan konfigurasi yang tidak berkaitan.
- Jangan menduplikasi nilai konfigurasi di banyak file tanpa alasan.
- Jangan menaruh komponen UI, halaman, atau logika bisnis di dalam file konfigurasi.
- Jangan menaruh password, API key privat, token rahasia, atau kredensial di file frontend.
- Bedakan konfigurasi publik dengan variabel lingkungan yang bersifat rahasia.
- Jangan mengganti nama, memindahkan, menggabungkan, atau memecah file konfigurasi tanpa persetujuan.
- Jika suatu nilai sudah tersedia dalam konfigurasi, gunakan sumber tersebut daripada membuat nilai kedua yang berpotensi berbeda.
- Validasi konfigurasi sesuai kebutuhan dan teknologi yang digunakan.

### Environment Variables

Variabel lingkungan digunakan untuk konfigurasi yang memang harus disediakan melalui environment, termasuk kredensial server.

Aturan:
- Rahasia hanya boleh digunakan pada konteks server yang sesuai.
- Jangan mengekspos rahasia melalui variabel yang ditujukan untuk browser.
- Jangan menuliskan nilai rahasia langsung ke source code.
- File contoh environment hanya boleh memuat nama variabel dan placeholder, bukan kredensial asli.
- Penambahan variabel atau perubahan mekanisme konfigurasi harus dijelaskan dan disetujui apabila memengaruhi struktur atau arsitektur.

## 7. Next.js Standards

CodeSpring menggunakan Next.js.

Sebelum mengembangkan halaman atau navigasi, AI harus memeriksa versi Next.js dan router yang benar-benar digunakan oleh proyek.

### Routing

- Ikuti sistem routing yang sudah dipakai proyek.
- Jangan beralih antara App Router dan Pages Router tanpa persetujuan.
- Jangan memindahkan halaman ke direktori routing lain tanpa persetujuan.
- Ikuti konvensi nama file yang sesuai dengan router yang digunakan.
- Pastikan navigasi tidak mengarah ke halaman yang tidak tersedia.

### Server and Client Components

Jika proyek menggunakan App Router:
- Gunakan Server Components secara default apabila sesuai.
- Gunakan Client Components hanya ketika membutuhkan interaktivitas browser atau state client.
- Hindari menandai seluruh halaman sebagai Client Component tanpa alasan.
- Jangan mengekspos kredensial server ke komponen client.
- Tempatkan akses data dan rahasia pada konteks server yang tepat.

Jika proyek menggunakan Pages Router, ikuti mekanisme yang sesuai dengan router tersebut.

### Dependencies

- Periksa dependensi yang sudah terpasang sebelum menambahkan paket baru.
- Gunakan library yang tersedia apabila sesuai.
- Jelaskan kebutuhan, manfaat, dan dampak dependensi baru.
- Minta persetujuan sebelum menambahkan atau mengganti dependensi.
- Jangan mengganti package manager tanpa izin.

## 8. Code Modification Policy

AI diberi izin untuk mengubah isi file yang secara eksplisit ditugaskan oleh pemilik proyek.

Izin tersebut tidak berarti AI boleh mengubah semua file yang dianggap berkaitan.

### Allowed

- Memperbaiki implementasi di dalam file yang ditugaskan.
- Memperbaiki bug pada lingkup tugas.
- Menyesuaikan styling pada komponen yang ditugaskan.
- Memperbaiki validasi dan penanganan kesalahan dalam lingkup tugas.
- Mengoptimalkan implementasi tanpa mengubah struktur atau kontrak yang telah ditetapkan.
- Menambahkan pengujian pada file yang sudah ditentukan untuk pengujian tersebut.

### Requires Approval

- Membuat file baru.
- Menghapus file.
- Memindahkan atau mengganti nama file.
- Mengubah struktur direktori.
- Mengubah kontrak antarkomponen yang memengaruhi bagian lain.
- Menambahkan dependensi.
- Mengubah framework, router, atau arsitektur.
- Mengubah sistem autentikasi, database, atau mekanisme keamanan.
- Mengubah desain di luar ruang lingkup tugas.

### Out-of-Scope Changes

Jangan melakukan refactoring besar hanya karena menemukan pola yang dianggap kurang ideal.

Jika menemukan masalah di luar tugas:
1. Catat masalah tersebut.
2. Jelaskan risiko atau dampaknya.
3. Selesaikan tugas utama tanpa memperluas lingkup perubahan apabila aman.
4. Minta persetujuan untuk perbaikan tambahan.

## 9. UI/UX Consistency

Seluruh halaman CodeSpring harus mengikuti spesifikasi UI/UX yang telah disetujui.

Prinsip:
- Minimalis, terang, modern, dan futuristik.
- Konsisten pada warna, tipografi, jarak, dan komponen.
- Responsif pada desktop, tablet, dan mobile.
- Mudah dinavigasi oleh siswa SMP dan SMK.
- Memiliki kondisi loading, empty, error, dan success yang sesuai.
- Memiliki fokus keyboard dan label aksesibilitas yang jelas.

Fokus produk tetap pada mata pelajaran Informatika. Jangan menambahkan katalog mata pelajaran lain.

Jika desain yang diminta bertentangan dengan implementasi saat ini, jelaskan konflik tersebut sebelum membuat perubahan besar.

## 10. Security and Data Integrity

- Jangan mengekspos rahasia dalam source code yang dikirim ke browser.
- Jangan mempercayai validasi client sebagai satu-satunya pengamanan.
- Validasi input pada batas kepercayaan yang sesuai.
- Lindungi akses ke data berdasarkan identitas dan izin pengguna.
- Jangan menganggap menyembunyikan tombol sudah cukup untuk mengamankan fitur.
- Jangan membuat autentikasi atau penyimpanan progres palsu yang diklaim sebagai fitur produksi.
- Jangan menghapus atau menimpa data pengguna tanpa izin.
- Jangan mengubah kebijakan keamanan atau akses data tanpa menjelaskan dampaknya.

Detail backend, database, dan provider autentikasi akan ditentukan secara terpisah.

## 11. Required Workflow for AI Coding Assistant

Untuk setiap tugas, AI harus mengikuti urutan berikut:

### Step 1 — Inspect
Periksa file yang ditugaskan dan file terkait yang diperlukan untuk memahami implementasi.

### Step 2 — Confirm Scope
Identifikasi perubahan yang benar-benar diperlukan. Jangan memperluas tugas tanpa alasan.

### Step 3 — Check Boundaries
Pastikan perubahan tidak memerlukan pembuatan file, perubahan struktur, penambahan dependensi, atau perubahan kontrak yang belum disetujui.

### Step 4 — Request Approval if Needed
Jika ada perubahan yang membutuhkan persetujuan, jelaskan perubahan tersebut dan tunggu keputusan pemilik proyek.

### Step 5 — Implement
Ubah isi file yang ditugaskan sesuai spesifikasi.

### Step 6 — Verify
Jalankan pemeriksaan yang tersedia dan relevan, seperti linting, type checking apabila tersedia, pengujian, atau build.

Jangan mengklaim pemeriksaan berhasil apabila tidak dijalankan atau gagal.

### Step 7 — Report
Setelah selesai, laporkan:
- File yang diubah.
- Ringkasan perubahan.
- Alasan perubahan.
- Pemeriksaan yang dijalankan dan hasilnya.
- Batasan atau pekerjaan yang belum selesai.

## 12. Final Rule

README ini merupakan pedoman utama untuk struktur dan tanggung jawab file CodeSpring.

**Pemilik proyek menentukan struktur; AI mengimplementasikan isi file yang ditugaskan. Perubahan struktur harus memperoleh persetujuan eksplisit sebelum diterapkan.**

Jika instruksi tugas bertentangan dengan standar ini, hentikan bagian yang berkonflik dan mintalah klarifikasi. Jangan menebak keputusan arsitektur atas nama pemilik proyek.
