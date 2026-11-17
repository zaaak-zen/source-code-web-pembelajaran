/*
 * Halaman detail materi SMK (/smk/[kelas]/[materi], contoh /smk/10/algoritma)
 *
 * Tanggung jawab: menampilkan isi satu materi Informatika.
 *
 * Data materi dibaca dari tabel `materi` dan dikelola guru lewat /guru/materi.
 * Isinya berupa array blok bertipe tujuan | teks | daftar | kode | catatan;
 * blok yang tidak dikenali diabaikan agar halaman tetap stabil.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getJenjangBySlug, getKelasBySlug } from "@/config/education";
import { ambilMateri, ambilMateriKelas } from "@/lib/materi/kelas";
import { punyaAksesKelas } from "@/lib/kelas/akses";
import { sudahAbsenHariIni } from "@/lib/kelas/absensi";
import { TIPE_BERKAS, formatUkuran } from "@/lib/materi/berkas";
import { urlBerkas } from "@/lib/materi/storage";
import Tanya from "@/components/Tanya/Tanya";
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconCode,
  IconDownload,
  IconFile,
  IconPlay,
  IconTarget,
} from "@/components/Icons/Icons";

const JENJANG_SLUG = "smk";

// Halaman membaca cookie token kelas, jadi selalu dirender per permintaan.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const materi = await ambilMateri(params.kelas, params.materi);
  if (!materi) return { title: "Materi tidak ditemukan" };
  return { title: materi.judul, description: materi.deskripsi };
}

/* ---------- Render blok konten ---------- */

