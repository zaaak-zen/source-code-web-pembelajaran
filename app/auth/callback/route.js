import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/*
 * Callback autentikasi Supabase.
 *
 * Tanggung jawab: menukar kode sekali pakai dari tautan email (verifikasi
 * akun atau reset kata sandi) menjadi sesi, lalu mengarahkan pengguna.
 *
 * Parameter `next` dibatasi ke jalur internal agar tidak bisa dipakai untuk
 * pengalihan ke domain lain.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const kode = searchParams.get("code");
  const next = searchParams.get("next");
  const tujuan = next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";

  if (!kode) {
    return NextResponse.redirect(`${origin}/login?galat=tautan-tidak-valid`);
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?galat=konfigurasi`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(kode);

  if (error) {
    return NextResponse.redirect(`${origin}/login?galat=tautan-tidak-valid`);
  }

  return NextResponse.redirect(`${origin}${tujuan}`);
}
