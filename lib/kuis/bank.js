/*
 * Bank soal kuis
 *
 * Tanggung jawab: menyimpan dan membaca soal yang sudah disusun guru di tabel
 * `kuis_bank` Supabase, satu baris per kelas + materi.
 *
 * Soal disimpan lengkap dengan kunci jawaban dan pembahasan. Hanya dibaca dari
 * server memakai service role key, lalu /api/kuis mengirim versi tanpa kunci ke
 * browser lewat token terenkripsi.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validasiBank } from "@/lib/kuis/soal";
import { dariCache, lupakanAwalan } from "@/lib/cache/tembol";

const TABEL = "kuis_bank";

/*
 * Masa berlaku cache bank soal (detik).
 *
 * Bank soal dibaca setiap kali /api/kuis dipanggil, yaitu sekali per siswa
 * yang membuka kuis. Isinya hanya berubah lewat /guru/kuis, dan setiap aksi
 * di sana sudah memanggil lupakanBank(). TTL ini hanya jaring pengaman bila
 * soal diubah langsung lewat dashboard Supabase.
 */
const TTL_BANK = 120;

/** Buang cache bank soal setelah guru menyimpan atau menghapus soal. */
export function lupakanBank(kelas, materi) {
  if (kelas && materi) {
    lupakanAwalan(`bank:${kelas}|${materi}`);
    return;
  }

  lupakanAwalan("bank:");
}

/** Bank soal satu materi, atau null bila guru belum membuatnya. */
export async function ambilBank(kelas, materi) {
  return dariCache(`bank:${kelas}|${materi}`, TTL_BANK, async () => {
    const supabase = createSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from(TABEL)
      .select("soal")
      .eq("kelas", kelas)
      .eq("materi", materi)
      .maybeSingle();

    if (error) {
      console.error("Bank soal: gagal membaca soal.", error.message);
      return null;
    }

    return validasiBank(data?.soal);
  });
}

/** Semua bank soal sebagai Map "kelas|materi" -> baris. Dipakai panel guru. */
export async function ambilPetaBank() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABEL)
    .select("kelas, materi, soal, diperbarui_pada");

  if (error) {
    console.error("Bank soal: gagal membaca daftar.", error.message);
    return null;
  }

  const peta = new Map();

  for (const baris of data ?? []) {
    const soal = validasiBank(baris.soal);
    if (!soal) continue;

    peta.set(`${baris.kelas}|${baris.materi}`, {
      jumlah: soal.length,
      diperbaruiPada: baris.diperbarui_pada,
    });
  }

  return peta;
}

/** Menyimpan (membuat ulang) bank soal satu materi. */
export async function simpanBank(kelas, materi, soal) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { error: "konfigurasi" };

  const { error } = await supabase.from(TABEL).upsert(
    {
      kelas,
      materi,
      soal,
      diperbarui_pada: new Date().toISOString(),
    },
    { onConflict: "kelas,materi" }
  );

  if (error) {
    console.error("Bank soal: gagal menyimpan.", error.message);
    return { error: "simpan" };
  }

  lupakanBank(kelas, materi);
  return { error: null };
}

/** Menghapus bank soal satu materi. */
export async function hapusBank(kelas, materi) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { error: "konfigurasi" };

  const { error } = await supabase
    .from(TABEL)
    .delete()
    .eq("kelas", kelas)
    .eq("materi", materi);

  if (error) {
    console.error("Bank soal: gagal menghapus.", error.message);
    return { error: "simpan" };
  }

  lupakanBank(kelas, materi);
  return { error: null };
}
