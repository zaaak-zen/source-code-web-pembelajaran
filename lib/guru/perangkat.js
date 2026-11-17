import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dariCache, lupakan } from "@/lib/cache/tembol";

/*
 * Catatan: modul ini TIDAK memakai direktif "use server". Hanya file dengan
 * direktif itu yang boleh berisi server action, dan di sana semua ekspor wajib
 * berupa fungsi async — padahal di sini ada konstanta (NAMA_COOKIE) dan helper
 * sinkron (buatTokenPerangkat, samaHash). Modul tetap aman diimpor dari Client
 * Component karena tidak pernah impor ke sisi browser; server action yang
 * butuh form (simpanTokenPerangkat) ada di lib/guru/perangkat-aksi.js.
 */

/*
 * Kunci perangkat absensi
 *
 * Tanggung jawab: mengikat satu perangkat (satu HP) ke satu siswa, sehingga
 * satu HP tidak bisa dipakai mengabsen banyak siswa, dan satu siswa tidak bisa
 * dicatat dari beberapa HP.
 *
 * Aturan yang ditegakkan (lihat `pasangkanSiswaKePerangkat`):
 * - Satu perangkat = satu siswa, termasuk lintas hari. Perangkat yang hari
 *   ini mencatat Raka tidak bisa mencatat Sinta besok.
 * - Satu siswa = satu perangkat. Sinta yang sudah dicatat dari HP A tidak bisa
 *   dicatat ulang dari HP B.
 * Siswa yang salah pilih memakai tombol "Bukan saya, pilih ulang nama"; guru
 * yang memindahkan siswa ke HP baru mengosongkan `perangkat_hash` dari
 * /guru/absen.
 *
 * Cara kerjanya:
 * 1. Guru menyimpan satu token perangkat di /guru/token (tabel
 *    `pengaturan_absensi`). Token ini diumumkan di kelas, seperti token kelas,
 *    tetapi TIDAK membuka apa pun: tanpa token kelas siswa tetap tidak bisa
 *    membuka materi.
 * 2. Siswa memasukkan token perangkat sekali per perangkat di /smk. Cookie
 *    `perangkat_absen` menyimpan tokennya (HttpOnly, 180 hari).
 * 3. Saat siswa mencatat kehadiran, server menulis
 *    `perangkat_hash` = HMAC(token, siswa_id) pada baris absensi.
 * 4. Setelah itu cookie `perangkat_absen` diganti bentuknya menjadi
 *    `siswa.<siswaId>.<hash>`. Bila perangkat itu kembali ke halaman absensi,
 *    halaman hanya menawarkan siswa yang terikat (lihat `siswaTerikat`), dan
 *    server action menolak siswa lain.
 *
 * Kenapa hash memakai siswa_id, bukan tanggal:
 * Cookie perangkat hanya bisa menyimpan satu siswa. Bila hash ikut memuat
 * tanggal, keesokan harinya perangkat yang sama bebas mencatat siswa lain, dan
 * kunci perangkat hanya berlaku sehari. Dengan siswa_id saja, ikatannya
 * bertahan selama siswa itu masih ada.
 *
 * Kenapa memakai token yang dipegang guru, bukan sidik perangkat keras:
 * browser tidak menyediakan identitas perangkat yang stabil dan tidak bisa
 * dipalsukan. Token yang hanya diketahui siswa di kelas membuat penyalinan
 * cookie tidak berguna tanpa ikut membocorkan tokennya.
 *
 * Batasnya: menghapus cookie, memakai mode incognito, atau mengganti browser
 * melepas ikatan cookie—tetapi siswa tersebut tetap tidak bisa dicatat ulang
 * hari itu, karena aturan "satu siswa per hari" di lib/kelas/absensi.js dan
 * pemeriksaan `perangkat_hash` di sini tetap memegang baris yang sudah ada.
 * Siswa yang membocorkan token ke temannya membuat temannya bisa menandai
 * dirinya hadir dari perangkat sendiri; karena itu guru dapat memutar token
 * kapan saja, dan perangkat lama harus memasukkan token baru.
 *
 * `perangkat_hash` tidak pernah dikirim dari browser. Checkbox status di
 * /guru/absen juga tidak mengirim kolom itu, sehingga upsert guru tidak
 * menimpa hash yang sudah ada.
 */

export const NAMA_COOKIE = "perangkat_absen";

const MASA_COOKIE = 60 * 60 * 24 * 180; // 180 hari
const PANJANG_MIN = 8;
const PANJANG_MAKS = 64;
const PESAN_SIDIK = "warung-kode-perangkat-absen-v2";
const KUNCI_TOKEN = "perangkat:token";
const TTL_TOKEN = 60;

