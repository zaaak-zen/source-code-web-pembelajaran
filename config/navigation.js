/**
 * Navigation configuration
 *
 * Sumber tunggal untuk menu di Navbar.
 *
 * CARA EDIT:
 * - Tambah/hapus item di array `links` di bawah.
 * - `label` = teks yang tampil di menu.
 * - `href`  = tujuan tautan. Harus diawali "/" untuk halaman internal.
 *
 * CATATAN:
 * Jangan menambah halaman ke menu sebelum halaman tersebut benar-benar ada,
 * agar navigasi tidak mengarah ke halaman kosong (README bagian 7).
 */
const navigationConfig = {
  links: [
    { label: "Beranda", href: "/" },
    { label: "SMK", href: "/smk" },
    { label: "Masuk", href: "/login" },
  ],
};

export default navigationConfig;
