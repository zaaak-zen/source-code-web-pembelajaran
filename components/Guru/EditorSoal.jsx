"use client";

/*
 * Editor soal manual (Client Component)
 *
 * Tanggung jawab: menampilkan sejumlah slot soal sesuai jumlah soal materi,
 * memungkinkan guru menulis pertanyaan, empat pilihan, kunci jawaban, dan
 * pembahasan, lalu mengirim semuanya sebagai satu field JSON.
 *
 * Jumlah slot diikat ke jumlah soal materi supaya jumlah soal yang tampil di
 * halaman siswa sama dengan yang tertulis di materi. Guru yang ingin jumlah
 * berbeda mengubahnya lewat menu Materi terlebih dahulu.
 *
 * Modul lib/kuis/soal.js tidak diimpor di sini karena memakai node:crypto;
 * validasi bentuk soal diulang ringan di browser dan diulang lagi di server.
 */

import { useRef, useState } from "react";
import TombolProses from "@/components/Guru/TombolProses";
import styles from "./EditorSoal.module.css";

const PILIHAN = 4;

function soalKosong() {
  return {
    pertanyaan: "",
    pilihan: Array.from({ length: PILIHAN }, () => ""),
    jawaban: 0,
    pembahasan: "",
  };
}

function rapikan(soal) {
  return {
    pertanyaan: String(soal?.pertanyaan ?? ""),
    pilihan: Array.from({ length: PILIHAN }, (_, index) =>
      String(soal?.pilihan?.[index] ?? "")
    ),
    jawaban:
      Number.isInteger(soal?.jawaban) &&
      soal.jawaban >= 0 &&
      soal.jawaban < PILIHAN
        ? soal.jawaban
        : 0,
    pembahasan: String(soal?.pembahasan ?? ""),
  };
}

function siapkanAwal(awal, jumlah) {
  return Array.from({ length: jumlah }, (_, index) =>
    rapikan(awal?.[index] ?? soalKosong())
  );
}

