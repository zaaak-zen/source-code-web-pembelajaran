/*
 * Pembuat soal kuis dengan AI
 *
 * Tanggung jawab: memanggil layanan AI yang kompatibel dengan Chat Completions
 * API untuk menyusun soal dari isi materi.
 *
 * Dipakai HANYA oleh panel guru (/guru/kuis). Siswa tidak lagi memicu pembuatan
 * soal; mereka membaca bank soal yang sudah dibuat guru, sehingga semua siswa
 * menerima soal yang sama.
 *
 * Konfigurasi environment yang dibutuhkan:
 * - AI_API_KEY   : kunci API (rahasia, hanya server)
 * - AI_BASE_URL  : base URL endpoint, tanpa "/chat/completions"
 * - AI_MODEL     : nama model yang dipakai
 */

import { MAX_SOAL, ringkasMateri, validasiSoalAi } from "@/lib/kuis/soal";

const BATAS_WAKTU = 120000;

/** True bila ketiga variabel environment AI sudah diisi. */
export function aiSiap() {
  return Boolean(
    process.env.AI_API_KEY &&
      process.env.AI_BASE_URL &&
      process.env.AI_MODEL
  );
}

function ambilTeksJawaban(pesan) {
  if (typeof pesan?.content === "string") return pesan.content;
  if (Array.isArray(pesan?.content)) {
    return pesan.content.map((bagian) => bagian?.text ?? "").join("");
  }
  return "";
}

function ekstrakHasil(teks) {
  // Model kadang menulis proses berpikir sebelum JSON. Cari objek JSON
  // yang benar-benar memuat array "soal", bukan sekadar brace pertama.
  for (
    let awal = teks.indexOf("{");
    awal !== -1;
    awal = teks.indexOf("{", awal + 1)
  ) {
    for (
      let akhir = teks.lastIndexOf("}");
      akhir > awal;
      akhir = teks.lastIndexOf("}", akhir - 1)
    ) {
      try {
        const hasil = JSON.parse(teks.slice(awal, akhir + 1));
        if (hasil && Array.isArray(hasil.soal)) return hasil;
      } catch {
        // coba kombinasi brace berikutnya
      }
    }
  }
  return null;
}

/**
 * Menyusun soal dari satu materi. Melempar Error berpesan ramah bila gagal.
 * Pemanggil (server action guru) yang mengubahnya menjadi pesan halaman.
 */
export async function buatSoalDariMateri({ materi, jumlahSoal }) {
  if (!aiSiap()) {
    throw new Error("Layanan AI belum dikonfigurasi di server.");
  }

  const jumlah = Number(jumlahSoal);
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAX_SOAL) {
    throw new Error("Jumlah soal belum diatur dengan benar.");
  }

  const ringkasan = ringkasMateri(materi);

  const prompt = `Anda adalah guru Informatika SMK. Susun ${jumlah} soal pilihan ganda berdasarkan materi berikut.

${ringkasan}

Aturan:
- Gunakan bahasa Indonesia yang sesuai untuk siswa SMK.
- Setiap soal memiliki tepat 4 pilihan dan satu jawaban benar.
- Soal menguji pemahaman materi di atas, bukan pengetahuan di luar materi.
- Sertakan pembahasan singkat yang merujuk pada materi.
- Kembalikan hanya JSON valid tanpa penjelasan tambahan, dengan bentuk:
{"soal":[{"pertanyaan":"...","pilihan":["...","...","...","..."],"jawaban":0,"pembahasan":"..."}]}
- Nilai "jawaban" adalah indeks pilihan yang benar (0-3).`;

  let jawabanAi;

  try {
    jawabanAi = await fetch(
      `${process.env.AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL,
          messages: [
            {
              role: "system",
              content:
                "Anda membuat soal kuis yang akurat, jelas, dan sesuai materi.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: Math.min(8000, 1000 + jumlah * 500),
        }),
        signal: AbortSignal.timeout(BATAS_WAKTU),
        cache: "no-store",
      }
    );
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error("Layanan AI terlalu lama merespons. Coba lagi.");
    }
    throw new Error("Gagal menghubungi layanan AI. Coba lagi.");
  }

  if (!jawabanAi.ok) {
    console.error(`Kuis AI: layanan mengembalikan status ${jawabanAi.status}.`);
    throw new Error("Layanan AI sedang bermasalah. Coba lagi.");
  }

  let data;
  try {
    data = await jawabanAi.json();
  } catch {
    throw new Error("Layanan AI mengembalikan respons yang tidak dapat dibaca.");
  }

  const teks = ambilTeksJawaban(data?.choices?.[0]?.message);
  const hasil = ekstrakHasil(teks);

  if (!hasil) {
    console.error("Kuis AI: respons tidak memuat JSON yang valid.");
    throw new Error("Soal gagal disusun. Coba lagi.");
  }

  const soal = validasiSoalAi(hasil, jumlah);

  if (!soal) {
    console.error("Kuis AI: format soal tidak valid.");
    throw new Error("Soal gagal disusun dengan format yang benar. Coba lagi.");
  }

  return { soal };
}
