import Link from "next/link";
import { redirect } from "next/navigation";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import { simpanMateriAksi } from "@/lib/materi/aksi";
import FormMateri from "@/components/Guru/FormMateri";
import { IconArrowLeft } from "@/components/Icons/Icons";

/*
 * Tambah materi (/guru/materi/baru)
 *
 * Tanggung jawab: menampilkan form materi kosong. Penyimpanan ditangani server
 * action simpanMateriAksi; halaman ini hanya memilih kelas awal dari query.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tambah materi",
};

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];

const PESAN_GALAT = {
  judul: "Judul materi wajib diisi.",
  jumlah: "Jumlah soal harus 0-20.",
  video: "ID atau URL video YouTube tidak valid.",
  konten: "Isi materi tidak valid. Periksa setiap blok lalu coba lagi.",
  berkas: "Daftar berkas tidak valid. Muat ulang halaman lalu unggah ulang.",
  slug: "Slug tidak valid. Gunakan huruf kecil, angka, dan tanda minus.",
  slugada: "Slug sudah dipakai materi lain di kelas ini. Ganti slug.",
  simpan: "Materi gagal disimpan. Periksa koneksi lalu coba lagi.",
};

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Materi</p>
          <h1 className="page-title">Layanan belum dikonfigurasi</h1>
          <p className="page-lead">
            Variabel <code>SUPABASE_URL</code> dan{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> belum diisi, atau tabel{" "}
            <code>materi</code> belum dibuat. Jalankan{" "}
            <code>supabase/schema.sql</code> lalu isi variabel tersebut di{" "}
            <code>.env.local</code>.
          </p>
        </div>
      </header>
    </main>
  );
}

export default async function MateriBaruPage({ searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const kelasAwal = daftarKelas.some(
    (item) => item.slug === searchParams?.kelas
  )
    ? searchParams.kelas
    : "";

  const pesan = PESAN_GALAT[searchParams?.galat] ?? "";

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/guru">Panel guru</Link>
            <span aria-hidden="true">/</span>
            <Link href="/guru/materi">Materi</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Tambah</span>
          </nav>

          <p className="eyebrow">Materi</p>
          <h1 className="page-title">Tambah materi</h1>
          <p className="page-lead">
            Isi judul, video, jumlah soal, dan blok penjelasan. Materi langsung
            tampil di halaman siswa setelah disimpan.
          </p>
        </div>
      </header>

      <section className="content-section" aria-label="Form materi baru">
        <div className="container">
          {pesan ? (
            <p className="authMessage authMessageError" role="alert">
              {pesan}
            </p>
          ) : null}

          <FormMateri
            mode="baru"
            daftarKelas={daftarKelas}
            kelasAwal={kelasAwal}
            aksi={simpanMateriAksi}
          />

          <div className="absenActions">
            <Link className="btn btnSecondary" href="/guru/materi">
              <IconArrowLeft size={16} />
              Kembali ke daftar materi
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
