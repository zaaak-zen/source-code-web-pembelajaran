/*
 * Route handler tanya AI (/api/tanya)
 *
 * Tanggung jawab: menjawab pertanyaan siswa tentang satu materi menggunakan
 * layanan AI yang kompatibel dengan Chat Completions API.
 *
 * Ini adalah peran AI kedua di Warung Kode: selain menyusun soal kuis
 * (/api/kuis), AI juga menjadi pembantu belajar di halaman materi.
 *
 * Keamanan:
 * - API key hanya dibaca di server, tidak pernah dikirim ke browser.
 * - Riwayat percakapan dibatasi jumlah, panjang, dan total karakternya.
 * - Materi diambil dari database berdasarkan kelas + slug, bukan dari teks
 *   bebas yang dikirim client, sehingga AI tidak bisa diminta membahas topik
 *   di luar materi.
 * - Ada pembatas permintaan sederhana per IP.
 *
 * Hemat token:
 * - Jawaban dibatasi pendek (MAKS_TOKEN_JAWABAN), dan susunannya diatur agar
 *   tetap mendidik: inti jawaban dulu, lalu alasan, lalu satu contoh.
 * - Konteks materi dipilih sesuai pertanyaan, bukan dikirim seluruhnya
 *   (MAKS_KARAKTER_MATERI). Bagian materi yang sama tidak perlu dikirim ulang
 *   pada setiap pertanyaan.
 * - Riwayat yang dikirim ulang dipangkas (MAKS_PESAN, MAKS_TOTAL_KARAKTER).
 */

import { ambilMateri } from "@/lib/materi/kelas";

const BATAS_PER_IP = 40; // per jam
const JENDELA_BATAS = 60 * 60 * 1000;

/*
 * Batas riwayat percakapan.
 *
 * Riwayat dikirim ulang pada SETIAP pertanyaan, jadi bagian inilah yang paling
 * banyak menghabiskan token, bukan prompt sistemnya. Karena itu batasnya
 * dibuat ketat: cukup untuk mengingat beberapa giliran terakhir, tidak lebih.
 * Percakapan yang lebih panjang tetap ditampilkan di browser; yang dipotong
 * hanya yang dikirim ke layanan AI.
 */
const MAKS_PESAN = 4;
const MAKS_PANJANG_PESAN = 600;
const MAKS_TOTAL_KARAKTER = 2400;

/*
 * Jawaban asisten di riwayat dipotong lebih pendek daripada pertanyaan siswa.
 * Pertanyaan pendek biasanya memuat konteks yang masih dibutuhkan, sedangkan
 * jawaban lama panjang dan jarang dirujuk lagi. Jawaban yang sudah terkirim ke
 * siswa tetap utuh di layar; hanya salinan untuk AI yang dipendekkan.
 */
const MAKS_PANJANG_JAWABAN_LAMA = 320;

/** Batas token keluaran. Cukup untuk jawaban singkat, tidak untuk esai. */
const MAKS_TOKEN_JAWABAN = 320;

/*
 * Batas panjang ringkasan materi yang dikirim sebagai konteks.
 *
 * Konteks materi ikut terkirim pada setiap pertanyaan. Tanpa batas, materi
 * yang panjang membuat biaya per pertanyaan ikut membesar. Bagian yang dikirim
 * dipilih yang paling cocok dengan pertanyaan (lihat ringkasMateri), bukan
 * dipotong dari awal begitu saja.
 */
const MAKS_KARAKTER_MATERI = 3500;

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

/**
 * Kata kunci dari pertanyaan siswa, dipakai untuk memilih bagian materi yang
 * paling relevan. Kata pendek dan kata umum dibuang karena tidak membedakan
 * satu bagian materi dari bagian lain.
 */
const KATA_UMUM = new Set([
  "yang", "dan", "atau", "dengan", "untuk", "dari", "pada", "dalam", "adalah",
  "itu", "ini", "apa", "apakah", "bagaimana", "mengapa", "kenapa", "jelaskan",
  "sebutkan", "contoh", "contohnya", "maksud", "arti", "artinya", "bisa",
  "tidak", "ya", "kah", "saja", "juga", "akan", "ada", "kalau", "jika", "saya",
  "aku", "kami", "kita", "kamu", "anda", "nya", "di", "ke", "oleh",
  "sebuah", "suatu", "para", "lebih", "paling", "sudah", "belum", "masih",
]);

