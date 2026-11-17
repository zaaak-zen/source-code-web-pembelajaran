"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  BATAS_TOKEN,
  NAMA_COOKIE,
  samaHash,
  sidikPerangkat,
  tokenPerangkatAktif,
} from "@/lib/guru/perangkat";

/*
 * Server action kunci perangkat
 *
 * Dipisah dari lib/guru/perangkat.js karena file ber-"use server" hanya boleh
 * mengekspor fungsi async, sedangkan modul utamanya juga mengekspor konstanta
 * (NAMA_COOKIE) dan helper sinkron (buatTokenPerangkat, samaHash).
 *
 * Satu-satunya aksi di sini adalah menyimpan token perangkat yang dimasukkan
 * siswa di /smk. Token salah tidak menyebabkan galat halaman: siswa
 * dikembalikan ke /smk dengan pesan.
 */

const AWALAN_TOKEN = "token.";
const AWALAN_SISWA = "siswa.";
const MASA_COOKIE = 60 * 60 * 24 * 180; // 180 hari

/**
 * Hapus token perangkat dari perangkat ini. Dipakai tombol "Ganti perangkat"
 * di /smk: siswa memasukkan ulang token, tanpa mengubah token yang dipegang
 * guru dan tanpa melepas ikatan siswa di database.
 */
export async function lupakanPerangkat() {
  cookies().delete(NAMA_COOKIE);
  revalidatePath("/smk");
  redirect("/smk");
}

export async function simpanTokenPerangkat(formData) {
  const lanjut = String(formData.get("lanjut") ?? "/smk");
  const aman =
    lanjut.startsWith("/smk") && !lanjut.startsWith("//") && !lanjut.includes("\\")
      ? lanjut
      : "/smk";

  const token = String(formData.get("token") ?? "")
    .trim()
    .toUpperCase();

  if (token.length < BATAS_TOKEN.min || token.length > BATAS_TOKEN.max) {
    redirect("/smk?galat=token");
  }

  const berlaku = await tokenPerangkatAktif();

  if (!berlaku) redirect("/smk?galat=perangkat-konfigurasi");

  if (!(await samaHash(token, berlaku))) {
    cookies().delete(NAMA_COOKIE);
    redirect("/smk?galat=token");
  }

  /*
   * Perangkat yang sudah terikat ke seorang siswa tetap mempertahankan
   * ikatannya; yang berubah hanya tokennya. Hash baru dihitung dengan token
   * yang baru supaya halaman absen mengenali ikatan itu.
   */
  const tersimpan = cookies().get(NAMA_COOKIE)?.value ?? "";
  const potongan = tersimpan.startsWith(AWALAN_SISWA)
    ? tersimpan.slice(AWALAN_SISWA.length).split(".")
    : [];
  const siswaId = potongan[0] ?? "";

  if (siswaId) {
    const hash = await sidikPerangkat(siswaId);

    if (hash) {
      cookies().set(NAMA_COOKIE, `${AWALAN_SISWA}${siswaId}.${hash}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: MASA_COOKIE,
      });

      revalidatePath("/smk");
      redirect(aman);
    }
  }

  cookies().set(NAMA_COOKIE, `${AWALAN_TOKEN}${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MASA_COOKIE,
  });

  revalidatePath("/smk");
  redirect(aman);
}
