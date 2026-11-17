"use client";

/*
 * PilihSiswa (Client Component)
 *
 * Tanggung jawab: memilih satu nama siswa dari daftar kelas dengan cara
 * mengetik, bukan menggulir dropdown.
 *
 * Kenapa bukan <select> biasa:
 * Satu kelas bisa berisi puluhan nama, dan siswa harus menggulir untuk
 * menemukannya. Dengan pencarian, siswa cukup mengetik dua-tiga huruf. Di
 * ponsel ini jauh lebih cepat karena papan ketik langsung muncul.
 *
 * Mode satu nama (`batasTampil={1}`, dipakai halaman absen) menampilkan satu
 * nama saja sekaligus. Tujuannya agar daftar nama sekelas tidak terbuka di
 * layar siswa lain yang kebetulan memegang perangkat itu. Siswa mengetik
 * namanya, dan yang muncul hanya nama yang paling cocok; bila masih ada nama
 * lain yang cocok, jumlahnya diberitahukan supaya siswa mengetik lebih
 * lengkap. Di mode ini kolom yang masih kosong tidak menampilkan nama siapa
 * pun.
 *
 * Nama kembar: dua siswa di satu kelas boleh bernama sama. Bila nama yang
 * diketik sama persis dengan beberapa siswa, semuanya ditampilkan (melebihi
 * batas tampil) dan diberi peringatan, karena tidak ada pembeda lain di data.
 * Tanpa itu, siswa kedua tidak akan pernah bisa menemukan namanya.
 *
 * Nilai yang dipilih dikirim lewat satu field tersembunyi (bawaannya
 * `siswaId`), sama seperti <select> sebelumnya, sehingga catatKehadiranSiswa()
 * tidak perlu diubah. Siswa yang namanya belum terdaftar memakai kolom nama
 * bebas yang disediakan komponen induk; komponen ini mengirim nilai kosong
 * saat tidak ada nama yang dipilih.
 *
 * Daftar nama hanya dipakai untuk mencocokkan pilihan; tidak ada data siswa
 * lain yang ditampilkan selain nama.
 */

import { useId, useMemo, useState } from "react";
import { IconUser, IconX } from "@/components/Icons/Icons";
import styles from "./PilihSiswa.module.css";

/**
 * Batas bawaan nama yang ditampilkan sekaligus. Daftar penuh tetap disimpan,
 * jadi pencarian tetap menemukan siswa di luar batas ini.
 *
 * Halaman absen memakai batas 1 (lihat `batasTampil`), agar daftar nama
 * sekelas tidak terbuka di layar. Kuis tetap memakai batas ini.
 */
const BATAS_TAMPIL = 8;

