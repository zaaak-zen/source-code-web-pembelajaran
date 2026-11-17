"use client";

/*
 * Komponen kuis (Client Component)
 *
 * Tanggung jawab: meminta soal ke /api/kuis, menampilkan pilihan ganda, lalu
 * meminta penilaian ke /api/kuis/nilai.
 *
 * Catatan:
 * - Soal berasal dari bank soal yang dibuat guru, bukan dibuat saat siswa
 *   mengerjakan. Setiap permintaan mengembalikan urutan acak dari bank yang sama.
 * - Kunci jawaban tidak ada di browser; penilaian dilakukan server.
 * - Jumlah soal tidak dikirim dari sini; server membacanya dari bank soal.
 * - Tidak ada akun: siswa memilih namanya dari daftar kelas sebelum mulai.
 *   Bila namanya belum terdaftar, ia boleh mengetiknya (dan nama itu ikut
 *   ditambahkan ke daftar agar konsisten). Nama divalidasi ulang di server
 *   dan dipakai untuk papan skor serta riwayat nilai, bukan untuk login.
 * - Setelah dinilai, server mengembalikan skor, pembahasan, dan papan skor
 *   (satu baris per nama berisi skor terbaik).
 */

import { useMemo, useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCheckCircle,
  IconTarget,
  IconTrophy,
  IconX,
  IconXCircle,
} from "@/components/Icons/Icons";
import PilihSiswa from "@/components/Absen/PilihSiswa";
import styles from "./Kuis.module.css";

