"use client";

/*
 * FormulirAbsen (Client Component)
 *
 * Tanggung jawab: membungkus form absensi agar nama siswa yang dipilih bisa
 * disimpan sebagai state di browser. Server action `catatKehadiranSiswa` tetap
 * yang menyimpan kehadiran, dan tetap menerima field yang sama seperti
 * sebelumnya (`kelas`, `lanjut`, `siswaId`, `nama`).
 *
 * Kenapa perlu komponen klien:
 * PilihSiswa menyimpan nama terpilih sebagai state, sedangkan halaman absen
 * adalah Server Component. Tanpa pembungkus ini, pilihan tidak bisa bertahan
 * antar-render dan siswa harus memilih ulang setiap kali daftar berubah.
 *
 * Ada dua cara mengisi identitas, sama seperti sebelumnya:
 * 1. Memilih dari daftar kelas (lewat PilihSiswa).
 * 2. Mengetik nama baru (kolom terpisah), untuk siswa yang belum terdaftar.
 *
 * Keduanya boleh diisi; server memakai pilihan dari daftar bila ada, sehingga
 * perilaku lama tidak berubah.
 *
 * Server action-nya diterima lewat prop `aksi`, bukan diimpor di sini.
 * lib/kelas/absensi.js membaca cookie dan mendefinisikan server action, jadi
 * mengimpornya langsung dari Client Component akan menyeret modul server ke
 * bundel browser dan build gagal. Halaman absen (Server Component) yang
 * mengimpornya, lalu menurunkannya sebagai prop — pola yang sama dipakai
 * komponen klien lain di proyek ini.
 */

import { useState } from "react";
import { IconUser } from "@/components/Icons/Icons";
import PilihSiswa from "./PilihSiswa";

export default function FormulirAbsen({
  kelas,
  lanjut,
  daftarSiswa = [],
  namaKelas = "",
  aksi,
}) {
  const [siswaId, setSiswaId] = useState("");
  const [namaBaru, setNamaBaru] = useState("");

  // Server memprioritaskan siswaId, jadi tombol baru aktif bila salah satunya
  // terisi. Ini mencegah siswa menekan "Saya hadir" tanpa identitas apa pun.
  const bisaKirim = Boolean(siswaId || namaBaru.trim());

  return (
    <form action={aksi}>
      <input type="hidden" name="kelas" value={kelas} />
      <input type="hidden" name="lanjut" value={lanjut} />

      <PilihSiswa
        daftarSiswa={daftarSiswa}
        nilai={siswaId}
        onPilih={(id) => {
          setSiswaId(id);
          // Memilih dari daftar membatalkan nama baru, supaya tidak ada dua
          // identitas terkirim sekaligus.
          if (id) setNamaBaru("");
        }}
        label="Pilih nama"
        namaField="siswaId"
        pesanKosong={`Belum ada nama terdaftar di ${namaKelas || "kelas ini"}. Ketik nama di bawah.`}
        autoFokus
        // Absensi hanya menampilkan satu nama sekaligus, agar daftar nama
        // sekelas tidak terbuka di layar.
        batasTampil={1}
      />

      <div className="authField">
        <label className="authLabel" htmlFor="nama-baru">
          Atau ketik nama baru
        </label>
        <input
          className="authInput"
          id="nama-baru"
          name="nama"
          type="text"
          value={namaBaru}
          onChange={(event) => {
            setNamaBaru(event.target.value);
            // Mengetik nama baru membatalkan pilihan dari daftar, agar yang
            // tersimpan hanya satu identitas.
            if (event.target.value.trim()) setSiswaId("");
          }}
          maxLength={80}
          placeholder="Contoh: Raka Pratama"
          autoComplete="off"
        />
        <p className="authHint">
          Nama baru otomatis ditambahkan ke daftar kelas. Isi kolom ini hanya
          jika nama belum ada di daftar atas.
        </p>
      </div>

      <button className="btn btnPrimary" type="submit" disabled={!bisaKirim}>
        <IconUser size={16} />
        Saya hadir
      </button>
    </form>
  );
}
