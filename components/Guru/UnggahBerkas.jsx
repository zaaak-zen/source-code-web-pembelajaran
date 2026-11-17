"use client";

/*
 * Unggah berkas materi (Client Component)
 *
 * Tanggung jawab: memilih berkas PDF/DOCX/PPTX, mengunggahnya ke route
 * /guru/materi/berkas, dan menampilkan daftar berkas yang akan disimpan.
 *
 * Unggahan terjadi segera (bukan saat form disimpan) supaya guru melihat
 * kemajuan per berkas dan form utama tetap ringan. Daftar hasilnya diteruskan
 * ke FormMateri melalui prop `onUbah` dan ikut tersimpan di kolom `berkas`.
 *
 * Berkas yang baru diunggah tetapi dihapus dari daftar langsung dibersihkan
 * dari Storage. Berkas yang sudah tersimpan baru dihapus dari Storage setelah
 * form disimpan (ditangani server action).
 */

import { useState } from "react";
import {
  ACCEPT_BERKAS,
  MAKS_BERKAS,
  MAKS_UKURAN,
  TIPE_BERKAS,
  formatUkuran,
  tipeDariNama,
} from "@/lib/materi/berkas";
import { IconDownload, IconFile, IconX } from "@/components/Icons/Icons";
import styles from "./UnggahBerkas.module.css";

export default function UnggahBerkas({ daftar, onUbah }) {
  const [mengunggah, setMengunggah] = useState(false);
  const [galat, setGalat] = useState("");

  const sisa = Math.max(0, MAKS_BERKAS - daftar.length);

  async function pilih(event) {
    const berkas = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (berkas.length === 0) return;

    if (berkas.length > sisa) {
      setGalat(
        `Maksimal ${MAKS_BERKAS} berkas per materi. Sisa slot: ${sisa}.`
      );
      return;
    }

    for (const file of berkas) {
      if (!tipeDariNama(file.name)) {
        setGalat(
          `"${file.name}" tidak didukung. Gunakan PDF, DOCX, atau PPTX.`
        );
        return;
      }

      if (file.size > MAKS_UKURAN) {
        setGalat(
          `"${file.name}" melebihi ${MAKS_UKURAN / (1024 * 1024)} MB.`
        );
        return;
      }
    }

    const data = new FormData();
    for (const file of berkas) data.append("berkas", file);

    setMengunggah(true);
    setGalat("");

    try {
      const respons = await fetch("/guru/materi/berkas", {
        method: "POST",
        body: data,
      });
      const isi = await respons.json().catch(() => ({}));

      if (!respons.ok) {
        throw new Error(isi.galat || "Berkas gagal diunggah. Coba lagi.");
      }

      const baru = (isi.berkas ?? []).map((item) => ({ ...item, baru: true }));
      onUbah([...daftar, ...baru]);
    } catch (kesalahan) {
      setGalat(kesalahan.message || "Berkas gagal diunggah. Coba lagi.");
    } finally {
      setMengunggah(false);
    }
  }

  function hapus(item) {
    onUbah(daftar.filter((berkas) => berkas.path !== item.path));

    // Berkas yang belum pernah disimpan tidak perlu menunggu form.
    if (item.baru) {
      fetch("/guru/materi/berkas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: item.path }),
      }).catch(() => {});
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <input
          id="materi-berkas"
          className={styles.input}
          type="file"
          accept={ACCEPT_BERKAS}
          multiple
          onChange={pilih}
          disabled={mengunggah || sisa === 0}
        />
        <label
          className={`btn btnSecondary btnSm ${styles.tombolPilih}`}
          htmlFor="materi-berkas"
          aria-disabled={mengunggah || sisa === 0}
        >
          {mengunggah ? "Mengunggah..." : "Pilih berkas"}
        </label>
        <p className={styles.hint}>
          PDF, DOCX, atau PPTX. Maksimal {MAKS_BERKAS} berkas,{" "}
          {MAKS_UKURAN / (1024 * 1024)} MB per berkas. PDF dapat dipratinjau di
          halaman siswa; Word dan PowerPoint hanya diunduh.
        </p>
      </div>

      {galat ? (
        <p className={styles.galat} role="alert">
          {galat}
        </p>
      ) : null}

      {daftar.length === 0 ? (
        <p className={styles.kosong}>Belum ada berkas dilampirkan.</p>
      ) : (
        <ul className={styles.list}>
          {daftar.map((item) => (
            <li key={item.path} className={styles.item}>
              <span className={styles.ikon} aria-hidden="true">
                <IconFile size={20} />
              </span>
              <span className={styles.info}>
                <span className={styles.nama}>{item.nama}</span>
                <span className={styles.meta}>
                  {TIPE_BERKAS[item.tipe]?.label ?? "Berkas"} ·{" "}
                  {formatUkuran(item.ukuran)}
                  {item.baru ? " · belum disimpan" : ""}
                </span>
              </span>
              <button
                className={`btn btnGhost btnSm ${styles.hapus}`}
                type="button"
                onClick={() => hapus(item)}
                aria-label={`Hapus berkas ${item.nama}`}
              >
                <IconX size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.hint}>
        <IconDownload size={13} aria-hidden="true" /> Berkas baru disimpan
        permanen saat tombol simpan materi ditekan.
      </p>
    </div>
  );
}
