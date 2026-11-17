import {
  MASA_SESI_GURU_DETIK,
  NAMA_COOKIE_SESI,
} from "@/lib/supabase/klien";

/*
 * Penanda masa sesi login guru
 *
 * Tanggung jawab: mencatat kapan guru mulai login, lalu menghitung sisa masa
 * sesinya. Logika "2 jam sejak login" hidup di satu tempat ini supaya
 * `masukGuru`, `middleware.js`, dan `createSupabaseAuthServerClient` tidak
 * saling bertentangan.
 *
 * Cookie `sesi_guru_mulai` sengaja dipisah dari cookie Supabase. Cookie
 * Supabase disegarkan berulang kali oleh middleware dan Supabase sendiri;
 * kalau masa sesi dititipkan di sana, penyegaran akan terus memperpanjangnya.
 * Penanda ini hanya ditulis sekali, saat login berhasil.
 */

/** Opsi cookie penanda sesi; dipakai saat menulisnya di server action. */
export const OPSI_COOKIE_SESI = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MASA_SESI_GURU_DETIK,
};

/** Tulis penanda mulai sesi dengan waktu sekarang (server action saja). */
export function tandaiMulaiSesi(cookieStore) {
  cookieStore.set(NAMA_COOKIE_SESI, String(Date.now()), OPSI_COOKIE_SESI);
}

/** Ubah nilai mentah cookie penanda menjadi angka waktu mulai, atau null. */
export function uraiMulaiSesi(nilai) {
  if (!nilai) return null;
  const angka = Number(nilai);
  if (!Number.isFinite(angka) || angka <= 0) return null;
  return angka;
}

/**
 * Sisa masa sesi dalam detik, dihitung dari nilai mentah penanda.
 *
 * - `null`  : tidak ada penanda (sesi lama sebelum fitur ini, atau penanda
 *             cacat). Pemanggil memilih kebijakan sendiri.
 * - `0`     : sesi sudah habis.
 * - `> 0`   : sisa detik.
 */
export function sisaSesiDetik(nilaiMentah) {
  const mulai = uraiMulaiSesi(nilaiMentah);
  if (mulai === null) return null;

  const habisPada = mulai + MASA_SESI_GURU_DETIK * 1000;
  const sisaMs = habisPada - Date.now();
  if (sisaMs <= 0) return 0;

  return Math.ceil(sisaMs / 1000);
}

/**
 * Hapus cookie sesi Supabase dari `cookieStore`.
 *
 * Middleware TIDAK memakai fungsi ini: di sana daftar cookie harus disalin
 * dulu ke respons, jadi penghapusan dilakukan langsung lewat
 * `respons.cookies.set(nama, "", { maxAge: 0 })`. Fungsi ini disediakan untuk
 * pemakaian di server action yang memang boleh menulis cookie.
 */
export function hapusCookieSesiSupabase(cookieStore) {
  cookieStore
    .getAll()
    .filter((c) => cookieSesiSupabase(c.name))
    .forEach((c) => cookieStore.delete(c.name));
}

/** True bila cookie ini milik sesi Supabase Auth. */
export function cookieSesiSupabase(name) {
  return name.startsWith("sb-") && name.includes("auth-token");
}
