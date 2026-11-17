/*
 * Utilitas materi (fungsi murni)
 *
 * Tanggung jawab: slug, ID YouTube, dan validasi blok konten. Tidak menyentuh
 * database maupun environment, sehingga aman dipakai di Client Component
 * (form materi) dan Server Component/Action.
 */

export const TIPE_BLOK = ["tujuan", "teks", "daftar", "kode", "catatan"];

const BATAS_BLOK = 100;
const BATAS_ITEM = 100;
const BATAS_TEKS = 20000;
const BATAS_JUDUL = 200;
const BATAS_ITEM_TEKS = 2000;
const BATAS_BAHASA = 40;

/** Slug ramah URL dari judul, unik di antara slug yang sudah dipakai. */
export function buatSlugMateri(judul, terpakai = []) {
  const dasar =
    String(judul ?? "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "materi";

  const dipakai = new Set(terpakai ?? []);
  if (!dipakai.has(dasar)) return dasar;

  let nomor = 2;
  while (dipakai.has(`${dasar}-${nomor}`)) nomor += 1;

  return `${dasar}-${nomor}`;
}

/** Mengurai URL/ID YouTube menjadi ID 11 karakter, atau null. */
export function uraiYoutubeId(masukan) {
  const teks = String(masukan ?? "").trim();
  if (!teks) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(teks)) return teks;

  let url;
  try {
    url = new URL(teks);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const hostSah = [
    "youtube.com",
    "m.youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "music.youtube.com",
  ].includes(host);

  if (!hostSah) return null;

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return /^[A-Za-z0-9_-]{11}$/.test(id ?? "") ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

  const bagian = url.pathname.split("/").filter(Boolean);
  const kandidat =
    bagian[0] === "embed" || bagian[0] === "shorts" || bagian[0] === "live"
      ? bagian[1]
      : null;

  return /^[A-Za-z0-9_-]{11}$/.test(kandidat ?? "") ? kandidat : null;
}

function teksSingkat(nilai, maks) {
  if (typeof nilai !== "string") return "";
  return nilai.trim().slice(0, maks);
}

function daftarItem(nilai) {
  if (!Array.isArray(nilai)) return null;

  const items = nilai
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, BATAS_ITEM)
    .map((item) => item.slice(0, BATAS_ITEM_TEKS));

  return items.length > 0 ? items : null;
}

/** Bentuk blok kosong untuk form. */
export function blokKosong(tipe = "teks") {
  return {
    tipe: TIPE_BLOK.includes(tipe) ? tipe : "teks",
    judul: "",
    isi: "",
    items: [],
    terurut: false,
    bahasa: "",
  };
}

/**
 * Merapikan satu blok. Mengembalikan null bila bentuk wajibnya tidak lengkap.
 * Dipakai bersama oleh validasi simpan, impor config, dan pembacaan database.
 */
export function normalisasiBlok(blok) {
  if (!blok || typeof blok !== "object") return null;
  if (!TIPE_BLOK.includes(blok.tipe)) return null;

  const judul = teksSingkat(blok.judul, BATAS_JUDUL);

  if (blok.tipe === "tujuan") {
    const items = daftarItem(blok.items);
    return items ? { tipe: "tujuan", items } : null;
  }

  if (blok.tipe === "teks") {
    const isi = teksSingkat(blok.isi, BATAS_TEKS);
    return isi ? { tipe: "teks", judul, isi } : null;
  }

  if (blok.tipe === "daftar") {
    const items = daftarItem(blok.items);
    if (!items) return null;
    return { tipe: "daftar", judul, terurut: Boolean(blok.terurut), items };
  }

  if (blok.tipe === "kode") {
    const isi = teksSingkat(blok.isi, BATAS_TEKS);
    if (!isi) return null;
    return {
      tipe: "kode",
      judul,
      bahasa: teksSingkat(blok.bahasa, BATAS_BAHASA),
      isi,
    };
  }

  if (blok.tipe === "catatan") {
    const isi = teksSingkat(blok.isi, BATAS_TEKS);
    return isi ? { tipe: "catatan", isi } : null;
  }

  return null;
}

/** Normalisasi longgar: blok rusak dibuang, dipakai saat membaca data lama. */
export function normalisasiKonten(nilai) {
  if (!Array.isArray(nilai)) return [];

  return nilai
    .slice(0, BATAS_BLOK)
    .map(normalisasiBlok)
    .filter(Boolean);
}

/** Validasi ketat: semua blok wajib sah. Null bila ada yang rusak. */
export function validasiKonten(nilai) {
  if (!Array.isArray(nilai) || nilai.length > BATAS_BLOK) return null;

  const hasil = [];

  for (const blok of nilai) {
    const bersih = normalisasiBlok(blok);
    if (!bersih) return null;
    hasil.push(bersih);
  }

  return hasil;
}
