/*
 * Halaman detail kelas SMK (/smk/[kelas], contoh /smk/10)
 *
 * Tanggung jawab: menampilkan daftar materi Informatika untuk satu kelas.
 *
 * Akses: memerlukan token kelas yang sudah dimasukkan di /smk
 * (lihat lib/kelas/akses.js). Tanpa itu, pengunjung dialihkan ke /smk.
 *
 * Daftar materi dibaca dari tabel `materi` dan dikelola guru lewat
 * /guru/materi. Config hanya menyimpan nama dan deskripsi kelas.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getKelasBySlug, getJenjangBySlug } from "@/config/education";
import { ambilMateriKelas } from "@/lib/materi/kelas";
import { keluarKelas, punyaAksesKelas } from "@/lib/kelas/akses";
import { sudahAbsenHariIni } from "@/lib/kelas/absensi";
import {
  IconArrowRight,
  IconBook,
  IconClock,
  IconLogout,
  IconSparkles,
  IconTarget,
} from "@/components/Icons/Icons";

const JENJANG_SLUG = "smk";

// Halaman membaca cookie token kelas, jadi selalu dirender per permintaan.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);
  if (!kelas) return { title: "Kelas tidak ditemukan" };
  return { title: `${kelas.nama} — SMK` };
}

export default async function KelasPage({ params }) {
  const jenjang = getJenjangBySlug(JENJANG_SLUG);
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);

  if (!jenjang || !kelas) notFound();

  // Kelas hanya terbuka setelah token kelasnya dimasukkan di /smk.
  if (!(await punyaAksesKelas(kelas.slug))) redirect("/smk?galat=akses");

  // Setelah token benar, siswa wajib mengisi kehadiran sekali per hari.
  if (!(await sudahAbsenHariIni(kelas.slug))) {
    const lanjut = `/smk/${kelas.slug}`;
    redirect(
      `/smk/${kelas.slug}/absen?lanjut=${encodeURIComponent(lanjut)}`
    );
  }

  const daftarMateri = await ambilMateriKelas(kelas.slug);
  const materiTersedia = daftarMateri ?? [];
  const jumlahKuis = materiTersedia.filter(
    (materi) => materi.kuis?.jumlahSoal > 0
  ).length;

  return (
    <main id="main-content" className="page">
      <section className="page-header" aria-labelledby="kelas-title">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${jenjang.slug}`}>{jenjang.singkatan}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{kelas.nama}</span>
          </nav>
          <p className="eyebrow">
            {jenjang.singkatan} &middot; {kelas.nama}
          </p>
          <h1 id="kelas-title" className="page-title">
            Materi {kelas.nama}
          </h1>
          <p className="page-lead">{kelas.deskripsi}</p>
          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconBook size={15} />
              {materiTersedia.length} materi
            </span>
            <span className="chip">
              <IconTarget size={15} />
              {jumlahKuis} kuis
            </span>
            <span className="chip">
              <IconSparkles size={15} />
              Pembantu AI di setiap materi
            </span>

            {/* Menghapus cookie akses kelas, sehingga token harus dimasukkan lagi. */}
            <form action={keluarKelas}>
              <button className="btn btnSecondary btnSm" type="submit">
                <IconLogout size={15} />
                Keluar kelas
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="content-section" aria-labelledby="materi-title">
        <div className="container">
          <header className="sectionHead">
            <p className="eyebrow">Daftar Materi</p>
            <h2 id="materi-title" className="sectionTitle">
              Belajar berurutan
            </h2>
            <p className="sectionLead">
              Ikuti dari atas ke bawah. Setiap materi diakhiri kuis singkat
              untuk mengecek pemahaman.
            </p>
          </header>

          {daftarMateri === null ? (
            <p className="emptyState">
              Materi belum dapat dimuat. Hubungi guru atau coba lagi nanti.
            </p>
          ) : materiTersedia.length === 0 ? (
            <p className="empty-state">
              Materi untuk {kelas.nama} segera hadir. Silakan cek kembali nanti.
            </p>
          ) : (
            <ol className="materialList">
              {materiTersedia.map((materi, index) => (
                <li key={materi.slug}>
                  <Link
                    className="materialItem"
                    href={`/${jenjang.slug}/${kelas.slug}/${materi.slug}`}
                  >
                    <span className="materialIndex" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="materialMain">
                      <span className="materialTitle">{materi.judul}</span>
                      {materi.deskripsi ? (
                        <span className="materialDesc">{materi.deskripsi}</span>
                      ) : null}
                    </span>

                    {materi.durasi ? (
                      <span className="chip">
                        <IconClock size={14} />
                        {materi.durasi}
                      </span>
                    ) : null}

                    <span className="materialArrow" aria-hidden="true">
                      <IconArrowRight size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
