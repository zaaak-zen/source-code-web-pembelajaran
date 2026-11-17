import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getKelasBySlug, getJenjangBySlug } from "@/config/education";
import { keluarKelas, punyaAksesKelas } from "@/lib/kelas/akses";
import {
  batalkanKehadiranSiswa,
  catatanAbsenHariIni,
  tanggalJakarta,
  catatKehadiranSiswa,
} from "@/lib/kelas/absensi";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siswaTerikat } from "@/lib/guru/perangkat";
import FormulirAbsen from "@/components/Absen/FormulirAbsen";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconClipboard,
  IconLogout,
  IconUser,
} from "@/components/Icons/Icons";

/*
 * Absensi mandiri siswa (/smk/[kelas]/absen)
 *
 * Tanggung jawab: meminta siswa mengonfirmasi kehadiran sekali per hari
 * sebelum materi kelasnya dibuka.
 *
 * Akses: tetap memerlukan token kelas (cookie `akses_kelas`). Tanpa token,
 * siswa dialihkan ke /smk.
 *
 * Identitas: siswa memilih namanya dari daftar `siswa` kelas itu, atau
 * mengetik nama baru yang langsung ditambahkan ke tabel `siswa`. Status yang
 * disimpan adalah `hadir`. Status yang sudah diubah guru tidak ditimpa.
 *
 * Salah pilih nama bisa diperbaiki sendiri lewat tombol "Bukan saya, pilih
 * ulang nama": baris `hadir` hari ini dihapus, lalu formulir muncul lagi.
 * Status izin/sakit/alfa yang sudah ditetapkan guru tidak bisa dihapus siswa.
 *
 * Kunci perangkat (lib/guru/perangkat.js): bila perangkat ini sudah terikat ke
 * seorang siswa, hanya siswa itu yang ditawarkan, dan server action menolak
 * siswa lain walau formulirnya dikirim langsung.
 */

const JENJANG_SLUG = "smk";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Absensi kelas",
};

const PESAN_GALAT = {
  identitas: "Pilih nama atau ketik nama baru terlebih dahulu.",
  nama: "Nama maksimal 80 karakter.",
  simpan: "Kehadiran gagal disimpan. Periksa koneksi lalu coba lagi.",
  konfigurasi: "Supabase belum dikonfigurasi di server.",
  sudah:
    "Kehadiran hari ini sudah tercatat dari perangkat ini. Tekan “Bukan saya, pilih ulang nama” bila tadi salah pilih.",
  batal: "Gagal membatalkan kehadiran. Periksa koneksi lalu coba lagi.",
  kunci:
    "Tidak bisa dibatalkan: guru sudah menetapkan izin, sakit, atau alfa untuk nama itu hari ini. Hubungi guru bila memang keliru.",
  "perangkat-token":
    "Token perangkat sudah diganti guru. Masukkan token perangkat yang baru di halaman token, lalu isi absensi lagi.",
  "perangkat-perangkat":
    "Perangkat ini sudah dipakai siswa lain untuk absensi. Satu HP hanya untuk satu siswa. Hubungi guru bila HP ini memang milikmu.",
  "perangkat-siswa":
    "Namamu sudah tercatat dari perangkat lain. Satu siswa hanya bisa absen dari satu HP. Hubungi guru bila HP-nya berganti.",
  "perangkat-identitas":
    "Data perangkat tidak lengkap. Muat ulang halaman lalu coba lagi.",
  ganda:
    "Ada lebih dari satu siswa dengan nama itu di kelas ini. Pilih namamu dari daftar di atas, jangan mengetik nama baru.",
};

function jalurLanjut(nilai, slug) {
  const teks = String(nilai ?? "");
  if (teks.startsWith(`/smk/${slug}`) && !teks.startsWith("//")) return teks;
  return `/smk/${slug}`;
}

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Absensi kelas</p>
          <h1 className="page-title">Layanan belum dikonfigurasi</h1>
          <p className="page-lead">
            Variabel <code>SUPABASE_URL</code> dan{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> belum diisi di server.
          </p>
        </div>
      </header>
    </main>
  );
}

