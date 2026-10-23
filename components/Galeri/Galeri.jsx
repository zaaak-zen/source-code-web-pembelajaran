"use client";

/*
 * Galeri (carousel foto)
 *
 * Tanggung jawab: menampilkan daftar foto sekolah yang bergeser otomatis
 * dari kiri ke kanan, lengkap dengan tombol navigasi dan jeda otomatis.
 *
 * CARA EDIT:
 * - Daftar foto diatur di config/education.js pada bagian `galeri.foto`.
 * - Simpan file foto di folder public/galeri/, lalu tulis path-nya di config.
 *
 * Catatan perilaku:
 * - Otomatis berhenti saat kursor di atas galeri, saat fokus keyboard berada
 *   di dalam galeri, saat tab browser tidak aktif, atau bila pengguna memilih
 *   "kurangi gerakan" di sistemnya.
 * - Tombol "Jeda otomatis" memberi kontrol eksplisit (WCAG 2.2.2).
 * - Track memakai slide kembar di kedua ujung agar perpindahan tetap mulus
 *   saat kembali ke foto pertama.
 */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconPause,
  IconPlay,
} from "@/components/Icons/Icons";
import styles from "./Galeri.module.css";

const JEDA = 5200; // jarak antar-foto (ms)
const DURASI = 700; // durasi animasi geser (ms), samakan dengan CSS

export default function Galeri({ foto = [], label = "Galeri foto sekolah" }) {
  const jumlah = foto.length;

  // Posisi pada track: 0 = kembaran foto pertama, 1..jumlah = foto asli
  // (urutan terbalik), jumlah + 1 = kembaran foto terakhir.
  const [posisi, setPosisi] = useState(jumlah);
  const [tanpaTransisi, setTanpaTransisi] = useState(false);
  const [berhenti, setBerhenti] = useState(false);
  const [hover, setHover] = useState(false);
  const [fokus, setFokus] = useState(false);
  const [redupGerak, setRedupGerak] = useState(false);
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

  // Setelah slide kembaran tampil, lompat tanpa animasi ke slide asli yang
  // isinya sama. Mata pengguna tidak melihat lompatan karena gambarnya identik.
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

  // Hormati preferensi sistem: kurangi gerakan.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const perbarui = () => setRedupGerak(media.matches);
    perbarui();
    media.addEventListener("change", perbarui);
    return () => media.removeEventListener("change", perbarui);
  }, []);

  // Jangan berjalan saat tab browser tidak terlihat.
  useEffect(() => {
    const perbarui = () => setTersembunyi(document.hidden);
    perbarui();
    document.addEventListener("visibilitychange", perbarui);
    return () => document.removeEventListener("visibilitychange", perbarui);
  }, []);

  const jedaAktif =
    berhenti || hover || fokus || redupGerak || tersembunyi || jumlah < 2;

  useEffect(() => {
    if (jedaAktif) return;

    const timer = setInterval(() => {
      setPosisi((nilai) => Math.max(0, nilai - 1));
    }, JEDA);

    return () => clearInterval(timer);
  }, [jedaAktif, interaksi]);

  function maju() {
    setInteraksi((nilai) => nilai + 1);
    setPosisi((nilai) => Math.max(0, nilai - 1));
  }

  function mundur() {
    setInteraksi((nilai) => nilai + 1);
    setPosisi((nilai) => Math.min(jumlah + 1, nilai + 1));
  }

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
                aria-hidden={indeksTrack !== posisi}
              >
                <Image
                  src={item.src}
                  alt={item.alt || ""}
                  fill
                  sizes="(min-width: 1024px) 1100px, 100vw"
                  unoptimized
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

        <button
          type="button"
          className={`${styles.panah} ${styles.panahKiri}`}
          onClick={mundur}
          aria-label="Foto sebelumnya"
        >
          <IconArrowLeft size={20} />
        </button>

        <button
          type="button"
          className={`${styles.panah} ${styles.panahKanan}`}
          onClick={maju}
          aria-label="Foto berikutnya"
        >
          <IconArrowRight size={20} />
        </button>

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

        <button
          type="button"
          className={styles.jeda}
          onClick={() => setBerhenti((nilai) => !nilai)}
          aria-pressed={berhenti}
        >
          {berhenti ? <IconPlay size={15} /> : <IconPause size={15} />}
          {berhenti ? "Putar otomatis" : "Jeda otomatis"}
        </button>
      </div>
    </div>
  );
}