export default function PilihSiswa({
  daftarSiswa = [],
  nilai = "",
  onPilih,
  label = "Pilih nama",
  namaField = "siswaId",
  pesanKosong = "Belum ada nama terdaftar. Ketik nama baru di kolom bawah.",
  autoFokus = false,
  batasTampil = BATAS_TAMPIL,
}) {
  const [cari, setCari] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const [sorot, setSorot] = useState(0);

  /*
   * Semua id diambil dari useId() supaya komponen ini aman dipakai lebih dari
   * sekali di satu halaman (misalnya form absen dan form kuis berdampingan).
   * Sebelumnya id kolom ditulis tetap ("siswaId"), dan itu bertabrakan dengan
   * id kolom nama baru di FormulirAbsen.
   */
  const dasarId = useId();
  const idKolom = `${dasarId}-cari`;
  const idDaftar = `${dasarId}-daftar`;

  const terpilih = useMemo(
    () => daftarSiswa.find((siswa) => siswa.id === nilai) ?? null,
    [daftarSiswa, nilai]
  );

  // Mode "satu nama": hanya satu nama tampil dan kolom kosong tidak
  // menampilkan siapa pun. Halaman absen memakainya supaya daftar nama
  // sekelas tidak terbuka di layar.
  const satuNama = batasTampil === 1;

  // Pencocokan tanpa membedakan huruf besar/kecil dan mengabaikan spasi di
  // tepi, karena siswa sering mengetik nama dengan spasi berlebih. Nama null
  // dari database disaring lebih dulu agar toLowerCase() tidak error.
  //
  // Saat kolom masih kosong dan mode satu nama aktif, tidak ada nama yang
  // ditampilkan: menampilkan nama pertama menurut abjad hanya membocorkan satu
  // nama sekelas tanpa alasan.
  const cocok = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return satuNama ? [] : daftarSiswa;

    return daftarSiswa.filter((siswa) =>
      String(siswa?.nama ?? "")
        .toLowerCase()
        .includes(kunci)
    );
  }, [cari, daftarSiswa, satuNama]);

  /*
   * Nama yang sama persis (huruf besar/kecil dan spasi tepi diabaikan).
   *
   * Dua siswa boleh punya nama yang sama di satu kelas. Kalau hanya satu nama
   * yang ditampilkan, siswa kedua tidak akan pernah menemukan namanya, jadi
   * kandidat yang persis sama selalu ditampilkan semuanya — walau itu berarti
   * melebihi `batasTampil`. Nama yang persis juga didahulukan atas nama yang
   * hanya mirip: siswa yang mengetik nama lengkapnya tidak perlu terganggu
   * oleh nama lain yang kebetulan memuat kunci yang sama.
   */
  const cocokPersis = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return [];

    return daftarSiswa.filter(
      (siswa) => String(siswa?.nama ?? "").trim().toLowerCase() === kunci
    );
  }, [cari, daftarSiswa]);

  /*
   * Daftar yang ditampilkan.
   *
   * Mode satu nama: bila ada yang namanya persis sama, hanya mereka yang
   * ditampilkan (bisa lebih dari satu bila namanya kembar); bila tidak ada,
   * satu kandidat teratas. Mode daftar panjang (kuis) tetap seperti semula —
   * potongan daftar cocok, tanpa didahulukan yang persis sama.
   */
  const hasil = useMemo(() => {
    if (!satuNama) return cocok.slice(0, batasTampil);
    if (cocokPersis.length > 0) return cocokPersis;

    return cocok.slice(0, batasTampil);
  }, [satuNama, cocokPersis, cocok, batasTampil]);

  // Berapa nama lain yang juga cocok tapi tidak ditampilkan. Hanya dipakai di
  // mode satu nama, untuk meminta siswa mengetik lebih lengkap tanpa menyebut
  // nama siapa pun.
  const sisanya = cocok.length - hasil.length;

  // Nama ganda: lebih dari satu siswa punya nama persis sama, sehingga
  // pembeda apa pun tidak ada di data. Ditandai agar siswa tidak asal pilih.
  const namaGanda = cocokPersis.length > 1;

  /*
   * Jumlah siswa lain yang namanya sama dengan nama yang sudah dipilih.
   * Peringatan tetap ditampilkan setelah memilih, karena pada nama kembar
   * siswa tidak punya cara memastikan baris mana yang benar — kesalahan baru
   * ketahuan dari rekap guru.
   */
  const kembarTerpilih = terpilih
    ? daftarSiswa.filter(
        (siswa) =>
          siswa.id !== terpilih.id &&
          String(siswa?.nama ?? "").trim().toLowerCase() ===
            String(terpilih.nama ?? "").trim().toLowerCase()
      ).length
    : 0;

  function pilih(siswa) {
    onPilih?.(siswa.id, siswa.nama);
    setCari("");
    setTerbuka(false);
    setSorot(0);
  }

  function lepas() {
    onPilih?.("", "");
    setCari("");
  }

  function padaTombol(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setTerbuka(true);
      // Tanpa daftar (mode satu nama sebelum diketik) sorot tetap 0, bukan -1.
      setSorot((n) =>
        hasil.length === 0 ? 0 : Math.min(n + 1, hasil.length - 1)
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSorot((n) => Math.max(n - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      // Enter memilih nama yang sedang disorot, bukan mengirim formulir, agar
      // siswa tidak terkirim dengan pilihan yang belum lengkap.
      if (terbuka && hasil[sorot]) {
        event.preventDefault();
        pilih(hasil[sorot]);
      }
      return;
    }

    if (event.key === "Escape") {
      setTerbuka(false);
      setCari("");
    }
  }

  return (
    <div className={styles.bungkus}>
      {/* Server action membaca field ini. Nilainya kosong bila siswa memilih
          mengetik nama baru. */}
      <input type="hidden" name={namaField} value={nilai} />

      <div className="authField">
        <label className="authLabel" htmlFor={idKolom}>
          {label}
        </label>

        {terpilih ? (
          <div className={styles.terpilih}>
            <span className={styles.terpilihNama}>
              <IconUser size={15} aria-hidden="true" />
              {terpilih.nama}
            </span>
            <button
              type="button"
              className={styles.lepas}
              onClick={lepas}
              aria-label={`Batalkan pilihan ${terpilih.nama}`}
            >
              <IconX size={15} />
            </button>
          </div>
        ) : (
          <div className={styles.kotakCari}>
            <input
              className="authInput"
              id={idKolom}
              type="text"
              value={cari}
              onChange={(event) => {
                setCari(event.target.value);
                setTerbuka(true);
                setSorot(0);
              }}
              onFocus={() => setTerbuka(true)}
              onKeyDown={padaTombol}
              onBlur={() => {
                // Ditunda agar klik pada daftar sempat diproses sebelum daftar
                // ditutup; tanpa jeda ini, pilihan tidak pernah terdaftar.
                setTimeout(() => setTerbuka(false), 120);
              }}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              autoFocus={autoFokus}
              placeholder="Ketik namamu…"
              role="combobox"
              aria-expanded={terbuka}
              aria-controls={idDaftar}
              aria-autocomplete="list"
            />

            {terbuka ? (
              <ul className={styles.daftar} id={idDaftar} role="listbox">
                {daftarSiswa.length === 0 ? (
                  <li className={styles.kosong}>{pesanKosong}</li>
                ) : satuNama && !cari.trim() ? (
                  <li className={styles.kosong}>
                    Ketik sebagian namamu untuk mencari.
                  </li>
                ) : hasil.length === 0 ? (
                  <li className={styles.kosong}>
                    Nama tidak ditemukan. Gunakan kolom nama baru di bawah.
                  </li>
                ) : (
                  /* role="option" ditaruh pada <li> dan <button> di dalamnya
                     diberi tabIndex -1, karena listbox hanya boleh berisi
                     option langsung. Fokus keyboard tetap di kotak pencarian,
                     jadi tombol tidak perlu menerima Tab sendiri. */
                  hasil.map((siswa, index) => (
                    <li
                      key={siswa.id}
                      role="option"
                      aria-selected={index === sorot}
                      className={`${styles.pilihan} ${
                        index === sorot ? styles.pilihanSorot : ""
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pilih(siswa)}
                      onMouseEnter={() => setSorot(index)}
                    >
                      {siswa.nama}
                      {/* Nama ganda tidak punya pembeda di data, jadi diberi
                          nomor urut agar siswa tahu bahwa pilihannya lebih dari
                          satu. Tetap ambigu bila namanya benar-benar sama;
                          karena itu ada peringatan di bawah daftar. */}
                      {namaGanda ? (
                        <span className={styles.urut}>
                          {" "}
                          ({index + 1} dari {hasil.length})
                        </span>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            {/* Nama lain yang cocok disembunyikan. Hanya berlaku di mode satu
                nama, dan tidak saat yang diketik sudah persis sama dengan
                seorang siswa — nama itu memang sudah tampil, jadi siswa tidak
                perlu diminta mengetik lebih lengkap. Ditaruh di luar listbox
                karena listbox hanya boleh berisi option; namanya pun tidak
                disebut di sini. */}
            {terbuka && satuNama && sisanya > 0 && cocokPersis.length === 0 ? (
              <p className="authHint">
                Masih ada {sisanya} nama lain yang cocok. Ketik nama lebih
                lengkap.
              </p>
            ) : null}

            {/* Dua siswa bernama sama: data tidak menyediakan pembeda apa pun,
                jadi siswa diberi tahu dan diminta memastikan lewat gurunya.
                Tanpa peringatan ini siswa bisa memilih baris yang salah. */}
            {terbuka && namaGanda ? (
              <p className="authHint">
                Ada {hasil.length} siswa bernama sama di kelas ini. Pilih yang
                benar; bila ragu, tanyakan ke guru.
              </p>
            ) : null}
          </div>
        )}

        {!terpilih ? (
          <p className="authHint">
            {daftarSiswa.length === 0
              ? pesanKosong
              : satuNama
                ? "Ketik sebagian namamu, lalu pilih nama yang muncul."
                : `${daftarSiswa.length} nama terdaftar. Ketik sebagian namamu, lalu pilih dari daftar.`}
          </p>
        ) : null}

        {/* Nama yang dipilih ternyata dimiliki lebih dari satu siswa. Tampil
            setelah memilih, karena di sinilah siswa sadar bahwa namanya tidak
            unik di kelas ini. Hanya di mode satu nama: di mode daftar panjang
            (kuis) pembeda ini tidak diperlukan. */}
        {terpilih && satuNama && kembarTerpilih > 0 ? (
          <p className="authHint">
            Ada {kembarTerpilih} siswa lain bernama sama. Bila salah pilih, tekan
            tombol silang lalu pilih nama yang lain. Bila ragu, tanyakan ke guru.
          </p>
        ) : null}
      </div>
    </div>
  );
}
