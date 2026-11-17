"use client";

/*
 * Form materi (Client Component)
 *
 * Tanggung jawab: mengisi judul, slug, deskripsi, video, jumlah soal, dan blok
 * konten, lalu mengirim semuanya ke server action simpanMateriAksi.
 *
 * Blok konten disusun sebagai state lokal dan dikirim sebagai satu field JSON
 * (`konten`). Validasi ringan dilakukan di browser agar guru tidak kehilangan
 * isian karena kesalahan yang bisa dicegah; server tetap memvalidasi ulang.
 */

import { useRef, useState } from "react";
import {
  buatSlugMateri,
  blokKosong,
  TIPE_BLOK,
  uraiYoutubeId,
  validasiKonten,
} from "@/lib/materi/konten";
import { normalisasiBerkas } from "@/lib/materi/berkas";
import TombolProses from "@/components/Guru/TombolProses";
import UnggahBerkas from "@/components/Guru/UnggahBerkas";
import styles from "./FormMateri.module.css";

const LABEL_TIPE = {
  tujuan: "Tujuan belajar",
  teks: "Teks / penjelasan",
  daftar: "Daftar",
  kode: "Contoh kode",
  catatan: "Catatan",
};

const POLA_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAKS_SOAL = 20;

function kontenUntukSimpan(daftar) {
  return daftar
    .map((blok) => ({
      tipe: blok.tipe,
      judul: blok.judul.trim(),
      isi: blok.isi.trim(),
      items: blok.items.map((item) => item.trim()).filter(Boolean),
      terurut: Boolean(blok.terurut),
      bahasa: blok.bahasa.trim(),
    }))
    .filter((blok) => {
      if (blok.tipe === "tujuan" || blok.tipe === "daftar") {
        return blok.items.length > 0;
      }
      return blok.isi.length > 0;
    });
}

