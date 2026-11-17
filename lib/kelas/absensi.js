import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  kelasTerdaftar,
  punyaAksesKelas,
  tokenKelasAktif,
} from "@/lib/kelas/akses";
import {
  NAMA_COOKIE as NAMA_COOKIE_PERANGKAT,
  ikatPerangkat,
  pasangkanSiswaKePerangkat,
} from "@/lib/guru/perangkat";

/*
 * Absensi mandiri siswa
 *
 * Tanggung jawab: memastikan siswa mengisi kehadiran sekali per hari setelah
 * memasukkan token kelas, lalu menyimpan status `hadir` ke tabel `absensi`.
 *
 * Alur:
 * 1. Siswa memasukkan token di /smk.
 * 2. Halaman kelas/materi/kuis memeriksa cookie `absen_kelas`. Bila belum ada
 *    catatan untuk hari ini, siswa diarahkan ke /smk/<kelas>/absen.
 * 3. Siswa memilih namanya dari daftar kelas atau mengetik nama baru. Nama
 *    baru otomatis ditambahkan ke tabel `siswa`.
 * 4. Status disimpan dengan `ignoreDuplicates`, sehingga status yang sudah
 *    diubah guru (izin/sakit/alfa) tidak tertimpa menjadi hadir.
 * 5. Bila namanya salah pilih, siswa menekan "Bukan saya, pilih ulang nama".
 *    Server menghapus catatan hadir hari itu, lalu siswa mengisi ulang.
 *
 * Cookie hanya berisi sidik HMAC bertanda token kelas, bukan token asli.
 * Nilai tanggal di dalam cookie membuat absensi berlaku untuk hari itu saja
 * (zona waktu Asia/Jakarta), walaupun cookie sendiri berumur 12 jam.
 *
 * Setiap bagian cookie berbentuk `slug.tanggal.siswaId.sidik`. UUID siswa ikut
 * disimpan dan ikut ditandatangani karena dua alasan:
 * - `catatKehadiranSiswa` perlu tahu siswa mana yang sudah dicatat perangkat
 *   ini, agar satu perangkat tidak bisa menandai banyak siswa hadir sekaligus.
 * - `batalkanKehadiranSiswa` perlu tahu baris `absensi` mana yang boleh
 *   dihapus ketika siswa memperbaiki nama yang salah.
 * Karena ikut ditandatangani, UUID di dalam cookie tidak bisa diganti menjadi
 * siswa lain tanpa membuat sidiknya tidak berlaku.
 */

export const NAMA_COOKIE = "absen_kelas";

const PEMISAH = "|";
const PEMISAH_BAGIAN = ".";
const MASA_COOKIE = 60 * 60 * 12; // 12 jam
// Versi 2: pesan yang ditandatangani ikut memuat UUID siswa. Cookie versi 1
// (tanpa UUID) otomatis tidak berlaku, sehingga siswa hanya perlu mengisi
// absensi sekali lagi setelah pembaruan ini.
const PESAN_SIDIK = "warung-kode-absen-kelas-v2";
const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tanggal hari ini menurut zona waktu sekolah. */
export function tanggalJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sama(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;

  return timingSafeEqual(x, y);
}

function sidikAbsen(slug, tanggal, siswaId, token) {
  if (!token) return null;

  return createHmac("sha256", token)
    .update(`${PESAN_SIDIK}:${slug}:${tanggal}:${siswaId}`)
    .digest("hex");
}

/**
 * Satu bagian cookie diurai menjadi `{ slug, tanggal, siswaId, nilai }`.
 * Null bila bentuknya tidak lengkap atau slugnya bukan kelas terdaftar.
 */
function uraiBagian(bagian) {
  const potongan = String(bagian).split(PEMISAH_BAGIAN);

  if (potongan.length !== 4) return null;

  const [slug, tanggal, siswaId, nilai] = potongan;

  if (!kelasTerdaftar(slug) || !tanggal || !POLA_UUID.test(siswaId)) return null;
  if (!nilai) return null;

  return { slug, tanggal, siswaId, nilai };
}

/** Seluruh bagian cookie yang bentuknya sah, sebagai objek. */
function bacaBagian() {
  const nilai = cookies().get(NAMA_COOKIE)?.value;
  if (!nilai) return [];

  return nilai
    .split(PEMISAH)
    .filter(Boolean)
    .map(uraiBagian)
    .filter(Boolean);
}

/**
 * Catatan absensi sah milik perangkat ini untuk satu kelas pada satu tanggal.
 * Null bila belum ada, atau bila sidiknya tidak cocok (misalnya token sudah
 * diganti guru).
 */