function pisahKata(teks) {
  return String(teks ?? "")
    .toLowerCase()
    // Buang tanda baca agar "algoritma?" dan "algoritma" dianggap sama.
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function kataKunci(teks) {
  return new Set(
    pisahKata(teks).filter((kata) => kata.length >= 4 && !KATA_UMUM.has(kata))
  );
}

/**
 * Ringkasan materi sebagai konteks prompt.
 *
 * Konteks ini ikut terkirim pada setiap pertanyaan, jadi ukurannya dibatasi
 * `MAKS_KARAKTER_MATERI`. Kalau dipotong buta dari awal, bagian yang justru
 * ditanyakan siswa bisa hilang dan jawabannya jadi mengarang. Karena itu
 * bagian materi dipilih berdasarkan kecocokan kata dengan pertanyaan:
 * judul, deskripsi, dan tujuan selalu disertakan sebagai kerangka, lalu blok
 * yang paling banyak memuat kata pertanyaan didahulukan. Blok lain diisi
 * selama anggaran karakter masih cukup.
 *
 * Bila tidak ada satu pun kata pertanyaan yang cocok, semua blok dianggap
 * sama relevannya dan diambil dari awal seperti biasa.
 */
function ringkasMateri(materi, pertanyaan = "") {
  const kerangka = [`Judul: ${materi.judul}`];

  if (materi.deskripsi) {
    kerangka.push(`Deskripsi: ${materi.deskripsi}`);
  }

  const blok = [];

  (materi.konten ?? []).forEach((item) => {
    if (item.tipe === "tujuan") {
      kerangka.push(`Tujuan belajar: ${(item.items ?? []).join("; ")}`);
    } else if (item.tipe === "teks") {
      blok.push(`${item.judul ?? "Penjelasan"}: ${item.isi ?? ""}`);
    } else if (item.tipe === "daftar") {
      blok.push(`${item.judul ?? "Daftar"}: ${(item.items ?? []).join("; ")}`);
    } else if (item.tipe === "kode") {
      const bahasa = item.bahasa ? ` (${item.bahasa})` : "";
      blok.push(`Contoh kode${bahasa}:\n${item.isi ?? ""}`);
    } else if (item.tipe === "catatan") {
      blok.push(`Catatan: ${item.isi ?? ""}`);
    }
  });

  const awal = kerangka.join("\n\n");
  const sisaAnggaran = Math.max(0, MAKS_KARAKTER_MATERI - awal.length);

  const kunci = kataKunci(pertanyaan);

  // Nilai kecocokan tiap blok: jumlah kata pertanyaan yang muncul di dalamnya.
  // Dibandingkan per kata utuh, bukan potongan huruf, agar "data" tidak ikut
  // dihitung saat pertanyaan menyebut "metadata".
  const bernilai = blok.map((teks, urutan) => {
    if (kunci.size === 0) return { teks, urutan, nilai: 0 };

    const kataBlok = new Set(pisahKata(teks));
    let nilai = 0;
    for (const kata of kunci) {
      if (kataBlok.has(kata)) nilai += 1;
    }

    return { teks, urutan, nilai };
  });

  // Nilai tinggi dulu; bila sama, urutan asli dipertahankan agar hasilnya
  // stabil dan bagian awal materi tetap diutamakan.
  bernilai.sort((a, b) => b.nilai - a.nilai || a.urutan - b.urutan);

  const dipakai = [];
  let terpakai = 0;

  /*
   * Blok yang tidak muat dilewati, bukan dihentikan: blok kecil yang masih
   * cocok tetap ikut walau blok sebelumnya panjang. Yang dilewati dicatat
   * supaya blok paling relevan bisa dipotong di langkah berikutnya — kalau
   * tidak, satu blok panjang justru menghapus bahan yang ditanyakan.
   */
  let belumMuat = null;

  for (const item of bernilai) {
    // +2 untuk pemisah "\n\n" antar bagian.
    const panjang = item.teks.length + 2;

    if (terpakai + panjang > sisaAnggaran) {
      if (!belumMuat) belumMuat = item;
      continue;
    }

    dipakai.push(item);
    terpakai += panjang;
  }

  /*
   * Blok teratas yang tidak muat dipotong pada batas kata terakhir selama
   * sisanya masih layak dibaca (lebih dari 200 karakter), lalu ditandai
   * terpotong agar AI tidak menyimpulkan kalimatnya selesai.
   */
  const MIN_SISA = 200;
  const PENANDA = " (bagian ini terpotong)";
  const sisa = sisaAnggaran - terpakai - PENANDA.length;

  if (belumMuat && sisa > MIN_SISA) {
    const potong = belumMuat.teks.slice(0, sisa);
    const batasKata = potong.lastIndexOf(" ");
    const teks =
      (batasKata > MIN_SISA ? potong.slice(0, batasKata) : potong).trimEnd() +
      PENANDA;

    dipakai.push({ ...belumMuat, teks });
  }

  // Kembalikan ke urutan asli materi supaya AI membaca alurnya secara wajar.
  dipakai.sort((a, b) => a.urutan - b.urutan);

  return [awal, ...dipakai.map((item) => item.teks)].join("\n\n");
}

function ambilTeksJawaban(pesan) {
  if (typeof pesan?.content === "string") return pesan.content;
  if (Array.isArray(pesan?.content)) {
    return pesan.content.map((bagian) => bagian?.text ?? "").join("");
  }
  return "";
}

/**
 * Merapikan jawaban yang terpotong batas token.
 *
 * Dengan MAKS_TOKEN_JAWABAN yang kecil, jawaban bisa berhenti di tengah
 * kalimat. Kalimat terakhir yang tidak selesai dibuang supaya siswa tidak
 * membaca potongan yang menggantung, dan tidak ada kesan jawabannya rusak.
 * Jawaban yang selesai (finish_reason bukan "length") tidak diubah.
 */
function rapikanJawaban(teks, terpotong) {
  if (!terpotong) return teks;

  const batas = Math.max(
    teks.lastIndexOf(". "),
    teks.lastIndexOf("! "),
    teks.lastIndexOf("? "),
    teks.lastIndexOf(".\n")
  );

  // Tidak ada kalimat utuh: biarkan apa adanya daripada mengembalikan kosong.
  if (batas < 40) return teks;

  return teks.slice(0, batas + 1).trim();
}

// Ubah riwayat dari client menjadi format messages, dengan batas ukuran.
// Mengembalikan null bila tidak ada pertanyaan pengguna yang valid.
function siapkanPesan(riwayat) {
  const pesan = [];

  for (const item of riwayat.slice(-MAKS_PESAN)) {
    const isi = typeof item?.isi === "string" ? item.isi.trim() : "";
    if (!isi) continue;

    const asisten = item?.peran === "asisten";

    pesan.push({
      role: asisten ? "assistant" : "user",
      content: isi.slice(
        0,
        asisten ? MAKS_PANJANG_JAWABAN_LAMA : MAKS_PANJANG_PESAN
      ),
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

  const dataMateri = await ambilMateri(kelas, materi);

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

${ringkasMateri(dataMateri, pesan[pesan.length - 1].content)}

Cara menjawab (penting, ikuti urutannya):
1. Baris pertama: jawaban langsung dalam satu kalimat. Tanpa pembuka, tanpa mengulang pertanyaan.
2. Setelah itu: penjelasan sebab-akibat dalam 2-3 kalimat pendek.
3. Bila membantu, tutup dengan satu contoh konkret atau satu analogi singkat.

Aturan isi:
- Gunakan bahasa Indonesia yang jelas dan sesuai untuk siswa SMK.
- Dasarkan jawaban pada materi di atas. Jika pertanyaan berada di luar cakupan materi, katakan bahwa hal itu di luar materi ini lalu arahkan kembali ke topik yang relevan.
- Jika materi di atas tidak memuat bagian yang ditanyakan, katakan terus terang bahwa bagian itu tidak tercakup, lalu jelaskan bagian yang memang ada.
- Jangan mengarang fakta, dan jangan menambah contoh yang tidak ada di materi. Jika tidak yakin, katakan bahwa Anda tidak yakin.
- Jangan memberikan kunci jawaban kuis; jelaskan konsep dan cara berpikirnya.

Aturan panjang dan bentuk:
- Maksimal sekitar 100 kata. Ini batas keras, bukan saran.
- Dahulukan kata yang paling sering dipakai di materi; hindari istilah teknis tambahan yang tidak ada di materi.
- Bila pertanyaan sederhana, satu-dua kalimat sudah cukup. Jangan menambah latar belakang yang tidak ditanyakan.
- Tulis sebagai teks biasa tanpa simbol markdown (tanpa ##, **, atau tabel).
- Jangan mengulang pertanyaan siswa dan jangan menutup dengan tawaran bantuan.

Aturan privasi:
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
    const pilihan = data?.choices?.[0];
    const mentah = ambilTeksJawaban(pilihan?.message).trim();

    if (!mentah) {
      console.error("Tanya AI: respons tidak memuat jawaban.");
      return respons({ error: "Jawaban gagal disusun. Coba lagi." }, 502);
    }

    // "length" berarti model berhenti karena kehabisan token, bukan selesai.
    const teks = rapikanJawaban(mentah, pilihan?.finish_reason === "length");

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