export default function FormMateri({
  mode = "baru",
  daftarKelas,
  kelasAwal,
  materi,
  aksi,
}) {
  const [kelas, setKelas] = useState(
    materi?.kelas ?? kelasAwal ?? daftarKelas[0]?.slug ?? ""
  );
  const [judul, setJudul] = useState(materi?.judul ?? "");
  const [slug, setSlug] = useState(materi?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(materi));
  const [deskripsi, setDeskripsi] = useState(materi?.deskripsi ?? "");
  const [durasi, setDurasi] = useState(materi?.durasi ?? "");
  const [videoJudul, setVideoJudul] = useState(materi?.video?.judul ?? "");
  const [videoYoutubeId, setVideoYoutubeId] = useState(
    materi?.video?.youtubeId ?? ""
  );
  const [kuisJumlah, setKuisJumlah] = useState(
    String(materi?.kuis?.jumlahSoal ?? 0)
  );
  const [konten, setKonten] = useState(
    materi?.konten?.length
      ? materi.konten.map((blok) => ({
          ...blokKosong(blok.tipe),
          ...blok,
          items: Array.isArray(blok.items) ? blok.items : [],
        }))
      : [blokKosong("teks")]
  );
  const [berkas, setBerkas] = useState(() =>
    normalisasiBerkas(materi?.berkas)
  );
  const [galat, setGalat] = useState("");

  const kontenRef = useRef(null);

  function ubahJudul(nilai) {
    setJudul(nilai);
    if (!slugManual) setSlug(buatSlugMateri(nilai));
  }

  function ubahSlug(nilai) {
    setSlug(nilai.toLowerCase());
    setSlugManual(true);
  }

  function ubahBlok(index, patch) {
    setKonten((sebelumnya) =>
      sebelumnya.map((blok, i) => (i === index ? { ...blok, ...patch } : blok))
    );
  }

  function gantiTipe(index, tipe) {
    setKonten((sebelumnya) =>
      sebelumnya.map((blok, i) =>
        i === index ? blokKosong(tipe) : blok
      )
    );
  }

  function tambahBlok() {
    setKonten((sebelumnya) => [...sebelumnya, blokKosong("teks")]);
  }

  function hapusBlok(index) {
    setKonten((sebelumnya) => sebelumnya.filter((_, i) => i !== index));
  }

  function geserBlok(index, arah) {
    const tujuan = index + arah;
    setKonten((sebelumnya) => {
      if (tujuan < 0 || tujuan >= sebelumnya.length) return sebelumnya;
      const salinan = [...sebelumnya];
      [salinan[index], salinan[tujuan]] = [salinan[tujuan], salinan[index]];
      return salinan;
    });
  }

  function periksa(event) {
    const pesan = [];

    if (!kelas) pesan.push("Pilih kelas.");
    if (!judul.trim()) pesan.push("Judul materi wajib diisi.");

    if (!slug.trim()) {
      pesan.push("Slug wajib diisi.");
    } else if (!POLA_SLUG.test(slug) || slug.length > 60) {
      pesan.push("Slug hanya boleh huruf kecil, angka, dan tanda minus.");
    }

    const jumlah = Number(kuisJumlah);
    if (!Number.isInteger(jumlah) || jumlah < 0 || jumlah > MAKS_SOAL) {
      pesan.push(`Jumlah soal harus 0-${MAKS_SOAL}.`);
    }

    if (videoYoutubeId.trim() && !uraiYoutubeId(videoYoutubeId)) {
      pesan.push("ID atau URL video YouTube tidak valid.");
    }

    const siap = kontenUntukSimpan(konten);
    if (!validasiKonten(siap)) {
      pesan.push(
        "Lengkapi isi setiap blok (tujuan/daftar butuh minimal satu item, blok lain butuh isi)."
      );
    }

    if (pesan.length > 0) {
      event.preventDefault();
      setGalat(pesan.join(" "));
      return;
    }

    setGalat("");
    // Kosongkan blok yang belum diisi sebelum form dikirim.
    if (kontenRef.current) {
      kontenRef.current.value = JSON.stringify(siap);
    }
  }

  return (
    <form className={styles.form} action={aksi} onSubmit={periksa}>
      <input type="hidden" name="mode" value={mode} />
      <input ref={kontenRef} type="hidden" name="konten" defaultValue="[]" />
      <input
        type="hidden"
        name="berkas"
        value={JSON.stringify(
          berkas.map((item) => ({
            id: item.id,
            nama: item.nama,
            path: item.path,
            tipe: item.tipe,
            mime: item.mime,
            ukuran: item.ukuran,
          }))
        )}
        readOnly
      />

      {galat ? (
        <p className="authMessage authMessageError" role="alert">
          {galat}
        </p>
      ) : null}

      <div className={styles.grid}>
        <div className="authField">
          <label className="authLabel" htmlFor="materi-kelas">
            Kelas
          </label>
          {mode === "edit" ? (
            <>
              <input
                className="authInput"
                id="materi-kelas"
                value={
                  daftarKelas.find((item) => item.slug === kelas)?.nama ?? kelas
                }
                readOnly
              />
              <input type="hidden" name="kelas" value={kelas} />
            </>
          ) : (
            <select
              className="authInput"
              id="materi-kelas"
              name="kelas"
              value={kelas}
              onChange={(event) => setKelas(event.target.value)}
            >
              {daftarKelas.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.nama}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="authField">
          <label className="authLabel" htmlFor="materi-judul">
            Judul
          </label>
          <input
            className="authInput"
            id="materi-judul"
            name="judul"
            value={judul}
            onChange={(event) => ubahJudul(event.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div className="authField">
          <label className="authLabel" htmlFor="materi-slug">
            Slug URL
          </label>
          <input
            className="authInput"
            id="materi-slug"
            name="slug"
            value={slug}
            onChange={(event) => ubahSlug(event.target.value)}
            readOnly={mode === "edit"}
            maxLength={60}
            required
          />
          <p className={styles.hint}>
            Alamat: /smk/{kelas || "<kelas>"}/{slug || "<slug>"}
            {mode === "edit" ? " — slug tidak bisa diubah." : ""}
          </p>
        </div>

        <div className="authField">
          <label className="authLabel" htmlFor="materi-durasi">
            Durasi
          </label>
          <input
            className="authInput"
            id="materi-durasi"
            name="durasi"
            value={durasi}
            onChange={(event) => setDurasi(event.target.value)}
            maxLength={40}
            placeholder="Contoh: 2 jam"
          />
        </div>

        <div className="authField">
          <label className="authLabel" htmlFor="materi-kuis">
            Jumlah soal kuis
          </label>
          <input
            className="authInput"
            id="materi-kuis"
            name="kuisJumlah"
            type="number"
            min={0}
            max={MAKS_SOAL}
            value={kuisJumlah}
            onChange={(event) => setKuisJumlah(event.target.value)}
          />
          <p className={styles.hint}>
            0 berarti materi ini tidak menampilkan kuis. Soal tetap disusun atau
            ditulis di menu <strong>Soal kuis</strong>.
          </p>
        </div>
      </div>

      <div className="authField">
        <label className="authLabel" htmlFor="materi-deskripsi">
          Deskripsi singkat
        </label>
        <textarea
          className="authInput"
          id="materi-deskripsi"
          name="deskripsi"
          value={deskripsi}
          onChange={(event) => setDeskripsi(event.target.value)}
          maxLength={400}
          rows={3}
        />
      </div>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Video (opsional)</legend>

        <div className={styles.grid}>
          <div className="authField">
            <label className="authLabel" htmlFor="materi-video-judul">
              Judul video
            </label>
            <input
              className="authInput"
              id="materi-video-judul"
              name="videoJudul"
              value={videoJudul}
              onChange={(event) => setVideoJudul(event.target.value)}
              maxLength={120}
            />
          </div>

          <div className="authField">
            <label className="authLabel" htmlFor="materi-video-id">
              ID atau URL YouTube
            </label>
            <input
              className="authInput"
              id="materi-video-id"
              name="videoYoutubeId"
              value={videoYoutubeId}
              onChange={(event) => setVideoYoutubeId(event.target.value)}
              placeholder="dQw4w9WgXcQ atau https://youtu.be/..."
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Berkas materi (opsional)</legend>

        <p className={styles.hint}>
          Lampirkan modul, slide, atau lembar kerja. Berkas diunggah sekarang,
          lalu disimpan bersama materi saat form ini disimpan.
        </p>

        <UnggahBerkas daftar={berkas} onUbah={setBerkas} />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Isi materi</legend>

        <div className={styles.groupHead}>
          <p className={styles.hint}>
            Susun penjelasan sebagai blok. Urutan blok mengikuti tampilan di
            halaman siswa.
          </p>
          <button
            className="btn btnSecondary btnSm"
            type="button"
            onClick={tambahBlok}
          >
            Tambah blok
          </button>
        </div>

        {konten.length === 0 ? (
          <p className={styles.hint}>
            Belum ada blok isi. Materi tetap bisa disimpan, tetapi halaman siswa
            akan menampilkan pesan &quot;isi sedang disiapkan&quot;.
          </p>
        ) : null}

        <div className={styles.blockList}>
          {konten.map((blok, index) => (
            <fieldset key={index} className={styles.block}>
              <div className={styles.blockHead}>
                <div className="authField">
                  <label className="authLabel" htmlFor={`blok-tipe-${index}`}>
                    Blok {index + 1}
                  </label>
                  <select
                    className="authInput"
                    id={`blok-tipe-${index}`}
                    value={blok.tipe}
                    onChange={(event) => gantiTipe(index, event.target.value)}
                  >
                    {TIPE_BLOK.map((tipe) => (
                      <option key={tipe} value={tipe}>
                        {LABEL_TIPE[tipe]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.blockActions}>
                  <button
                    className="btn btnGhost btnSm"
                    type="button"
                    onClick={() => geserBlok(index, -1)}
                    disabled={index === 0}
                    aria-label="Naikkan blok"
                  >
                    ↑
                  </button>
                  <button
                    className="btn btnGhost btnSm"
                    type="button"
                    onClick={() => geserBlok(index, 1)}
                    disabled={index === konten.length - 1}
                    aria-label="Turunkan blok"
                  >
                    ↓
                  </button>
                  <button
                    className="btn btnGhost btnSm"
                    type="button"
                    onClick={() => hapusBlok(index)}
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {blok.tipe !== "tujuan" && blok.tipe !== "catatan" ? (
                <div className="authField">
                  <label className="authLabel" htmlFor={`blok-judul-${index}`}>
                    Judul blok (opsional)
                  </label>
                  <input
                    className="authInput"
                    id={`blok-judul-${index}`}
                    value={blok.judul}
                    onChange={(event) =>
                      ubahBlok(index, { judul: event.target.value })
                    }
                    maxLength={200}
                  />
                </div>
              ) : null}

              {blok.tipe === "tujuan" || blok.tipe === "daftar" ? (
                <div className="authField">
                  <label className="authLabel" htmlFor={`blok-item-${index}`}>
                    Item (satu per baris)
                  </label>
                  <textarea
                    className="authInput"
                    id={`blok-item-${index}`}
                    value={blok.items.join("\n")}
                    onChange={(event) =>
                      ubahBlok(index, {
                        items: event.target.value.split("\n"),
                      })
                    }
                    rows={4}
                  />
                </div>
              ) : null}

              {blok.tipe === "daftar" ? (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={Boolean(blok.terurut)}
                    onChange={(event) =>
                      ubahBlok(index, { terurut: event.target.checked })
                    }
                  />
                  Tampilkan sebagai daftar bernomor
                </label>
              ) : null}

              {blok.tipe === "kode" ? (
                <div className="authField">
                  <label className="authLabel" htmlFor={`blok-bahasa-${index}`}>
                    Bahasa (opsional)
                  </label>
                  <input
                    className="authInput"
                    id={`blok-bahasa-${index}`}
                    value={blok.bahasa}
                    onChange={(event) =>
                      ubahBlok(index, { bahasa: event.target.value })
                    }
                    maxLength={40}
                    placeholder="Contoh: javascript"
                  />
                </div>
              ) : null}

              {blok.tipe === "teks" ||
              blok.tipe === "kode" ||
              blok.tipe === "catatan" ? (
                <div className="authField">
                  <label className="authLabel" htmlFor={`blok-isi-${index}`}>
                    Isi
                  </label>
                  <textarea
                    className={`authInput ${styles.mono}`}
                    id={`blok-isi-${index}`}
                    value={blok.isi}
                    onChange={(event) =>
                      ubahBlok(index, { isi: event.target.value })
                    }
                    rows={blok.tipe === "kode" ? 8 : 5}
                  />
                </div>
              ) : null}
            </fieldset>
          ))}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <TombolProses
          className="btn btnPrimary"
          labelProses="Menyimpan materi..."
        >
          {mode === "edit" ? "Simpan perubahan" : "Simpan materi"}
        </TombolProses>
      </div>
    </form>
  );
}