async function catatanSah(slug, tanggal) {
  const token = await tokenKelasAktif(slug);
  if (!token) return null;

  for (const bagian of bacaBagian()) {
    if (bagian.slug !== slug || bagian.tanggal !== tanggal) continue;

    const harapan = sidikAbsen(slug, tanggal, bagian.siswaId, token);
    if (harapan && sama(bagian.nilai, harapan)) return bagian;
  }

  return null;
}

/** True bila siswa sudah mengisi absensi kelas ini hari ini. */
export async function sudahAbsenHariIni(slug) {
  return Boolean(await catatanSah(slug, tanggalJakarta()));
}

/**
 * Catatan absensi hari ini milik perangkat ini, sebagai `{ siswaId }`, atau
 * null bila belum ada. Dipakai halaman absen untuk menampilkan nama yang
 * tercatat beserta tombol "Bukan saya".
 */
export async function catatanAbsenHariIni(slug) {
  const bagian = await catatanSah(slug, tanggalJakarta());

  return bagian ? { siswaId: bagian.siswaId } : null;
}

/**
 * Menulis ulang cookie dari daftar bagian. Cookie dihapus bila daftarnya
 * kosong, agar tidak menyimpan string kosong.
 */
function tulisBagian(daftar) {
  const nilai = daftar
    .map(
      (bagian) =>
        `${bagian.slug}${PEMISAH_BAGIAN}${bagian.tanggal}${PEMISAH_BAGIAN}${bagian.siswaId}${PEMISAH_BAGIAN}${bagian.nilai}`
    )
    .join(PEMISAH);

  if (!nilai) {
    cookies().delete(NAMA_COOKIE);
    return;
  }

  cookies().set(NAMA_COOKIE, nilai, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Path "/" agar cookie juga terkirim ke POST /api/kuis, yang ikut
    // memeriksa absensi sebelum membuat soal.
    path: "/",
    maxAge: MASA_COOKIE,
  });
}

/**
 * Menulis ulang cookie absensi: bagian untuk kelas + tanggal ini diganti
 * dengan catatan siswa terbaru, bagian lain dipertahankan.
 */
async function simpanBagian(slug, tanggal, siswaId) {
  const token = await tokenKelasAktif(slug);
  if (!token) return false;

  const nilai = sidikAbsen(slug, tanggal, siswaId, token);
  if (!nilai) return false;

  const lain = bacaBagian().filter(
    (bagian) => !(bagian.slug === slug && bagian.tanggal === tanggal)
  );

  tulisBagian([...lain, { slug, tanggal, siswaId, nilai }]);

  return true;
}

/** Menghapus catatan absensi kelas + tanggal ini dari cookie saja. */
function hapusBagian(slug, tanggal) {
  const lain = bacaBagian().filter(
    (bagian) => !(bagian.slug === slug && bagian.tanggal === tanggal)
  );

  tulisBagian(lain);
}

/** Hanya menerima jalur internal /smk/<kelas> agar tidak menjadi open redirect. */
function jalurLanjut(nilai, slug) {
  const teks = String(nilai ?? "");
  if (!teks.startsWith(`/smk/${slug}`)) return `/smk/${slug}`;
  if (teks.startsWith("//") || teks.includes("\\")) return `/smk/${slug}`;

  return teks;
}

/**
 * Mencari siswa dari identitas yang dikirim formulir: pilihan dari daftar
 * (`siswaId`) atau nama yang diketik (`nama`). Nama baru sekaligus ditambahkan
 * ke tabel `siswa`.
 *
 * Mengembalikan `{ siswa }` bila ketemu, atau `{ galat }` berisi penanda pesan
 * yang harus ditampilkan di halaman absen.
 */
async function cariSiswa(supabase, slug, siswaId, namaBaru) {
  if (siswaId) {
    if (!POLA_UUID.test(siswaId)) return { galat: "identitas" };

    const { data, error } = await supabase
      .from("siswa")
      .select("id")
      .eq("id", siswaId)
      .eq("kelas", slug)
      .maybeSingle();

    if (error) {
      console.error("Absensi siswa: gagal memeriksa siswa.", error.message);
      return { galat: "simpan" };
    }

    return data?.id ? { siswa: data } : { galat: "identitas" };
  }

  if (namaBaru) {
    if (namaBaru.length > 80) return { galat: "nama" };

    // Cocokkan tanpa membedakan huruf besar/kecil, supaya nama yang sudah
    // terdaftar tidak tercatat dua kali.
    const { data: daftar, error: galatDaftar } = await supabase
      .from("siswa")
      .select("id, nama")
      .eq("kelas", slug);

    if (galatDaftar) {
      console.error("Absensi siswa: gagal membaca siswa.", galatDaftar.message);
      return { galat: "simpan" };
    }

    const cocok = (daftar ?? []).filter(
      (baris) =>
        String(baris.nama ?? "").trim().toLowerCase() === namaBaru.toLowerCase()
    );

    if (cocok.length === 1) return { siswa: { id: cocok[0].id } };

    /*
     * Lebih dari satu siswa bernama persis sama. Memilih yang pertama berarti
     * menebak: absensi bisa tercatat pada siswa yang salah tanpa siswa sadar,
     * dan pembetulannya merepotkan guru. Jadi ditolak, dan siswa diminta
     * memilih sendiri dari daftar kelas (yang menampilkan semua nama kembar).
     */
    if (cocok.length > 1) return { galat: "ganda" };

    const { data, error } = await supabase
      .from("siswa")
      .insert({ nama: namaBaru, kelas: slug })
      .select("id")
      .single();

    if (error) {
      console.error("Absensi siswa: gagal menambah siswa.", error.message);
      return { galat: "simpan" };
    }

    return { siswa: data };
  }

  return { galat: "identitas" };
}