const AWALAN_TOKEN = "token.";
const AWALAN_SISWA = "siswa.";

/** Karakter yang mudah dibaca dan diketik: tanpa I, O, 0, dan 1. */
const ABJAD = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Membuat token perangkat acak 8 karakter, misalnya "K7QM2VT9". */
export function buatTokenPerangkat() {
  const bita = randomBytes(8);
  let hasil = "";

  for (let i = 0; i < 8; i += 1) {
    hasil += ABJAD[bita[i] % ABJAD.length];
  }

  return hasil;
}

/** Buang cache token setelah guru membuat atau mengganti token perangkat. */
export function lupakanTokenPerangkat() {
  lupakan(KUNCI_TOKEN);
}

/**
 * Token perangkat yang berlaku (satu baris, id = 1). Null bila belum diatur,
 * Supabase belum dikonfigurasi, atau kueri gagal.
 */
const tokenPerangkat = cache(async () =>
  dariCache(KUNCI_TOKEN, TTL_TOKEN, async () => {
    const supabase = createSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("pengaturan_absensi")
      .select("token_perangkat")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      // Tabel belum dibuat: absensi tetap jalan tanpa kunci perangkat, supaya
      // siswa tidak buntu karena guru belum menjalankan skema terbaru.
      if (error.code !== "42P01") {
        console.error("Kunci perangkat: gagal membaca token.", error.message);
      }
      return null;
    }

    return data?.token_perangkat ?? null;
  })
);

/** Token perangkat yang berlaku, atau null bila belum diatur. */
export async function tokenPerangkatAktif() {
  return tokenPerangkat();
}

/** True bila guru sudah mengatur token perangkat. */
export async function kunciPerangkatAktif() {
  return Boolean(await tokenPerangkat());
}

/** Sidik perangkat untuk satu siswa: HMAC(token, siswa_id), 64 karakter hex. */
export async function sidikPerangkat(siswaId) {
  const token = await tokenPerangkat();
  if (!token || !siswaId) return null;

  return createHmac("sha256", token)
    .update(`${PESAN_SIDIK}:${siswaId}`)
    .digest("hex");
}

/** Perbandingan teks dengan panjang sama, tanpa membocorkan waktu. */
export function samaHash(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || a.length !== b.length) return false;

  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Isi cookie: `{ token }`, `{ siswaId, hash }`, atau null bila kosong/asing. */
function uraiCookie(nilai) {
  if (!nilai) return null;

  if (nilai.startsWith(AWALAN_TOKEN)) {
    const token = nilai.slice(AWALAN_TOKEN.length);
    return token ? { jenis: "token", token } : null;
  }

  if (nilai.startsWith(AWALAN_SISWA)) {
    const [siswaId, hash] = nilai.slice(AWALAN_SISWA.length).split(".");
    return siswaId && hash ? { jenis: "siswa", siswaId, hash } : null;
  }

  return null;
}

/** Tulis cookie baru, atau hapus bila `nilai` kosong. */
function tulisCookie(nilai) {
  if (!nilai) {
    cookies().delete(NAMA_COOKIE);
    return;
  }

  cookies().set(NAMA_COOKIE, nilai, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MASA_COOKIE,
  });
}

/**
 * True bila perangkat ini sudah memegang token perangkat yang berlaku.
 *
 * Dua bentuk cookie dihitung terdaftar:
 * - `token.<token>`   token dimasukkan tetapi belum dipakai absen;
 * - `siswa.<id>.<hash>`  perangkat sudah terikat ke siswa. Hash-nya dihitung
 *   ulang dengan token yang berlaku, jadi setelah guru memutar token hasilnya
 *   false dan siswa diminta memasukkan token baru.
 */
export async function perangkatTerkunci() {
  const isi = uraiCookie(cookies().get(NAMA_COOKIE)?.value);
  if (!isi) return false;

  const berlaku = await tokenPerangkat();

  // Token belum diatur guru: cookie lama tidak lagi berarti.
  if (!berlaku) return false;

  if (isi.jenis === "token") return samaHash(isi.token, berlaku);

  const harapan = await sidikPerangkat(isi.siswaId);
  return Boolean(harapan) && samaHash(isi.hash, harapan);
}

/**
 * Siswa yang terikat ke perangkat ini, sebagai `{ siswaId }`, atau null.
 *
 * Hanya dianggap sah bila hash di cookie sama dengan HMAC(token, siswaId) yang
 * berlaku sekarang. Setelah guru memutar token, hasilnya null dan siswa
 * diminta memasukkan token perangkat lagi.
 */
