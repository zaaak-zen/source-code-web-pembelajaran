import { NextResponse } from "next/server";
import { punyaAkses } from "@/lib/guru/akses";
import {
  MAKS_BERKAS,
  MAKS_UKURAN,
  tipeDariNama,
} from "@/lib/materi/berkas";
import { hapusBerkas, unggahBerkas } from "@/lib/materi/storage";

/*
 * Unggah dan hapus berkas materi (/guru/materi/berkas)
 *
 * Tanggung jawab: menerima berkas dari form materi, memvalidasi format dan
 * ukurannya, lalu menyimpannya ke Supabase Storage. Metadata hasil unggahan
 * dikirim balik ke browser dan disimpan di form sebagai field `berkas`.
 *
 * Route ini berada di bawah /guru agar cookie akses guru (Path=/guru) ikut
 * terkirim. Berkas tidak dikirim lewat server action supaya tidak terkena
 * batas body server action Next.js.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PESAN_TIPE = "Format berkas harus PDF, DOCX, atau PPTX.";
const PESAN_UKURAN = `Ukuran berkas maksimal ${MAKS_UKURAN / (1024 * 1024)} MB.`;

function galat(pesan, status) {
  return NextResponse.json({ galat: pesan }, { status });
}

/** True bila nilai dari FormData adalah File/Blob yang punya isi. */
function adalahBerkas(nilai) {
  return (
    nilai &&
    typeof nilai === "object" &&
    typeof nilai.arrayBuffer === "function" &&
    typeof nilai.size === "number"
  );
}

export async function POST(request) {
  if (!(await punyaAkses())) {
    return galat("Akses guru diperlukan. Muat ulang halaman lalu coba lagi.", 401);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return galat("Berkas gagal dibaca. Coba pilih ulang.", 400);
  }

  const daftar = form.getAll("berkas").filter(adalahBerkas);

  if (daftar.length === 0) {
    return galat("Tidak ada berkas yang dipilih.", 400);
  }

  if (daftar.length > MAKS_BERKAS) {
    return galat(`Maksimal ${MAKS_BERKAS} berkas per materi.`, 400);
  }

  const berhasil = [];
  const paths = [];

  for (const file of daftar) {
    const tipe = tipeDariNama(file.name);

    if (!tipe) {
      await hapusBerkas(paths);
      return galat(`${PESAN_TIPE} (${file.name})`, 400);
    }

    if (file.size <= 0) {
      await hapusBerkas(paths);
      return galat(`Berkas "${file.name}" kosong.`, 400);
    }

    if (file.size > MAKS_UKURAN) {
      await hapusBerkas(paths);
      return galat(`${PESAN_UKURAN} (${file.name})`, 400);
    }

    const data = await file.arrayBuffer();
    const hasil = await unggahBerkas({ nama: file.name, tipe, data });

    if (hasil.error === "konfigurasi") {
      await hapusBerkas(paths);
      return galat("Supabase belum dikonfigurasi di server.", 500);
    }

    if (hasil.error === "isi") {
      await hapusBerkas(paths);
      return galat(
        `Isi berkas "${file.name}" tidak cocok dengan ekstensinya.`,
        400
      );
    }

    if (hasil.error || !hasil.berkas) {
      await hapusBerkas(paths);
      return galat(`Berkas "${file.name}" gagal diunggah. Coba lagi.`, 500);
    }

    berhasil.push(hasil.berkas);
    paths.push(hasil.berkas.path);
  }

  return NextResponse.json({ berkas: berhasil });
}

/** Hapus satu berkas yang baru diunggah tetapi dibatalkan dari form. */
export async function DELETE(request) {
  if (!(await punyaAkses())) {
    return galat("Akses guru diperlukan.", 401);
  }

  let isi;
  try {
    isi = await request.json();
  } catch {
    return galat("Permintaan tidak valid.", 400);
  }

  const path = typeof isi?.path === "string" ? isi.path : "";
  if (!path) return galat("Path berkas wajib diisi.", 400);

  // hapusBerkas() hanya menerima path yang dibuat server (anti path traversal).
  await hapusBerkas([path]);

  return NextResponse.json({ ok: true });
}
