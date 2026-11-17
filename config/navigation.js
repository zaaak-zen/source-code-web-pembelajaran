/**
 * Navigation configuration
 *
 * Sumber tunggal untuk menu di Navbar dan kolom tautan di Footer.
 *
 * CARA EDIT:
 * - Tambah/hapus item di array `links` di bawah.
 * - `label` = teks yang tampil di menu.
 * - `href`  = tujuan tautan. Harus diawali "/" untuk halaman internal.
 * - `children` = daftar submenu (opsional). Isi [] bila item tidak
 *   punya submenu.
 *
 * CATATAN:
 * Jangan menambah halaman ke menu sebelum halaman tersebut benar-benar ada,
 * agar navigasi tidak mengarah ke halaman kosong (README bagian 7).
 */
import educationConfig from "@/config/education";

/**
 * Menu utama Navbar.
 *
 * Setiap item boleh punya `children` (array) untuk menampilkan submenu
 * yang bisa dibuka-tutup di desktop dan mobile.
 *
 * CATATAN:
 * Kelas 10/11/12 tidak ditulis manual di sini, melainkan diambil dari
 * config/education.js agar menu ikut berubah saat kelas ditambah/dihapus.
 */
const jenjang = educationConfig.jenjang[0] ?? null;

const kelasLinks = jenjang
  ? jenjang.kelas.map((kelas) => ({
      label: kelas.nama,
      href: `/${jenjang.slug}/${kelas.slug}`,
    }))
  : [];

const navigationConfig = {
  links: [
    {
      label: "Beranda",
      href: "/",
      children: [],
    },
    {
      label: jenjang ? jenjang.singkatan : "SMK",
      href: jenjang ? `/${jenjang.slug}` : "/smk",
      children: [
        {
          label: `Semua Materi ${jenjang ? jenjang.singkatan : "SMK"}`,
          href: jenjang ? `/${jenjang.slug}` : "/smk",
        },
        ...kelasLinks,
      ],
    },
    {
      label: "Dashboard Guru",
      href: "/guru",
      children: [],
    },
  ],
};

export default navigationConfig;
