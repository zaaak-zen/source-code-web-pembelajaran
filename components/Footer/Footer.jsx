/*
 * Footer
 *
 * Tanggung jawab: menampilkan footer yang sama di seluruh halaman.
 *
 * CARA EDIT:
 * - Teks hak cipta diatur di bawah.
 * - Nama website diambil dari config/site.js.
 * - Daftar kelas diambil otomatis dari config/education.js.
 * - Tampilan diatur di Footer.module.css.
 *
 * Footer ini Server Component karena tidak ada interaksi pengguna.
 */

import Link from "next/link";
import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import SchoolLogo from "@/components/SchoolLogo/SchoolLogo";
import styles from "./Footer.module.css";

export default function Footer() {
  // EDIT: teks di belakang tahun (kosongkan "" jika tidak perlu)
  const rights = "Seluruh hak cipta dilindungi.";
  const jenjang = educationConfig.jenjang[0] ?? null;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link
            href="/"
            className={styles.brand}
            aria-label={`${siteConfig.name} — beranda`}
          >
            <SchoolLogo size={42} decorative className={styles.brandLogo} />
            <span className={styles.brandName}>{siteConfig.name}</span>
          </Link>
          <p className={styles.description}>{siteConfig.description}</p>
          <p className={styles.school}>
            {educationConfig.school.name}
            <span className={styles.schoolAddress}>
              {educationConfig.school.address}
            </span>
          </p>
        </div>

        {jenjang ? (
          <nav className={styles.col} aria-labelledby="footer-belajar">
            <h2 className={styles.colTitle} id="footer-belajar">
              Belajar
            </h2>
            <ul className={styles.list}>
              {jenjang.kelas.map((kelas) => (
                <li key={kelas.slug}>
                  <Link
                    className={styles.link}
                    href={`/${jenjang.slug}/${kelas.slug}`}
                  >
                    {kelas.nama}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <nav className={styles.col} aria-labelledby="footer-akun">
          <h2 className={styles.colTitle} id="footer-akun">
            Akun
          </h2>
          <ul className={styles.list}>
            <li>
              <Link className={styles.link} href="/login">
                Masuk
              </Link>
            </li>
            <li>
              <Link className={styles.link} href="/register">
                Daftar
              </Link>
            </li>
            <li>
              <Link className={styles.link} href="/dashboard">
                Dashboard
              </Link>
            </li>
          </ul>
        </nav>

        <nav className={styles.col} aria-labelledby="footer-jelajahi">
          <h2 className={styles.colTitle} id="footer-jelajahi">
            Jelajahi
          </h2>
          <ul className={styles.list}>
            <li>
              <Link className={styles.link} href="/">
                Beranda
              </Link>
            </li>
            <li>
              <Link className={styles.link} href="/smk">
                Materi SMK
              </Link>
            </li>
            <li>
              <a className={styles.link} href="#main-content">
                Kembali ke atas
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className={styles.bottom}>
        {/* Halaman statis: tahun dicetak saat build, bukan saat browser dibuka. */}
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.name}
          {rights ? `. ${rights}` : "."}
        </p>
      </div>
    </footer>
  );
}
