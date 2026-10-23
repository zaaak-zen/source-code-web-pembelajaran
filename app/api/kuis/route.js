/*
 * Route handler kuis AI (/api/kuis)
 *
 * Tanggung jawab: membuat soal pilihan ganda dari isi materi menggunakan
 * layanan AI yang kompatibel dengan Chat Completions API.
 *
 * Keamanan:
 * - API key hanya dibaca di server (process.env), tidak pernah dikirim ke browser.
 * - Jumlah soal diambil dari config/education.js, bukan dari request client,
 *   sehingga siswa tidak bisa meminta soal sebanyak apa pun.
 * - Ada cache 1 jam dan pembatas permintaan sederhana per IP.
 *
 * Konfigurasi environment yang dibutuhkan:
 * - AI_API_KEY   : kunci API (rahasia, hanya server)
 * - AI_BASE_URL  : base URL endpoint, tanpa "/chat/completions"
 * - AI_MODEL     : nama model yang dipakai
 */

import { getMateriBySlug } from "@/config/education";
import { buatTokenKuis } from "@/lib/kuis/token";

const CACHE_TTL = 60 * 60 * 1000; // 1 jam
const MAX_SOAL = 20;
const BATAS_PER_IP = 120; // per jam
const JENDELA_BATAS = 60 * 60 * 1000;

const cacheSoal = new Map();
const catatanPermintaan = new Map();

// Buang entri yang sudah kedaluwarsa agar kedua Map tidak tumbuh terus selama
// proses server hidup. Dijalankan saat permintaan masuk, bukan lewat timer,
// supaya tidak ada pekerjaan latar yang berjalan tanpa permintaan.
function bersihkanCatatan() {
  const sekarang = Date.now();

  for (const [kunci, entri] of cacheSoal) {
    if (sekarang - entri.waktu >= CACHE_TTL) cacheSoal.delete(kunci);
  }

  for (const [ip, catatan] of catatanPermintaan) {
    if (sekarang - catatan.mulai > JENDELA_BATAS) catatanPermintaan.delete(ip);
  }
}

function respons(data, status = 200) {
  return Response.json(data, { status });
}

// Hanya pertanyaan dan pilihan yang dikirim ke browser. Kunci jawaban dan
// pembahasan disimpan di token terenkripsi, lalu dibuka saat penilaian.
function soalPublik(soal) {
  return soal.map(({ pertanyaan, pilihan }) => ({ pertanyaan, pilihan }));
}

function kirimSoal(kelas, materi, soal) {
  const token = buatTokenKuis({ kelas, materi, soal });

  if (!token) {
    return respons(
      { error: "Kuis belum dikonfigurasi. Hubungi pengelola situs." },
      503
    );
  }

  return respons({ token, soal: soalPublik(soal) });
}

function ambilIp(request) {
  // Ambil entri paling kanan dari X-Forwarded-For, karena entri itulah yang
  // ditambahkan oleh reverse proxy terdekat. Entri paling kiri berasal dari
  // klien dan bisa dipalsukan untuk melewati pembatas permintaan.
  // Catatan: ini mengasumsikan deployment berada di belakang proxy yang
  // menambahkan header tersebut. Tanpa proxy, header sepenuhnya dikendalikan
  // klien sehingga pembatas ini hanya bersifat mencegah, bukan pengamanan.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const daftar = forwarded
      .split(",")
      .map((bagian) => bagian.trim())
      .filter(Boolean);
    if (daftar.length > 0) return daftar[daftar.length - 1];
  }

  return request.headers.get("x-real-ip")?.trim() || "tidak-diketahui";
}

