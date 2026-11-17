/*
 * Berkas materi (fungsi murni)
 *
 * Tanggung jawab: daftar format yang didukung, batas ukuran, dan validasi
 * metadata berkas. Tidak menyentuh database, Storage, maupun environment,
 * sehingga aman dipakai di Client Component (form unggah) dan Server Action.
 *
 * Berkas disimpan di Supabase Storage (bucket privat `materi`), sedangkan
 * metadatanya disimpan di kolom `materi.berkas` berupa array JSON:
 * [{ id, nama, path, tipe, mime, ukuran }]
 */

export const TIPE_BERKAS = {
  pdf: {
    label: "PDF",
    ekstensi: "pdf",
    mime: "application/pdf",
    pratinjau: true,
  },
  docx: {
    label: "Word",
    ekstensi: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pratinjau: false,
  },
  pptx: {
    label: "PowerPoint",
    ekstensi: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    pratinjau: false,
  },
};

export const DAFTAR_TIPE = Object.keys(TIPE_BERKAS);

/** 4 MB per berkas, di bawah batas body Vercel (±4,5 MB). */
export const MAKS_UKURAN = 4 * 1024 * 1024;

/**
 * Batas ukuran untuk metadata yang SUDAH tersimpan, terpisah dari batas unggah.
 *
 * Berkas yang diunggah lewat form dibatasi MAKS_UKURAN karena harus melewati
 * body request Vercel. Berkas yang dimasukkan langsung ke Storage (misalnya
 * buku pegangan sekolah) tidak melewati jalur itu, sehingga tidak boleh
 * dibuang hanya karena lebih besar dari batas unggah. Tanpa batas terpisah,
 * metadata berkas besar akan hilang diam-diam saat dibaca dari database dan
 * lampirannya tidak pernah tampil di halaman siswa.
 */
export const MAKS_UKURAN_SIMPAN = 25 * 1024 * 1024;

/** Maksimal berkas per materi. */
export const MAKS_BERKAS = 5;

/** Nilai untuk atribut `accept` pada input file. */
export const ACCEPT_BERKAS = DAFTAR_TIPE.map(
  (tipe) => `.${TIPE_BERKAS[tipe].ekstensi}`
).join(",");

const POLA_PATH = /^materi\/[A-Za-z0-9-]+\.(pdf|docx|pptx)$/;

/** True bila path cocok dengan pola yang dibuat server (anti path traversal). */
export function pathBerkasSah(path) {
  return typeof path === "string" && POLA_PATH.test(path);
}

/** Ekstensi huruf kecil tanpa titik, atau "" bila tidak ada. */
export function ekstensiDariNama(nama) {
  const teks = String(nama ?? "").trim().toLowerCase();
  const titik = teks.lastIndexOf(".");
  if (titik < 1 || titik === teks.length - 1) return "";
  return teks.slice(titik + 1);
}

/** Kunci tipe berkas (pdf/docx/pptx) dari nama file, atau null. */
export function tipeDariNama(nama) {
  const ekstensi = ekstensiDariNama(nama);
  return DAFTAR_TIPE.includes(ekstensi) ? ekstensi : null;
}

/** True bila tipe berkas dapat dipratinjau di browser (hanya PDF). */
export function bolehPratinjau(tipe) {
  return Boolean(TIPE_BERKAS[tipe]?.pratinjau);
}

/** Ukuran berkas dalam bentuk ringkas, mis. "1,2 MB" / "480 KB". */
export function formatUkuran(byte) {
  const nilai = Number(byte);
  if (!Number.isFinite(nilai) || nilai < 0) return "—";
  if (nilai < 1024) return `${nilai} B`;
  if (nilai < 1024 * 1024) return `${Math.round(nilai / 1024)} KB`;

  const mb = nilai / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1).replace(".", ",")} MB`;
}

/**
 * Nama tampilan yang aman: buang karakter kontrol dan pemisah path, rapikan
 * spasi, lalu batasi panjangnya. Path penyimpanan tetap memakai UUID, jadi
 * nama ini hanya untuk ditampilkan.
 */
export function namaBerkasAman(nama) {
  return String(nama ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]+/g, "-")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120) || "berkas";
}

/**
 * Merapikan satu berkas. `maksUkuran` dipakai pemanggil: form unggah memakai
 * MAKS_UKURAN (batas body request), pembacaan data tersimpan memakai
 * MAKS_UKURAN_SIMPAN.
 */
function normalisasiSatu(item, maksUkuran = MAKS_UKURAN_SIMPAN) {
  if (!item || typeof item !== "object") return null;

  const tipe = String(item.tipe ?? "");
  if (!DAFTAR_TIPE.includes(tipe)) return null;

  const path = String(item.path ?? "");
  if (!POLA_PATH.test(path)) return null;

  const ekstensiPath = ekstensiDariNama(path);
  if (ekstensiPath !== TIPE_BERKAS[tipe].ekstensi) return null;

  const ukuran = Number(item.ukuran);
  if (!Number.isInteger(ukuran) || ukuran <= 0 || ukuran > maksUkuran) {
    return null;
  }

  const id = String(item.id ?? "").trim().slice(0, 64);
  if (!id) return null;

  return {
    id,
    nama: namaBerkasAman(item.nama),
    path,
    tipe,
    mime: TIPE_BERKAS[tipe].mime,
    ukuran,
  };
}

/**
 * Merapikan daftar berkas dari database atau form. Entri rusak dibuang dan
 * jumlah dibatasi MAKS_BERKAS, sehingga data lama tidak bisa merusak halaman.
 *
 * Baris dari form unggah sudah divalidasi terhadap MAKS_UKURAN di
 * /guru/materi/berkas, jadi di sini cukup batas simpan yang lebih longgar.
 */
export function normalisasiBerkas(nilai) {
  if (!Array.isArray(nilai)) return [];

  return nilai
    .slice(0, MAKS_BERKAS)
    .map((item) => normalisasiSatu(item))
    .filter(Boolean);
}
