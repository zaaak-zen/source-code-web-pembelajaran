import Image from "next/image";
import educationConfig from "@/config/education";
import { IconGraduation } from "@/components/Icons/Icons";
import styles from "./SchoolLogo.module.css";

/*
 * SchoolLogo
 *
 * Menampilkan logo sekolah dari config/education.js.
 * - Path logo diatur lewat `school.logo`; file aset disimpan di folder public/.
 * - Bila `school.logo` dikosongkan, komponen memakai ikon wisuda sebagai
 *   pengganti agar tata letak tidak rusak.
 *
 * Gunakan `decorative` bila logo hanya pemanis dan maknanya sudah diwakili
 * teks di sekitarnya (mis. di dalam tautan yang punya aria-label).
 */
export default function SchoolLogo({
  size = 40,
  className = "",
  decorative = false,
}) {
  const { school } = educationConfig;
  const label = school.logoAlt || `Logo ${school.name}`;

  return (
    <span
      className={`${styles.logo} ${className}`}
      style={{ width: size, height: size }}
    >
      {school.logo ? (
        <Image
          src={school.logo}
          alt={decorative ? "" : label}
          width={size}
          height={size}
          unoptimized
          className={styles.image}
        />
      ) : (
        <span className={styles.fallback} aria-hidden="true">
          <IconGraduation size={Math.round(size * 0.52)} />
        </span>
      )}
    </span>
  );
}
