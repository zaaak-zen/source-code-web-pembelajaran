import { cache } from "react";
import educationConfig from "@/config/education";
import {
  createSupabaseCacheClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { normalisasiKonten } from "@/lib/materi/konten";
import { normalisasiBerkas } from "@/lib/materi/berkas";
import { dariCache, lupakanAwalan } from "@/lib/cache/tembol";

/*
 * Materi kelas (database)
 *
 * Tanggung jawab: membaca dan menulis materi belajar dari tabel `materi`.
 * Materi dikelola guru lewat dashboard (/guru/materi); config/education.js
 * hanya dipakai sebagai data awal yang dapat diimpor sekali.
 *
 * Dipakai oleh:
 * - app/smk/[kelas]/page.jsx
 * - app/smk/[kelas]/[materi]/page.jsx
 * - app/smk/[kelas]/[materi]/kuis/page.jsx
 * - app/api/kuis/route.js
 * - app/api/tanya/route.js
 * - app/guru/materi/page.jsx
 * - app/guru/kuis/page.jsx
 * - app/guru/nilai/page.jsx
 * - app/page.jsx (jumlah materi di beranda)
 */

export const TABEL = "materi";

/*
 * Masa berlaku cache materi (detik).
 *
 * Materi hanya berubah saat guru menekan simpan, dan setiap aksi guru sudah
 * memanggil lupakanMateri() sehingga perubahan langsung terlihat. Angka ini
 * hanya jaring pengaman bila ada baris yang diubah langsung lewat dashboard
 * Supabase: perubahan itu muncul paling lama 60 detik kemudian.
 */
const TTL_MATERI = 60;

/** Buang cache materi setelah guru menambah, mengubah, atau menghapus materi. */
export function lupakanMateri() {
  lupakanAwalan("materi:");
}

const KOLOM_DASAR =
  "kelas, slug, judul, deskripsi, durasi, video_judul, video_youtube_id, " +
  "kuis_jumlah, konten, urutan, diperbarui_pada";

const KOLOM = `${KOLOM_DASAR}, berkas`;

/*
 * Kolom `berkas` baru ditambahkan pada skema 2 November 2026. Bila database
 * belum dijalankan ulang, query dengan kolom itu gagal (42703) dan seluruh
 * halaman materi akan kosong. Fallback ke kolom dasar membuat halaman tetap
 * tampil tanpa fitur berkas sampai schema.sql dijalankan lagi.
 */
function kolomHilang(error) {
  return error?.code === "42703";
}

function barisKeMateri(baris) {
  return {
    kelas: baris.kelas,
    slug: baris.slug,
    judul: baris.judul,
    deskripsi: baris.deskripsi ?? "",
    durasi: baris.durasi ?? "",
    video: baris.video_youtube_id
      ? {
          judul: baris.video_judul || baris.judul,
          youtubeId: baris.video_youtube_id,
        }
      : null,
    kuis: { jumlahSoal: Number(baris.kuis_jumlah) || 0 },
    konten: normalisasiKonten(baris.konten),
    berkas: normalisasiBerkas(baris.berkas),
    urutan: Number(baris.urutan) || 0,
    diperbaruiPada: baris.diperbarui_pada ?? null,
  };
}

/*
 * Pembaca bersama untuk daftar materi.
 *
 * `pakaiCache` menentukan klien Supabase yang dipakai:
 * - false (bawaan): klien no-store, untuk halaman yang isinya berbeda per
 *   pengunjung atau harus selalu segar.
 * - true: klien force-cache, khusus dipakai beranda supaya Next.js tidak
 *   menganggap halaman itu dinamis. Beranda dibatasi `revalidate = 300` dan
 *   setiap aksi guru memanggil revalidatePath("/"), jadi hasil cache tidak
 *   pernah tertinggal lebih lama dari itu.
 */
async function bacaMateri({ kelasSlug = null, pakaiCache = false }) {
  const supabase = pakaiCache
    ? createSupabaseCacheClient()
    : createSupabaseServerClient();
  if (!supabase) return null;

  const kueri = (kolom) => {
    const dasar = supabase.from(TABEL).select(kolom);

    if (kelasSlug) {
      return dasar
        .eq("kelas", kelasSlug)
        .order("urutan", { ascending: true })
        .order("dibuat_pada", { ascending: true });
    }

    return dasar
      .order("kelas", { ascending: true })
      .order("urutan", { ascending: true });
  };

  let { data, error } = await kueri(KOLOM);
  if (kolomHilang(error)) {
    ({ data, error } = await kueri(KOLOM_DASAR));
  }

  if (error) {
    if (error.code !== "42P01") {
      console.error("Materi: gagal membaca daftar materi.", error.message);
    }
    return null;
  }

  return (data ?? []).map(barisKeMateri);
}

/**
 * Materi satu kelas, terurut sesuai kolom `urutan`.
 * Null bila Supabase/tabel belum siap; array kosong bila memang belum ada.
 *
 * Dua lapis cache:
 * - `cache` React: satu permintaan tidak membaca tabel berkali-kali.
 * - `dariCache`: permintaan berbeda dalam 60 detik memakai hasil yang sama,
 *   sehingga membuka halaman kelas tidak selalu menunggu Supabase.
 */
export const ambilMateriKelas = cache(async (kelasSlug) =>
  dariCache(`materi:kelas:${kelasSlug}`, TTL_MATERI, () =>
    bacaMateri({ kelasSlug })
  )
);

/** Satu materi berdasarkan kelas + slug. Null bila tidak ada / gagal dibaca. */
export async function ambilMateri(kelasSlug, materiSlug) {
  const daftar = await ambilMateriKelas(kelasSlug);
  return daftar?.find((item) => item.slug === materiSlug) ?? null;
}

/**
 * Semua materi dari semua kelas. Dipakai panel guru dan beranda.
 *
 * `pakaiCache` hanya dipakai beranda (lihat bacaMateri). Panel guru tetap
 * memakai data segar supaya guru selalu melihat keadaan terbaru.
 */
export const ambilSemuaMateri = cache(async (pakaiCache = false) =>
  dariCache(`materi:semua:${pakaiCache ? "cache" : "segar"}`, TTL_MATERI, () =>
    bacaMateri({ pakaiCache })
  )
);

/** Peta "kelas|slug" -> judul, untuk menampilkan nama materi di rekap. */
export async function petaJudulMateri() {
  const daftar = await ambilSemuaMateri();
  const peta = new Map();

  for (const item of daftar ?? []) {
    peta.set(`${item.kelas}|${item.slug}`, item.judul);
  }

  return peta;
}

/** Nomor urut berikutnya di satu kelas. */
export async function urutanBerikutnya(kelasSlug) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from(TABEL)
    .select("urutan")
    .eq("kelas", kelasSlug)
    .order("urutan", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Materi: gagal membaca urutan terakhir.", error.message);
    return 0;
  }

  return (Number(data?.urutan) || 0) + 1;
}

