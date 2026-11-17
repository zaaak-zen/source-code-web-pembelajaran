"use client";

/*
 * Galeri (carousel foto)
 *
 * Tanggung jawab: menampilkan daftar foto sekolah yang bergeser otomatis
 * dari kiri ke kanan. Navigasi hanya lewat titik di bawah foto.
 *
 * CARA EDIT:
 * - Daftar foto diatur di config/education.js pada bagian `galeri.foto`.
 * - Simpan file foto di folder public/galeri/, lalu tulis path-nya di config.
 *
 * Catatan perilaku:
 * - Otomatis berhenti saat kursor di atas galeri, saat fokus keyboard berada
 *   di dalam galeri, atau saat tab browser tidak aktif.
 * - Preferensi sistem "kurangi gerakan" sengaja TIDAK diikuti: carousel ini
 *   diminta tetap bergerak walau "Animation effects" dimatikan di Windows,
 *   jadi transisi dan auto-geser tetap hidup. Berhentinya auto-geser tetap
 *   bisa dilakukan pengunjung lewat hover/fokus.
 * - Track memakai slide kembar di kedua ujung agar perpindahan tetap mulus
 *   saat kembali ke foto pertama.
 */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./Galeri.module.css";

const JEDA = 5200; // jarak antar-foto (ms)
const DURASI = 700; // durasi animasi geser (ms), samakan dengan CSS

export default function Galeri({ foto = [], label = "Galeri foto sekolah" }) {
  const jumlah = foto.length;

  // Posisi pada track: 0 = kembaran foto pertama, 1..jumlah = foto asli
  // (urutan terbalik), jumlah + 1 = kembaran foto terakhir.
  const [posisi, setPosisi] = useState(jumlah);
  const [tanpaTransisi, setTanpaTransisi] = useState(false);
  const [hover, setHover] = useState(false);
  const [fokus, setFokus] = useState(false);
  const [tersembunyi, setTersembunyi] = useState(false);
  const [interaksi, setInteraksi] = useState(0);

  const track = useMemo(() => {
    if (jumlah === 0) return [];
    return [foto[0], ...foto.slice().reverse(), foto[jumlah - 1]];
  }, [foto, jumlah]);

  const aktif =
    posisi === 0
      ? 0
      : posisi === jumlah + 1
        ? jumlah - 1
        : jumlah - posisi;

  // Saat posisi menyentuh slide kembar (0 = kembaran foto pertama,
  // jumlah + 1 = kembaran foto terakhir), lompat tanpa animasi ke slide asli
  // yang isinya sama sebelum penonton sempat melihatnya. Karena foto kembar
  // dan foto asli identik, perpindahan ini tidak terlihat oleh mata.
  //
  // Auto-geser sengaja hanya melewati slide asli: dari foto 1 langsung ke
  // slide kembar di ujung kanan (posisi jumlah + 1), bukan ke posisi 0.
  useEffect(() => {
    if (posisi !== 0 && posisi !== jumlah + 1) return;

    let raf1;
    let raf2;
    const timer = setTimeout(() => {
      setTanpaTransisi(true);
      setPosisi(posisi === 0 ? jumlah : 1);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setTanpaTransisi(false));
      });
    }, DURASI);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [posisi, jumlah]);

  // Jangan berjalan saat tab browser tidak terlihat.
  useEffect(() => {
    const perbarui = () => setTersembunyi(document.hidden);
    perbarui();
    document.addEventListener("visibilitychange", perbarui);
    return () => document.removeEventListener("visibilitychange", perbarui);
  }, []);

  // Sengaja TIDAK membaca `prefers-reduced-motion`: carousel ini diminta tetap
  // bergerak walau pengguna mematikan "Animation effects" di sistemnya.
  // Yang tetap dijeda hanya interaksi langsung pengguna (kursor di atas
  // galeri, fokus keyboard di dalamnya) dan tab yang tidak terlihat.
  const jedaAktif = hover || fokus || tersembunyi || jumlah < 2;

  // Auto-geser memakai `setInterval`, jadi penjadwalannya tidak ikut di-reset
  // setiap `posisi` berubah. Ketika posisi mencapai 1 (foto pertama), timer
  // berikutnya mengirim track ke slide kembaran di ujung kanan sekaligus;
  // `tanpaTransisi` di effect bawah membuat perpindahan itu tidak terlihat.
  useEffect(() => {
    if (jedaAktif) return;

    const timer = setInterval(() => {
      setPosisi((nilai) => (nilai <= 1 ? jumlah + 1 : nilai - 1));
    }, JEDA);

    return () => clearInterval(timer);
  }, [jedaAktif, interaksi, jumlah]);

  function keFoto(indeks) {
    setInteraksi((nilai) => nilai + 1);
    setPosisi(jumlah - indeks);
  }

  if (jumlah === 0) return null;

  return (
    <div
      className={styles.galeri}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFokus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFokus(false);
        }
      }}
    >
      <div className={styles.viewport}>
        <div
          className={`${styles.track} ${
            tanpaTransisi ? styles.tanpaTransisi : ""
          }`}
          style={{ transform: `translateX(-${posisi * 100}%)` }}
        >
          {track.map((item, indeksTrack) => {
            // Foto yang sedang dilihat tidak pernah disembunyikan dari pembaca
            // layar, berapa pun posisi track saat itu. `posisi` sesaat bisa
            // bernilai 0 atau jumlah + 1 (slide kembar); slide kembar dianggap
            // mewakili foto aslinya, jadi tidak ada foto yang hilang dari
            // urutan baca.
            const kembarPertama = indeksTrack === 0 && posisi === 0;
            const kembarTerakhir =
              indeksTrack === jumlah + 1 && posisi === jumlah + 1;
            const sedangTampil =
              indeksTrack === posisi || kembarPertama || kembarTerakhir;

            const indeksAsli =
              indeksTrack === 0
                ? 0
                : indeksTrack === jumlah + 1
                  ? jumlah - 1
                  : jumlah - indeksTrack;

            return (
              <figure
                className={styles.slide}
                key={`${item.src}-${indeksTrack}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${indeksAsli + 1} dari ${jumlah}`}
                aria-hidden={!sedangTampil}
              >
                <Image
                  src={item.src}
                  alt={item.alt || ""}
                  fill
                  sizes="(min-width: 1024px) 1100px, 100vw"
                  draggable={false}
                  className={styles.gambar}
                />

                {item.caption ? (
                  <figcaption className={styles.keterangan}>
                    <span className={styles.keteranganJudul}>
                      {item.caption}
                    </span>
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>

        <p className={styles.status}>
          Foto {aktif + 1} dari {jumlah}
        </p>
      </div>

      <div className={styles.kontrol}>
        <div className={styles.titik}>
          {foto.map((item, indeks) => (
            <button
              key={`${item.src}-${indeks}`}
              type="button"
              className={`${styles.dot} ${
                indeks === aktif ? styles.dotAktif : ""
              }`}
              onClick={() => keFoto(indeks)}
              aria-label={`Tampilkan foto ${indeks + 1}${
                item.caption ? `: ${item.caption}` : ""
              }`}
              aria-current={indeks === aktif ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
