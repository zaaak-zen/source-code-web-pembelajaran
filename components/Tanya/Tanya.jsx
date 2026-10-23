"use client";

/*
 * Komponen tanya AI (Client Component)
 *
 * Tanggung jawab: mengirim pertanyaan siswa ke /api/tanya dan menampilkan
 * jawaban AI sebagai percakapan singkat.
 *
 * Catatan:
 * - AI hanya menjawab berdasarkan materi yang sedang dibuka; slug kelas dan
 *   materi dikirim ke server, bukan isi materi.
 * - Riwayat dibatasi server, jadi percakapan yang terlalu panjang tidak
 *   membebani layanan AI.
 */

import { useEffect, useRef, useState } from "react";
import {
  IconChat,
  IconSend,
  IconSparkles,
} from "@/components/Icons/Icons";
import styles from "./Tanya.module.css";

const SARAN = [
  "Jelaskan materi ini dengan contoh sederhana.",
  "Bagian mana yang paling penting untuk diingat?",
  "Apa kesalahan umum saat mempelajari materi ini?",
];

export default function Tanya({ kelas, materi, judul }) {
  const [percakapan, setPercakapan] = useState([]);
  const [teks, setTeks] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  const akhirRef = useRef(null);

  // Gulir ke pesan terbaru tanpa menggeser seluruh halaman.
  useEffect(() => {
    const node = akhirRef.current;
    if (!node) return;

    const kurangGerak =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    node.scrollIntoView({
      block: "nearest",
      behavior: kurangGerak ? "auto" : "smooth",
    });
  }, [percakapan, memuat]);

  async function kirim(event) {
    event.preventDefault();

    const pertanyaan = teks.trim();
    if (!pertanyaan || memuat) return;

    const riwayat = [...percakapan, { peran: "pengguna", isi: pertanyaan }];

    setPercakapan(riwayat);
    setTeks("");
    setGalat("");
    setMemuat(true);

    try {
      const respons = await fetch("/api/tanya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelas, materi, riwayat }),
      });

      const data = await respons.json().catch(() => ({}));

      if (!respons.ok || typeof data.jawaban !== "string") {
        throw new Error(data.error || "Gagal mendapatkan jawaban.");
      }

      setPercakapan((sebelumnya) => [
        ...sebelumnya,
        { peran: "asisten", isi: data.jawaban },
      ]);
    } catch (error) {
      setGalat(error.message || "Gagal mendapatkan jawaban. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  function aturUlang() {
    if (memuat) return;
    setPercakapan([]);
    setTeks("");
    setGalat("");
  }

  function saatTombol(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      kirim(event);
    }
  }

  return (
    <section className={styles.tanya} aria-labelledby="tanya-title">
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          <IconSparkles size={14} />
          Pembantu belajar
        </span>
        <h2 id="tanya-title" className={styles.title}>
          Tanya AI tentang {judul}
        </h2>
        <p className={styles.meta}>
          AI menjawab berdasarkan isi materi ini. Jawaban bisa keliru, jadi
          periksa kembali dengan materi dan penjelasan guru.
        </p>
      </header>

      {percakapan.length === 0 && !memuat ? (
        <div className={styles.kosong}>
          <span className={styles.kosongIcon} aria-hidden="true">
            <IconChat size={24} />
          </span>
          <p className={styles.kosongTitle}>Belum ada pertanyaan</p>
          <p className={styles.status}>
            Mulai dengan salah satu contoh berikut.
          </p>
          <div className={styles.saran}>
            {SARAN.map((contoh) => (
              <button
                key={contoh}
                type="button"
                className={styles.saranTombol}
                onClick={() => setTeks(contoh)}
              >
                {contoh}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className={styles.daftar} aria-live="polite">
          {percakapan.map((item, index) => {
            const pengguna = item.peran === "pengguna";

            return (
              <li
                key={index}
                className={`${styles.baris} ${
                  pengguna ? styles.barisPengguna : styles.barisAsisten
                }`}
              >
                <span
                  className={`${styles.avatar} ${
                    pengguna ? styles.avatarPengguna : styles.avatarAI
                  }`}
                  aria-hidden="true"
                >
                  {pengguna ? "A" : <IconSparkles size={15} />}
                </span>
                <div className={styles.bubbleWrap}>
                  <p className={styles.pesanLabel}>
                    {pengguna ? "Anda" : "AI"}
                  </p>
                  <p
                    className={`${styles.pesan} ${
                      pengguna ? styles.pesanPengguna : styles.pesanAsisten
                    }`}
                  >
                    {item.isi}
                  </p>
                </div>
              </li>
            );
          })}

          {memuat ? (
            <li className={`${styles.baris} ${styles.barisAsisten}`}>
              <span
                className={`${styles.avatar} ${styles.avatarAI}`}
                aria-hidden="true"
              >
                <IconSparkles size={15} />
              </span>
              <div className={styles.bubbleWrap}>
                <p className={styles.pesanLabel}>AI</p>
                <p className={styles.pesanMenunggu} role="status">
                  Menyusun jawaban
                  <span className={styles.titik} aria-hidden="true" />
                  <span className={styles.titik} aria-hidden="true" />
                  <span className={styles.titik} aria-hidden="true" />
                </p>
              </div>
            </li>
          ) : null}

          <li ref={akhirRef} aria-hidden="true" />
        </ol>
      )}

      {galat ? (
        <p className={styles.galat} role="alert">
          {galat}
        </p>
      ) : null}

      <form className={styles.form} onSubmit={kirim}>
        <label className={styles.labelTersembunyi} htmlFor="tanya-pertanyaan">
          Pertanyaan untuk AI
        </label>

        <div className={styles.composer}>
          <textarea
            className={styles.input}
            id="tanya-pertanyaan"
            name="pertanyaan"
            rows={2}
            maxLength={1000}
            placeholder="Tanyakan sesuatu tentang materi ini..."
            value={teks}
            onChange={(event) => setTeks(event.target.value)}
            onKeyDown={saatTombol}
            disabled={memuat}
          />

          <button
            className={styles.kirim}
            type="submit"
            disabled={memuat || !teks.trim()}
            aria-label="Kirim pertanyaan"
          >
            <IconSend size={18} />
          </button>
        </div>

        <div className={styles.formFoot}>
          {percakapan.length > 0 ? (
            <button
              type="button"
              className={styles.reset}
              onClick={aturUlang}
              disabled={memuat}
            >
              Mulai ulang
            </button>
          ) : (
            <span className={styles.hint}>
              Enter untuk kirim, Shift + Enter untuk baris baru.
            </span>
          )}

          <span className={styles.panjang}>{teks.length}/1000</span>
        </div>
      </form>
    </section>
  );
}
