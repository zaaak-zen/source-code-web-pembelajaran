import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { kelasTerdaftar, punyaAksesKelas } from "@/lib/kelas/akses";

/*
 * Riwayat nilai siswa
 *
 * Tanggung jawab: membuka riwayat nilai kuis seorang siswa lewat kode akses
 * yang dibuat guru. Siswa tidak punya akun, dan tanggal lahir tidak pernah
 * disimpan, jadi kode acak inilah satu-satunya pembeda antar siswa.
 *
 * Alur:
 * 1. Guru membuka /guru/riwayat, lalu menekan "Buat kode" pada seorang siswa.
 * 2. Guru membagikan kode 6 karakter itu kepada siswa.
 * 3. Siswa membuka /smk/<kelas>/riwayat dan memasukkan kodenya.
 * 4. Riwayat nilai kelas itu ditampilkan; kode disimpan di cookie berisi
 *    sidik HMAC (bukan kode asli) selama 30 hari.
 *
 * Kode disimpan apa adanya di tabel `kode_riwayat` agar guru dapat melihatnya
 * kembali, sama seperti `token_kelas`. Mengganti atau mencabut kode otomatis
 * membuat cookie siswa yang lama tidak sah, karena sidik memakai kode sebagai
 * kunci HMAC.
 */

export const NAMA_COOKIE = "riwayat_kelas";

// Alfabet sama dengan token kelas: tanpa huruf I/O dan angka 0/1 agar tidak
// salah ketik. 32 karakter sehingga 256 habis dibagi rata (tanpa bias modulo).
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PANJANG_KODE = 6;

// Riwayat bukan data sensitif harian, jadi cookienya berumur panjang. Kode
// tetap dapat dicabut guru kapan saja.
const MASA_COOKIE = 60 * 60 * 24 * 30; // 30 hari
const PESAN_SIDIK = "warung-kode-riwayat-kelas-v1";
const PEMISAH = "|";
const TABEL = "kode_riwayat";

// Batas percobaan kode yang gagal, per alamat IP. Hanya kegagalan yang
// dihitung, supaya satu kelas dengan satu IP sekolah tetap bisa masuk.
const BATAS_GAGAL = 10;
const JENDELA_GAGAL = 10 * 60 * 1000;

const catatanGagal = new Map();

function sama(a, b) {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  // timingSafeEqual melempar bila panjang berbeda, jadi dibandingkan dulu.
  if (x.length !== y.length) return false;
  if (x.length === 0) return false;

  return timingSafeEqual(x, y);
}

function sidikRiwayat(kelas, kode) {
  if (!kode) return null;

  return createHmac("sha256", kode)
    .update(`${PESAN_SIDIK}:${kelas}`)
    .digest("hex");
}

function bacaBagian() {
  const nilai = cookies().get(NAMA_COOKIE)?.value;
  if (!nilai) return [];

  return nilai.split(PEMISAH).filter(Boolean);
}

/** Membuat kode acak 6 karakter untuk satu siswa. */
export function buatKodeAcak() {
  const bytes = randomBytes(PANJANG_KODE);
  let kode = "";

  for (let i = 0; i < PANJANG_KODE; i += 1) {
    kode += ALFABET[bytes[i] % ALFABET.length];
  }

  return kode;
}

