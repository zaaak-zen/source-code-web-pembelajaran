/**
 * Education configuration
 *
 * Semua data yang berkaitan dengan sekolah dan jenjang pendidikan.
 *
 * CARA EDIT:
 * - Cari penanda "EDIT:" di file ini lalu ganti nilai di sebelahnya.
 * - Semua teks di sini tampil langsung di halaman; tidak perlu menyentuh kode.
 *
 * STRUKTUR:
 * - school       : profil sekolah di landing page.
 * - galeri       : foto-foto sekolah untuk carousel di beranda.
 * - tahunBerdiri : tahun awal berdirinya sekolah.
 * - sejarah      : narasi sejarah sekolah.
 * - jenjang      : daftar jenjang, kelas, dan materi.
 */

const educationConfig = {
  /* ------------------------------------------------------------------
   * 1. PROFIL SEKOLAH (landing page)
   * ------------------------------------------------------------------ */
  school: {
    // EDIT: nama sekolah
    name: "SMK Negeri 1 Garut",
    // EDIT: logo sekolah. Simpan file logo di folder public/, lalu tulis
    // path-nya di sini. Ganti public/logo-sekolah.svg dengan logo resmi
    // sekolah (boleh .png/.jpg/.webp, sesuaikan path-nya).
    // Kosongkan ("") untuk memakai ikon bawaan sebagai pengganti.
    logo: "/logo-sekolah.svg",
    // EDIT: teks alternatif logo untuk pembaca layar
    logoAlt: "Logo SMK Negeri 1 Garut",
    // EDIT: deskripsi singkat sekolah (2-3 kalimat)
    description:
      "SMK Negeri 1 Garut adalah sekolah menengah kejuruan yang berkomitmen untuk menyediakan pendidikan berkualitas tinggi dalam bidang teknik dan kejuruan.",
    // EDIT: alamat sekolah
    address:
      "Jl. Cimanuk No.309A, Sukagalih, Kec. Tarogong Kidul, Kabupaten Garut, Jawa Barat 44151",
  },

  /* ------------------------------------------------------------------
   * 2. GALERI SEKOLAH (carousel di beranda)
   * ------------------------------------------------------------------
   * Simpan foto di folder public/galeri/, lalu tulis path-nya di `src`.
   * Foto bergeser otomatis dari kiri ke kanan setiap ±5 detik dan bisa
   * dijeda pengunjung. Urutan di sini adalah urutan tampil.
   * Contoh: { src: "/galeri/foto-asli.jpg", alt: "Gedung sekolah", caption: "Gedung sekolah" }
   */
  galeri: {
    // EDIT: judul dan pengantar bagian galeri
    judul: "Suasana sekolah kami",
    deskripsi:
      "Sekilas tempat belajar, fasilitas, dan kegiatan yang mendukung pembelajaran Informatika.",
    foto: [
      {
        src: "/galeri/sekolah-1.svg",
        alt: "Ilustrasi gedung SMK Negeri 1 Garut",
        caption: "Gedung sekolah",
      },
      {
        src: "/galeri/sekolah-2.svg",
        alt: "Ilustrasi laboratorium komputer",
        caption: "Laboratorium komputer",
      },
      {
        src: "/galeri/sekolah-3.svg",
        alt: "Ilustrasi perpustakaan sekolah",
        caption: "Perpustakaan sekolah",
      },
    ],
  },

  /* ------------------------------------------------------------------
   * 3. SEJARAH SEKOLAH (landing page)
   * ------------------------------------------------------------------ */
  // EDIT: tahun awal berdirinya sekolah
  tahunBerdiri: "1 Agustus 1959",

  // EDIT: narasi sejarah sekolah dan awal berdirinya
  sejarah:
    "Sekolah Menengah Ekonomi Atas Negeri (SMEAN) Garut didirikan pada tanggal 1 Agustus 1959 berdasarkan Surat Keputusan Menteri Pendidikan, Pengajaran dan Kebudayaan tanggal 24 Juli 1959 No. 897/B.3/Pedj, yang berlokasi di Jalan Kiansantang menumpang pada bangunan SPG Negeri Garut. Tahun 1965 SMEAN Garut pindah lokasi menempati bangunan baru di Jl. Haur Panggung yang dibangun oleh CV. Haruman dengan luas 7.850 m2 dan luas bangunan 935,96 m2 dengan program keahliannya meliputi: Tata Niaga, Tata Buku, dan Kesekretarisan.",

  /* ------------------------------------------------------------------
   * 4. JENJANG, KELAS, DAN MATERI
   * ------------------------------------------------------------------
   * Setiap jenjang punya:
   * - slug      : dipakai di URL, tanpa spasi. Contoh "smk" -> /smk
   * - nama      : judul yang tampil di halaman, contoh "Sekolah Menengah Kejuruan"
   * - singkatan : label pendek, contoh "SMK"
   * - deskripsi : penjelasan singkat (1-2 kalimat)
   * - kelas     : daftar kelas. Setiap kelas punya:
   *     - slug     : dipakai di URL, contoh "10" -> /smk/10
   *     - nama     : judul yang tampil, contoh "Kelas 10"
   *     - deskripsi: penjelasan singkat kelas
   *     - materi   : daftar materi. Setiap materi punya:
   *         - slug      : dipakai di URL, contoh "algoritma" -> /smk/10/algoritma
   *         - judul     : nama materi yang tampil
   *         - deskripsi : ringkasan singkat (1-2 kalimat)
   *         - durasi    : perkiraan waktu, contoh "2 jam" (boleh "")
   *         - video     : { judul, youtubeId } atau null jika belum ada
   *         - kuis      : { jumlahSoal } — jumlah soal ditentukan guru
   *         - konten    : isi materi berupa array blok. Jenis blok:
   *             { tipe: "tujuan",  items: ["...", "..."] }  daftar tujuan belajar
   *             { tipe: "teks",    judul: "Subjudul", isi: "Paragraf." }
   *             { tipe: "daftar",  judul: "Subjudul", terurut: true, items: [...] }
   *             { tipe: "kode",    judul: "Contoh", bahasa: "python", isi: "..." }
   *             { tipe: "catatan", isi: "Pesan penting." }
   *       Kosongkan array `materi` ([]) jika belum ada materi;
   *       halaman akan menampilkan pesan "materi segera hadir".
   */
  jenjang: [
    {
      slug: "smk",
      // EDIT: nama lengkap jenjang
      nama: "Sekolah Menengah Kejuruan",
      // EDIT: singkatan jenjang
      singkatan: "SMK",
      // EDIT: deskripsi jenjang
      deskripsi:
        "Materi Informatika SMK mengikuti elemen Kurikulum Merdeka, mulai dari fondasi berpikir komputasional hingga penerapan melalui proyek dan analisis data.",
      kelas: [
        {
          slug: "10",
          // EDIT: nama kelas
          nama: "Kelas 10",
          // EDIT: deskripsi kelas
          deskripsi:
            "Fondasi Informatika: berpikir komputasional, sistem komputer, jaringan, dan pengenalan pemrograman.",
          materi: [
            {
              slug: "berpikir-komputasional",
              judul: "Berpikir Komputasional",
              deskripsi:
                "Mengenal cara berpikir komputasional dan menerapkannya untuk memecah masalah sehari-hari.",
              durasi: "2 jam",
              // EDIT: isi setelah video tersedia, contoh:
              // video: { judul: "Video: Berpikir Komputasional", youtubeId: "xxxxxxxxxxx" },
              video: null,
              kuis: {
                // EDIT: guru menentukan jumlah soal kuis (1-20)
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menjelaskan pengertian berpikir komputasional.",
                    "Mengenali empat fondasi: dekomposisi, pengenalan pola, abstraksi, dan algoritma.",
                    "Menerapkan dekomposisi pada masalah sehari-hari.",
                    "Menuliskan algoritma sederhana dalam bentuk pseudocode.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Apa itu Berpikir Komputasional?",
                  isi: "Berpikir komputasional adalah cara menyelesaikan masalah secara sistematis sehingga solusinya dapat dijalankan oleh manusia maupun komputer. Pendekatan ini tidak selalu berarti memakai komputer; yang ditekankan adalah cara berpikirnya: memecah masalah besar, mengenali pola, menyaring hal penting, lalu menyusun langkah penyelesaian.",
                },
                {
                  tipe: "daftar",
                  judul: "Empat Fondasi Berpikir Komputasional",
                  terurut: true,
                  items: [
                    "Dekomposisi: memecah masalah besar menjadi bagian-bagian kecil yang lebih mudah diselesaikan.",
                    "Pengenalan pola: mencari kesamaan atau kecenderungan pada masalah yang pernah dihadapi.",
                    "Abstraksi: mengabaikan detail yang tidak perlu dan fokus pada informasi penting.",
                    "Algoritma: menyusun langkah penyelesaian yang runtut, jelas, dan berakhir.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Contoh Penerapan",
                  isi: "Misalnya, tugas menyusun jadwal belajar mingguan dapat dipecah menjadi beberapa bagian: mendata mata pelajaran, menentukan prioritas, memperkirakan waktu, lalu menyusun urutan belajar. Pola yang sama dapat dipakai setiap minggu, dan detail seperti warna catatan tidak perlu dimasukkan ke dalam algoritma.",
                },
                {
                  tipe: "kode",
                  judul: "Pseudocode Menghitung Rata-rata",
                  bahasa: "pseudocode",
                  isi: `MULAI
  Masukkan nilai1, nilai2, nilai3
  jumlah = nilai1 + nilai2 + nilai3
  rata_rata = jumlah / 3
  Tampilkan rata_rata
SELESAI`,
                },
                {
                  tipe: "catatan",
                  isi: "Algoritma yang baik selalu berhenti, menghasilkan keluaran yang jelas, dan dapat dijalankan orang lain tanpa penjelasan tambahan.",
                },
              ],
            },
            {
              slug: "sistem-komputer",
              judul: "Sistem Komputer",
              deskripsi:
                "Mengenal perangkat keras, perangkat lunak, dan cara komputer menyimpan serta mengolah data.",
              durasi: "2 jam",
              video: null,
              kuis: {
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menyebutkan komponen utama sistem komputer.",
                    "Menjelaskan peran CPU, RAM, dan media penyimpanan.",
                    "Membedakan perangkat masukan, proses, dan keluaran.",
                    "Mengubah bilangan desimal sederhana menjadi biner.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Apa itu Sistem Komputer?",
                  isi: "Sistem komputer adalah gabungan perangkat keras dan perangkat lunak yang bekerja bersama untuk menerima masukan, mengolahnya, dan menghasilkan keluaran. Perangkat keras berwujud fisik, sedangkan perangkat lunak berupa instruksi yang dijalankan perangkat keras.",
                },
                {
                  tipe: "daftar",
                  judul: "Komponen Utama",
                  terurut: false,
                  items: [
                    "CPU (processor) menjalankan instruksi dan mengatur jalannya program.",
                    "RAM menyimpan data sementara selama program berjalan; isinya hilang saat daya dimatikan.",
                    "Media penyimpanan seperti SSD atau hard disk menyimpan data secara permanen.",
                    "Perangkat masukan seperti keyboard dan kamera mengirim data ke komputer.",
                    "Perangkat keluaran seperti monitor dan printer menampilkan hasil pengolahan.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Data Disimpan sebagai Bilangan Biner",
                  isi: "Komputer mengenali dua keadaan listrik: menyala dan mati. Karena itu seluruh data, termasuk teks, gambar, dan suara, direpresentasikan sebagai deretan angka 0 dan 1. Satu digit biner disebut bit, dan delapan bit disebut satu byte.",
                },
                {
                  tipe: "kode",
                  judul: "Konversi Desimal ke Biner dengan Python",
                  bahasa: "python",
                  isi: `def ke_biner(angka):
    if angka == 0:
        return "0"

    hasil = ""
    while angka > 0:
        sisa = angka % 2
        hasil = str(sisa) + hasil
        angka = angka // 2

    return hasil


print(ke_biner(13))   # 1101
print(ke_biner(100))  # 1100100`,
                },
                {
                  tipe: "catatan",
                  isi: "Menambah RAM membuat lebih banyak program berjalan bersamaan, tetapi tidak membuat CPU lebih cepat. Kecepatan pemrosesan dan kapasitas memori adalah dua hal yang berbeda.",
                },
              ],
            },
            {
              slug: "jaringan-komputer",
              judul: "Jaringan Komputer & Internet",
              deskripsi:
                "Memahami bagaimana perangkat terhubung, bertukar data, dan mengapa keamanan koneksi penting.",
              durasi: "2 jam",
              video: null,
              kuis: {
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menjelaskan perbedaan jaringan lokal dan internet.",
                    "Menyebutkan fungsi alamat IP, DNS, dan protokol HTTP.",
                    "Membedakan HTTP dan HTTPS.",
                    "Menerapkan kebiasaan dasar saat memakai jaringan publik.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Dari Jaringan Lokal ke Internet",
                  isi: "Jaringan komputer adalah kumpulan perangkat yang saling terhubung untuk bertukar data. Jaringan lokal (LAN) menghubungkan perangkat dalam satu area, misalnya laboratorium komputer. Internet adalah jaringan global yang menghubungkan jutaan jaringan lokal melalui penyedia layanan internet.",
                },
                {
                  tipe: "daftar",
                  judul: "Istilah yang Sering Muncul",
                  terurut: false,
                  items: [
                    "Alamat IP mengidentifikasi sebuah perangkat di dalam jaringan.",
                    "DNS menerjemahkan nama domain seperti contoh.sch.id menjadi alamat IP.",
                    "HTTP adalah protokol permintaan dan tanggapan antara browser dan server web.",
                    "HTTPS adalah HTTP yang dienkripsi sehingga isinya tidak mudah dibaca pihak lain.",
                    "Router meneruskan data antara jaringan lokal dan jaringan luar.",
                  ],
                },
                {
                  tipe: "kode",
                  judul: "Memeriksa Koneksi dari Terminal",
                  bahasa: "bash",
                  isi: `# Melihat alamat IP perangkat
ipconfig

# Menguji apakah server dapat dijangkau
ping example.com

# Melihat rute perjalanan paket data
tracert example.com`,
                },
                {
                  tipe: "teks",
                  judul: "Mengapa Keamanan Penting",
                  isi: "Data yang melewati jaringan publik dapat disadap bila tidak dienkripsi. Karena itu situs yang meminta kata sandi atau data pribadi sebaiknya memakai HTTPS. Hindari masuk ke akun penting melalui jaringan Wi-Fi publik yang tidak jelas pengelolanya.",
                },
                {
                  tipe: "catatan",
                  isi: "Alamat IP publik dapat menunjukkan perkiraan lokasi dan penyedia layanan, sehingga tidak perlu dibagikan sembarangan di media sosial.",
                },
              ],
            },
          ],
        },
        {
          slug: "11",
          // EDIT: nama kelas
          nama: "Kelas 11",
          // EDIT: deskripsi kelas
          deskripsi:
            "Pendalaman algoritma dan pemrograman, struktur data, serta pengelolaan basis data.",
          materi: [
            {
              slug: "algoritma-pemrograman",
              judul: "Algoritma & Pemrograman",
              deskripsi:
                "Menghubungkan algoritma dengan program Python melalui variabel, percabangan, perulangan, dan fungsi.",
              durasi: "2 jam",
              // EDIT: isi setelah video tersedia, contoh:
              // video: { judul: "Video: Berpikir Komputasional", youtubeId: "xxxxxxxxxxx" },
              video: null,
              kuis: {
                // EDIT: guru menentukan jumlah soal kuis (1-20)
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menjelaskan hubungan antara algoritma dan program.",
                    "Menggunakan variabel, percabangan, dan perulangan dalam Python.",
                    "Menulis fungsi dengan parameter dan nilai kembalian.",
                    "Menguji program dengan beberapa kasus masukan.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Dari Algoritma ke Program",
                  isi: "Algoritma adalah urutan langkah penyelesaian masalah, sedangkan program adalah algoritma yang ditulis dalam bahasa pemrograman agar dapat dijalankan komputer. Bahasa seperti Python menyediakan variabel untuk menyimpan nilai, percabangan untuk memilih langkah, dan perulangan untuk mengulang pekerjaan.",
                },
                {
                  tipe: "daftar",
                  judul: "Struktur Kontrol Dasar",
                  terurut: false,
                  items: [
                    "Percabangan if/elif/else digunakan ketika keputusan bergantung pada kondisi.",
                    "Perulangan for digunakan saat banyaknya pengulangan sudah diketahui.",
                    "Perulangan while digunakan selama kondisi masih terpenuhi.",
                    "Fungsi mengelompokkan langkah agar dapat dipakai berulang tanpa menulis ulang kode.",
                  ],
                },
                {
                  tipe: "kode",
                  judul: "Fungsi Python untuk Menghitung Rata-rata",
                  bahasa: "python",
                  isi: `def rata_rata(nilai):
    if not nilai:
        return 0

    total = 0
    for angka in nilai:
        total += angka

    return total / len(nilai)


data = [80, 75, 90, 85]
print(rata_rata(data))  # 82.5`,
                },
                {
                  tipe: "teks",
                  judul: "Menguji Program",
                  isi: "Program perlu diuji dengan masukan yang berbeda, termasuk daftar kosong, satu nilai, dan nilai yang sama semua. Pengujian membantu menemukan kesalahan logika sebelum program dipakai orang lain.",
                },
                {
                  tipe: "catatan",
                  isi: "Nama variabel dan fungsi sebaiknya deskriptif. Kode yang benar tetapi sulit dibaca akan menyulitkan perbaikan di kemudian hari.",
                },
              ],
            },
            {
              slug: "struktur-data",
              judul: "Struktur Data",
              deskripsi:
                "Memilih cara menyimpan data yang tepat: list, dictionary, stack, dan queue.",
              durasi: "2 jam",
              video: null,
              kuis: {
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menjelaskan pengertian struktur data.",
                    "Menggunakan list dan dictionary di Python.",
                    "Membedakan perilaku stack dan queue.",
                    "Memilih struktur data sesuai kebutuhan program.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Mengapa Struktur Data Penting",
                  isi: "Struktur data adalah cara menyimpan dan mengatur data agar dapat diakses dan diolah secara efisien. Memilih struktur data yang tepat membuat program lebih mudah ditulis dan lebih cepat dijalankan. Memilih yang salah membuat kode rumit meskipun hasilnya sama.",
                },
                {
                  tipe: "daftar",
                  judul: "Struktur Data Dasar",
                  terurut: false,
                  items: [
                    "List menyimpan banyak nilai berurutan dan dapat diubah isinya.",
                    "Dictionary menyimpan pasangan kunci dan nilai sehingga data dicari lewat kuncinya.",
                    "Stack bekerja dengan prinsip terakhir masuk pertama keluar (LIFO), seperti tumpukan piring.",
                    "Queue bekerja dengan prinsip pertama masuk pertama keluar (FIFO), seperti antrean layanan.",
                  ],
                },
                {
                  tipe: "kode",
                  judul: "List, Dictionary, dan Stack dengan Python",
                  bahasa: "python",
                  isi: `# List: daftar nilai berurutan
nilai = [80, 75, 90]
nilai.append(85)
print(nilai[0])       # 80

# Dictionary: pasangan kunci-nilai
siswa = {"nama": "Rani", "kelas": "11"}
print(siswa["nama"])  # Rani

# Stack: terakhir masuk, pertama keluar
tumpukan = []
tumpukan.append("halaman 1")
tumpukan.append("halaman 2")
print(tumpukan.pop())  # halaman 2`,
                },
                {
                  tipe: "teks",
                  judul: "Memilih Struktur Data",
                  isi: "Gunakan list bila data perlu diurutkan atau diakses berdasarkan posisi. Gunakan dictionary bila data dicari berdasarkan nama atau identitas. Gunakan stack untuk riwayat yang dibatalkan (undo), dan queue untuk pekerjaan yang harus diproses sesuai urutan kedatangan.",
                },
                {
                  tipe: "catatan",
                  isi: "Struktur data yang tepat mengurangi jumlah kode, tetapi tidak menggantikan algoritma yang benar. Keduanya harus dirancang bersama.",
                },
              ],
            },
            {
              slug: "basis-data",
              judul: "Basis Data",
              deskripsi:
                "Menyimpan data secara terstruktur dengan tabel, relasi, dan perintah SQL dasar.",
              durasi: "2 jam",
              video: null,
              kuis: {
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menjelaskan fungsi basis data dan tabel.",
                    "Membedakan primary key dan foreign key.",
                    "Menulis perintah SELECT, INSERT, UPDATE, dan DELETE sederhana.",
                    "Menjelaskan pentingnya validasi dan izin akses data.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Dari Tabel ke Basis Data",
                  isi: "Basis data adalah kumpulan data yang disimpan secara terstruktur sehingga mudah dicari, diubah, dan dihubungkan. Data biasanya disusun dalam tabel yang terdiri atas baris (record) dan kolom (field). Setiap tabel sebaiknya memiliki kunci unik agar setiap baris dapat dibedakan.",
                },
                {
                  tipe: "daftar",
                  judul: "Istilah Penting",
                  terurut: false,
                  items: [
                    "Primary key adalah kolom yang nilainya unik untuk setiap baris, misalnya NIS.",
                    "Foreign key adalah kolom yang merujuk ke primary key tabel lain, misalnya kolom kelas pada tabel siswa.",
                    "Relasi menghubungkan data antar tabel sehingga tidak perlu menyalin data yang sama berulang.",
                    "Query adalah perintah untuk mengambil atau mengubah data.",
                  ],
                },
                {
                  tipe: "kode",
                  judul: "Perintah SQL Dasar",
                  bahasa: "sql",
                  isi: `-- Mengambil data
SELECT nama, kelas FROM siswa WHERE kelas = '11';

-- Menambah data
INSERT INTO siswa (nis, nama, kelas)
VALUES ('1101', 'Rani', '11');

-- Mengubah data
UPDATE siswa SET kelas = '12' WHERE nis = '1101';

-- Menghapus data
DELETE FROM siswa WHERE nis = '1101';`,
                },
                {
                  tipe: "teks",
                  judul: "Menjaga Data Tetap Sahih",
                  isi: "Basis data produksi harus dilindungi dengan hak akses dan aturan validasi. Siswa hanya boleh membaca data miliknya, sedangkan guru dapat membaca data kelasnya. Perintah DELETE sebaiknya dijalankan dengan syarat yang jelas agar tidak menghapus seluruh tabel.",
                },
                {
                  tipe: "catatan",
                  isi: "Selalu uji query SELECT terlebih dahulu sebelum menjalankan UPDATE atau DELETE dengan kondisi yang sama. Kebiasaan ini mencegah data terhapus tanpa sengaja.",
                },
              ],
            },
          ],
        },
        {
          slug: "12",
          // EDIT: nama kelas
          nama: "Kelas 12",
          // EDIT: deskripsi kelas
          deskripsi:
            "Analisis data, dampak sosial informatika, dan proyek lintas bidang sebagai penerapan nyata.",
          materi: [
            {
              slug: "analisis-data",
              judul: "Analisis Data",
              deskripsi:
                "Mengolah data menjadi informasi melalui tahapan analisis dan statistik sederhana.",
              durasi: "2 jam",
              // EDIT: isi setelah video tersedia, contoh:
              // video: { judul: "Video: Berpikir Komputasional", youtubeId: "xxxxxxxxxxx" },
              video: null,
              kuis: {
                // EDIT: guru menentukan jumlah soal kuis (1-20)
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Membedakan data dan informasi.",
                    "Menjelaskan tahapan analisis data.",
                    "Menghitung ukuran pemusatan data sederhana dengan Python.",
                    "Menilai kualitas dan etika penggunaan data.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Data dan Informasi",
                  isi: "Data adalah kumpulan fakta mentah, sedangkan informasi adalah hasil pengolahan data yang dapat digunakan untuk mengambil keputusan. Analisis data bertujuan menemukan pola, kecenderungan, atau hubungan yang tidak terlihat pada data mentah.",
                },
                {
                  tipe: "daftar",
                  judul: "Tahapan Analisis Data",
                  terurut: true,
                  items: [
                    "Merumuskan pertanyaan yang ingin dijawab.",
                    "Mengumpulkan data dari sumber yang relevan.",
                    "Membersihkan data dari nilai kosong, duplikat, atau kesalahan penulisan.",
                    "Mengolah dan memvisualisasikan data.",
                    "Menarik kesimpulan dan menyampaikannya secara jujur.",
                  ],
                },
                {
                  tipe: "kode",
                  judul: "Menghitung Statistik Sederhana",
                  bahasa: "python",
                  isi: `def ringkasan(data):
    if not data:
        return None

    data_urut = sorted(data)
    n = len(data_urut)
    rata = sum(data_urut) / n

    tengah = n // 2
    if n % 2 == 0:
        median = (data_urut[tengah - 1] + data_urut[tengah]) / 2
    else:
        median = data_urut[tengah]

    return {
        "rata_rata": rata,
        "median": median,
        "minimum": data_urut[0],
        "maksimum": data_urut[-1],
    }


nilai = [70, 85, 90, 75, 80]
print(ringkasan(nilai))`,
                },
                {
                  tipe: "catatan",
                  isi: "Data pribadi harus digunakan sesuai izin pemiliknya. Kesimpulan yang menarik harus tetap didukung data, bukan sekadar dugaan.",
                },
              ],
            },
            {
              slug: "dampak-sosial-informatika",
              judul: "Dampak Sosial Informatika",
              deskripsi:
                "Menimbang manfaat dan risiko teknologi: privasi, jejak digital, dan etika bermedia.",
              durasi: "2 jam",
              video: null,
              kuis: {
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menjelaskan dampak positif dan negatif teknologi informasi.",
                    "Mengenali jenis data pribadi yang perlu dilindungi.",
                    "Menjelaskan pengertian jejak digital.",
                    "Menerapkan etika berkomunikasi di ruang digital.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Teknologi Bukan Hanya Alat",
                  isi: "Teknologi informasi mempercepat pekerjaan, memperluas akses belajar, dan membuka peluang usaha. Pada saat yang sama, teknologi dapat menyebarkan informasi keliru, mempersempit perhatian, dan menimbulkan ketergantungan. Dampaknya bergantung pada cara manusia memakainya.",
                },
                {
                  tipe: "daftar",
                  judul: "Empat Isu yang Perlu Dipedulikan",
                  terurut: true,
                  items: [
                    "Privasi: data pribadi seperti nomor identitas, alamat, dan riwayat kesehatan tidak boleh dibagikan tanpa alasan jelas.",
                    "Jejak digital: setiap unggahan, komentar, dan pencarian meninggalkan rekam jejak yang sulit dihapus sepenuhnya.",
                    "Hoaks: informasi yang belum terverifikasi mudah menyebar karena kecepatan berbagi melebihi kecepatan pemeriksaan.",
                    "Perundungan siber: pesan menyakitkan yang dikirim berulang dapat menimbulkan dampak serius bagi korban.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Menimbang Sebelum Membagikan",
                  isi: "Sebelum mengunggah atau meneruskan informasi, tanyakan tiga hal: apakah sumbernya jelas, apakah isinya bermanfaat, dan apakah ada pihak yang dirugikan. Menahan diri dari membagikan konten yang meragukan lebih baik daripada memperbaiki kekeliruan setelah tersebar luas.",
                },
                {
                  tipe: "catatan",
                  isi: "Kebebasan berpendapat di ruang digital tetap disertai tanggung jawab. Kritik yang disampaikan dengan data dan bahasa yang santun lebih efektif daripada serangan pribadi.",
                },
              ],
            },
            {
              slug: "proyek-informatika",
              judul: "Proyek Lintas Bidang",
              deskripsi:
                "Merancang, mengerjakan, dan mempresentasikan proyek Informatika secara berkelompok.",
              durasi: "4 jam",
              video: null,
              kuis: {
                jumlahSoal: 5,
              },
              konten: [
                {
                  tipe: "tujuan",
                  items: [
                    "Menyusun rencana proyek yang jelas dan terukur.",
                    "Membagi peran dalam kerja kelompok.",
                    "Mendokumentasikan proses dan hasil proyek.",
                    "Mempresentasikan hasil serta menanggapi masukan.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Belajar melalui Proyek",
                  isi: "Proyek lintas bidang menggabungkan kemampuan Informatika dengan mata pelajaran lain untuk menyelesaikan masalah nyata. Contohnya, membuat dashboard sederhana untuk menampilkan data kebersihan kelas atau situs profil kegiatan sekolah. Yang dinilai bukan hanya hasil akhir, tetapi juga proses perencanaan dan kerja sama.",
                },
                {
                  tipe: "daftar",
                  judul: "Tahapan Proyek",
                  terurut: true,
                  items: [
                    "Merumuskan masalah dan pengguna yang akan dibantu.",
                    "Menetapkan tujuan dan batasan proyek agar lingkupnya tidak melebar.",
                    "Membagi peran: riset, desain, pengembangan, pengujian, dan dokumentasi.",
                    "Membuat purwarupa awal, lalu mengujinya kepada calon pengguna.",
                    "Memperbaiki berdasarkan masukan dan menyiapkan bahan presentasi.",
                  ],
                },
                {
                  tipe: "teks",
                  judul: "Dokumentasi yang Baik",
                  isi: "Dokumentasi mencatat keputusan penting: mengapa suatu fitur dibuat, data apa yang dipakai, dan cara menjalankan proyek. Dokumentasi yang rapi memudahkan guru menilai proses dan memudahkan anggota lain melanjutkan pekerjaan.",
                },
                {
                  tipe: "kode",
                  judul: "Contoh Struktur Catatan Proyek",
                  bahasa: "text",
                  isi: `Nama proyek:
Anggota dan peran:
Masalah yang ingin diselesaikan:
Pengguna sasaran:
Fitur utama:
Data yang digunakan:
Jadwal pengerjaan:
Hasil pengujian:
Kendala dan solusi:`,
                },
                {
                  tipe: "catatan",
                  isi: "Proyek yang selesai dengan lingkup kecil lebih bernilai daripada proyek besar yang tidak pernah diuji. Mulailah dari fitur paling penting, lalu kembangkan bila waktu memungkinkan.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Cari satu jenjang berdasarkan slug (dipakai halaman /[jenjang]).
 * @param {string} slug
 */
export function getJenjangBySlug(slug) {
  return educationConfig.jenjang.find((item) => item.slug === slug) ?? null;
}

/**
 * Cari satu kelas di dalam jenjang berdasarkan slug (dipakai halaman /[jenjang]/[kelas]).
 * @param {string} jenjangSlug
 * @param {string} kelasSlug
 */
export function getKelasBySlug(jenjangSlug, kelasSlug) {
  const jenjang = getJenjangBySlug(jenjangSlug);
  if (!jenjang) return null;
  return jenjang.kelas.find((item) => item.slug === kelasSlug) ?? null;
}

/**
 * Cari satu materi di dalam kelas (dipakai halaman /[jenjang]/[kelas]/[materi]).
 * @param {string} jenjangSlug
 * @param {string} kelasSlug
 * @param {string} materiSlug
 */
export function getMateriBySlug(jenjangSlug, kelasSlug, materiSlug) {
  const kelas = getKelasBySlug(jenjangSlug, kelasSlug);
  if (!kelas) return null;
  return kelas.materi.find((item) => item.slug === materiSlug) ?? null;
}

export default educationConfig;