export default async function AbsenKelasPage({ params, searchParams }) {
  const jenjang = getJenjangBySlug(JENJANG_SLUG);
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);
  if (!jenjang || !kelas) notFound();

  if (!(await punyaAksesKelas(kelas.slug))) redirect("/smk?galat=akses");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const lanjut = jalurLanjut(searchParams?.lanjut, kelas.slug);
  const catatan = await catatanAbsenHariIni(kelas.slug);

  /*
   * Nama siswa yang tercatat dibaca lebih dulu, karena hasilnya menentukan
   * apakah kartu "sudah tercatat" ditampilkan.
   *
   * Bila baris siswanya benar-benar sudah tidak ada (misalnya dihapus guru
   * setelah siswa absen), catatan itu tidak lagi dianggap sah dan halaman
   * kembali ke formulir. Tanpa ini, siswa terjebak: kartu "sudah tercatat"
   * muncul dengan nama kosong, dan tombol "Bukan saya" tidak menghapus apa pun.
   *
   * Kueri yang gagal (`error`) tidak diperlakukan sebagai penghapusan: `data`
   * bernilai null saat gangguan jaringan, dan menganggapnya "siswa hilang"
   * akan membuka kembali absensi yang sebenarnya sudah tercatat.
   */
  const tercatatHasil = catatan
    ? await supabase
        .from("siswa")
        .select("nama")
        .eq("id", catatan.siswaId)
        .maybeSingle()
    : { data: null, error: null };

  const namaTercatat = tercatatHasil.data?.nama ?? "";
  // Null data tanpa error berarti siswa benar-benar sudah tidak ada.
  const siswaHilang =
    Boolean(catatan) && !tercatatHasil.error && !tercatatHasil.data;
  const sudah = Boolean(catatan) && !siswaHilang;

  // Daftar siswa hanya dibutuhkan saat formulir ditampilkan.
  const { data: siswa, error } = sudah
    ? { data: [], error: null }
    : await supabase
        .from("siswa")
        .select("id, nama")
        .eq("kelas", kelas.slug)
        .order("nama", { ascending: true });

  const pesan = PESAN_GALAT[searchParams?.galat] ?? "";
  const tanggal = tanggalJakarta();

  /*
   * Kunci perangkat: perangkat yang sudah mengikat diri ke seorang siswa tidak
   * boleh mencatat siswa lain. Fungsi ini mengembalikan null bila kunci belum
   * diatur guru atau perangkat belum terikat.
   */
  const terikat = await siswaTerikat();

  // Siswa yang terikat selalu didahulukan, meskipun daftar kelas gagal dimuat.
  let daftarSiswa = siswa ?? [];

  if (terikat) {
    const milikPerangkat = daftarSiswa.filter(
      (item) => item.id === terikat.siswaId
    );

    if (milikPerangkat.length > 0) {
      daftarSiswa = milikPerangkat;
    } else {
      // Terikat tetapi namanya tidak ada di kelas ini (misalnya siswa pindah
      // kelas): tampilkan nama apa pun yang dimiliki perangkat ini, supaya
      // siswa tidak buntu di formulir kosong.
      const { data: siswaTerikatData } = await supabase
        .from("siswa")
        .select("id, nama")
        .eq("id", terikat.siswaId)
        .maybeSingle();

      daftarSiswa = siswaTerikatData ? [siswaTerikatData] : [];
    }
  }

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${jenjang.slug}`}>{jenjang.singkatan}</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${jenjang.slug}/${kelas.slug}`}>{kelas.nama}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Absensi</span>
          </nav>

          <p className="eyebrow">
            {jenjang.singkatan} &middot; {kelas.nama}
          </p>
          <h1 className="page-title">Isi kehadiran dulu</h1>
          <p className="page-lead">
            Absensi cukup sekali per hari. Setelah dikirim, materi{" "}
            {kelas.nama} langsung terbuka.
          </p>

          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconClipboard size={15} />
              {new Intl.DateTimeFormat("id-ID", {
                dateStyle: "full",
                timeZone: "Asia/Jakarta",
              }).format(new Date(`${tanggal}T12:00:00Z`))}
            </span>
            <Link className="btn btnSecondary btnSm" href="/smk">
              <IconArrowLeft size={15} />
              Kembali ke token
            </Link>
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Formulir absensi siswa">
        <div className="container">
          {/* Pesan galat tampil di kedua keadaan. `galat=sudah` khusus muncul
              bersama kartu "sudah tercatat", jadi tidak boleh hanya berada di
              cabang formulir. */}
          {pesan ? (
            <p className="authMessage authMessageError" role="alert">
              {pesan}
            </p>
          ) : null}

          {sudah ? (
            <div className="card">
              <h2 className="dashSectionTitle">
                <IconCheckCircle size={18} /> Kehadiran hari ini sudah dicatat
              </h2>

              <p className="absenTercatat">
                <IconUser size={16} />
                <span>
                  Tercatat sebagai{" "}
                  <strong>{namaTercatat || "siswa kelas ini"}</strong>
                  {namaTercatat ? null : " (nama tidak ditemukan)"}.
                </span>
              </p>

              <p className="authHint">
                Terima kasih. Materi kelas bisa dibuka sekarang. Absensi akan
                diminta lagi besok.
              </p>

              <div className="absenActions">
                <Link className="btn btnPrimary" href={lanjut}>
                  Lanjut belajar
                </Link>

                {/* Menghapus catatan hadir hari ini, lalu memunculkan formulir
                    lagi. Status izin/sakit/alfa dari guru tidak terhapus. */}
                <form action={batalkanKehadiranSiswa}>
                  <input type="hidden" name="kelas" value={kelas.slug} />
                  <button className="btn btnGhost" type="submit">
                    Bukan saya, pilih ulang nama
                  </button>
                </form>
              </div>

              <p className="authHint">
                Nama di atas salah? Tekan tombol itu untuk mengisi ulang.
                Jika guru sudah menetapkan izin, sakit, atau alfa hari ini,
                tombol tersebut tidak mengubah apa pun.
              </p>
            </div>
          ) : (
            <div className="card">
              <h2 className="dashSectionTitle">Siapa yang hadir?</h2>

              {/* Catatan lama dibuang karena siswanya sudah dihapus guru.
                  Dijelaskan supaya siswa tidak mengira absennya hilang
                  begitu saja. */}
              {siswaHilang ? (
                <p className="authHint">
                  Catatan kehadiran sebelumnya sudah tidak berlaku. Silakan isi
                  ulang.
                </p>
              ) : null}

              {error ? (
                <p className="authMessage authMessageError" role="alert">
                  Daftar siswa belum dapat dimuat. Pastikan tabel{" "}
                  <code>siswa</code> sudah dibuat lewat{" "}
                  <code>supabase/schema.sql</code>.
                </p>
              ) : null}

              <FormulirAbsen
                kelas={kelas.slug}
                lanjut={lanjut}
                daftarSiswa={daftarSiswa}
                namaKelas={kelas.nama}
                aksi={catatKehadiranSiswa}
              />
            </div>
          )}

          <div className="absenActions">
            <form action={keluarKelas}>
              <button className="btn btnGhost" type="submit">
                <IconLogout size={16} />
                Keluar dari kelas
              </button>
            </form>
            <Link className="btn btnSecondary" href="/smk">
              <IconArrowLeft size={16} />
              Kembali ke halaman token
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
