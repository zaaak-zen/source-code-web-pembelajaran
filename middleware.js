import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  cookieSesiSupabase,
  sisaSesiDetik,
} from "@/lib/guru/sesi";
import { NAMA_COOKIE_SESI } from "@/lib/supabase/klien";

/*
 * Middleware sesi Supabase
 *
 * Tanggung jawab:
 * - Menegakkan masa sesi guru: 2 jam sejak login. Begitu penanda
 *   `sesi_guru_mulai` kedaluwarsa, cookie sesi Supabase dibuang dan
 *   pengunjung diarahkan ke /guru/login?galat=sesi.
 * - Menyegarkan cookie sesi Supabase pada setiap permintaan selama sesi masih
 *   berlaku, supaya guru yang sedang membuka panel tidak tiba-tiba terlempar
 *   keluar saat access tokennya (umur 1 jam) kedaluwarsa. Penyegaran ini tidak
 *   memperpanjang masa sesi, karena acuannya tetap penanda mulai.
 * - Mengarahkan pengunjung tanpa sesi dari /guru ke /guru/login. Pemeriksaan
 *   peran guru dilakukan di halaman (lib/guru/akses.js), karena middleware
 *   tidak memanggil database aplikasi.
 *
 * Bila environment Supabase Auth belum diisi, middleware diteruskan tanpa
 * pemeriksaan agar situs tetap dapat dibuka.
 */
export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return NextResponse.next();

  const jalur = request.nextUrl.pathname;
  const perluMasuk = jalur.startsWith("/guru") && jalur !== "/guru/login";

  /*
   * Langkah 1: periksa masa sesi sebelum apa pun.
   *
   * Penanda `null` berarti sesi lama (login sebelum fitur ini dipasang) atau
   * penanda rusak. Dalam kasus itu cookie Supabase dipertahankan agar guru
   * yang sedang login tidak terlempar tanpa alasan. Guru cukup login sekali
   * lagi untuk mendapatkan penanda baru.
   */
  const sisa = sisaSesiDetik(request.cookies.get(NAMA_COOKIE_SESI)?.value);

  if (sisa === 0) {
    const tujuan = request.nextUrl.clone();
    tujuan.pathname = "/guru/login";
    tujuan.search = "galat=sesi";

    const respons = NextResponse.redirect(tujuan);

    // Buang semua cookie sesi Supabase dan penanda mulai.
    const namaSesi = request.cookies
      .getAll()
      .filter((c) => cookieSesiSupabase(c.name) || c.name === NAMA_COOKIE_SESI)
      .map((c) => c.name);

    namaSesi.forEach((nama) => {
      respons.cookies.set(nama, "", { path: "/", maxAge: 0 });
    });

    return respons;
  }

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
          /*
           * Potong umur cookie sesi Supabase ke sisa masa sesi guru. Tanpa
           * potongan ini, cookie yang disegarkan Supabase dapat hidup lebih
           * lama dari 2 jam dan hanya halaman yang akan menolaknya.
           */
          const opsi =
            sisa !== null
              ? { ...options, maxAge: Math.min(options?.maxAge ?? Infinity, sisa) }
              : options;

          respons.cookies.set(name, value, opsi);
        });
      },
    },
  });

  // getSession() membaca cookie tanpa verifikasi; getUser() memverifikasi ke
  // server Supabase, sehingga aman dipakai untuk keputusan akses.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && perluMasuk) {
    const tujuan = request.nextUrl.clone();
    tujuan.pathname = "/guru/login";
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
