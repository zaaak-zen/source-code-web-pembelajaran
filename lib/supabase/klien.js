import { createBrowserClient, createServerClient } from "@supabase/ssr";

/*
 * Klien Supabase Auth (anon key)
 *
 * Tanggung jawab: menyediakan klien untuk login/logout akun guru lewat
 * Supabase Auth. Berbeda dengan `server.js` yang memakai service role untuk
 * database, klien di sini memakai anon key karena hanya mengurus sesi.
 *
 * Akun yang sah: pengguna Supabase Auth yang `app_metadata.role` bernilai
 * "guru". `app_metadata` hanya dapat diubah dari dashboard/Admin API, jadi
 * pengguna biasa tidak bisa menaikkan perannya sendiri.
 */

export const PERAN_GURU = "guru";

/*
 * Masa sesi login guru.
 *
 * Sesi berakhir 2 jam setelah guru MASUK, bukan 2 jam setelah aktivitas
 * terakhir. Guru wajib memasukkan password lagi setelah itu (auto logout).
 *
 * Kenapa "sejak masuk" dan bukan "sejak aktivitas": penghitung aktivitas
 * membuat sesi di komputer sekolah yang ditinggal tetap hidup selama ada
 * permintaan apa pun, sehingga 2 jam tidak pernah benar-benar tercapai.
 * Dengan batas tetap, sesi pasti berakhir.
 *
 * Cara kerja:
 * - Cookie penanda `sesi_guru_mulai` menyimpan waktu mulai login dalam epoch
 *   milidetik. Nilainya HttpOnly dan hanya ditulis server saat login.
 * - `sesiGuruKedaluwarsa()` di middleware menghapus cookie sesi Supabase bila
 *   umur penanda melewati `MASA_SESI_GURU_DETIK`.
 * - Cookie Supabase sendiri diberi `maxAge` yang sama saat ditulis lewat
 *   klien ini, sehingga browser juga membuangnya di waktu yang sama walau
 *   tab lama dibiarkan terbuka.
 * - Penyegaran token Supabase (access token berumur 1 jam) TIDAK memperpanjang
 *   sesi, karena penanda mulai tidak ikut diperbarui oleh penyegaran.
 */
export const NAMA_COOKIE_SESI = "sesi_guru_mulai";
export const MASA_SESI_GURU_DETIK = 2 * 60 * 60; // 2 jam

/** True bila URL dan anon key Supabase Auth tersedia. */
export function authSiap() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Batasi `maxAge` cookie sesi Supabase agar tidak melewati sisa masa sesi.
 *
 * Klien Supabase meminta `maxAge` sendiri untuk setiap cookie (token akses,
 * refresh token, dsb.). Di sini nilainya dipotong supaya tidak ada cookie sesi
 * yang bertahan setelah 2 jam. Bila `sisaDetik` tidak diketahui (mis. saat
 * pertama kali login), nilai dari Supabase dibiarkan dan penanda mulai yang
 * menjadi acuan.
 */
export function batasiMaxAge(options, sisaDetik) {
  if (!options || typeof sisaDetik !== "number" || sisaDetik <= 0) {
    return options;
  }

  return { ...options, maxAge: Math.min(options.maxAge ?? Infinity, sisaDetik) };
}

/** Klien untuk komponen browser, misalnya memanggil `auth.signOut()`. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase Auth belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local."
    );
  }

  return createBrowserClient(url, anonKey);
}

/**
 * Klien untuk server action dan server component.
 *
 * `cookies()` baru hanya bisa ditulis di server action/route handler. Saat
 * dipanggil dari server component (hanya membaca), penyegaran token dilewati
 * dan middleware yang menanganinya.
 *
 * `sisaDetik` (opsional) membatasi umur cookie sesi Supabase. Middleware
 * mengirim sisa masa sesi guru di sini supaya cookie yang disegarkan tidak
 * hidup melewati batas 2 jam.
 */
export function createSupabaseAuthServerClient(cookieStore, sisaDetik) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(daftar) {
        try {
          daftar.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, batasiMaxAge(options, sisaDetik));
          });
        } catch {
          // Dipanggil dari server component: biarkan middleware menyegarkan.
        }
      },
    },
  });
}