export async function siswaTerikat() {
  const isi = uraiCookie(cookies().get(NAMA_COOKIE)?.value);
  if (isi?.jenis !== "siswa") return null;

  const harapan = await sidikPerangkat(isi.siswaId);
  if (!harapan || !samaHash(isi.hash, harapan)) return null;

  return { siswaId: isi.siswaId, hash: isi.hash };
}


/**
 * Pasangkan siswa ke perangkat ini, atau tolak bila sudah terikat ke siswa
 * lain. Dipanggil lib/kelas/absensi.js sebelum baris absensi ditulis.
 *
 * Mengembalikan `{ boleh, hash, alasan }`:
 * - `boleh: true, hash`      absensi boleh ditulis dengan hash ini;
 * - `boleh: false, alasan`   "siswa" (siswa ini sudah tercatat dari perangkat
 *                            lain), "perangkat" (perangkat ini sudah terikat
 *                            ke siswa lain), atau "token" (token perangkat
 *                            sudah diganti guru).
 *
 * Guru belum mengatur token perangkat: tidak ada yang dikunci, hasilnya
 * `{ boleh: true, hash: null }`.
 */
export async function pasangkanSiswaKePerangkat(siswaId) {
  const token = await tokenPerangkat();
  if (!token) return { boleh: true, hash: null };

  const hash = await sidikPerangkat(siswaId);
  if (!hash) return { boleh: false, alasan: "identitas" };

  // Baris absensi siswa ini sudah dipegang perangkat lain.
  const { data: hashLama, error } = await ambilHashSiswa(siswaId);

  if (error) {
    console.error("Kunci perangkat: gagal membaca sidik siswa.", error.message);
    return { boleh: false, alasan: "simpan" };
  }

  if (hashLama && !samaHash(hashLama, hash)) {
    return { boleh: false, alasan: "siswa" };
  }

  const isi = uraiCookie(cookies().get(NAMA_COOKIE)?.value);

  if (isi?.jenis === "token") {
    // Perangkat yang membawa token lama (guru sudah memutar token) tidak
    // diloloskan diam-diam; siswa diminta memasukkan token baru.
    if (!samaHash(isi.token, token)) {
      return { boleh: false, alasan: "token" };
    }

    return { boleh: true, hash };
  }

  if (isi?.jenis === "siswa") {
    if (!samaHash(isi.hash, hash)) {
      return isi.siswaId === siswaId
        ? { boleh: false, alasan: "token" }
        : { boleh: false, alasan: "perangkat" };
    }

    return { boleh: true, hash };
  }

  // Cookie kosong atau tidak dikenali: perangkat dianggap belum terikat.
  return { boleh: true, hash };
}

/** Simpan ikatan perangkat -> siswa setelah absensi berhasil ditulis. */
export async function ikatPerangkat(siswaId, hash) {
  if (!siswaId || !hash) return;

  tulisCookie(`${AWALAN_SISWA}${siswaId}.${hash}`);
}

/** Baris absensi siswa ini yang sudah punya `perangkat_hash`, atau null. */
async function ambilHashSiswa(siswaId) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("absensi")
    .select("perangkat_hash")
    .eq("siswa_id", siswaId)
    .not("perangkat_hash", "is", null)
    .limit(1)
    .maybeSingle();

  return { data: data?.perangkat_hash ?? null, error };
}

/**
 * Ganti perangkat siswa: kosongkan `perangkat_hash` seluruh baris absensinya,
 * supaya siswa bisa mencatat dari HP baru. Dipakai guru di /guru/absen.
 *
 * Baris absensi yang dilepas tetap tersimpan; yang hilang hanya kuncinya.
 * Akibatnya hash siswa ini dianggap belum pernah ada, sehingga siswa tersebut
 * bisa mencatat dari HP mana pun pada hari berikutnya. HP yang dibebaskan itu
 * juga bebas, karena ikatannya dibaca dari baris absensi siswa, bukan dari
 * daftar perangkat terpisah.
 */
export async function lepasPerangkatSiswa(siswaId) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { error: "konfigurasi" };

  const { error } = await supabase
    .from("absensi")
    .update({ perangkat_hash: null })
    .eq("siswa_id", siswaId);

  if (error) {
    console.error("Kunci perangkat: gagal melepas.", error.message);
    return { error: "simpan" };
  }

  return { error: null };
}

/** Batas panjang token perangkat, dipakai pemeriksaan di server action. */
export const BATAS_TOKEN = { min: PANJANG_MIN, max: PANJANG_MAKS };
