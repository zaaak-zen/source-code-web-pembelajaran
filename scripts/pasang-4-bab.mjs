/*
 * Pasang 4 bab buku Informatika Kelas X sebagai materi kelas 10.
 *
 * Tiap bab jadi satu baris `materi`, dengan PDF bab itu sebagai lampiran.
 * Teks bab dimasukkan ke `konten` HANYA bila data/bab-teks.json sudah ada
 * (dibuat skrip siapkan-bab.py --simpan). Bila belum ada, materi tetap dipasang
 * dengan daftar subbab dari Daftar Isi buku, dan kuis dimatikan (0) sampai
 * guru menyiapkan bahan soalnya.
 *
 * Yang dilakukan:
 * 1. Unggah 4 PDF bab dari materi/ ke bucket `materi` (Storage).
 * 2. Upsert 4 baris `materi` kelas 10 — konten, jumlah soal, dan berkasnya
 *    DITIMPA dengan versi dari skrip ini.
 * 3. Hapus baris kelas 10 lain beserta bank soal + berkasnya di Storage.
 * 4. Hapus berkas lama milik baris yang di-upsert (PDF lamanya diganti).
 *
 * Aman dijalankan berulang: baris di-upsert per slug dan berkas lama dibuang.
 * Karena `konten` dan `kuis_jumlah` ikut ditimpa, suntingan yang dibuat lewat
 * /guru/materi akan hilang — dry run menampilkan peringatannya lebih dulu.
 * Bila hanya ingin mengganti PDF, lakukan lewat /guru/materi agar suntingan
 * materi tidak tersentuh.
 *
 * Pakai (dari root proyek):
 *   node scripts/pasang-4-bab.mjs             -> tampilkan rencana (dry run)
 *   node scripts/pasang-4-bab.mjs --jalankan  -> terapkan
 *   node scripts/pasang-4-bab.mjs --jalankan --pakai-teks
 *
 * Catatan Windows: tidak memakai process.exit(), karena memanggilnya saat
 * koneksi HTTP Supabase masih menutup memicu assertion libuv.
 */
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const arg = process.argv.slice(2);
const JALANKAN = arg.includes("--jalankan");
const PAKAI_TEKS = arg.includes("--pakai-teks");

const KELAS = "10";
const BUCKET = "materi";
const JUMLAH_SOAL = 5;

const BAB = [
  {
    nomor: 1,
    slug: "informatika-bab-1",
    judul: "Bab 1 — Data, Informasi, dan Validasinya",
    berkas: "Bab_1_Data_Informasi_dan_Validasinya.pdf",
    deskripsi:
      "Data, informasi, dan cara memvalidasinya: pencarian dengan banyak variabel, koleksi data, ekosistem periksa fakta, serta evaluasi data dan sumbernya.",
    subbab: [
      "A. Pencarian dengan Banyak Variabel",
      "B. Koleksi Data",
      "C. Ekosistem Periksa Fakta",
      "D. Evaluasi Data dan Sumbernya",
    ],
  },
  {
    nomor: 2,
    slug: "informatika-bab-2",
    judul: "Bab 2 — Algoritma dan Struktur Data",
    berkas: "Bab_2_Algoritma_dan_Struktur_Data.pdf",
    deskripsi:
      "Algoritma dan pemrograman, struktur kendali, pemilihan algoritma, dan pemilihan struktur data untuk masalah nyata.",
    subbab: [
      "A. Mengenal Algoritma dan Pemrograman",
      "B. Membuat Program Sesuai Struktur Kendalinya",
      "C. Memilih Algoritma untuk Masalah di Kehidupan Nyata",
      "D. Memilih Struktur Data untuk Masalah di Kehidupan Nyata",
    ],
  },
  {
    nomor: 3,
    slug: "informatika-bab-3",
    judul: "Bab 3 — Teknologi dan Budaya Digital",
    berkas: "Bab_3_Teknologi_dan_Budaya_Digital.pdf",
    deskripsi:
      "Sistem komputer, otomatisasi dan pemrosesan dokumen dengan perangkat lunak perkantoran, budaya baru era Informatika, serta budaya karier dan sertifikasi.",
    subbab: [
      "A. Sistem Komputer",
      "B. Otomatisasi dengan Perangkat Lunak Perkantoran",
      "C. Pemrosesan Dokumen dengan Perangkat Lunak Perkantoran",
      "D. Budaya Baru di Era Informatika",
      "E. Budaya Karier dan Beragam Sertifikasi di Bidang Informatika",
    ],
  },
  {
    nomor: 4,
    slug: "informatika-bab-4",
    judul: "Bab 4 — Keamanan dan Manajemen Informasi",
    berkas: "Bab_4_Keamanan_dan_Manajemen_Informasi.pdf",
    deskripsi:
      "Jaringan komputer dan internet, proteksi data di internet, serta peningkatan keamanan informasi.",
    subbab: [
      "A. Pendahuluan",
      "B. Jaringan Komputer dan Internet",
      "C. Proteksi Data di Internet",
      "D. Meningkatkan Keamanan Informasi",
    ],
  },
];