export default function EditorSoal({
  kelas,
  materi,
  jumlahSoal,
  awal,
  aksi,
}) {
  const jumlah = Math.min(Math.max(Number(jumlahSoal) || 0, 1), 20);

  const [daftar, setDaftar] = useState(() => siapkanAwal(awal, jumlah));
  const [galat, setGalat] = useState("");
  const soalRef = useRef(null);

  function ubahSoal(index, patch) {
    setDaftar((sebelumnya) =>
      sebelumnya.map((soal, i) => (i === index ? { ...soal, ...patch } : soal))
    );
  }

  function ubahPilihan(indexSoal, indexPilihan, nilai) {
    setDaftar((sebelumnya) =>
      sebelumnya.map((soal, i) => {
        if (i !== indexSoal) return soal;
        const pilihan = [...soal.pilihan];
        pilihan[indexPilihan] = nilai;
        return { ...soal, pilihan };
      })
    );
  }

  function geser(index, arah) {
    const tujuan = index + arah;
    setDaftar((sebelumnya) => {
      if (tujuan < 0 || tujuan >= sebelumnya.length) return sebelumnya;
      const salinan = [...sebelumnya];
      [salinan[index], salinan[tujuan]] = [salinan[tujuan], salinan[index]];
      return salinan;
    });
  }

  function periksa(event) {
    for (let i = 0; i < daftar.length; i += 1) {
      const soal = daftar[i];

      if (!soal.pertanyaan.trim()) {
        event.preventDefault();
        setGalat(`Pertanyaan soal ${i + 1} masih kosong.`);
        return;
      }

      const kosong = soal.pilihan.findIndex((pilihan) => !pilihan.trim());
      if (kosong !== -1) {
        event.preventDefault();
        setGalat(
          `Pilihan ${String.fromCharCode(65 + kosong)} pada soal ${i + 1} masih kosong.`
        );
        return;
      }
    }

    setGalat("");
    if (soalRef.current) {
      soalRef.current.value = JSON.stringify(
        daftar.map((soal) => ({
          pertanyaan: soal.pertanyaan.trim(),
          pilihan: soal.pilihan.map((pilihan) => pilihan.trim()),
          jawaban: soal.jawaban,
          pembahasan: soal.pembahasan.trim(),
        }))
      );
    }
  }

  return (
    <form className={styles.form} action={aksi} onSubmit={periksa}>
      <input type="hidden" name="kelas" value={kelas} />
      <input type="hidden" name="materi" value={materi} />
      <input ref={soalRef} type="hidden" name="soal" defaultValue="[]" />

      {galat ? (
        <p className="authMessage authMessageError" role="alert">
          {galat}
        </p>
      ) : null}

      <div className={styles.list}>
        {daftar.map((soal, index) => (
          <fieldset className={styles.card} key={index}>
            <div className={styles.head}>
              <h2 className={styles.title}>Soal {index + 1}</h2>

              <div className={styles.actions}>
                <button
                  className="btn btnGhost btnSm"
                  type="button"
                  onClick={() => geser(index, -1)}
                  disabled={index === 0}
                  aria-label={`Naikkan soal ${index + 1}`}
                >
                  ↑
                </button>
                <button
                  className="btn btnGhost btnSm"
                  type="button"
                  onClick={() => geser(index, 1)}
                  disabled={index === daftar.length - 1}
                  aria-label={`Turunkan soal ${index + 1}`}
                >
                  ↓
                </button>
              </div>
            </div>

            <div className="authField">
              <label className="authLabel" htmlFor={`pertanyaan-${index}`}>
                Pertanyaan
              </label>
              <textarea
                className="authInput"
                id={`pertanyaan-${index}`}
                value={soal.pertanyaan}
                onChange={(event) =>
                  ubahSoal(index, { pertanyaan: event.target.value })
                }
                rows={3}
                placeholder="Tulis pertanyaan pilihan ganda..."
              />
            </div>

            <div className={styles.options}>
              {soal.pilihan.map((pilihan, nomor) => (
                <div className={styles.option} key={nomor}>
                  <input
                    className={styles.radio}
                    type="radio"
                    name={`jawaban-${index}`}
                    checked={soal.jawaban === nomor}
                    onChange={() => ubahSoal(index, { jawaban: nomor })}
                    aria-label={`Tandai pilihan ${String.fromCharCode(65 + nomor)} sebagai jawaban benar`}
                  />
                  <span className={styles.huruf} aria-hidden="true">
                    {String.fromCharCode(65 + nomor)}
                  </span>
                  <input
                    className="authInput"
                    value={pilihan}
                    onChange={(event) =>
                      ubahPilihan(index, nomor, event.target.value)
                    }
                    placeholder={`Pilihan ${String.fromCharCode(65 + nomor)}`}
                    aria-label={`Pilihan ${String.fromCharCode(65 + nomor)} soal ${index + 1}`}
                  />
                </div>
              ))}
            </div>

            <p className={styles.hint}>
              Klik lingkaran di kiri untuk menandai jawaban benar.
            </p>

            <div className="authField">
              <label className="authLabel" htmlFor={`pembahasan-${index}`}>
                Pembahasan (opsional)
              </label>
              <textarea
                className="authInput"
                id={`pembahasan-${index}`}
                value={soal.pembahasan}
                onChange={(event) =>
                  ubahSoal(index, { pembahasan: event.target.value })
                }
                rows={2}
                placeholder="Penjelasan singkat jawaban benar..."
              />
            </div>
          </fieldset>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.hint}>
          Tersedia {jumlah} slot soal, sesuai jumlah soal materi. Soal dan
          pilihan akan diacak otomatis untuk setiap siswa.
        </p>

        <TombolProses
          className="btn btnPrimary"
          labelProses="Menyimpan soal..."
        >
          Simpan soal
        </TombolProses>
      </div>
    </form>
  );
}
