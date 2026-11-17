import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MAKS_UKURAN,
  TIPE_BERKAS,
  namaBerkasAman,
  pathBerkasSah,
} from "@/lib/materi/berkas";

/*
 * Penyimpanan berkas materi (Supabase Storage)
 *
 * Tanggung jawab: mengunggah, menghapus, dan membuat tautan sementara untuk
 * berkas materi. Bucket bersifat privat; browser tidak pernah menghubungi
 * Supabase langsung. Halaman siswa menerima signed URL berumur pendek yang
 * dibuat di server.
 *
 * Hanya dipakai server (Route Handler, Server Action, Server Component).
 */

export const BUCKET = "materi";

/** Signed URL berlaku 2 jam; cukup untuk satu sesi membaca materi. */
const MASA_URL = 60 * 60 * 2;

/**
 * Memeriksa beberapa byte pertama agar isi berkas cocok dengan ekstensinya.
 * PDF diawali "%PDF"; DOCX/PPTX adalah arsip ZIP yang diawali "PK".
 */
export function cocokIsiBerkas(buffer, tipe) {
  if (!buffer || buffer.length < 4) return false;

  if (tipe === "pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  if (tipe === "docx" || tipe === "pptx") {
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }

  return false;
}

/**
 * Mengunggah satu berkas ke Storage dengan nama UUID (nama asli hanya untuk
 * tampilan). Mengembalikan metadata siap disimpan di `materi.berkas`.
 */
export async function unggahBerkas({ nama, tipe, data }) {
  if (!TIPE_BERKAS[tipe]) return { error: "tipe" };

  const ukuran = data?.byteLength ?? 0;
  if (!Number.isInteger(ukuran) || ukuran <= 0 || ukuran > MAKS_UKURAN) {
    return { error: "ukuran" };
  }

  const isi = Buffer.from(data);

  if (!cocokIsiBerkas(isi, tipe)) {
    return { error: "isi" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return { error: "konfigurasi" };

  const path = `materi/${randomUUID()}.${TIPE_BERKAS[tipe].ekstensi}`;
  const potongan = isi.buffer.slice(
    isi.byteOffset,
    isi.byteOffset + isi.byteLength
  );

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, potongan, {
      contentType: TIPE_BERKAS[tipe].mime,
      upsert: false,
    });

  if (error) {
    console.error("Berkas: gagal mengunggah.", error.message);
    return { error: "simpan" };
  }

  return {
    error: null,
    berkas: {
      id: randomUUID(),
      nama: namaBerkasAman(nama),
      path,
      tipe,
      mime: TIPE_BERKAS[tipe].mime,
      ukuran,
    },
  };
}

/** Menghapus beberapa berkas. Path tidak sah diabaikan. */
export async function hapusBerkas(paths) {
  const daftar = (Array.isArray(paths) ? paths : [])
    .filter(pathBerkasSah)
    .slice(0, 50);

  if (daftar.length === 0) return;

  const supabase = createSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase.storage.from(BUCKET).remove(daftar);

  if (error) {
    console.error("Berkas: gagal menghapus.", error.message);
  }
}

/**
 * Signed URL untuk satu berkas, atau null bila gagal. Bila `unduh` diisi nama
 * berkas, Supabase menambahkan header unduhan sehingga tautan langsung
 * menyimpan berkas (atribut `download` tidak berlaku lintas domain).
 */
export async function urlBerkas(path, { unduh } = {}) {
  if (!pathBerkasSah(path)) return null;

  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const opsi = unduh ? { download: namaBerkasAman(unduh) } : undefined;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, MASA_URL, opsi);

  if (error) {
    console.error("Berkas: gagal membuat tautan.", error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}
