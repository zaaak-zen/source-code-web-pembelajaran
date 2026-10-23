import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/*
 * Middleware sesi Supabase
 *
 * Tanggung jawab:
 * - Menyegarkan cookie sesi pada setiap permintaan.
 * - Mengarahkan pengunjung tanpa sesi dari /dashboard dan /guru ke /login.
 *   Pemeriksaan peran guru/admin dilakukan di halaman masing-masing.
 *
 * Jika environment Supabase belum diisi, middleware diteruskan tanpa
 * pemeriksaan agar situs tetap dapat dibuka.
 */
export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return NextResponse.next();

  let respons = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(daftar) {
        daftar.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        respons = NextResponse.next({ request });

        daftar.forEach(({ name, value, options }) => {
          respons.cookies.set(name, value, options);
        });
      },
    },
  });

  // getSession() membaca cookie tanpa verifikasi; getUser() memverifikasi ke
  // server Supabase, sehingga aman dipakai untuk keputusan akses.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const jalur = request.nextUrl.pathname;
  const jalurPerluMasuk =
    jalur.startsWith("/dashboard") || jalur.startsWith("/guru");

  if (!user && jalurPerluMasuk) {
    const tujuan = request.nextUrl.clone();
    tujuan.pathname = "/login";
    tujuan.search = "";
    return NextResponse.redirect(tujuan);
  }

  return respons;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