/** Membersihkan kode ketikan siswa: huruf besar, tanpa spasi/tanda hubung. */
export function bersihkanKode(nilai) {
  return String(nilai ?? "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
}

/** Alamat IP pemanggil, untuk pembatas percobaan gagal. */
export function alamatIp(header) {
  const nilai = header?.get?.("x-forwarded-for") ?? "";
  return String(nilai).split(",")[0].trim() || "lokal";
}

/**
 * Mencatat percobaan gagal dan melaporkan apakah IP ini masih boleh mencoba.
 * Mengembalikan true bila batas sudah terlampaui.
 */
export function terlaluSeringGagal(ip) {
  const sekarang = Date.now();
  const catatan = catatanGagal.get(ip) ?? [];
  const masihBerlaku = catatan.filter((waktu) => sekarang - waktu < JENDELA_GAGAL);
  catatanGagal.set(ip, masihBerlaku);

  return masihBerlaku.length >= BATAS_GAGAL;
}

export function catatGagal(ip) {
  const sekarang = Date.now();
  const catatan = catatanGagal.get(ip) ?? [];
  catatanGagal.set(
    ip,
    [...catatan, sekarang].filter((waktu) => sekarang - waktu < JENDELA_GAGAL)
  );
}

export function bersihkanGagal(ip) {
  catatanGagal.delete(ip);
}

/**
 * True bila cookie perangkat ini memuat sidik untuk kelas itu.
 *
 * Cookie hanya menyimpan sidik HMAC, bukan kode asli (sidik tidak dapat
 * dibalik). Jadi keabsahan cukup diperiksa dari keberadaan dan kecocokan
 * formatnya; keaslian kode sudah dibuktikan saat kode pertama dimasukkan.
 */
export function punyaAksesRiwayat(kelas) {
  return bacaBagian().some((bagian) => {
    const [kelasBagian, nilai] = bagian.split(".");
    return kelasBagian === kelas && Boolean(nilai) && nilai.length === 64;
  });
}

/**
 * Siswa yang sedang terhubung di perangkat ini untuk kelas itu, dibaca dengan
 * mencocokkan sidik di cookie. Null bila belum ada kode yang dimasukkan.
 */
export async function siswaRiwayatAktif(kelas) {
  if (!punyaAksesRiwayat(kelas)) return null;

  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const kode = await kodeRiwayatAktif(kelas);
  if (!kode) return null;

  const { data: barisKode, error } = await supabase
    .from(TABEL)
    .select("siswa_id, kode")
    .eq("kelas", kelas)
    .eq("kode", kode)
    .maybeSingle();

  if (error || !barisKode) return null;

  const { data: siswa, error: galatSiswa } = await supabase
    .from("siswa")
    .select("id, nama, kelas")
    .eq("id", barisKode.siswa_id)
    .maybeSingle();

  if (galatSiswa || !siswa) return null;

  return siswa;
}

/**
 * Mencari kode asli dari sidik yang tersimpan di cookie, dengan membandingkan
 * ke semua kode di kelas itu. Kelas biasanya berisi puluhan siswa, jadi
 * pemindaian ini murah dan tidak menyimpan kode di perangkat siswa.
 */
async function kodeRiwayatAktif(kelas) {
  const sidik = bacaBagian()
    .find((bagian) => bagian.split(".")[0] === kelas)
    ?.split(".")[1];

  if (!sidik) return null;

  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABEL)
    .select("kode")
    .eq("kelas", kelas);

  if (error) {
    console.error("Riwayat: gagal membaca kode kelas.", error.message);
    return null;
  }

  const cocok = (data ?? []).find((baris) =>
    sama(sidikRiwayat(kelas, baris.kode), sidik)
  );

  return cocok?.kode ?? null;
}

/**
 * Mencari siswa pemilik sebuah kode di kelas tertentu. Mengembalikan
 * { siswaId, nama, kode } atau null. `kode` yang dikembalikan adalah kode
 * asli, sehingga cookie dapat dibuat tanpa membaca tabel dua kali.
 */
export async function cariSiswaDenganKode(kelas, kode) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABEL)
    .select("siswa_id, kelas, kode")
    .eq("kelas", kelas)
    .eq("kode", kode)
    .maybeSingle();

  if (error) {
    console.error("Riwayat: gagal membaca kode.", error.message);
    return null;
  }

  return data ?? null;
}

/** Menyimpan kode yang sudah terverifikasi ke cookie perangkat. */
export function simpanKodeCookie(kelas, kode) {
  const nilai = sidikRiwayat(kelas, kode);
  if (!nilai) return false;

  const lain = bacaBagian().filter((bagian) => bagian.split(".")[0] !== kelas);

  cookies().set(
    NAMA_COOKIE,
    [...lain, `${kelas}.${nilai}`].join(PEMISAH),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MASA_COOKIE,
    }
  );

  return true;
}

/** Menghapus akses riwayat untuk satu kelas, atau semuanya. */
export function lupakanKode(kelas) {
  const lain = kelas
    ? bacaBagian().filter((bagian) => bagian.split(".")[0] !== kelas)
    : [];

  if (lain.length === 0) {
    cookies().delete({ name: NAMA_COOKIE, path: "/" });
    return;
  }

  cookies().set(NAMA_COOKIE, lain.join(PEMISAH), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MASA_COOKIE,
  });
}

/**
 * Server action: verifikasi kode yang diketik siswa, lalu buka halaman
 * riwayat. Siswa harus sudah punya akses kelas (token) terlebih dahulu.
 */
export async function masukRiwayat(formData) {
  "use server";

  const kelas = String(formData.get("kelas") ?? "");
  if (!kelasTerdaftar(kelas)) redirect("/smk?galat=akses");

  if (!(await punyaAksesKelas(kelas))) redirect("/smk?galat=akses");

  const ip = alamatIp(headers());
  if (terlaluSeringGagal(ip)) {
    redirect(`/smk/${kelas}/riwayat?galat=batas`);
  }

  const kode = bersihkanKode(formData.get("kode"));
  if (!kode || kode.length !== PANJANG_KODE) {
    catatGagal(ip);
    redirect(`/smk/${kelas}/riwayat?galat=kode`);
  }

  const cocok = await cariSiswaDenganKode(kelas, kode);

  if (!cocok) {
    catatGagal(ip);
    redirect(`/smk/${kelas}/riwayat?galat=kode`);
  }

  bersihkanGagal(ip);
  simpanKodeCookie(kelas, cocok.kode);

  redirect(`/smk/${kelas}/riwayat`);
}
