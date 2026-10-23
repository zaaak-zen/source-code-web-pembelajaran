"use client";

/*
 * Navbar
 *
 * Tanggung jawab: menampilkan menu navigasi utama di bagian atas setiap halaman.
 *
 * CARA EDIT:
 * - Menu tidak diubah di file ini. Ubah daftar menu di config/navigation.js.
 * - Nama website diambil dari config/site.js.
 * - Tampilan diatur di Navbar.module.css.
 *
 * Client Component dipakai untuk:
 * - menandai menu yang sedang dibuka (usePathname),
 * - membuka/menutup menu mobile,
 * - menukar tautan "Masuk" menjadi "Dashboard" bila sesi aktif.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import navigationConfig from "@/config/navigation";
import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { IconMenu, IconX, IconArrowRight } from "@/components/Icons/Icons";
import SchoolLogo from "@/components/SchoolLogo/SchoolLogo";
import styles from "./Navbar.module.css";

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, pathname, onClick }) {
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname() ?? "/";
  const [buka, setBuka] = useState(false);
  const [digulir, setDigulir] = useState(false);
  const [sesiAktif, setSesiAktif] = useState(null);

  // Menu utama dari config; tautan akun ditampilkan terpisah sebagai CTA.
  const tautanMenu = navigationConfig.links.filter(
    (link) => link.href !== "/login"
  );

  useEffect(() => {
    function saatGulir() {
      setDigulir(window.scrollY > 8);
    }

    saatGulir();
    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => window.removeEventListener("scroll", saatGulir);
  }, []);

  // Periksa sesi sekali di browser. Bila Supabase belum dikonfigurasi,
  // navbar tetap menampilkan tautan "Masuk".
  useEffect(() => {
    let aktif = true;

    async function periksaSesi() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (aktif) setSesiAktif(Boolean(user));
      } catch {
        if (aktif) setSesiAktif(false);
      }
    }

    periksaSesi();
    return () => {
      aktif = false;
    };
  }, [pathname]);

  // Tutup menu mobile setiap kali halaman berganti.
  useEffect(() => {
    setBuka(false);
  }, [pathname]);

  const tujuanAkun = sesiAktif ? "/dashboard" : "/login";
  const labelAkun = sesiAktif ? "Dashboard" : "Masuk";

  return (
    <header
      className={`${styles.header} ${digulir ? styles.headerScrolled : ""}`}
    >
      <div className={styles.inner}>
        <Link
          href="/"
          className={styles.brand}
          aria-label={`${siteConfig.name} ${educationConfig.school.name} — beranda`}
        >
          <SchoolLogo size={38} decorative className={styles.brandLogo} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{siteConfig.name}</span>
            <span className={styles.brandSchool}>
              {educationConfig.school.name}
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className={styles.links}>
          {tautanMenu.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              pathname={pathname}
            />
          ))}
        </nav>

        <div className={styles.actions}>
          <Link className={styles.cta} href={tujuanAkun}>
            {labelAkun}
            <IconArrowRight size={16} />
          </Link>

          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setBuka((nilai) => !nilai)}
            aria-expanded={buka}
            aria-controls="menu-mobile"
            aria-label={buka ? "Tutup menu" : "Buka menu"}
          >
            {buka ? <IconX size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </div>

      {buka ? (
        <div className={styles.menuPanel} id="menu-mobile">
          <nav aria-label="Navigasi utama (mobile)" className={styles.menuNav}>
            {tautanMenu.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                pathname={pathname}
                onClick={() => setBuka(false)}
              />
            ))}
            <Link
              href={tujuanAkun}
              className={styles.menuAkun}
              onClick={() => setBuka(false)}
            >
              {labelAkun}
              <IconArrowRight size={16} />
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
