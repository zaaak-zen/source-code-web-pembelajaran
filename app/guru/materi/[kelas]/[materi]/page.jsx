import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import { ambilMateri } from "@/lib/materi/kelas";
import { simpanMateriAksi } from "@/lib/materi/aksi";
import FormMateri from "@/components/Guru/FormMateri";
import { IconArrowLeft, IconArrowRight } from "@/components/Icons/Icons";

/*
 * Ubah materi (/guru/materi/[kelas]/[materi])
 *
 * Tanggung jawab: memuat satu materi dari database lalu menampilkannya pada
 * form. Slug sengaja tidak bisa diubah agar tautan siswa dan bank soal tetap
 * cocok.
 */

export const dynamic = "force-dynamic";

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];

const PESAN_GALAT = {
  judul: "Judul materi wajib diisi.",
  jumlah: "Jumlah soal harus 0-20.",
  video: "ID atau URL video YouTube tidak valid.",
  konten: "Isi materi tidak valid. Periksa setiap blok lalu coba lagi.",
  berkas: "Daftar berkas tidak valid. Muat ulang halaman lalu coba lagi.",
  simpan: "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.",
};

export async function generateMetadata({ params }) {
  const data = await ambilMateri(params.kelas, params.materi);
  return { title: data ? `Ubah ${data.judul}` : "Ubah materi" };
}

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

export default async function MateriUbahPage({ params, searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const kelasSah = daftarKelas.some((item) => item.slug === params.kelas);
  if (!kelasSah) notFound();

  const materi = await ambilMateri(params.kelas, params.materi);
  if (!materi) notFound();

  const namaKelas =
    daftarKelas.find((item) => item.slug === params.kelas)?.nama ??
    params.kelas;

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
            <span aria-current="page">{materi.judul}</span>
          </nav>

          <p className="eyebrow">{namaKelas}</p>
          <h1 className="page-title">{materi.judul}</h1>
          <p className="page-lead">
            Ubah isi materi. Perubahan langsung tampil di halaman siswa; soal
            kuis yang sudah tersimpan tidak berubah.
          </p>
        </div>
      </header>

      <section className="content-section" aria-label="Form ubah materi">
        <div className="container">
          {pesan ? (
            <p className="authMessage authMessageError" role="alert">
              {pesan}
            </p>
          ) : null}

          <FormMateri
            mode="edit"
            daftarKelas={daftarKelas}
            materi={materi}
            aksi={simpanMateriAksi}
          />

          <div className="absenActions">
            <Link className="btn btnSecondary" href="/guru/materi">
              <IconArrowLeft size={16} />
              Kembali ke daftar materi
            </Link>
            <Link
              className="btn btnGhost"
              href={`/smk/${materi.kelas}/${materi.slug}`}
            >
              Lihat halaman siswa
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
