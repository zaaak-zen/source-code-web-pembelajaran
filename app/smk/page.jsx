/*
 * Halaman daftar kelas SMK (/smk)
 *
 * Tanggung jawab: menampilkan daftar kelas untuk jenjang SMK.
 *
 * CARA EDIT:
 * - Nama jenjang, deskripsi, dan daftar kelas diambil dari config/education.js
 *   (cari bagian "jenjang" -> "smk" -> "kelas").
 * - Jangan mengubah teks di file ini untuk mengubah konten.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getJenjangBySlug } from "@/config/education";
import {
  IconArrowRight,
  IconBook,
  IconCompass,
  IconTarget,
} from "@/components/Icons/Icons";

export const metadata = {
  title: "Materi Informatika SMK",
  description:
    "Daftar kelas dan materi Informatika untuk jenjang Sekolah Menengah Kejuruan.",
};

export default function SmkPage() {
  const jenjang = getJenjangBySlug("smk");

  // Jika entri "smk" dihapus dari config, halaman menjadi 404.
  if (!jenjang) notFound();

  const jumlahMateri = jenjang.kelas.reduce(
    (total, kelas) => total + kelas.materi.length,
    0
  );

  return (
    <main id="main-content" className="page">
      <section className="page-header" aria-labelledby="smk-title">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{jenjang.singkatan}</span>
          </nav>
          <p className="eyebrow">Materi SMK</p>
          <h1 id="smk-title" className="page-title">
            {jenjang.nama}
          </h1>
          <p className="page-lead">{jenjang.deskripsi}</p>
          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconBook size={15} />
              {jenjang.kelas.length} kelas
            </span>
            <span className="chip">
              <IconTarget size={15} />
              {jumlahMateri} materi
            </span>
            <span className="chip">
              <IconCompass size={15} />
              Kurikulum Merdeka
            </span>
          </div>
        </div>
      </section>

      <section className="content-section" aria-labelledby="kelas-title">
        <div className="container">
          <header className="sectionHead">
            <p className="eyebrow">Pilih Kelas</p>
            <h2 id="kelas-title" className="sectionTitle">
              Mulai dari kelasmu
            </h2>
            <p className="sectionLead">
              Setiap kelas berisi materi yang saling berurutan. Kamu bisa
              mengerjakan kuis di akhir setiap materi.
            </p>
          </header>

          {jenjang.kelas.length === 0 ? (
            // Kondisi kosong: tampil jika daftar kelas dikosongkan di config.
            <p className="empty-state">
              Daftar kelas belum tersedia. Silakan cek kembali nanti.
            </p>
          ) : (
            <ul className="classGrid">
              {jenjang.kelas.map((kelas) => (
                <li key={kelas.slug}>
                  <Link
                    className="classCard"
                    href={`/${jenjang.slug}/${kelas.slug}`}
                  >
                    <span className="classTop">
                      <span className="classBadge" aria-hidden="true">
                        {kelas.slug}
                      </span>
                      <span className="chip chipPrimary">
                        {kelas.materi.length} materi
                      </span>
                    </span>

                    <span className="className">{kelas.nama}</span>
                    <span className="classDesc">{kelas.deskripsi}</span>

                    {kelas.materi.length > 0 ? (
                      <span className="classTopics">
                        {kelas.materi.slice(0, 2).map((materi) => (
                          <span key={materi.slug} className="chip">
                            {materi.judul}
                          </span>
                        ))}
                        {kelas.materi.length > 2 ? (
                          <span className="chip">
                            +{kelas.materi.length - 2} lagi
                          </span>
                        ) : null}
                      </span>
                    ) : null}

                    <span className="classMeta">
                      <span className="classMetaIcon">
                        <IconBook size={15} />
                        Lihat materi
                      </span>
                      <span className="classArrow" aria-hidden="true">
                        <IconArrowRight size={16} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