function bacaEnv() {
  const teks = readFileSync(new URL("../.env.local", import.meta.url), "utf8");

  return Object.fromEntries(
    teks
      .split(/\r?\n/)
      .map((baris) => baris.trim())
      .filter((baris) => baris && !baris.startsWith("#"))
      .map((baris) => {
        const pisah = baris.indexOf("=");
        return [baris.slice(0, pisah), baris.slice(pisah + 1)];
      })
  );
}

function gagal(pesan) {
  console.error(pesan);
  process.exitCode = 1;
  return null;
}

/**
 * Konten materinya.
 *
 * Bila teks bab tersedia (data/bab-teks.json), pakai itu: blok teks panjang
 * yang sudah dipecah, sehingga AI bisa menyusun soal dan Tanya AI bisa menjawab
 * dari isi bab. Bila belum, konten diisi daftar subbab dari Daftar Isi buku
 * supaya halaman materi tidak kosong dan siswa tahu isi babnya.
 */
function susunKonten(bab, teksBab) {
  if (teksBab && Array.isArray(teksBab.konten) && teksBab.konten.length > 0) {
    return teksBab.konten;
  }

  return [
    {
      tipe: "teks",
      judul: `Isi ${bab.judul}`,
      isi: `${bab.deskripsi} Bahan bacaan lengkap ada pada lampiran PDF bab ini: buka bagian Berkas materi di bawah halaman, lalu pratinjau atau unduh.`,
    },
    {
      tipe: "daftar",
      judul: "Subbab dalam bab ini",
      terurut: true,
      items: bab.subbab,
    },
    {
      tipe: "catatan",
      isi: "Baca bab ini dari lampiran PDF secara berurutan. Setelah selesai, ulangi latihan di bagian Uji Kompetensi pada akhir bab.",
    },
  ];
}

