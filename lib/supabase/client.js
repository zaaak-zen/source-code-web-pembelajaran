import { createBrowserClient } from "@supabase/ssr";

/*
 * Klien Supabase untuk browser.
 *
 * Tanggung jawab: membuat klien Supabase yang memakai anon key publik.
 * Jangan memakai service role key di sini.
 *
 * Klien dibuat saat dipanggil (bukan saat modul dimuat) agar halaman tetap
 * bisa dirender saat variabel environment belum diisi.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local."
    );
  }

  return createBrowserClient(url, anonKey);
}