/** Menyimpan (menambah atau memperbarui) satu materi. */
export async function simpanMateri(data) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { error: "konfigurasi" };

  const { error } = await supabase.from(TABEL).upsert(
    {
      kelas: data.kelas,
      slug: data.slug,
      judul: data.judul,
      deskripsi: data.deskripsi ?? "",
      durasi: data.durasi ?? "",
      video_judul: data.videoJudul ?? "",
      video_youtube_id: data.videoYoutubeId ?? "",
      kuis_jumlah: data.kuisJumlah ?? 0,
      konten: data.konten ?? [],
      berkas: normalisasiBerkas(data.berkas),
      urutan: data.urutan ?? 0,
      diperbarui_pada: new Date().toISOString(),
    },
    { onConflict: "kelas,slug" }
  );

  if (error) {
    console.error("Materi: gagal menyimpan.", error.message);
    return { error: "simpan" };
  }

  return { error: null };
}

/** Menghapus satu materi. */
export async function hapusMateri(kelasSlug, materiSlug) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { error: "konfigurasi" };

  const { error } = await supabase
    .from(TABEL)
    .delete()
    .eq("kelas", kelasSlug)
    .eq("slug", materiSlug);

  if (error) {
    console.error("Materi: gagal menghapus.", error.message);
    return { error: "simpan" };
  }

  return { error: null };
}

/**
 * Mengimpor materi dari config/education.js. Baris yang slug-nya sudah ada
 * TIDAK ditimpa (`ignoreDuplicates`), sehingga aman ditekan berulang kali
 * tanpa menghapus perubahan guru.
 */
export async function imporMateriConfig() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { error: "konfigurasi", jumlah: 0 };

  const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];
  const baris = [];

  for (const kelas of daftarKelas) {
    (kelas.materi ?? []).forEach((materi, index) => {
      baris.push({
        kelas: kelas.slug,
        slug: materi.slug,
        judul: materi.judul,
        deskripsi: materi.deskripsi ?? "",
        durasi: materi.durasi ?? "",
        video_judul: materi.video?.judul ?? "",
        video_youtube_id: materi.video?.youtubeId ?? "",
        kuis_jumlah: Number(materi.kuis?.jumlahSoal) || 0,
        konten: normalisasiKonten(materi.konten),
        urutan: index,
      });
    });
  }

  if (baris.length === 0) return { error: null, jumlah: 0 };

  const { error } = await supabase
    .from(TABEL)
    .upsert(baris, { onConflict: "kelas,slug", ignoreDuplicates: true });

  if (error) {
    console.error("Materi: gagal mengimpor config.", error.message);
    return { error: "simpan", jumlah: 0 };
  }

  return { error: null, jumlah: baris.length };
}
