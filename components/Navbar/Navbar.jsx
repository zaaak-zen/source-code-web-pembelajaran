"use client";

/*
 * Navbar
 *
 * Tanggung jawab: menampilkan menu navigasi utama di bagian atas setiap halaman.
 *
 * CARA EDIT:
 * - Menu tidak diubah di file ini. Ubah daftar menu di config/navigation.js.
 *   Item dengan `children` otomatis jadi menu turun (dropdown).
 * - Nama website diambil dari config/site.js.
 * - Tampilan diatur di Navbar.module.css.
 *
 * Client Component dipakai untuk:
 * - menandai menu yang sedang dibuka (usePathname),
 * - membuka/menutup menu mobile,
 * - menebalkan navbar saat halaman digulir.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChevronDown,
  IconMenu,
  IconX,
  IconArrowRight,
} from "@/components/Icons/Icons";
import navigationConfig from "@/config/navigation";
import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import SchoolLogo from "@/components/SchoolLogo/SchoolLogo";
import styles from "./Navbar.module.css";

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, pathname, onClick, className }) {
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={[
        styles.link,
        active ? styles.linkActive : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {label}
    </Link>
  );
}

/**
 * Satu item menu. Bila punya `children`, item dirender sebagai tombol
 * yang membuka submenu (klik untuk buka-tutup di desktop maupun mobile).
 */
function NavItem({ item, pathname, onNavigate }) {
  const [terbuka, setTerbuka] = useState(false);
  const grupRef = useRef(null);
  const punyaAnak = Array.isArray(item.children) && item.children.length > 0;
  const aktif =
    isActive(pathname, item.href) ||
    (punyaAnak && item.children.some((anak) => isActive(pathname, anak.href)));

  // Tutup submenu saat halaman berganti.
  useEffect(() => {
    setTerbuka(false);
  }, [pathname]);

  // Tutup submenu saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!terbuka) return undefined;

    function saatKlikLuar(event) {
      if (grupRef.current && !grupRef.current.contains(event.target)) {
        setTerbuka(false);
      }
    }

    function saatTekanTombol(event) {
      if (event.key === "Escape") setTerbuka(false);
    }

    document.addEventListener("pointerdown", saatKlikLuar);
    document.addEventListener("keydown", saatTekanTombol);

    return () => {
      document.removeEventListener("pointerdown", saatKlikLuar);
      document.removeEventListener("keydown", saatTekanTombol);
    };
  }, [terbuka]);

  if (!punyaAnak) {
    return (
      <NavLink
        href={item.href}
        label={item.label}
        pathname={pathname}
        onClick={onNavigate}
      />
    );
  }

  return (
    <div className={styles.group} ref={grupRef}>
      <button
        type="button"
        className={[
          styles.link,
          styles.groupToggle,
          aktif ? styles.linkActive : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setTerbuka((nilai) => !nilai)}
        aria-expanded={terbuka}
      >
        {item.label}
        <IconChevronDown
          size={14}
          className={terbuka ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
        />
      </button>

      <div
        className={terbuka ? `${styles.submenu} ${styles.submenuOpen}` : styles.submenu}
      >
        {item.children.map((anak) => (
          <NavLink
            key={anak.href}
            href={anak.href}
            label={anak.label}
            pathname={pathname}
            className={styles.subLink}
            onClick={() => {
              setTerbuka(false);
              if (onNavigate) onNavigate();
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname() ?? "/";
  const [buka, setBuka] = useState(false);
  const [digulir, setDigulir] = useState(false);

  // Menu utama dari config; tautan akun ditampilkan terpisah sebagai CTA.
  const tautanMenu = navigationConfig.links;

  useEffect(() => {
    function saatGulir() {
      setDigulir(window.scrollY > 8);
    }

    saatGulir();
    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => window.removeEventListener("scroll", saatGulir);
  }, []);

  // Tutup menu mobile setiap kali halaman berganti.
  useEffect(() => {
    setBuka(false);
  }, [pathname]);

  // Tidak ada akun: CTA selalu mengarah ke daftar materi.
  const tujuanAkun = "/smk";
  const labelAkun = "Mulai belajar";

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
          {tautanMenu.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
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
            {tautanMenu.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={() => setBuka(false)}
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