// Sidik jari sederhana (FNV-1a) atas isi materi, dipakai di kunci cache agar
// soal lama otomatis tidak terpakai setelah materi diedit.
function sidikTeks(teks) {
  let hash = 2166136261;
  for (let i = 0; i < teks.length; i += 1) {
    hash ^= teks.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function bolehMeminta(ip) {
  const sekarang = Date.now();
  const catatan = catatanPermintaan.get(ip);

  if (!catatan || sekarang - catatan.mulai > JENDELA_BATAS) {
    catatanPermintaan.set(ip, { mulai: sekarang, jumlah: 1 });
    return true;
  }

  if (catatan.jumlah >= BATAS_PER_IP) return false;

  catatan.jumlah += 1;
  return true;
}

function ringkasMateri(materi) {
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
  for (let awal = teks.indexOf("{"); awal !== -1; awal = teks.indexOf("{", awal + 1)) {
    for (let akhir = teks.lastIndexOf("}"); akhir > awal; akhir = teks.lastIndexOf("}", akhir - 1)) {
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

function validasiSoal(hasil, jumlahSoal) {
  if (!hasil || !Array.isArray(hasil.soal)) return null;

  const soal = [];

  for (const item of hasil.soal) {
    if (soal.length >= jumlahSoal) break;

    if (typeof item?.pertanyaan !== "string" || !item.pertanyaan.trim()) {
      continue;
    }
    if (!Array.isArray(item.pilihan) || item.pilihan.length !== 4) {
      continue;
    }
    if (!item.pilihan.every((pilihan) => typeof pilihan === "string" && pilihan.trim())) {
      continue;
    }
    if (!Number.isInteger(item.jawaban) || item.jawaban < 0 || item.jawaban > 3) {
      continue;
    }

    soal.push({
      pertanyaan: item.pertanyaan.trim(),
      pilihan: item.pilihan.map((pilihan) => pilihan.trim()),
      jawaban: item.jawaban,
      pembahasan:
        typeof item.pembahasan === "string" ? item.pembahasan.trim() : "",
    });
  }

  return soal.length === jumlahSoal ? soal : null;
}

export async function POST(request) {
  bersihkanCatatan();

  let isiPermintaan;
  try {
    isiPermintaan = await request.json();
  } catch {
    return respons({ error: "Permintaan tidak valid." }, 400);
  }

  const { kelas, materi } = isiPermintaan ?? {};

  if (typeof kelas !== "string" || typeof materi !== "string") {
    return respons({ error: "Kelas dan materi wajib diisi." }, 400);
  }

  const dataMateri = getMateriBySlug("smk", kelas, materi);

  if (!dataMateri) {
    return respons({ error: "Materi tidak ditemukan." }, 404);
  }

  const jumlahSoal = Number(dataMateri.kuis?.jumlahSoal);

  if (!Number.isInteger(jumlahSoal) || jumlahSoal < 1 || jumlahSoal > MAX_SOAL) {
    return respons(
      { error: "Jumlah soal belum diatur dengan benar oleh guru." },
      400
    );
  }

  const ringkasan = ringkasMateri(dataMateri);
  const kunciCache = `${kelas}/${materi}/${jumlahSoal}/${sidikTeks(ringkasan)}`;
  const tersimpan = cacheSoal.get(kunciCache);

  if (tersimpan && Date.now() - tersimpan.waktu < CACHE_TTL) {
    return kirimSoal(kelas, materi, tersimpan.soal);
  }

  // Pembatas permintaan hanya dihitung untuk permintaan yang benar-benar
  // memanggil layanan AI. Jawaban dari cache tidak memotong kuota siswa lain
  // yang mungkin berbagi satu alamat IP.
  const ip = ambilIp(request);

  if (!bolehMeminta(ip)) {
    return respons(
      { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
      429
    );
  }

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;

  if (!apiKey || !baseUrl || !model) {
    return respons(
      {
        error:
          "Layanan AI belum dikonfigurasi. Hubungi pengelola situs.",
      },
      503
    );
  }

  const prompt = `Anda adalah guru Informatika SMK. Susun ${jumlahSoal} soal pilihan ganda berdasarkan materi berikut.

${ringkasan}

Aturan:
- Gunakan bahasa Indonesia yang sesuai untuk siswa SMK.
- Setiap soal memiliki tepat 4 pilihan dan satu jawaban benar.
- Soal menguji pemahaman materi di atas, bukan pengetahuan di luar materi.
- Sertakan pembahasan singkat yang merujuk pada materi.
- Kembalikan hanya JSON valid tanpa penjelasan tambahan, dengan bentuk:
{"soal":[{"pertanyaan":"...","pilihan":["...","...","...","..."],"jawaban":0,"pembahasan":"..."}]}
- Nilai "jawaban" adalah indeks pilihan yang benar (0-3).`;

  try {
    const jawabanAi = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Anda membuat soal kuis yang akurat, jelas, dan sesuai materi.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: Math.min(8000, 1000 + jumlahSoal * 500),
        }),
        signal: AbortSignal.timeout(120000),
        cache: "no-store",
      }
    );

    if (!jawabanAi.ok) {
      console.error(`Kuis AI: layanan mengembalikan status ${jawabanAi.status}.`);
      return respons(
        { error: "Layanan AI sedang bermasalah. Coba lagi." },
        502
      );
    }

    const data = await jawabanAi.json();
    const teks = ambilTeksJawaban(data?.choices?.[0]?.message);
    const hasil = ekstrakHasil(teks);

    if (!hasil) {
      console.error("Kuis AI: respons tidak memuat JSON yang valid.");
      return respons(
        { error: "Soal gagal disusun. Coba lagi." },
        502
      );
    }

    const soal = validasiSoal(hasil, jumlahSoal);

    if (!soal) {
      console.error("Kuis AI: format soal tidak valid.");
      return respons(
        { error: "Soal gagal disusun dengan format yang benar. Coba lagi." },
        502
      );
    }

    cacheSoal.set(kunciCache, { waktu: Date.now(), soal });

    return kirimSoal(kelas, materi, soal);
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return respons(
        { error: "Layanan AI terlalu lama merespons. Coba lagi." },
        504
      );
    }

    console.error("Kuis AI: gagal membuat soal.", error);
    return respons({ error: "Gagal membuat kuis. Coba lagi." }, 500);
  }
}