/**
 * Server action: catat kehadiran siswa, lalu buka halaman yang dituju.
 *
 * Identitas dipilih dari daftar kelas (`siswaId`) atau diketik baru (`nama`).
 * Bila keduanya diisi, pilihan dari daftar yang dipakai.
 *
 * Satu perangkat hanya boleh mencatat satu siswa per kelas per hari. Aturan ini
 * ditegakkan di sini, bukan hanya di tampilan, karena server action dapat
 * dipanggil langsung tanpa membuka halaman absen. Tanpa pemeriksaan ini, satu
 * siswa dapat mengirim `siswaId` berulang dan menandai seluruh kelas hadir.
 */
export async function catatKehadiranSiswa(formData) {
  "use server";

  const slug = String(formData.get("kelas") ?? "");
  if (!kelasTerdaftar(slug)) redirect("/smk?galat=akses");

  const lanjut = jalurLanjut(formData.get("lanjut"), slug);

  if (!(await punyaAksesKelas(slug))) redirect("/smk?galat=akses");

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    redirect(`/smk/${slug}/absen?galat=konfigurasi`);
  }

  const namaBaru = String(formData.get("nama") ?? "").trim();

  /*
   * Kehadiran hari ini sudah dicatat dari perangkat ini. Bila `siswaId`-nya
   * sama, permintaan hanya diulang (misalnya tombol tertekan dua kali) dan
   * siswa langsung dilanjutkan tanpa menyentuh database. Bila berbeda, ini
   * percobaan mengganti identitas: tolak, karena perbaikan nama hanya boleh
   * lewat "Bukan saya, pilih ulang nama".
   */
  const tanggal = tanggalJakarta();
  const sebelumnya = await catatanSah(slug, tanggal);
  const siswaId = String(formData.get("siswaId") ?? "").trim();

  if (sebelumnya) {
    /*
     * Siswa yang tercatat bisa saja sudah dihapus guru setelah absen. Dalam
     * hal itu catatannya sudah tidak berarti: barisnya ikut terhapus lewat
     * `on delete cascade`, dan membiarkan cookie-nya hanya membuat siswa
     * buntu di pesan "sudah tercatat". Jadi cookie lama dibersihkan dan
     * absensi dianggap belum diisi.
     *
     * Kueri yang gagal sengaja tidak diperlakukan sebagai "sudah dihapus".
     * Kalau gangguan jaringan dianggap penghapusan, cookie dibersihkan dan
     * aturan satu siswa per hari bisa dilewati; lebih aman menampilkan galat
     * simpan dan membiarkan siswa mencoba lagi.
     */
    const { data: masihAda, error: galatSiswa } = await supabase
      .from("siswa")
      .select("id")
      .eq("id", sebelumnya.siswaId)
      .maybeSingle();

    if (galatSiswa) {
      console.error(
        "Absensi siswa: gagal memeriksa siswa.",
        galatSiswa.message
      );
      redirect(`/smk/${slug}/absen?galat=simpan`);
    }

    if (!masihAda?.id) {
      hapusBagian(slug, tanggal);
    } else {
      // Hanya pengiriman ulang identitas yang sama yang dianggap duplikat.
      // Identitas lain (termasuk nama baru tanpa `siswaId`) ditolak, karena
      // perbaikan nama hanya boleh lewat "Bukan saya, pilih ulang nama".
      if (siswaId && siswaId === sebelumnya.siswaId) redirect(lanjut);

      redirect(`/smk/${slug}/absen?galat=sudah`);
    }
  }

  const { siswa, galat } = await cariSiswa(
    supabase,
    slug,
    siswaId,
    namaBaru
  );

  if (galat) redirect(`/smk/${slug}/absen?galat=${galat}`);
  if (!siswa?.id) redirect(`/smk/${slug}/absen?galat=identitas`);

  /*
   * Kunci perangkat: satu HP hanya untuk satu siswa, dan satu siswa hanya dari
   * satu HP (lihat lib/guru/perangkat.js). Diperiksa setelah identitas pasti,
   * karena hashnya dihitung dari siswa_id. Guru belum mengatur token
   * perangkat: hasilnya `{ boleh: true, hash: null }` dan absensi berjalan
   * seperti biasa.
   */
  const kunci = await pasangkanSiswaKePerangkat(siswa.id);

  if (!kunci.boleh) {
    /*
     * Token perangkat guru sudah diganti. Cookie perangkat dibersihkan supaya
     * siswa diarahkan memasukkan token yang baru, bukan terjebak pada pesan
     * yang sama berulang kali.
     */
    if (kunci.alasan === "token") {
      cookies().delete(NAMA_COOKIE_PERANGKAT);
      redirect(`/smk/${slug}/absen?galat=perangkat-token`);
    }

    if (kunci.alasan === "simpan") {
      redirect(`/smk/${slug}/absen?galat=simpan`);
    }

    redirect(`/smk/${slug}/absen?galat=perangkat-${kunci.alasan}`);
  }

  const baris = {
    siswa_id: siswa.id,
    tanggal,
    status: "hadir",
  };

  // Hash hanya ikut bila ada. Tanpa token perangkat, kolom dibiarkan null
  // seperti sebelumnya.
  if (kunci.hash) baris.perangkat_hash = kunci.hash;

  const { error } = await supabase.from("absensi").upsert(baris, {
    onConflict: "siswa_id,tanggal",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("Absensi siswa: gagal menyimpan kehadiran.", error.message);
    redirect(`/smk/${slug}/absen?galat=simpan`);
  }

  await ikatPerangkat(siswa.id, kunci.hash);
  await simpanBagian(slug, tanggal, siswa.id);

  revalidatePath("/guru/absen");
  redirect(lanjut);
}

