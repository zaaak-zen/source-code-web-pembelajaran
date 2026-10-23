import Link from "next/link";
import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import SchoolLogo from "@/components/SchoolLogo/SchoolLogo";
import { IconCheck } from "@/components/Icons/Icons";

/*
 * Layout halaman akun (/login, /register, /lupa-sandi, /reset-sandi).
 *
 * Tanggung jawab: kerangka dua kolom — panel brand di kiri (hanya desktop)
 * dan kartu formulir di kanan. Halaman anak cukup mengembalikan isi kartu.
 */

const MANFAAT = [
  "Materi Informatika SMK yang tersusun per kelas.",
  "Kuis otomatis dengan pembahasan setiap soal.",
  "Pembantu AI untuk bagian yang belum dipahami.",
  "Nilai dan riwayat kehadiran tersimpan rapi.",
];

export default function AuthLayout({ children }) {
  return (
    <main id="main-content" className="authLayout">
      <section className="authShowcase" aria-label="Tentang CodeSpring">
        <div className="authShowcaseInner">
          <Link
            href="/"
            className="authBrand"
            aria-label={`${siteConfig.name} — beranda`}
          >
            <SchoolLogo
              size={40}
              decorative
              className="authBrandMark"
            />
            <span className="authBrandText">
              <span className="authBrandName">{siteConfig.name}</span>
              <span className="authBrandSchool">
                {educationConfig.school.name}
              </span>
            </span>
          </Link>

          <div>
            <p className="authShowcaseTitle">
              Belajar informatika dengan cara yang lebih hidup.
            </p>
            <p className="authShowcaseLead">
              Satu akun untuk menyimpan progres, nilai kuis, dan riwayat
              kehadiranmu.
            </p>
          </div>

          <ul className="authShowcaseList">
            {MANFAAT.map((item) => (
              <li key={item} className="authShowcaseItem">
                <span className="authShowcaseCheck" aria-hidden="true">
                  <IconCheck size={14} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="authPanel">{children}</section>
    </main>
  );
}
