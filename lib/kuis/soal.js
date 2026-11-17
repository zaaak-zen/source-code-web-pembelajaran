/*
 * Utilitas soal kuis
 *
 * Tanggung jawab: menyiapkan ringkasan materi untuk prompt AI, memvalidasi
 * bentuk soal, dan mengacak urutan soal/pilihan untuk setiap siswa.
 *
 * Modul ini tidak memanggil layanan AI dan tidak menyentuh database, sehingga
 * dapat dipakai baik oleh pembuat soal di panel guru maupun oleh /api/kuis.
 */

import { randomInt } from "node:crypto";

export const MAX_SOAL = 20;
export const JUMLAH_PILIHAN = 4;

/** Ringkasan isi materi yang dipakai sebagai konteks prompt AI. */
export function ringkasMateri(materi) {
  const bagian = [`Judul: ${materi.judul}`];

  if (materi.deskripsi) {
    bagian.push(`Deskripsi: ${materi.deskripsi}`);
  }

  (materi.konten ?? []).forEach((blok) => {
    if (blok.tipe === "tujuan") {
      bagian.push(`Tujuan belajar: ${(blok.items ?? []).join("; ")}`);
    } else if (blok.tipe === "teks") {
      bagian.push(`${blok.judul ?? "Penjelasan"}: ${blok.isi ?? ""}`);
    } else if (blok.tipe === "daftar") {
      bagian.push(`${blok.judul ?? "Daftar"}: ${(blok.items ?? []).join("; ")}`);
    } else if (blok.tipe === "kode") {
      const bahasa = blok.bahasa ? ` (${blok.bahasa})` : "";
      bagian.push(`Contoh kode${bahasa}:\n${blok.isi ?? ""}`);
    } else if (blok.tipe === "catatan") {
      bagian.push(`Catatan: ${blok.isi ?? ""}`);
    }
  });

  return bagian.join("\n\n");
}

/**
 * Merapikan satu soal mentah. Mengembalikan null bila bentuknya tidak sah.
 * Aturan yang sama dipakai untuk keluaran AI dan isi database, sehingga data
 * lama yang rusak tidak pernah sampai ke browser.
 */
export function normalisasiSoal(item) {
  if (typeof item?.pertanyaan !== "string" || !item.pertanyaan.trim()) {
    return null;
  }
  if (!Array.isArray(item.pilihan) || item.pilihan.length !== JUMLAH_PILIHAN) {
    return null;
  }
  if (
    !item.pilihan.every(
      (pilihan) => typeof pilihan === "string" && pilihan.trim()
    )
  ) {
    return null;
  }
  if (
    !Number.isInteger(item.jawaban) ||
    item.jawaban < 0 ||
    item.jawaban >= JUMLAH_PILIHAN
  ) {
    return null;
  }

  return {
    pertanyaan: item.pertanyaan.trim(),
    pilihan: item.pilihan.map((pilihan) => pilihan.trim()),
    jawaban: item.jawaban,
    pembahasan:
      typeof item.pembahasan === "string" ? item.pembahasan.trim() : "",
  };
}

/**
 * Memvalidasi keluaran AI: harus tepat sebanyak jumlahSoal yang diminta.
 * Mengembalikan array soal atau null.
 */
export function validasiSoalAi(hasil, jumlahSoal) {
  if (!hasil || !Array.isArray(hasil.soal)) return null;

  const soal = [];

  for (const item of hasil.soal) {
    if (soal.length >= jumlahSoal) break;

    const bersih = normalisasiSoal(item);
    if (bersih) soal.push(bersih);
  }

  return soal.length === jumlahSoal ? soal : null;
}

/**
 * Memvalidasi isi bank soal dari database. Berbeda dengan keluaran AI, jumlah
 * tidak diikat ke config: bila guru mengubah jumlah soal di config setelah bank
 * dibuat, soal yang tersimpan tetap bisa dipakai.
 */
export function validasiBank(soal) {
  if (!Array.isArray(soal)) return null;

  const bersih = soal
    .slice(0, MAX_SOAL)
    .map(normalisasiSoal)
    .filter(Boolean);

  return bersih.length > 0 ? bersih : null;
}

/** Fisher-Yates memakai randomInt agar urutan acak tidak bias. */
function acakDaftar(daftar) {
  const hasil = [...daftar];

  for (let i = hasil.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }

  return hasil;
}

/**
 * Mengacak pilihan jawaban satu soal lalu menggeser indeks kunci jawaban agar
 * tetap menunjuk teks yang sama.
 */
function acakPilihan(soal) {
  const urutan = acakDaftar(soal.pilihan.map((_, index) => index));

  return {
    pertanyaan: soal.pertanyaan,
    pilihan: urutan.map((index) => soal.pilihan[index]),
    jawaban: urutan.indexOf(soal.jawaban),
    pembahasan: soal.pembahasan,
  };
}

/**
 * Urutan soal baru untuk satu pengerjaan: soal diacak, dan pilihan di dalam
 * setiap soal juga diacak. Semua siswa menerima bank soal yang sama, tetapi
 * nomor soal dan huruf jawaban bisa berbeda.
 */
export function acakSoal(soal) {
  return acakDaftar(soal).map(acakPilihan);
}
