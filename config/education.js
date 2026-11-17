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
 * - school       : profil sekolah + video sosialisasi di landing page.
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
    name: "SMK Negeri 2 Garut",
    // EDIT: logo sekolah. Simpan file logo di folder public/, lalu tulis
    // path-nya di sini. Nama berkas boleh memakai spasi; tulis apa adanya,
    // karena path akan di-encode otomatis oleh encodeURI di layout.
    // Kosongkan ("") untuk memakai ikon bawaan sebagai pengganti.
    logo: "/logo smkn 2.png",
    // EDIT: teks alternatif logo untuk pembaca layar
    logoAlt: "Logo SMK Negeri 2 Garut",
    // EDIT: deskripsi singkat sekolah (2-3 kalimat)
    description:
      "SMK Negeri 2 Garut merupakan sekolah menengah kejuruan unggulan yang berfokus mencetak lulusan kompeten dan siap kerja melalui penguasaan teknologi terapan, rekayasa industri, serta inovasi kreatif.",
    // EDIT: alamat sekolah
    address:
      "Jl.Suherman NO. 90 PO.BOX 103 Tarogong Kaler Kp.Jati, Kec. Tarogong Kaler Kab. Garut, Prov. Jawa Barat Kode Pos: 44151",

    // Video sosialisasi sekolah (ditampilkan di beranda).
    // EDIT: isi youtubeId dengan 11 karakter dari URL YouTube, misalnya
    // https://www.youtube.com/watch?v=abcdefghijk -> "abcdefghijk".
    // Biarkan kosong ("") untuk menyembunyikan bagian video.
    videoSosialisasi: {
      judul: "Company Profile",
      deskripsi:
        "Kenali lingkungan belajar, fasilitas, dan kegiatan SMK Negeri 2 Garut sebelum mulai belajar.",
      youtubeId: "XTu29qU_IBg",
    },
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
      "Sekilas tempat belajar, fasilitas, dan kegiatan yang mendukung pembelajaran.",
    foto: [
    { src: "/galeri/gedung.jpeg", alt: "Gedung SMK Negeri 2 Garut", caption: "Gedung sekolah" },
    { src: "/galeri/perpustakaan.jpeg", alt: "Perpustakaan sekolah", caption: "Perpustakaan sekolah" },
    { src: "/galeri/siswa.jpeg", alt: "Kegiatan siswa", caption: "Kegiatan siswa" },
  ],
  },

  /* ------------------------------------------------------------------
   * 3. SEJARAH SEKOLAH (landing page)
   * ------------------------------------------------------------------ */
  // EDIT: tahun awal berdirinya sekolah
  tahunBerdiri: "3 Agustus 1965",

  // EDIT: narasi sejarah sekolah dan awal berdirinya
  sejarah:
    "Sekolah Teknologi Menengah (STM) Negeri Garut (kini SMK Negeri 2 Garut) didirikan pada tanggal 3 Agustus 1965 berdasarkan Surat Keputusan Pendirian Nomor 118/DIR.PT/B.1/1965. Sekolah yang kini berlokasi di Jl. Suherman No. 90, Kelurahan Jati, Kecamatan Tarogong Kaler, Kabupaten Garut ini memiliki luas tanah mencapai 39.671 m². Seiring perkembangannya, program keahlian di sekolah ini mencakup berbagai bidang teknologi dan rekayasa, seperti Desain Pemodelan dan Informasi Bangunan (DPIB), Teknik Audio Video, Geologi Pertambangan, Teknik Instalasi Tenaga Listrik, Teknik Kendaraan Ringan, Desain Komunikasi Visual (DKV), Teknik Elektronika Industri, Teknik Penyiaran Pertelevisian, Teknik Logistik, serta Teknik Industri Farmasi",

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
            "Materi Informatika kelas X mengikuti empat bab buku Informatika SMA/SMK Kelas X: data dan validasinya, algoritma dan struktur data, teknologi dan budaya digital, serta keamanan dan manajemen informasi.",
          materi: [
            {
              slug: "informatika-bab-1",
              judul: "Bab 1 — Data, Informasi, dan Validasinya",
              deskripsi:
                "Data, informasi, dan cara memvalidasinya: pencarian dengan banyak variabel, koleksi data, ekosistem periksa fakta, serta evaluasi data dan sumbernya.",
              durasi: "",
              video: null,
              kuis: {
                // 0 = kuis tidak ditampilkan. Bank soal disusun dari blok
                // `konten`, sedangkan materi ini bertumpu pada lampiran PDF.
                // Ubah ke 1-20 setelah bahan soalnya siap.
                jumlahSoal: 0,
              },
              konten: [
                {
                  tipe: "teks",
                  judul: "Isi Bab 1 — Data, Informasi, dan Validasinya",
                  isi: "Data, informasi, dan cara memvalidasinya: pencarian dengan banyak variabel, koleksi data, ekosistem periksa fakta, serta evaluasi data dan sumbernya. Bahan bacaan lengkap ada pada lampiran PDF bab ini: buka bagian Berkas materi di bawah halaman, lalu pratinjau atau unduh.",
                },
                {
                  tipe: "daftar",
                  judul: "Subbab dalam bab ini",
                  terurut: true,
                  items: [
                    "A. Pencarian dengan Banyak Variabel",
                    "B. Koleksi Data",
                    "C. Ekosistem Periksa Fakta",
                    "D. Evaluasi Data dan Sumbernya",
                  ],
                },
                {
                  tipe: "catatan",
                  isi: "Baca bab ini dari lampiran PDF secara berurutan. Setelah selesai, ulangi latihan di bagian Uji Kompetensi pada akhir bab.",
                },
              ],
            },
            {
              slug: "informatika-bab-2",
              judul: "Bab 2 — Algoritma dan Struktur Data",
              deskripsi:
                "Algoritma dan pemrograman, struktur kendali, pemilihan algoritma, dan pemilihan struktur data untuk masalah nyata.",
              durasi: "",
              video: null,
              kuis: {
                jumlahSoal: 0,
              },
              konten: [
                {
                  tipe: "teks",
                  judul: "Isi Bab 2 — Algoritma dan Struktur Data",
                  isi: "Algoritma dan pemrograman, struktur kendali, pemilihan algoritma, dan pemilihan struktur data untuk masalah nyata. Bahan bacaan lengkap ada pada lampiran PDF bab ini: buka bagian Berkas materi di bawah halaman, lalu pratinjau atau unduh.",
                },
                {
                  tipe: "daftar",
                  judul: "Subbab dalam bab ini",
                  terurut: true,
                  items: [
                    "A. Mengenal Algoritma dan Pemrograman",
                    "B. Membuat Program Sesuai Struktur Kendalinya",
                    "C. Memilih Algoritma untuk Masalah di Kehidupan Nyata",
                    "D. Memilih Struktur Data untuk Masalah di Kehidupan Nyata",
                  ],
                },
                {
                  tipe: "catatan",
                  isi: "Baca bab ini dari lampiran PDF secara berurutan. Setelah selesai, ulangi latihan di bagian Uji Kompetensi pada akhir bab.",
                },
              ],
            },
            {
              slug: "informatika-bab-3",
              judul: "Bab 3 — Teknologi dan Budaya Digital",
              deskripsi:
                "Sistem komputer, otomatisasi dan pemrosesan dokumen dengan perangkat lunak perkantoran, budaya baru era Informatika, serta budaya karier dan sertifikasi.",
              durasi: "",
              video: null,
              kuis: {
                jumlahSoal: 0,
              },
              konten: [
                {
                  tipe: "teks",
                  judul: "Isi Bab 3 — Teknologi dan Budaya Digital",
                  isi: "Sistem komputer, otomatisasi dan pemrosesan dokumen dengan perangkat lunak perkantoran, budaya baru era Informatika, serta budaya karier dan sertifikasi. Bahan bacaan lengkap ada pada lampiran PDF bab ini: buka bagian Berkas materi di bawah halaman, lalu pratinjau atau unduh.",
                },
                {
                  tipe: "daftar",
                  judul: "Subbab dalam bab ini",
                  terurut: true,
                  items: [
                    "A. Sistem Komputer",
                    "B. Otomatisasi dengan Perangkat Lunak Perkantoran",
                    "C. Pemrosesan Dokumen dengan Perangkat Lunak Perkantoran",
                    "D. Budaya Baru di Era Informatika",
                    "E. Budaya Karier dan Beragam Sertifikasi di Bidang Informatika",
                  ],
                },
                {
                  tipe: "catatan",
                  isi: "Baca bab ini dari lampiran PDF secara berurutan. Setelah selesai, ulangi latihan di bagian Uji Kompetensi pada akhir bab.",
                },
              ],
            },
            {
              slug: "informatika-bab-4",
              judul: "Bab 4 — Keamanan dan Manajemen Informasi",
              deskripsi:
                "Jaringan komputer dan internet, proteksi data di internet, serta peningkatan keamanan informasi.",
              durasi: "",
              video: null,
              kuis: {
                jumlahSoal: 0,
              },
              konten: [
                {
                  tipe: "teks",
                  judul: "Isi Bab 4 — Keamanan dan Manajemen Informasi",
                  isi: "Jaringan komputer dan internet, proteksi data di internet, serta peningkatan keamanan informasi. Bahan bacaan lengkap ada pada lampiran PDF bab ini: buka bagian Berkas materi di bawah halaman, lalu pratinjau atau unduh.",
                },
                {
                  tipe: "daftar",
                  judul: "Subbab dalam bab ini",
                  terurut: true,
                  items: [
                    "A. Pendahuluan",
                    "B. Jaringan Komputer dan Internet",
                    "C. Proteksi Data di Internet",
                    "D. Meningkatkan Keamanan Informasi",
                  ],
                },
                {
                  tipe: "catatan",
                  isi: "Baca bab ini dari lampiran PDF secara berurutan. Setelah selesai, ulangi latihan di bagian Uji Kompetensi pada akhir bab.",
                },
              ],
            },
          ],
        },
        /*
         * Kelas 11 dan 12 dihapus sementara untuk simulasi satu kelas (kelas 10).
         * Untuk mengembalikannya, tambahkan lagi objek kelas di sini, lengkap
         * dengan `slug`, `nama`, `deskripsi`, dan `materi`-nya.
         */
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