export default function Kuis({ kelas, materi, judul, jumlahSoal, daftarSiswa = [] }) {
  const [nama, setNama] = useState("");
  // Dipakai bila nama siswa belum ada di daftar kelas: kolom ketik ditampilkan
  // sebagai ganti pilihan, agar tidak ada siswa yang terhalang mengerjakan.
  const [namaBaru, setNamaBaru] = useState(false);
  // Penanda nama terpilih pada PilihSiswa. Papan skor dan riwayat nilai
  // menyimpan nama, bukan id, jadi nilai pilihan tetap diturunkan dari nama —
  // menyamakan huruf besar/kecilnya agar "budi" dan "Budi" dianggap satu orang.
  const namaTerpilih = useMemo(() => {
    const kunci = nama.trim().toLowerCase();
    if (!kunci) return null;
    return (
      daftarSiswa.find(
        (siswa) => String(siswa?.nama ?? "").trim().toLowerCase() === kunci
      ) ?? null
    );
  }, [daftarSiswa, nama]);
  const [token, setToken] = useState(null);
  const [soal, setSoal] = useState(null);
  const [jawaban, setJawaban] = useState({});
  const [hasil, setHasil] = useState(null);
  const [skor, setSkor] = useState(null);
  const [tersimpan, setTersimpan] = useState(false);
  const [papanSkor, setPapanSkor] = useState(null);
  const [status, setStatus] = useState("idle");
  const [pesan, setPesan] = useState("");
  const [dinilai, setDinilai] = useState(false);
  // Soal yang sedang tampil dalam mode satu-soal-per-layar.
  const [nomor, setNomor] = useState(0);

  function aturUlang() {
    setJawaban({});
    setHasil(null);
    setSkor(null);
    setTersimpan(false);
    setPapanSkor(null);
    setDinilai(false);
    setPesan("");
    setNomor(0);
  }

  async function muatSoal() {
    if (!nama.trim()) return;

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
          nama: nama.trim(),
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
      setPapanSkor(data.papanSkor ?? null);
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
          Soal pilihan ganda disiapkan guru dari materi ini. Urutan soal dan
          pilihan diacak untuk setiap pengerjaan, jadi nomor soalnya bisa
          berbeda dengan teman.
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
              Pilih namamu, jawab semua soal, lalu lihat skor, pembahasan, dan
              papan skor materi ini. Tidak perlu akun.
            </p>
          </div>

          <div className={styles.startForm}>
            {namaBaru || daftarSiswa.length === 0 ? (
              <>
                <label className={styles.namaLabel} htmlFor="kuis-nama">
                  Nama kamu
                </label>
                <input
                  className={styles.namaInput}
                  id="kuis-nama"
                  type="text"
                  value={nama}
                  onChange={(event) => setNama(event.target.value)}
                  maxLength={60}
                  autoComplete="name"
                  placeholder="Contoh: Budi Santoso"
                  aria-describedby="kuis-nama-hint"
                />
              </>
            ) : (
              /*
               * Pencarian nama, sama seperti di halaman absen. Satu kelas bisa
               * berisi puluhan nama, dan menggulir <select> di ponsel jauh
               * lebih lambat daripada mengetik dua-tiga huruf.
               *
               * PilihSiswa menyimpan nilai pilihan lewat prop `nilai` dan
               * melaporkan perubahan lewat onPilih; keduanya memakai id siswa.
               * Kuis hanya memerlukan namanya (dipakai /api/kuis/nilai dan
               * papan skor), jadi `nilai` diisi dari nama yang cocok
               * (namaTerpilih) dan nama itu yang disimpan ke state `nama`.
               * `namaField` tidak dipakai di sini karena Kuis tidak mengirim
               * formulir ke server action.
               */
              <PilihSiswa
                daftarSiswa={daftarSiswa}
                nilai={namaTerpilih?.id ?? ""}
                onPilih={(id, namaDipilih) => setNama(id ? namaDipilih : "")}
                label="Nama kamu"
                pesanKosong="Belum ada nama terdaftar di kelas ini. Ketik nama baru lewat tombol di bawah."
              />
            )}

            <button
              type="button"
              className="btn btnPrimary"
              onClick={muatSoal}
              disabled={!nama.trim()}
            >
              Mulai kuis
              <IconArrowRight size={17} />
            </button>

            {daftarSiswa.length > 0 ? (
              <button
                type="button"
                className="btn btnGhost btnSm"
                onClick={() => {
                  setNamaBaru((nilai) => !nilai);
                  setNama("");
                }}
              >
                {namaBaru
                  ? "Pilih dari daftar nama"
                  : "Nama saya belum ada di daftar"}
              </button>
            ) : null}

            <p className={styles.namaHint} id="kuis-nama-hint">
              {namaBaru || daftarSiswa.length === 0
                ? "Nama ini tampil di papan skor materi dan di riwayat nilaimu, jadi tulis yang benar."
                : "Ketik sebagian namamu lalu pilih dari daftar. Nama ini tampil di papan skor dan riwayat nilaimu."}
            </p>
          </div>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Menyiapkan soal...</p>
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
          {/*
           * Satu soal per layar, seperti kuis game. Saat sudah dinilai, semua
           * soal bisa ditelusuri kembali dengan tombol Sebelumnya/Lanjut untuk
           * membaca pembahasan.
           */}
          <div className={styles.soalNav} aria-hidden="true">
            {soal.map((_, index) => {
              const terjawab = jawaban[index] !== undefined;
              const kunciNav = hasil ? hasil[index] : null;

              return (
                <span
                  key={index}
                  className={[
                    styles.dot,
                    index === nomor ? styles.dotAktif : "",
                    terjawab && !dinilai ? styles.dotTerjawab : "",
                    dinilai && kunciNav?.benar ? styles.dotBenar : "",
                    dinilai && kunciNav && !kunciNav.benar
                      ? styles.dotSalah
                      : "",
                  ]
                    .join(" ")
                    .trim()}
                />
              );
            })}
          </div>

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
              <span className={styles.progressText}>
                Soal {nomor + 1} dari {soal.length}
              </span>
            </div>
          ) : null}

          {soal.map((item, indexSoal) => {
            if (indexSoal !== nomor) return null;

            const jawabanDipilih = jawaban[indexSoal];
            const kunci = hasil ? hasil[indexSoal] : null;
            const benar = dinilai && kunci?.benar;
            const salah = dinilai && kunci && !kunci.benar;

            return (
              <div
                key={indexSoal}
                className={[
                  styles.soalKartu,
                  benar ? styles.soalBenar : "",
                  salah ? styles.soalSalah : "",
                ]
                  .join(" ")
                  .trim()}
              >
                <div className={styles.soalBadge}>
                  <span className={styles.soalBadgeNomor}>
                    {indexSoal + 1}
                  </span>
                  <span className={styles.soalBadgeLabel}>
                    dari {soal.length}
                  </span>
                </div>

                <fieldset className={styles.fieldset} disabled={dinilai}>
                  <legend className={styles.legend}>
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
                            onChange={() => pilih(indexSoal, indexPilihan)}
                          />
                          <span className={styles.opsiLetter}>
                            {String.fromCharCode(65 + indexPilihan)}
                          </span>
                          <span className={styles.opsiText}>{pilihan}</span>
                          {kunciTampil ? (
                            <span className={styles.opsiMark} aria-hidden="true">
                              <IconCheck size={16} />
                            </span>
                          ) : null}
                          {salahPilih ? (
                            <span className={styles.opsiMark} aria-hidden="true">
                              <IconX size={16} />
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {dinilai && kunci ? (
                  <div
                    className={[
                      styles.feedback,
                      kunci.benar ? styles.feedbackBenar : styles.feedbackSalah,
                    ]
                      .join(" ")
                      .trim()}
                    role="status"
                  >
                    <span className={styles.feedbackIkon} aria-hidden="true">
                      {kunci.benar ? (
                        <IconCheckCircle size={26} />
                      ) : (
                        <IconXCircle size={26} />
                      )}
                    </span>
                    <div className={styles.feedbackIsi}>
                      <p className={styles.feedbackJudul}>
                        {kunci.benar
                          ? "Benar!"
                          : `Belum tepat — jawaban benar: ${String.fromCharCode(
                              65 + kunci.jawaban
                            )}`}
                      </p>
                      {kunci.pembahasan ? (
                        <p className={styles.feedbackTeks}>
                          {kunci.pembahasan}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {pesan && !dinilai ? (
            <p className={styles.error} role="alert">
              {pesan}
            </p>
          ) : null}

          {!dinilai ? (
            <div className={styles.aksiBar}>
              <div className={styles.navBar}>
                <button
                  type="button"
                  className="btn btnSecondary"
                  onClick={() => setNomor((n) => Math.max(n - 1, 0))}
                  disabled={nomor === 0}
                >
                  <IconArrowLeft size={16} />
                  Sebelumnya
                </button>

                <div className={styles.navTengah}>
                  {nomor < soal.length - 1 ? (
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={() =>
                        setNomor((n) => Math.min(n + 1, soal.length - 1))
                      }
                      disabled={jawaban[nomor] === undefined}
                    >
                      Lanjut
                      <IconArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btnPrimary"
                      disabled={!semuaDijawab || status === "menilai"}
                    >
                      {status === "menilai" ? "Menilai..." : "Periksa jawaban"}
                    </button>
                  )}
                </div>
              </div>

              {jawaban[nomor] === undefined ? (
                <p className={styles.status}>
                  Pilih satu jawaban untuk melanjutkan.
                </p>
              ) : !semuaDijawab ? (
                <p className={styles.status}>
                  {jumlahDijawab} dari {soal.length} soal sudah dijawab.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              {/* Setelah dinilai, satu soal tetap tampil; tombol ini menelusuri
                  pembahasan tiap soal. */}
              <div className={styles.aksiBar}>
                <div className={styles.navBar}>
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={() => setNomor((n) => Math.max(n - 1, 0))}
                    disabled={nomor === 0}
                  >
                    <IconArrowLeft size={16} />
                    Sebelumnya
                  </button>

                  <span className={styles.navPosisi}>
                    Soal {nomor + 1} / {soal.length}
                  </span>

                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={() =>
                      setNomor((n) => Math.min(n + 1, soal.length - 1))
                    }
                    disabled={nomor >= soal.length - 1}
                  >
                    Lanjut
                    <IconArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.skor} aria-live="polite">
                <div
                  className={styles.skorRing}
                  style={{
                    "--nilai": persenSkor,
                    "--skor-warna":
                      persenSkor >= 80
                        ? "var(--color-success)"
                        : persenSkor >= 60
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                  }}
                  aria-hidden="true"
                >
                  <span className={styles.skorAngka}>
                    {skor?.benar ?? 0}
                    <small>/{skor?.total ?? soal.length}</small>
                  </span>
                </div>

                <div className={styles.skorInfo}>
                  <p className={styles.skorLabel}>
                    {persenSkor === 100
                      ? "Sempurna"
                      : persenSkor >= 80
                        ? "Hebat"
                        : persenSkor >= 60
                          ? "Bagus"
                          : "Ayo coba lagi"}
                  </p>
                  <p className={styles.skorMessage}>
                    {skor && skor.benar === skor.total
                      ? "Semua jawaban benar. Kerja bagus!"
                      : "Pelajari kembali materi lalu coba lagi."}
                  </p>
                  {tersimpan ? (
                    <p className={styles.status}>
                      <span className={styles.saved}>
                        <IconCheckCircle size={15} />
                        Nilai tercatat di papan skor materi ini.
                      </span>
                    </p>
                  ) : (
                    <p className={styles.status}>
                      Skor tidak tersimpan karena layanan nilai belum
                      dikonfigurasi.
                    </p>
                  )}

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
                      Acak ulang soal
                    </button>
                  </div>
                </div>
              </div>

              {papanSkor ? (
                <div className={styles.papanSkor}>
                  <div className={styles.papanSkorHead}>
                    <p className={styles.papanSkorTitle}>
                      <IconTrophy size={17} />
                      Papan skor materi ini
                    </p>
                    {papanSkor.peringkat && papanSkor.totalPeserta > 0 ? (
                      <span className={styles.papanSkorPosisi}>
                        Peringkat kamu {papanSkor.peringkat} dari{" "}
                        {papanSkor.totalPeserta}
                      </span>
                    ) : null}
                  </div>

                  {papanSkor.daftar.length === 0 ? (
                    <p className={styles.papanSkorEmpty}>
                      Belum ada skor di papan. Nilaimu akan tampil setelah
                      tersimpan.
                    </p>
                  ) : (
                    <div className={styles.papanSkorScroll}>
                      <table
                        className={styles.papanSkorTable}
                        aria-label="Papan skor materi ini"
                      >
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Nama</th>
                            <th scope="col">Skor</th>
                            <th scope="col">Persen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {papanSkor.daftar.map((item, index) => {
                            const milikSendiri =
                              String(item.nama ?? "")
                                .trim()
                                .toLowerCase() === nama.trim().toLowerCase();

                            return (
                              <tr
                                key={`${item.nama}-${index}`}
                                className={
                                  milikSendiri ? styles.papanSkorSaya : ""
                                }
                              >
                                <td className={styles.papanSkorNo}>
                                  {index + 1}
                                </td>
                                <th scope="row">
                                  {item.nama}
                                  {milikSendiri ? (
                                    <span className={styles.papanSkorBadge}>
                                      Kamu
                                    </span>
                                  ) : null}
                                </th>
                                <td>
                                  {item.skor}/{item.total}
                                </td>
                                <td>{item.persen}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </form>
      ) : null}
    </section>
  );
}