function KontenBlok({ blok, index }) {
  const id = `bagian-${index}`;

  switch (blok.tipe) {
    case "tujuan":
      return (
        <section
          id={id}
          className="materiTujuan materiSection"
          aria-label="Tujuan belajar"
        >
          <p className="materiBlockLabel">Tujuan Belajar</p>
          <ul className="missionList">
            {(blok.items ?? []).map((item, i) => (
              <li key={i} className="missionItem">
                <span className="missionNumber" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "teks":
      return (
        <section id={id} className="materiSection">
          {blok.judul ? (
            <h2 className="materiHeading">{blok.judul}</h2>
          ) : null}
          <p className="materiParagraf">{blok.isi}</p>
        </section>
      );

    case "daftar": {
      const ListTag = blok.terurut ? "ol" : "ul";
      return (
        <section id={id} className="materiSection">
          {blok.judul ? (
            <h2 className="materiHeading">{blok.judul}</h2>
          ) : null}
          <ListTag
            className={blok.terurut ? "materiListOl" : "materiListUl"}
          >
            {(blok.items ?? []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ListTag>
        </section>
      );
    }

    case "kode":
      return (
        <section id={id} className="materiSection">
          {blok.judul ? (
            <h2 className="materiHeading">{blok.judul}</h2>
          ) : null}
          <p className="materiBlockLabel">
            <IconCode size={14} aria-hidden="true" />{" "}
            {blok.bahasa ? `Bahasa: ${blok.bahasa}` : "Contoh kode"}
          </p>
          <pre className="materiKode" tabIndex={0}>
            <code>{blok.isi}</code>
          </pre>
        </section>
      );

    case "catatan":
      return (
        <aside id={id} className="materiCatatan materiSection" aria-label="Catatan">
          <span className="materiCatatanIcon" aria-hidden="true">
            <IconAlert size={18} />
          </span>
          <p>{blok.isi}</p>
        </aside>
      );

    default:
      // Tipe tidak dikenali: dilewati agar halaman tetap stabil.
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `Konten materi: tipe blok tidak dikenal "${blok.tipe}" (index ${index}).`
        );
      }
      return null;
  }
}

function labelBlok(blok, index) {
  if (blok.judul) return blok.judul;
  if (blok.tipe === "tujuan") return "Tujuan belajar";
  if (blok.tipe === "catatan") return "Catatan penting";
  return `Bagian ${index + 1}`;
}

/* ---------- Halaman ---------- */

export default async function MateriPage({ params }) {
  const jenjang = getJenjangBySlug(JENJANG_SLUG);
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);
  const materi = await ambilMateri(params.kelas, params.materi);

  if (!jenjang || !kelas || !materi) notFound();

  // Materi hanya terbuka setelah token kelasnya dimasukkan di /smk.
  if (!(await punyaAksesKelas(kelas.slug))) redirect("/smk?galat=akses");

  if (!(await sudahAbsenHariIni(kelas.slug))) {
    const lanjut = `/smk/${kelas.slug}/${materi.slug}`;
    redirect(
      `/smk/${kelas.slug}/absen?lanjut=${encodeURIComponent(lanjut)}`
    );
  }

  const daftarMateri = (await ambilMateriKelas(kelas.slug)) ?? [];
  const urutan = daftarMateri.findIndex((item) => item.slug === materi.slug);
  const sebelumnya = urutan > 0 ? daftarMateri[urutan - 1] : null;
  const berikutnya =
    urutan >= 0 && urutan < daftarMateri.length - 1
      ? daftarMateri[urutan + 1]
      : null;
  const konten = Array.isArray(materi.konten) ? materi.konten : [];
  const adaKuis = materi.kuis?.jumlahSoal > 0;
  const kuisHref = `/${jenjang.slug}/${kelas.slug}/${materi.slug}/kuis`;

  /*
   * Signed URL dibuat di server karena bucket privat. PDF mendapat dua tautan:
   * satu untuk dipratinjau di iframe, satu dengan header unduhan. Word/PPT
   * hanya mendapat tautan unduhan karena browser tidak bisa merendernya.
   */
  const berkas = Array.isArray(materi.berkas) ? materi.berkas : [];
  const berkasTampil = (
    await Promise.all(
      berkas.map(async (item) => ({
        ...item,
        url: await urlBerkas(item.path, { unduh: item.nama }),
        urlPratinjau: TIPE_BERKAS[item.tipe]?.pratinjau
          ? await urlBerkas(item.path)
          : null,
      }))
    )
  ).filter((item) => item.url);

  // Hanya embed ID YouTube yang bentuknya valid (11 karakter).
  const videoId =
    typeof materi.video?.youtubeId === "string" &&
    /^[A-Za-z0-9_-]{11}$/.test(materi.video.youtubeId)
      ? materi.video.youtubeId
      : null;

  const daftarIsi = [
    { id: "video-materi", label: "Video materi" },
    ...konten.map((blok, index) => ({
      id: `bagian-${index}`,
      label: labelBlok(blok, index),
    })),
    ...(berkasTampil.length > 0
      ? [{ id: "berkas-materi", label: "Berkas materi" }]
      : []),
    { id: "tanya-ai", label: "Tanya AI" },
    ...(adaKuis ? [{ id: "kuis", label: "Kuis" }] : []),
  ];

  return (
    <main id="main-content" className="page">
      <section className="page-header" aria-labelledby="materi-title">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${jenjang.slug}`}>{jenjang.singkatan}</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${jenjang.slug}/${kelas.slug}`}>{kelas.nama}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{materi.judul}</span>
          </nav>

          <p className="eyebrow">
            {jenjang.singkatan} &middot; {kelas.nama}
          </p>
          <h1 id="materi-title" className="page-title">
            {materi.judul}
          </h1>
          {materi.deskripsi ? (
            <p className="page-lead">{materi.deskripsi}</p>
          ) : null}

          <div className="pageMeta">
            {materi.durasi ? (
              <span className="chip chipPrimary">
                <IconClock size={15} />
                {materi.durasi}
              </span>
            ) : null}
            {adaKuis ? (
              <span className="chip">
                <IconTarget size={15} />
                {materi.kuis.jumlahSoal} soal kuis
              </span>
            ) : null}
            {berkasTampil.length > 0 ? (
              <span className="chip">
                <IconFile size={15} />
                {berkasTampil.length} berkas
              </span>
            ) : null}
            <span className="chip">
              <IconPlay size={15} />
              {videoId ? "Video tersedia" : "Video menyusul"}
            </span>
          </div>
        </div>
      </section>

      <section className="content-section" aria-label="Isi materi">
        <div className="container materiLayout">
          <article className="materiMain">
            <section
              id="video-materi"
              className="materiSection"
              aria-labelledby="video-materi-title"
            >
              <p className="eyebrow">Video</p>
              <h2
                id="video-materi-title"
                className="materiHeading"
              >
                Video materi
              </h2>

              {videoId ? (
                <>
                  <div className="videoFrame">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                      title={materi.video?.judul ?? materi.judul}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <a
                    className="materiVideoLink"
                    href={`https://www.youtube.com/watch?v=${videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka di YouTube
                    <IconArrowRight size={15} />
                  </a>
                </>
              ) : (
                <div className="videoEmpty">
                  <span className="videoEmptyIcon" aria-hidden="true">
                    <IconPlay size={22} />
                  </span>
                  <p>
                    <strong>Video materi belum tersedia.</strong> Kamu tetap
                    bisa membaca penjelasan di bawah dan mengerjakan kuisnya.
                  </p>
                </div>
              )}
            </section>

            {konten.length === 0 ? (
              // Kondisi kosong: materinya sudah didaftarkan tetapi isinya belum diisi.
              <p className="empty-state">
                Isi materi ini sedang disiapkan. Silakan cek kembali nanti.
              </p>
            ) : (
              konten.map((blok, index) => (
                <KontenBlok key={index} blok={blok} index={index} />
              ))
            )}

            {/* Berkas lampiran: PDF bisa dipratinjau, Word/PPT diunduh. */}
            {berkasTampil.length > 0 ? (
              <section
                id="berkas-materi"
                className="materiSection"
                aria-labelledby="berkas-materi-title"
              >
                <p className="eyebrow">Unduhan</p>
                <h2 id="berkas-materi-title" className="materiHeading">
                  Berkas materi
                </h2>

                <ul className="berkasList">
                  {berkasTampil.map((item) => (
                    <li key={item.path} className="berkasItem">
                      <div className="berkasInfo">
                        <span className="berkasIkon" aria-hidden="true">
                          <IconFile size={20} />
                        </span>
                        <div>
                          <p className="berkasNama">{item.nama}</p>
                          <p className="berkasMeta">
                            {TIPE_BERKAS[item.tipe]?.label ?? "Berkas"} &middot;{" "}
                            {formatUkuran(item.ukuran)}
                          </p>
                        </div>
                      </div>

                      <div className="berkasActions">
                        <a
                          className="btn btnSecondary btnSm"
                          href={item.url}
                          rel="noopener"
                        >
                          <IconDownload size={16} />
                          Unduh
                        </a>
                      </div>

                      {item.urlPratinjau ? (
                        <details className="berkasPratinjau">
                          <summary>Pratinjau PDF</summary>
                          <iframe
                            src={item.urlPratinjau}
                            title={`Pratinjau ${item.nama}`}
                            loading="lazy"
                          />
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <p className="berkasCatatan">
                  Tautan unduhan berlaku sekitar 2 jam. Muat ulang halaman ini
                  bila tautan sudah kedaluwarsa.
                </p>
              </section>
            ) : null}

            {/* AI pembantu belajar: menjawab berdasarkan materi ini. */}
            <div id="tanya-ai" className="materiSection">
              <Tanya
                kelas={kelas.slug}
                materi={materi.slug}
                judul={materi.judul}
              />
            </div>

            {/* Kuis punya halaman sendiri agar materi tetap ringkas. */}
            {adaKuis ? (
              <div id="kuis" className="materiSection">
                <div className="card">
                  <p className="eyebrow">Kuis</p>
                  <h2 className="materiHeading">
                    {materi.kuis.jumlahSoal} soal pilihan ganda
                  </h2>
                  <p className="materiParagraf">
                    Kuis dibuka di halaman terpisah. Isi nama, jawab semua soal,
                    lalu lihat skor, pembahasan, dan papan skor materi ini.
                  </p>
                  <Link className="btn btnPrimary" href={kuisHref}>
                    Kerjakan kuis
                    <IconArrowRight size={17} />
                  </Link>
                </div>
              </div>
            ) : null}

            <nav className="materiNav" aria-label="Navigasi antar materi">
              {sebelumnya ? (
                <Link
                  href={`/${jenjang.slug}/${kelas.slug}/${sebelumnya.slug}`}
                  className="materiNavLink"
                >
                  <span className="materiNavLabel">
                    <IconArrowLeft size={13} aria-hidden="true" /> Sebelumnya
                  </span>
                  <span className="materiNavTitle">{sebelumnya.judul}</span>
                </Link>
              ) : (
                <span />
              )}
              {berikutnya ? (
                <Link
                  href={`/${jenjang.slug}/${kelas.slug}/${berikutnya.slug}`}
                  className="materiNavLink materiNavNext"
                >
                  <span className="materiNavLabel">
                    Berikutnya{" "}
                    <IconArrowRight size={13} aria-hidden="true" />
                  </span>
                  <span className="materiNavTitle">{berikutnya.judul}</span>
                </Link>
              ) : null}
            </nav>
          </article>

          <aside className="toc" aria-label="Daftar isi">
            <p className="tocTitle">Di halaman ini</p>
            <ul className="tocList">
              {daftarIsi.map((item, index) => (
                <li key={item.id}>
                  <a className="tocLink" href={`#${item.id}`}>
                    <span className="tocIndex" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            {adaKuis ? (
              <div className="tocAction">
                <Link className="btn btnPrimary btnSm btnBlock" href={kuisHref}>
                  Kerjakan kuis
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
