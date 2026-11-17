import { createClient } from "@supabase/supabase-js";

/*
 * Klien Supabase untuk server (Server Component, Route Handler, Server Action).
 *
 * Tanggung jawab: menyediakan akses database dari sisi server saja.
 *
 * Proyek ini tidak memakai akun pengguna, sehingga tidak ada sesi Supabase.
 * Klien dibuat dengan service role key yang hanya ada di environment server;
 * kunci ini tidak pernah dikirim ke browser. Kembalian null jika environment
 * belum diisi, sehingga halaman dapat menampilkan pesan konfigurasi alih-alih
 * error 500.
 *
 * Dua mode cache
 * --------------
 * Next.js 14 menyimpan respons fetch GET ke Data Cache (bawaan: bertahan satu
 * tahun), termasuk hasil query Supabase. Akibatnya perubahan data di database
 * tidak pernah terlihat oleh halaman. Contoh nyata: saat sebuah baris dihapus
 * langsung lewat SQL Editor, jawaban kosong (`[]`) ikut tersimpan dan terus
 * dipakai setelah baris dibuat lagi, sehingga data yang tampil tidak sesuai
 * isi database.
 *
 * Karena itu hasil query tidak boleh masuk Data Cache. Caranya ada dua, dan
 * keduanya tersedia di sini:
 *
 * - `createSupabaseServerClient()` — memakai `cache: "no-store"`. Selalu segar,
 *   tetapi halaman yang memanggilnya dianggap dinamis dan dibangun ulang setiap
 *   permintaan. Pakai ini untuk data yang boleh/harus berubah seketika.
 *
 * - `createSupabaseCacheClient()` — memakai `cache: "force-cache"` supaya
 *   Next.js tidak menganggap halaman dinamis. Tidak ada data basi yang lolos
 *   karena route-nya sudah dibatasi: `export const revalidate` pada halaman
 *   (beranda) membuang hasil lama secara berkala, dan server action guru
 *   memanggil `revalidatePath` setelah menyimpan. Pakai ini untuk halaman yang
 *   isinya hanya berubah lewat panel guru.
 *
 * Halaman yang membaca cookie (kelas, absen, riwayat, panel guru) tetap memakai
 * klien no-store dan `force-dynamic`, karena isinya memang berbeda tiap
 * pengunjung.
 */

function buatKlien(cacheMode) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: cacheMode }),
    },
  });
}

/**
 * Klien segar: setiap query benar-benar menuju database, tidak pernah dibaca
 * dari cache. Ini pilihan aman (default) untuk halaman yang butuh data terkini.
 */
export function createSupabaseServerClient() {
  return buatKlien("no-store");
}

/**
 * Klien untuk halaman yang boleh memakai hasil cache selama masa `revalidate`
 * halaman tersebut belum lewat. Digunakan oleh beranda, yang angkanya hanya
 * berubah saat guru menyimpan materi atau soal.
 *
 * Jangan pakai di halaman yang isinya berbeda per pengunjung (cookie), dan
 * jangan pakai untuk absensi atau nilai kuis.
 */
export function createSupabaseCacheClient() {
  return buatKlien("force-cache");
}
