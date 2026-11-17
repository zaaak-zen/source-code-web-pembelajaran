"use server";

/*
 * Server action untuk pengelolaan materi (/guru/materi)
 *
 * Tanggung jawab: memvalidasi isian form materi, menyimpannya ke database,
 * menghapus materi, dan mengimpor materi awal dari config/education.js.
 *
 * Semua aksi memeriksa cookie guru lagi, karena server action dapat dipanggil
 * langsung tanpa melewati halaman.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import educationConfig from "@/config/education";
import { punyaAkses } from "@/lib/guru/akses";
import {
  ambilMateri,
  hapusMateri,
  imporMateriConfig,
  lupakanMateri,
  simpanMateri,
  urutanBerikutnya,
} from "@/lib/materi/kelas";
import {
  buatSlugMateri,
  uraiYoutubeId,
  validasiKonten,
} from "@/lib/materi/konten";
import { normalisasiBerkas } from "@/lib/materi/berkas";
import { hapusBerkas } from "@/lib/materi/storage";
import { hapusBank } from "@/lib/kuis/bank";
import { MAX_SOAL } from "@/lib/kuis/soal";

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];
const POLA_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function kelasSah(slug) {
  return daftarKelas.some((kelas) => kelas.slug === slug);
}

function bersihkan(nilai, maks) {
  return String(nilai ?? "").trim().slice(0, maks);
}

/** Server action: tambah atau ubah satu materi. */
export async function simpanMateriAksi(formData) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const mode = String(formData.get("mode") ?? "baru");
  const kelas = String(formData.get("kelas") ?? "");
  const judul = bersihkan(formData.get("judul"), 120);
  const deskripsi = bersihkan(formData.get("deskripsi"), 400);
  const durasi = bersihkan(formData.get("durasi"), 40);
  const videoJudul = bersihkan(formData.get("videoJudul"), 120);
  const videoMentah = String(formData.get("videoYoutubeId") ?? "").trim();
  const kuisJumlah = Number(formData.get("kuisJumlah"));

  const kembali =
    mode === "edit"
      ? `/guru/materi/${kelas}/${String(formData.get("slug") ?? "")}`
      : `/guru/materi/baru?kelas=${kelas}`;

  if (!kelasSah(kelas)) redirect("/guru/materi?galat=kelas");
  if (!judul) redirect(`${kembali}${kembali.includes("?") ? "&" : "?"}galat=judul`);
  if (!Number.isInteger(kuisJumlah) || kuisJumlah < 0 || kuisJumlah > MAX_SOAL) {
    redirect(`${kembali}${kembali.includes("?") ? "&" : "?"}galat=jumlah`);
  }

  let videoYoutubeId = "";
  if (videoMentah) {
    videoYoutubeId = uraiYoutubeId(videoMentah) ?? "";
    if (!videoYoutubeId) {
      redirect(`${kembali}${kembali.includes("?") ? "&" : "?"}galat=video`);
    }
  }

  let konten;
  try {
    konten = validasiKonten(JSON.parse(String(formData.get("konten") ?? "[]")));
  } catch {
    konten = null;
  }
  if (!konten) {
    redirect(`${kembali}${kembali.includes("?") ? "&" : "?"}galat=konten`);
  }

  /*
   * Field `berkas` selalu dikirim form. Bila kosong/tidak ada (mis. form lama
   * yang masih terbuka), daftar berkas yang tersimpan dibiarkan apa adanya —
   * jangan sampai berkas terhapus hanya karena field tidak ikut terkirim.
   */
  let berkas = null;
  const berkasMentah = formData.get("berkas");

  if (berkasMentah !== null) {
    try {
      const diurai = JSON.parse(String(berkasMentah));
      if (!Array.isArray(diurai)) throw new Error("bukan array");
      berkas = normalisasiBerkas(diurai);
    } catch {
      redirect(`${kembali}${kembali.includes("?") ? "&" : "?"}galat=berkas`);
    }
  }

  let slug;
  let urutan;
  let berkasLama = [];

  if (mode === "edit") {
    slug = String(formData.get("slug") ?? "").trim();
    const lama = await ambilMateri(kelas, slug);
    if (!lama) redirect("/guru/materi?galat=materi");
    urutan = lama.urutan;
    berkasLama = lama.berkas ?? [];
  } else {
    slug = String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase();

    if (!slug) slug = buatSlugMateri(judul);

    if (!POLA_SLUG.test(slug) || slug.length > 60) {
      redirect(`/guru/materi/baru?kelas=${kelas}&galat=slug`);
    }

    if (await ambilMateri(kelas, slug)) {
      redirect(`/guru/materi/baru?kelas=${kelas}&galat=slugada`);
    }

    urutan = await urutanBerikutnya(kelas);
  }

  const berkasSimpan = berkas === null ? berkasLama : berkas;

  const { error } = await simpanMateri({
    kelas,
    slug,
    judul,
    deskripsi,
    durasi,
    videoJudul: videoJudul || judul,
    videoYoutubeId,
    kuisJumlah,
    konten,
    berkas: berkasSimpan,
    urutan,
  });

  if (error) redirect(`${kembali}${kembali.includes("?") ? "&" : "?"}galat=simpan`);

  // Berkas yang dilepas dari form baru dihapus setelah materi tersimpan.
  if (mode === "edit") {
    const dipakai = new Set(berkasSimpan.map((item) => item.path));
    const dibuang = berkasLama
      .map((item) => item.path)
      .filter((path) => !dipakai.has(path));

    if (dibuang.length > 0) await hapusBerkas(dibuang);
  }

  // Cache materi dibuang sebelum revalidatePath, supaya render ulang halaman
  // guru membaca data baru dan bukan hasil cache 60 detik sebelumnya.
  lupakanMateri();

  revalidatePath("/");
  revalidatePath("/guru/materi");
  revalidatePath("/guru/kuis");
  revalidatePath(`/smk/${kelas}`);
  revalidatePath(`/smk/${kelas}/${slug}`);
  revalidatePath(`/smk/${kelas}/${slug}/kuis`);

  redirect(`/guru/materi?tersimpan=${mode}&kelas=${kelas}`);
}

/** Server action: hapus satu materi beserta bank soalnya. */
export async function hapusMateriAksi(formData) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  const slug = String(formData.get("slug") ?? "");

  if (!kelasSah(kelas)) redirect("/guru/materi?galat=kelas");

  const lama = await ambilMateri(kelas, slug);
  if (!lama) redirect("/guru/materi?galat=materi");

  const { error } = await hapusMateri(kelas, slug);
  if (error) redirect(`/guru/materi?galat=simpan&kelas=${kelas}`);

  // Bank soal dan berkas tidak punya foreign key, jadi dibersihkan di sini.
  await hapusBank(kelas, slug);
  await hapusBerkas((lama.berkas ?? []).map((item) => item.path));

  lupakanMateri();

  revalidatePath("/");
  revalidatePath("/guru/materi");
  revalidatePath("/guru/kuis");
  revalidatePath(`/smk/${kelas}`);

  redirect(`/guru/materi?dihapus=1&kelas=${kelas}`);
}

/** Server action: impor materi awal dari config/education.js. */
export async function imporMateriAksi() {
  if (!(await punyaAkses())) redirect("/guru/login");

  const { error, jumlah } = await imporMateriConfig();

  if (error) redirect("/guru/materi?galat=impor");

  lupakanMateri();

  revalidatePath("/");
  revalidatePath("/guru/materi");
  revalidatePath("/guru/kuis");

  redirect(`/guru/materi?impor=${jumlah}`);
}
