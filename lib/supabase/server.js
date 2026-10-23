import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/*
 * Klien Supabase untuk server (Server Component, Route Handler, Server Action).
 *
 * Tanggung jawab: membaca/menulis sesi lewat cookie HttpOnly.
 * Kembalian null jika environment belum diisi, sehingga halaman dapat
 * menampilkan pesan konfigurasi alih-alih error 500.
 */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(daftar) {
        try {
          daftar.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component tidak boleh menulis cookie. Penyegaran sesi
          // ditangani middleware, jadi kegagalan di sini aman diabaikan.
        }
      },
    },
  });
}