async function utama() {
  const env = bacaEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return gagal("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kosong di .env.local");
  }

  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // --- Berkas teks (opsional) ---
  const jalurTeks = new URL("../data/bab-teks.json", import.meta.url);
  let petaTeks = new Map();

  if (PAKAI_TEKS && existsSync(jalurTeks)) {
    const daftar = JSON.parse(readFileSync(jalurTeks, "utf8"));
    petaTeks = new Map(daftar.map((item) => [item.nomor, item]));
    console.log(`Teks bab: dibaca dari data/bab-teks.json (${petaTeks.size} bab)`);
  } else if (PAKAI_TEKS) {
    console.log("Teks bab: --pakai-teks diminta tetapi data/bab-teks.json tidak ada.");
    console.log("           Materi dipasang dengan daftar subbab, kuis dimatikan.");
  } else {
    console.log("Teks bab: tidak dipakai (tanpa --pakai-teks). Kuis dimatikan.");
  }
  console.log();

  // --- Baca PDF bab + validasi ---
  const siap = [];

  for (const bab of BAB) {
    const jalur = new URL(`../materi/${bab.berkas}`, import.meta.url);

    if (!existsSync(jalur)) {
      return gagal(`PDF tidak ada: materi/${bab.berkas}`);
    }

    const isi = readFileSync(jalur);
    const magic = isi.subarray(0, 4).toString("latin1");

    if (magic !== "%PDF") {
      return gagal(`materi/${bab.berkas} bukan PDF (awalan ${JSON.stringify(magic)}).`);
    }

    const teksBab = petaTeks.get(bab.nomor) ?? null;
    const konten = susunKonten(bab, teksBab);
    // Kuis hanya dinyalakan bila ada teks bab: bank soal disusun dari `konten`,
    // dan daftar subbab saja tidak cukup untuk membuat soal yang layak.
    const adaTeks = Boolean(teksBab?.konten?.length);

    siap.push({
      ...bab,
      isi,
      ukuran: isi.byteLength,
      konten,
      kuis: adaTeks ? JUMLAH_SOAL : 0,
      jumlahKarakter: teksBab?.jumlahKarakter ?? 0,
    });
  }

  // --- Bandingkan dengan isi tabel sekarang ---
  const { data: barisAda, error: galatBaca } = await supabase
    .from("materi")
    .select("kelas, slug, judul, urutan, berkas, kuis_jumlah, konten")
    .eq("kelas", KELAS)
    .order("urutan");

  if (galatBaca) {
    return gagal(`Gagal membaca tabel materi: ${galatBaca.code ?? ""} ${galatBaca.message}`);
  }

  const lama = barisAda ?? [];
  const slugBaru = new Set(siap.map((b) => b.slug));
  const akanDihapus = lama.filter((b) => !slugBaru.has(b.slug));

  /*
   * Berkas yang harus dibuang dari Storage. Dua sumbernya:
   * 1. Berkas milik materi yang dihapus seluruhnya.
   * 2. Berkas lama milik materi yang di-upsert — PDF-nya diganti versi baru,
   *    jadi path lama tidak lagi dirujuk siapa pun.
   *
   * Tanpa poin 2, setiap kali PDF diganti lalu skrip dijalankan ulang, berkas
   * lama tertinggal di Storage selamanya tanpa baris yang menunjuknya. Ini
   * penting karena PDF bab masih sementara dan akan diganti beberapa kali.
   */
  const pathDibuang = [
    ...akanDihapus.flatMap((b) => (b.berkas ?? []).map((item) => item.path)),
    ...lama
      .filter((b) => slugBaru.has(b.slug))
      .flatMap((b) => (b.berkas ?? []).map((item) => item.path)),
  ];

  console.log(`Materi kelas ${KELAS} sekarang (${lama.length} baris):`);
  for (const b of lama) {
    console.log(`  - ${b.slug} | urutan=${b.urutan} | ${b.judul}`);
  }

  console.log(`\nRencana:`);
  console.log(`  1. ${siap.length} materi bab dipasang:`);
  for (const b of siap) {
    console.log(
      `       ${b.slug}  ${b.berkas}  ${(b.ukuran / 1048576).toFixed(2)} MB` +
        `  kuis=${b.kuis}` +
        (b.jumlahKarakter ? `  teks=${b.jumlahKarakter} kar` : "")
    );
  }
  console.log(
    `  2. Hapus ${akanDihapus.length} materi lain: ${
      akanDihapus.map((b) => b.slug).join(", ") || "(tidak ada)"
    }`
  );
  console.log(
    `  3. Hapus ${pathDibuang.length} berkas lama dari Storage (termasuk PDF yang diganti)`
  );
  console.log("  4. Hapus bank soal materi yang dihapus (kuis_hasil dibiarkan)");

  /*
   * Peringatan penimpaan. Skrip ini menulis ulang `konten` dan `kuis_jumlah`
   * setiap kali dijalankan. Tanpa peringatan, guru yang sudah menyunting
   * materi lewat /guru/materi lalu menjalankan skrip ini untuk mengganti PDF
   * akan kehilangan suntingannya tanpa sadar.
   */
  const tertimpa = lama.filter((b) => slugBaru.has(b.slug));

  if (tertimpa.length > 0) {
    console.log("\nPERHATIAN — baris ini ada di database dan akan ditimpa:");
    for (const b of tertimpa) {
      const kuisSekarang = Number(b.kuis_jumlah) || 0;
      const blokSekarang = (b.konten ?? []).length;
      const bab = siap.find((x) => x.slug === b.slug);

      console.log(
        `  - ${b.slug}: kuis ${kuisSekarang} -> ${bab.kuis}, blok ${blokSekarang} -> ${bab.konten.length}`
      );
    }
    console.log(
      "  Suntingan yang dibuat lewat /guru/materi pada baris di atas akan hilang."
    );
    console.log(
      "  Bila hanya ingin mengganti PDF, ubah `berkas` baris itu lewat /guru/materi."
    );
  }

  if (!JALANKAN) {
    console.log("\nDry run. Tambahkan --jalankan untuk menerapkan.");
    return true;
  }

  // --- 1. Unggah PDF tiap bab ---
  console.log();

  for (const bab of siap) {
    const path = `materi/${randomUUID()}.pdf`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, bab.isi, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (error) {
      // Buang berkas yang sudah terunggah supaya Storage tidak menyimpan
      // berkas yatim saat pemasangan berhenti di tengah.
      const sudah = siap
        .slice(0, siap.indexOf(bab))
        .map((b) => b.path)
        .filter(Boolean);

      if (sudah.length > 0) await supabase.storage.from(BUCKET).remove(sudah);

      return gagal(`Gagal mengunggah ${bab.berkas}: ${error.message}`);
    }

    bab.path = path;
    console.log(`Terunggah: ${bab.slug} -> ${path}`);
  }

  // --- 2. Baris materi ---
  const baris = siap.map((bab, indeks) => ({
    kelas: KELAS,
    slug: bab.slug,
    judul: bab.judul,
    deskripsi: bab.deskripsi,
    durasi: "",
    video_judul: "",
    video_youtube_id: "",
    kuis_jumlah: bab.kuis,
    konten: bab.konten,
    berkas: [
      {
        id: randomUUID(),
        nama: bab.berkas,
        path: bab.path,
        tipe: "pdf",
        mime: "application/pdf",
        ukuran: bab.ukuran,
      },
    ],
    urutan: indeks,
    diperbarui_pada: new Date().toISOString(),
  }));

  const { error: galatSimpan } = await supabase
    .from("materi")
    .upsert(baris, { onConflict: "kelas,slug" });

  if (galatSimpan) {
    await supabase.storage
      .from(BUCKET)
      .remove(siap.map((b) => b.path));
    return gagal(`Gagal menyimpan materi: ${galatSimpan.message}`);
  }

  console.log(`\nTersimpan: ${baris.length} materi kelas ${KELAS}`);

  // --- 3. Hapus materi lama ---
  for (const b of akanDihapus) {
    const { error } = await supabase
      .from("materi")
      .delete()
      .eq("kelas", KELAS)
      .eq("slug", b.slug);

    if (error) {
      console.error(`Gagal menghapus ${b.slug}: ${error.message}`);
      continue;
    }

    const { error: galatBank } = await supabase
      .from("kuis_bank")
      .delete()
      .eq("kelas", KELAS)
      .eq("materi", b.slug);

    if (galatBank) {
      console.error(`Bank soal ${b.slug} gagal dihapus: ${galatBank.message}`);
    }

    console.log(`Dihapus: ${b.slug}`);
  }

  // --- 4. Bersihkan berkas lama ---
  if (pathDibuang.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(pathDibuang);
    console.log(
      error
        ? `Gagal menghapus berkas lama: ${error.message}`
        : `${pathDibuang.length} berkas lama dihapus`
    );
  }

  // --- Verifikasi ---
  const { data: akhir } = await supabase
    .from("materi")
    .select("slug, judul, urutan, kuis_jumlah, berkas, konten")
    .eq("kelas", KELAS)
    .order("urutan");

  console.log(`\nHasil akhir kelas ${KELAS}:`);
  for (const b of akhir ?? []) {
    const berkas = (b.berkas ?? []).length;
    const blok = (b.konten ?? []).length;

    console.log(
      `  ${String(b.urutan).padStart(2)}. ${b.slug} | kuis=${b.kuis_jumlah} | berkas=${berkas} | blok=${blok}`
    );
  }

  return true;
}

utama().catch((galat) => {
  console.error("Gagal:", galat?.message ?? galat);
  process.exitCode = 1;
});
