"use client";

/*
 * Komponen kuis (Client Component)
 *
 * Tanggung jawab: meminta soal ke /api/kuis, menampilkan pilihan ganda, lalu
 * meminta penilaian ke /api/kuis/nilai.
 *
 * Catatan:
 * - Kunci jawaban tidak ada di browser; penilaian dilakukan server.
 * - Jumlah soal tidak dikirim dari sini; server membacanya dari config.
 * - Nilai hanya tersimpan bila pengguna sedang masuk.
 */

import { useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconCheckCircle,
  IconTarget,
  IconX,
  IconXCircle,
} from "@/components/Icons/Icons";
import styles from "./Kuis.module.css";

export default function Kuis({ kelas, materi, judul, jumlahSoal }) {
  const [token, setToken] = useState(null);
  const [soal, setSoal] = useState(null);
  const [jawaban, setJawaban] = useState({});
  const [hasil, setHasil] = useState(null);
  const [skor, setSkor] = useState(null);
  const [tersimpan, setTersimpan] = useState(false);
  const [status, setStatus] = useState("idle");
  const [pesan, setPesan] = useState("");
  const [dinilai, setDinilai] = useState(false);

  function aturUlang() {
    setJawaban({});
    setHasil(null);
    setSkor(null);
    setTersimpan(false);
    setDinilai(false);
    setPesan("");
  }

  async function muatSoal() {
    setStatus("loading");
    setPesan("");
    setToken(null);
    setSoal(null);
    aturUlang();

    try {
      const respons = await fetch("/api/kuis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelas, materi }),
      });

      const data = await respons.json().catch(() => ({}));

      if (
        !respons.ok ||
        typeof data.token !== "string" ||
        !Array.isArray(data.soal) ||
        data.soal.length === 0
      ) {
        throw new Error(data.error || "Gagal menyusun soal.");
      }

      setToken(data.token);
      setSoal(data.soal);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setPesan(error.message || "Gagal menyusun soal.");
    }
  }

  function pilih(indexSoal, indexPilihan) {
    if (dinilai) return;
    setJawaban((sebelumnya) => ({
      ...sebelumnya,
      [indexSoal]: indexPilihan,
    }));
  }

  async function periksa(event) {
    event.preventDefault();
    if (!soal || !token) return;

    setStatus("menilai");
    setPesan("");

    try {
      const respons = await fetch("/api/kuis/nilai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          jawaban: soal.map((_, index) => jawaban[index]),
        }),
      });

      const data = await respons.json().catch(() => ({}));

      if (!respons.ok || !Array.isArray(data.hasil)) {
        throw new Error(data.error || "Gagal menilai jawaban.");
      }

      setHasil(data.hasil);
      setSkor({ benar: data.skor, total: data.total });
      setTersimpan(Boolean(data.tersimpan));
      setDinilai(true);
      setStatus("ready");
    } catch (error) {
      setStatus("ready");
      setPesan(error.message || "Gagal menilai jawaban. Coba lagi.");
    }
  }

  const semuaDijawab = soal
    ? soal.every((_, index) => jawaban[index] !== undefined)
    : false;

  const jumlahDijawab = soal
    ? soal.filter((_, index) => jawaban[index] !== undefined).length
    : 0;

  const persenDijawab = soal?.length
    ? Math.round((jumlahDijawab / soal.length) * 100)
    : 0;

  const persenSkor =
    skor && skor.total > 0 ? Math.round((skor.benar / skor.total) * 100) : 0;

  return (
    <section className={styles.kuis} aria-labelledby="kuis-title">
      <header className={styles.header}>
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrow}>
            <IconTarget size={14} />
            Kuis
          </span>
          {soal ? (
            <span className={styles.counter}>
              {jumlahDijawab} / {soal.length} dijawab
            </span>
          ) : (
            <span className={styles.counter}>{jumlahSoal} soal</span>
          )}
        </div>

        <h2 id="kuis-title" className={styles.title}>
          Uji pemahaman: {judul}
        </h2>
        <p className={styles.meta}>
          Soal pilihan ganda disusun otomatis dari materi ini. Periksa kembali
          bila ada yang meragukan.
        </p>
      </header>

      {status === "idle" ? (
        <div className={styles.start}>
          <span className={styles.startIcon} aria-hidden="true">
            <IconTarget size={26} />
          </span>
          <div className={styles.startTextWrap}>
            <p className={styles.startTitle}>{jumlahSoal} soal pilihan ganda</p>
            <p className={styles.startText}>
              Jawab semua soal, lalu lihat skor dan pembahasannya. Bila masuk
              ke akun, nilaimu otomatis tersimpan.
            </p>
          </div>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={muatSoal}
          >
            Mulai kuis
            <IconArrowRight size={17} />
          </button>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Menyusun soal dari materi...</p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className={styles.error} role="alert">
          <p>{pesan}</p>
          <button
            type="button"
            className="btn btnSecondary btnSm"
            onClick={muatSoal}
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      {(status === "ready" || status === "menilai") && soal ? (
        <form onSubmit={periksa}>
          {!dinilai ? (
            <div className={styles.progressRow}>
              <div
                className={styles.progress}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={persenDijawab}
                aria-label="Kemajuan menjawab soal"
              >
                <span
                  className={styles.progressFill}
                  style={{ width: `${persenDijawab}%` }}
                />
              </div>
              <span className={styles.progressText}>{persenDijawab}%</span>
            </div>
          ) : null}

          <ol className={styles.soalList}>
            {soal.map((item, indexSoal) => {
              const jawabanDipilih = jawaban[indexSoal];
              const kunci = hasil ? hasil[indexSoal] : null;
              const benar = dinilai && kunci?.benar;
              const salah = dinilai && kunci && !kunci.benar;

              return (
                <li
                  key={indexSoal}
                  className={[
                    styles.soal,
                    benar ? styles.soalBenar : "",
                    salah ? styles.soalSalah : "",
                  ]
                    .join(" ")
                    .trim()}
                >
                  <fieldset className={styles.fieldset} disabled={dinilai}>
                    <legend className={styles.legend}>
                      <span className={styles.legendIndex}>
                        {indexSoal + 1}
                      </span>
                      <span>{item.pertanyaan}</span>
                    </legend>

                    <div className={styles.pilihan}>
                      {item.pilihan.map((pilihan, indexPilihan) => {
                        const dipilih = jawabanDipilih === indexPilihan;
                        const kunciTampil =
                          dinilai && kunci?.jawaban === indexPilihan;
                        const salahPilih =
                          dinilai &&
                          dipilih &&
                          kunci?.jawaban !== indexPilihan;

                        return (
                          <label
                            key={indexPilihan}
                            className={[
                              styles.opsi,
                              kunciTampil ? styles.opsiBenar : "",
                              salahPilih ? styles.opsiSalah : "",
                              dipilih && !dinilai ? styles.opsiDipilih : "",
                            ]
                              .join(" ")
                              .trim()}
                          >
                            <input
                              type="radio"
                              name={`soal-${indexSoal}`}
                              value={indexPilihan}
                              checked={dipilih}
                              onChange={() =>
                                pilih(indexSoal, indexPilihan)
                              }
                            />
                            <span className={styles.opsiLetter}>
                              {String.fromCharCode(65 + indexPilihan)}
                            </span>
                            <span className={styles.opsiText}>{pilihan}</span>
                            {kunciTampil ? (
                              <span
                                className={styles.opsiMark}
                                aria-hidden="true"
                              >
                                <IconCheck size={16} />
                              </span>
                            ) : null}
                            {salahPilih ? (
                              <span
                                className={styles.opsiMark}
                                aria-hidden="true"
                              >
                                <IconX size={16} />
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {dinilai && kunci ? (
                    <p className={styles.pembahasan}>
                      <span className={styles.pembahasanLabel}>
                        {kunci.benar ? (
                          <>
                            <IconCheckCircle size={15} /> Benar
                          </>
                        ) : (
                          <>
                            <IconXCircle size={15} /> Jawaban benar:{" "}
                            {String.fromCharCode(65 + kunci.jawaban)}
                          </>
                        )}
                      </span>
                      {kunci.pembahasan}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {pesan && !dinilai ? (
            <p className={styles.error} role="alert">
              {pesan}
            </p>
          ) : null}

          {!dinilai ? (
            <div className={styles.aksiBar}>
              <div>
                <button
                  type="submit"
                  className="btn btnPrimary"
                  disabled={!semuaDijawab || status === "menilai"}
                >
                  {status === "menilai"
                    ? "Menilai..."
                    : "Periksa jawaban"}
                </button>
                {!semuaDijawab ? (
                  <p className={styles.status}>
                    Jawab semua soal untuk menilai.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={styles.skor} aria-live="polite">
              <div
                className={styles.skorRing}
                style={{ "--nilai": persenSkor }}
                aria-hidden="true"
              >
                <span className={styles.skorAngka}>
                  {skor?.benar ?? 0}
                  <small>/{skor?.total ?? soal.length}</small>
                </span>
              </div>

              <div className={styles.skorInfo}>
                <p className={styles.skorLabel}>Skor kamu</p>
                <p className={styles.skorMessage}>
                  {skor && skor.benar === skor.total
                    ? "Semua jawaban benar. Kerja bagus!"
                    : "Pelajari kembali materi lalu coba lagi."}
                </p>
                <p className={styles.status}>
                  {tersimpan ? (
                    <span className={styles.saved}>
                      <IconCheckCircle size={15} />
                      Nilai tersimpan di dashboard kamu.
                    </span>
                  ) : (
                    <>
                      <Link href="/login">Masuk</Link> untuk menyimpan nilai
                      dan memantau progres.
                    </>
                  )}
                </p>

                <div className={styles.aksi}>
                  <button
                    type="button"
                    className="btn btnSecondary btnSm"
                    onClick={aturUlang}
                  >
                    Ulangi
                  </button>
                  <button
                    type="button"
                    className="btn btnPrimary btnSm"
                    onClick={muatSoal}
                  >
                    Buat soal baru
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      ) : null}
    </section>
  );
}
