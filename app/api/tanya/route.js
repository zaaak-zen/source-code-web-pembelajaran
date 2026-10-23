/*
 * Route handler tanya AI (/api/tanya)
 *
 * Tanggung jawab: menjawab pertanyaan siswa tentang satu materi menggunakan
 * layanan AI yang kompatibel dengan Chat Completions API.
 *
 * Ini adalah peran AI kedua di CodeSpring: selain menyusun soal kuis
 * (/api/kuis), AI juga menjadi pembantu belajar di halaman materi.
 *
 * Keamanan:
 * - API key hanya dibaca di server, tidak pernah dikirim ke browser.
 * - Riwayat percakapan dibatasi jumlah, panjang, dan total karakternya.
 * - Materi diambil dari config/education.js berdasarkan slug, bukan dari
 *   teks bebas yang dikirim client, sehingga AI tidak bisa diminta membahas
 *   topik di luar materi.
 * - Ada pembatas permintaan sederhana per IP.
 */

import { getMateriBySlug } from "@/config/education";

const BATAS_PER_IP = 40; // per jam
const JENDELA_BATAS = 60 * 60 * 1000;
const MAKS_PESAN = 10;
const MAKS_PANJANG_PESAN = 1200;
const MAKS_TOTAL_KARAKTER = 8000;
const MAKS_TOKEN_JAWABAN = 700;

const catatanPermintaan = new Map();

function respons(data, status = 200) {
  return Response.json(data, { status });
}

// Buang catatan IP yang jendelanya sudah lewat agar Map tidak tumbuh terus.
function bersihkanCatatan() {
  const sekarang = Date.now();

  for (const [ip, catatan] of catatanPermintaan) {
    if (sekarang - catatan.mulai > JENDELA_BATAS) catatanPermintaan.delete(ip);
  }
}

function ambilIp(request) {
  // Sama seperti /api/kuis: entri paling kanan ditambahkan proxy terdekat.
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

// Ubah riwayat dari client menjadi format messages, dengan batas ukuran.
// Mengembalikan null bila tidak ada pertanyaan pengguna yang valid.
function siapkanPesan(riwayat) {
  const pesan = [];

  for (const item of riwayat.slice(-MAKS_PESAN)) {
    const isi = typeof item?.isi === "string" ? item.isi.trim() : "";
    if (!isi) continue;

    pesan.push({
      role: item?.peran === "asisten" ? "assistant" : "user",
      content: isi.slice(0, MAKS_PANJANG_PESAN),
    });
  }

  // Buang pesan paling lama bila totalnya melebihi batas, tetapi sisakan
  // pesan terakhir (pertanyaan yang sedang dijawab).
  let total = pesan.reduce((jumlah, item) => jumlah + item.content.length, 0);
  while (pesan.length > 1 && total > MAKS_TOTAL_KARAKTER) {
    total -= pesan[0].content.length;
    pesan.shift();
  }

  if (pesan.length === 0 || pesan[pesan.length - 1].role !== "user") {
    return null;
  }

  return pesan;
}

export async function POST(request) {
  bersihkanCatatan();

  let isiPermintaan;
  try {
    isiPermintaan = await request.json();
  } catch {
    return respons({ error: "Permintaan tidak valid." }, 400);
  }

  const { kelas, materi, riwayat } = isiPermintaan ?? {};

  if (typeof kelas !== "string" || typeof materi !== "string") {
    return respons({ error: "Kelas dan materi wajib diisi." }, 400);
  }

  const dataMateri = getMateriBySlug("smk", kelas, materi);

  if (!dataMateri) {
    return respons({ error: "Materi tidak ditemukan." }, 404);
  }

  if (!Array.isArray(riwayat)) {
    return respons({ error: "Riwayat percakapan tidak valid." }, 400);
  }

  const pesan = siapkanPesan(riwayat);

  if (!pesan) {
    return respons({ error: "Pertanyaan tidak boleh kosong." }, 400);
  }

  const ip = ambilIp(request);

  if (!bolehMeminta(ip)) {
    return respons(
      { error: "Terlalu banyak pertanyaan. Silakan coba lagi nanti." },
      429
    );
  }

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;

  if (!apiKey || !baseUrl || !model) {
    return respons(
      { error: "Layanan AI belum dikonfigurasi. Hubungi pengelola situs." },
      503
    );
  }

  const sistem = `Anda adalah pembantu belajar Informatika untuk siswa SMK. Jawab pertanyaan siswa hanya berdasarkan materi berikut.

${ringkasMateri(dataMateri)}

Aturan:
- Gunakan bahasa Indonesia yang jelas dan sesuai untuk siswa SMK.
- Dasarkan jawaban pada materi di atas. Jika pertanyaan berada di luar cakupan materi, katakan bahwa hal itu di luar materi ini lalu arahkan kembali ke topik yang relevan.
- Jangan mengarang fakta. Jika tidak yakin, katakan bahwa Anda tidak yakin.
- Jangan memberikan kunci jawaban kuis; jelaskan konsep dan cara berpikirnya.
- Jawab ringkas, maksimal sekitar 200 kata. Gunakan daftar bernomor bila membantu.
- Tulis jawaban sebagai teks biasa tanpa simbol markdown (tanpa ##, **, atau tabel).
- Jangan meminta atau menyimpan data pribadi siswa.`;

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
          messages: [{ role: "system", content: sistem }, ...pesan],
          temperature: 0.5,
          max_tokens: MAKS_TOKEN_JAWABAN,
        }),
        signal: AbortSignal.timeout(60000),
        cache: "no-store",
      }
    );

    if (!jawabanAi.ok) {
      console.error(`Tanya AI: layanan mengembalikan status ${jawabanAi.status}.`);
      return respons(
        { error: "Layanan AI sedang bermasalah. Coba lagi." },
        502
      );
    }

    const data = await jawabanAi.json();
    const teks = ambilTeksJawaban(data?.choices?.[0]?.message).trim();

    if (!teks) {
      console.error("Tanya AI: respons tidak memuat jawaban.");
      return respons({ error: "Jawaban gagal disusun. Coba lagi." }, 502);
    }

    return respons({ jawaban: teks });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return respons(
        { error: "Layanan AI terlalu lama merespons. Coba lagi." },
        504
      );
    }

    console.error("Tanya AI: gagal menjawab.", error);
    return respons({ error: "Gagal mendapatkan jawaban. Coba lagi." }, 500);
  }
}
