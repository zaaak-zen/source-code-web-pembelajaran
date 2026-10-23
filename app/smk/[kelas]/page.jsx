/*
 * Halaman detail kelas SMK (/smk/[kelas], contoh /smk/10)
 *
 * Tanggung jawab: menampilkan daftar materi Informatika untuk satu kelas.
 *
 * CARA EDIT:
 * - Daftar materi diambil dari config/education.js
 *   (cari bagian "jenjang" -> "smk" -> "kelas" -> "materi").
 * - Jika "materi" masih kosong ([]), halaman menampilkan pesan "segera hadir".
 * - Setiap materi otomatis tertaut ke /smk/<kelas>/<slug-materi>.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getKelasBySlug, getJenjangBySlug } from "@/config/education";
import {
  IconArrowRight,
  IconBook,
  IconClock,
  IconSparkles,
  IconTarget,
} from "@/components/Icons/Icons";

const JENJANG_SLUG = "smk";

export function generateStaticParams() {
  const jenjang = getJenjangBySlug(JENJANG_SLUG);
  if (!jenjang) return [];
  return jenjang.kelas.map((kelas) => ({ kelas: kelas.slug }));
}

export function generateMetadata({ params }) {
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);
  if (!kelas) return { title: "Kelas tidak ditemukan" };
  return { title: `${kelas.nama} — SMK` };
}

export default function KelasPage({ params }) {
  const jenjang = getJenjangBySlug(JENJANG_SLUG);
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);

  if (!jenjang || !kelas) notFound();

  const jumlahKuis = kelas.materi.filter(
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
              {kelas.materi.length} materi
            </span>
            <span className="chip">
              <IconTarget size={15} />
              {jumlahKuis} kuis
            </span>
            <span className="chip">
              <IconSparkles size={15} />
              Pembantu AI di setiap materi
            </span>
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

          {kelas.materi.length === 0 ? (
            // Kondisi kosong: tampil selama daftar materi masih [].
            <p className="empty-state">
              Materi untuk {kelas.nama} segera hadir. Silakan cek kembali nanti.
            </p>
          ) : (
            <ol className="materialList">
              {kelas.materi.map((materi, index) => (
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
