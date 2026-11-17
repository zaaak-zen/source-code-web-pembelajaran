/*
 * Footer
 *
 * Tanggung jawab: menampilkan footer yang sama di seluruh halaman.
 *
 * CARA EDIT:
 * - Teks hak cipta diatur di bawah.
 * - Nama website diambil dari config/site.js.
 * - Profil sekolah diambil dari config/education.js.
 * - Kolom tautan mengikuti menu di config/navigation.js.
 * - Tampilan diatur di Footer.module.css.
 *
 * Footer ini Server Component karena tidak ada interaksi pengguna.
 */

import Link from "next/link";
import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import navigationConfig from "@/config/navigation";
import styles from "./Footer.module.css";

export default function Footer() {
  // EDIT: teks di belakang tahun (kosongkan "" jika tidak perlu)
  const rights = "Seluruh hak cipta dilindungi.";

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link
            href="/"
            className={styles.brand}
            aria-label={`${siteConfig.name} — beranda`}
          >
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

        {/*
          Kolom tautan footer disusun otomatis dari config/navigation.js,
          yaitu menu yang sama dengan Navbar. Jadi saat menu navbar berubah,
          footer ikut menyesuaikan tanpa perlu diedit terpisah.
        */}
        <nav className={styles.col} aria-labelledby="footer-jelajahi">
          <h2 className={styles.colTitle} id="footer-jelajahi">
            Tautan
          </h2>
          <ul className={styles.list}>
            {navigationConfig.links.map((item) => (
              <li key={item.href}>
                <Link className={styles.link} href={item.href}>
                  {item.label}
                </Link>
                {item.children?.length ? (
                  <ul className={styles.subList}>
                    {item.children.map((anak) => (
                      <li key={anak.href}>
                        <Link className={styles.subLink} href={anak.href}>
                          {anak.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
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
