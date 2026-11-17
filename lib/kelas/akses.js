import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dariCache, lupakan } from "@/lib/cache/tembol";

/*
 * Akses kelas tanpa akun
 *
 * Tanggung jawab: membaca token kelas yang dibuat guru dari tabel `token_kelas`,
 * menukarnya dengan cookie berisi sidik HMAC, dan menyediakan aksi masuk serta
 * keluar yang dipakai halaman /smk beserta seluruh halaman di dalamnya.
 *
 * Dipakai oleh:
 * - app/smk/page.jsx                (formulir token)
 * - app/smk/[kelas]/page.jsx        (pemeriksaan)
 * - app/smk/[kelas]/[materi]/page.jsx
 * - app/smk/[kelas]/[materi]/kuis/page.jsx
 * - app/api/kuis/route.js
 * - app/guru/token/page.jsx         (membuat dan mencabut token)
 *
 * Guru membuat token dari /guru/token, bukan dari environment. Satu token per
 * kelas; token kelas 10 tidak bisa membuka kelas 11. Karena token dibaca dari
 * database, guru dapat menggantinya kapan saja tanpa menjalankan ulang server.
 *
 * Cookie hanya menyimpan sidik HMAC per kelas, bukan token asli. Path sengaja
 * diisi "/" (bukan "/smk"), karena POST /api/kuis juga memeriksa cookie ini
 * dan browser tidak mengirim cookie Path=/smk ke /api. Cookie ini HttpOnly dan
 * hanya berisi sidik, jadi aman bila ikut terkirim ke halaman lain.
 */

export const NAMA_COOKIE = "akses_kelas";

// Tanpa huruf I/O dan angka 0/1 agar tidak salah ketik. Panjang 32 karakter,
// sehingga 256 (nilai satu byte) habis dibagi rata dan tidak ada bias modulo.
export const ALFABET_TOKEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PANJANG_TOKEN = 8;

const MASA_COOKIE = 60 * 60 * 8; // 8 jam, kira-kira satu hari sekolah
const PESAN_SIDIK = "warung-kode-akses-kelas-v1";
const PEMISAH = "|";
const TABEL_TOKEN = "token_kelas";

// Batas percobaan token yang gagal, per alamat IP. Hanya percobaan gagal yang
// dihitung, supaya satu kelas yang memakai satu IP sekolah tetap bisa masuk.
const BATAS_GAGAL = 10;
const JENDELA_GAGAL = 10 * 60 * 1000;

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];

const catatanGagal = new Map();

/** Membuat token acak untuk sebuah kelas. Dipakai halaman /guru/token. */
export function buatTokenAcak() {
  const bytes = randomBytes(PANJANG_TOKEN);
  let token = "";

  for (let i = 0; i < PANJANG_TOKEN; i += 1) {
    token += ALFABET_TOKEN[bytes[i] % ALFABET_TOKEN.length];
  }

  return token;
}

/** True bila slug benar-benar terdaftar di config/education.js. */
export function kelasTerdaftar(slug) {
  return daftarKelas.some((item) => item.slug === slug);
}

/** Kunci cache peta token. Dipakai juga saat guru mengganti token. */
const KUNCI_TOKEN = "token:kelas";

/*
 * Masa berlaku cache token (detik).
 *
 * Token dibaca pada setiap halaman kelas, materi, kuis, dan setiap panggilan
 * /api/kuis. Isinya hanya berubah lewat /guru/token, dan kedua aksi di sana
 * memanggil lupakanToken(). Nilai token tidak sensitif untuk disimpan di
 * memori server: yang dikirim ke browser tetap sidik HMAC, bukan tokennya.
 */
const TTL_TOKEN = 60;

/** Buang cache token setelah guru membuat atau mencabut token. */
export function lupakanToken() {
  lupakan(KUNCI_TOKEN);
}

/**
 * Seluruh token kelas dari database, sebagai Map slug -> token.
 * Null bila Supabase belum dikonfigurasi atau kueri gagal.
 *
 * Dibungkus cache React agar satu permintaan hanya membaca tabel sekali,
 * meskipun beberapa pemeriksaan akses dipanggil di halaman yang sama, dan
 * cache lintas-permintaan agar halaman berikutnya tidak menunggu database.
 */
const ambilPetaToken = cache(async () =>
  dariCache(KUNCI_TOKEN, TTL_TOKEN, async () => {
    const supabase = createSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from(TABEL_TOKEN)
      .select("kelas, token");

    if (error) {
      console.error("Akses kelas: gagal membaca token.", error.message);
      return null;
    }

    const peta = new Map();

    for (const baris of data ?? []) {
      if (typeof baris?.kelas !== "string" || typeof baris?.token !== "string") {
        continue;
      }
      if (!baris.kelas || !baris.token) continue;

      peta.set(baris.kelas, baris.token);
    }

    return peta;
  })
);

/** Token aktif satu kelas, atau null bila belum dibuat guru. */
export async function tokenKelasAktif(slug) {
  const peta = await ambilPetaToken();
  return peta?.get(slug) ?? null;
}

