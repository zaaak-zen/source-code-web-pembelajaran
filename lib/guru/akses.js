"use server";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  PERAN_GURU,
  NAMA_COOKIE_SESI,
  authSiap,
  createSupabaseAuthServerClient,
} from "@/lib/supabase/klien";
import { tandaiMulaiSesi, uraiMulaiSesi } from "@/lib/guru/sesi";

/*
 * Akun guru (satu akun, lewat Supabase Auth)
 *
 * Tanggung jawab: memeriksa sesi Supabase Auth, memastikan perannya guru, dan
 * menyediakan aksi masuk serta aksi kirim tautan ganti password.
 *
 * Keluar dilakukan dari browser (`components/Guru/TombolKeluarGuru.jsx`) karena
 * cookie sesi Supabase dikelola klien Supabase.
 *
 * Model:
 * - Akun guru adalah pengguna Supabase Auth (email + password) dengan
 *   `app_metadata.role = "guru"`. Akun dibuat sekali lewat Supabase Dashboard
 *   (Authentication -> Users -> Add user), lalu password diubah lewat email
 *   dari /guru/keamanan atau diatur ulang dari dashboard.
 * - Sesi disimpan Supabase sebagai cookie yang disegarkan `middleware.js`.
 *   Cookie lama milik akun lain tidak berlaku karena `getUser()` memverifikasi
 *   sesi ke server Supabase.
 * - Login/logout memakai klien anon key (`lib/supabase/klien.js`), bukan
 *   password yang disimpan sendiri.
 *
 * Keamanan:
 * - Password ditangani Supabase (hash bcrypt di sisi mereka); aplikasi tidak
 *   pernah menyimpan password.
 * - Username/email salah dan password salah memberi pesan yang sama.
 * - Maksimal 5 percobaan gagal per IP per 10 menit.
 * - Cookie sesi HttpOnly dan SameSite=Lax bawaan Supabase; jangan diubah
 *   menjadi dapat dibaca JavaScript.
 * - Sesi berakhir 2 jam setelah login (lihat lib/guru/sesi.js). Middleware
 *   yang membuang cookie sesi saat penanda mulai kedaluwarsa.
 *
 * Catatan: batas percobaan disimpan di memori proses. Setelah server restart
 * atau cold start di Vercel, catatan kembali kosong. Ini pembatas tambahan,
 * bukan satu-satunya pengamanan.
 */

const BATAS_GAGAL = 5;
const JENDELA_GAGAL = 10 * 60 * 1000;
const catatanGagal = new Map();

/** Akun yang sedang masuk, atau null. Dibaca sekali per permintaan. */
const penggunaGuru = cache(async () => {
  const cookieStore = cookies();

  /*
   * Penanda sesi tidak ada atau sudah lewat 2 jam: perlakukan sebagai belum
   * masuk. Middleware juga sudah menghapus cookienya, tetapi pemeriksaan di
   * sini membuat server component tetap aman bila middleware dilewati
   * (mis. pemanggilan langsung ke route handler).
   */
  if (uraiMulaiSesi(cookieStore.get(NAMA_COOKIE_SESI)?.value) === null) {
    return null;
  }

  const supabase = createSupabaseAuthServerClient(cookieStore);
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  if (user.app_metadata?.role !== PERAN_GURU) return null;

  return user;
});

/** True bila Supabase Auth sudah dikonfigurasi di server. */
export async function guruSiap() {
  return authSiap();
}

/** True bila pengunjung punya sesi guru yang sah. */
export async function punyaAkses() {
  return Boolean(await penggunaGuru());
}

/** Email guru yang sedang masuk, atau null. */
export async function emailGuru() {
  return (await penggunaGuru())?.email ?? null;
}

/** Sidik akun untuk ditampilkan (bukan email penuh), misalnya "gu••@sekolah.sch.id". */
export async function sidikGuru() {
  const email = await emailGuru();
  if (!email) return "";

  const [nama, domain] = email.split("@");
  if (!domain) return email;

  const terlihat = nama.slice(0, 2);
  return `${terlihat}${"•".repeat(Math.max(nama.length - 2, 2))}@${domain}`;
}