/**
 * Server action: batalkan kehadiran hari ini karena salah pilih nama.
 *
 * Hanya baris milik siswa yang tercatat di cookie perangkat ini yang dihapus,
 * dan hanya bila statusnya masih `hadir`. Status yang sudah diubah guru
 * (izin/sakit/alfa) dibiarkan, karena itu keputusan guru, bukan salah pilih
 * siswa.
 *
 * Penghapusan memakai `select("id")` supaya server tahu apakah ada baris yang
 * benar-benar terhapus. Bila tidak ada (misalnya guru sudah menetapkan izin),
 * cookie tidak dibersihkan dan siswa diberi tahu, sehingga tampilan tidak
 * menjanjikan sesuatu yang tidak terjadi.
 */
export async function batalkanKehadiranSiswa(formData) {
  "use server";

  const slug = String(formData.get("kelas") ?? "");
  if (!kelasTerdaftar(slug)) redirect("/smk?galat=akses");

  if (!(await punyaAksesKelas(slug))) redirect("/smk?galat=akses");

  const tanggal = tanggalJakarta();
  const sebelumnya = await catatanSah(slug, tanggal);

  // Tidak ada catatan sah milik perangkat ini: tidak ada yang boleh dihapus.
  if (!sebelumnya) redirect(`/smk/${slug}/absen`);

  const supabase = createSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("absensi")
      .delete()
      .eq("siswa_id", sebelumnya.siswaId)
      .eq("tanggal", tanggal)
      .eq("status", "hadir")
      .select("id");

    if (error) {
      console.error("Absensi siswa: gagal membatalkan.", error.message);
      redirect(`/smk/${slug}/absen?galat=batal`);
    }

    if ((data ?? []).length === 0) {
      /*
       * Tidak ada baris `hadir` yang terhapus. Dua kemungkinannya dibedakan,
       * karena pesannya berbeda:
       * - siswanya sudah dihapus guru: baris absensinya ikut terhapus lewat
       *   `on delete cascade`, jadi yang perlu dilakukan hanya membersihkan
       *   cookie dan mengembalikan siswa ke formulir;
       * - status hari ini sudah ditetapkan guru (izin/sakit/alfa): itu
       *   keputusan guru dan tidak boleh dibatalkan dari halaman siswa.
       */
      const { data: masihAda } = await supabase
        .from("siswa")
        .select("id")
        .eq("id", sebelumnya.siswaId)
        .maybeSingle();

      if (!masihAda?.id) {
        hapusBagian(slug, tanggal);
        redirect(`/smk/${slug}/absen`);
      }

      redirect(`/smk/${slug}/absen?galat=kunci`);
    }
  }

  hapusBagian(slug, tanggal);
  revalidatePath("/guru/absen");
  redirect(`/smk/${slug}/absen`);
}