/** True bila minimal satu kelas sudah punya token dari guru. */
export async function adaToken() {
  const peta = await ambilPetaToken();
  if (!peta) return false;

  return daftarKelas.some((kelas) => Boolean(peta.get(kelas.slug)));
}

/** Sidik token untuk satu kelas. Nilai cookie tidak pernah berisi token asli. */
function sidikToken(slug, token) {
  if (!token) return null;

  return createHmac("sha256", token)
    .update(`${PESAN_SIDIK}:${slug}`)
    .digest("hex");
}

function sama(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;

  return timingSafeEqual(x, y);
}

/** Mencari kelas yang tokennya cocok dengan masukan, tanpa membocorkan waktu. */
function kelasDariToken(peta, masukan) {
  const nilai = String(masukan ?? "").trim().toUpperCase();
  if (!nilai) return null;

  for (const kelas of daftarKelas) {
    const token = peta.get(kelas.slug);
    if (!token) continue;

    // Token diketik tanpa membedakan huruf besar/kecil.
    if (sama(nilai, token.toUpperCase())) return kelas.slug;
  }

  return null;
}

function bacaBagian() {
  const nilai = cookies().get(NAMA_COOKIE)?.value;
  if (!nilai) return [];

  return nilai.split(PEMISAH).filter(Boolean);
}

/** Daftar slug kelas yang cookie-nya masih sah. */
export async function daftarKelasTerbuka() {
  const peta = await ambilPetaToken();
  if (!peta) return [];

  const terbuka = [];

  for (const bagian of bacaBagian()) {
    const titik = bagian.indexOf(".");
    if (titik < 1) continue;

    const slug = bagian.slice(0, titik);
    const nilai = bagian.slice(titik + 1);

    if (!kelasTerdaftar(slug)) continue;

    const harapan = sidikToken(slug, peta.get(slug));

    if (harapan && sama(nilai, harapan) && !terbuka.includes(slug)) {
      terbuka.push(slug);
    }
  }

  return terbuka;
}

/** True bila cookie kelas ini sah (token sudah pernah dimasukkan). */
export async function punyaAksesKelas(slug) {
  return (await daftarKelasTerbuka()).includes(slug);
}

function ambilIp() {
  // Entri paling kanan X-Forwarded-For ditambahkan proxy terdekat; entri paling
  // kiri berasal dari klien dan bisa dipalsukan.
  const forwarded = headers().get("x-forwarded-for");

  if (forwarded) {
    const daftar = forwarded
      .split(",")
      .map((bagian) => bagian.trim())
      .filter(Boolean);
    if (daftar.length > 0) return daftar[daftar.length - 1];
  }

  return headers().get("x-real-ip")?.trim() || "tidak-diketahui";
}

function bolehMencoba(ip) {
  const sekarang = Date.now();
  const catatan = catatanGagal.get(ip);

  if (!catatan || sekarang - catatan.mulai > JENDELA_GAGAL) return true;

  return catatan.jumlah < BATAS_GAGAL;
}

function catatGagal(ip) {
  const sekarang = Date.now();

  for (const [kunci, catatan] of catatanGagal) {
    if (sekarang - catatan.mulai > JENDELA_GAGAL) catatanGagal.delete(kunci);
  }

  const catatan = catatanGagal.get(ip);

  if (!catatan) {
    catatanGagal.set(ip, { mulai: sekarang, jumlah: 1 });
    return;
  }

  catatan.jumlah += 1;
}

/** Server action: tukar token kelas dengan cookie, lalu buka kelasnya. */
export async function masukKelas(formData) {
  "use server";

  const peta = await ambilPetaToken();

  if (!peta) redirect("/smk?galat=konfigurasi");

  const adaTokenTersimpan = daftarKelas.some((kelas) =>
    Boolean(peta.get(kelas.slug))
  );

  if (!adaTokenTersimpan) redirect("/smk?galat=belum");

  const ip = ambilIp();

  if (!bolehMencoba(ip)) redirect("/smk?galat=batas");

  const token = String(formData.get("token") ?? "");
  const slug = kelasDariToken(peta, token);

  if (!slug) {
    catatGagal(ip);
    redirect("/smk?galat=token");
  }

  const harapan = sidikToken(slug, peta.get(slug));

  if (!harapan) redirect("/smk?galat=belum");

  // Simpan semua kelas yang sudah terbuka, tambahkan kelas baru.
  const terbuka = (await daftarKelasTerbuka()).filter((item) => item !== slug);
  const nilai = [...terbuka, slug]
    .filter((item) => Boolean(peta.get(item)))
    .map((item) => `${item}.${sidikToken(item, peta.get(item))}`)
    .join(PEMISAH);

  // Path "/" agar cookie juga terkirim ke POST /api/kuis (gate kuis) dan bisa
  // dihapus oleh keluarKelas() memakai path yang sama.
  cookies().set(NAMA_COOKIE, nilai, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MASA_COOKIE,
  });

  redirect(`/smk/${slug}`);
}

/** Server action: hapus akses semua kelas. */
export async function keluarKelas() {
  "use server";

  cookies().delete(NAMA_COOKIE);
  redirect("/smk");
}