/** Alamat IP pengunjung untuk pembatas percobaan gagal. */
function alamatIp() {
  const h = headers();
  const diteruskan = h.get("x-forwarded-for") ?? "";
  const pertama = diteruskan.split(",")[0]?.trim();
  return pertama || h.get("x-real-ip") || "lokal";
}

function kenaBatas(ip) {
  const catatan = catatanGagal.get(ip);
  if (!catatan) return false;

  if (Date.now() - catatan.mulai > JENDELA_GAGAL) {
    catatanGagal.delete(ip);
    return false;
  }

  return catatan.jumlah >= BATAS_GAGAL;
}

function catatGagal(ip) {
  const sekarang = Date.now();
  const catatan = catatanGagal.get(ip);

  if (!catatan || sekarang - catatan.mulai > JENDELA_GAGAL) {
    catatanGagal.set(ip, { jumlah: 1, mulai: sekarang });
  } else {
    catatan.jumlah += 1;
  }

  // Jaga ukuran Map agar tidak tumbuh tanpa batas di proses yang berumur panjang.
  if (catatanGagal.size > 5000) {
    for (const [kunci, nilai] of catatanGagal) {
      if (sekarang - nilai.mulai > JENDELA_GAGAL) catatanGagal.delete(kunci);
    }
  }
}

/**
 * Server action: masuk dengan email + password Supabase Auth.
 *
 * Setelah login berhasil, sesi Supabase disimpan ke cookie lalu pengguna
 * diarahkan ke /guru. Bila akun ada tetapi perannya bukan guru, sesinya
 * langsung dihapus supaya tidak tertinggal di browser.
 */
export async function masukGuru(formData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const sandi = String(formData.get("sandi") ?? "");

  if (!email || !sandi || sandi.length > 200) {
    redirect("/guru/login?galat=kredensial");
  }

  const ip = alamatIp();
  if (kenaBatas(ip)) redirect("/guru/login?galat=batas");

  const cookieStore = cookies();
  const supabase = createSupabaseAuthServerClient(cookieStore);

  if (!supabase || !authSiap()) redirect("/guru/login?galat=konfigurasi");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: sandi,
  });

  if (error || !data?.user) {
    catatGagal(ip);
    redirect("/guru/login?galat=kredensial");
  }

  if (data.user.app_metadata?.role !== PERAN_GURU) {
    await supabase.auth.signOut();
    redirect("/guru/login?galat=peran");
  }

  /*
   * Tandai waktu mulai sesi. Cookie Supabase baru saja ditulis oleh
   * `signInWithPassword` di atas, dan penanda ini menjadi acuan kapan sesi
   * harus berakhir (2 jam). Ditulis setelah peran dipastikan guru supaya
   * tidak ada penanda tertinggal untuk akun yang ditolak.
   */
  tandaiMulaiSesi(cookieStore);

  catatanGagal.delete(ip);
  redirect("/guru");
}

/**
 * Server action: kirim email ganti password ke email guru yang sedang masuk.
 *
 * Supabase yang mengirim tautannya; setelah password diganti, semua sesi
 * perangkat lain ikut berakhir. Halaman yang mengirim diarahkan kembali dengan
 * `?kirim=1`.
 */
export async function mintaGantiSandi() {
  const cookieStore = cookies();
  const supabase = createSupabaseAuthServerClient(cookieStore);

  if (!supabase) redirect("/guru/keamanan?galat=konfigurasi");

  const user = await penggunaGuru();
  if (!user?.email) redirect("/guru/login");

  const { error } = await supabase.auth.resetPasswordForEmail(user.email);

  if (error) {
    console.error("Akses guru: gagal mengirim email ganti sandi.", error.message);
    redirect("/guru/keamanan?galat=kirim");
  }

  redirect("/guru/keamanan?kirim=1");
}
