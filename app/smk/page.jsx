/*
 * Halaman akses kelas SMK (/smk)
 *
 * Tanggung jawab: menjadi pintu masuk ke materi. Daftar kelas tidak lagi
 * ditampilkan di sini maupun di beranda; siswa memasukkan token kelas yang
 * diberikan guru (seperti token ujian), lalu langsung dibawa ke kelasnya.
 *
 * CARA EDIT:
 * - Token per kelas dibuat dan diganti guru di /guru/token (tabel `token_kelas`).
 * - Nama dan deskripsi jenjang diambil dari config/education.js.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getJenjangBySlug } from "@/config/education";
import {
  adaToken,
  daftarKelasTerbuka,
  keluarKelas,
  masukKelas,
} from "@/lib/kelas/akses";
import {
  kunciPerangkatAktif,
  perangkatTerkunci,
} from "@/lib/guru/perangkat";
import {
  lupakanPerangkat,
  simpanTokenPerangkat,
} from "@/lib/guru/perangkat-aksi";
import {
  IconArrowRight,
  IconBook,
  IconCompass,
  IconLogout,
  IconTarget,
} from "@/components/Icons/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Materi Informatika SMK",
  description:
    "Materi Informatika SMK dibuka dengan token kelas dari guru.",
};

const PESAN = {
  token: "Token tidak cocok. Periksa kembali token dari guru.",
  akses: "Sesi kelas sudah berakhir. Masukkan token kelas lagi.",
  konfigurasi: "Token kelas belum dapat dibaca server. Hubungi pengelola situs.",
  belum: "Token kelas belum dibuat guru. Minta guru membuatnya di panel guru.",
  batas: "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.",
  "perangkat-konfigurasi":
    "Token perangkat belum dapat dibaca server. Hubungi guru.",
};

export default async function SmkPage({ searchParams }) {
  const jenjang = getJenjangBySlug("smk");

  // Jika entri "smk" dihapus dari config, halaman menjadi 404.
  if (!jenjang) notFound();

  const siap = await adaToken();
  const terbuka = await daftarKelasTerbuka();
  const pesan = PESAN[searchParams?.galat] ?? "";

  /*
   * Kunci perangkat: kartunya hanya muncul bila guru sudah membuat token
   * perangkat. Bila belum, absensi berjalan tanpa kunci HP dan halaman ini
   * tidak menambah kolom yang tidak berguna.
   */
  const kunciPerangkat = await kunciPerangkatAktif();
  const perangkatSiap = kunciPerangkat && (await perangkatTerkunci());

  const namaKelas = (slug) =>
    jenjang.kelas.find((item) => item.slug === slug)?.nama ?? `Kelas ${slug}`;

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
            Masuk ke kelas
          </h1>
          <p className="page-lead">
            Materi kelas 10, 11, dan 12 dibuka dengan token kelas. Minta token
            kepada guru, lalu masukkan di bawah ini.
          </p>
          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconBook size={15} />
              {jenjang.kelas.length} kelas
            </span>
            <span className="chip">
              <IconTarget size={15} />
              Kuis di setiap materi
            </span>
            <span className="chip">
              <IconCompass size={15} />
              Kurikulum Merdeka
            </span>
          </div>
        </div>
      </section>

      <section className="content-section" aria-labelledby="token-title">
        <div className="container">
          <div className="card">
            <h2 id="token-title" className="sectionTitle">
              Token kelas
            </h2>
            <p className="sectionLead">
              Token berbeda untuk tiap kelas. Setelah benar, kamu langsung
              dibawa ke daftar materi kelas tersebut.
            </p>

            {siap ? (
              <form action={masukKelas}>
                <div className="authField">
                  <label className="authLabel" htmlFor="token">
                    Token kelas
                  </label>
                  <input
                    className="authInput"
                    id="token"
                    name="token"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    autoFocus
                    aria-describedby="token-hint"
                  />
                </div>

                {pesan ? (
                  <p className="authMessage authMessageError" role="alert">
                    {pesan}
                  </p>
                ) : null}

                <button className="btn btnPrimary" type="submit">
                  Masuk
                  <IconArrowRight size={17} />
                </button>

                <p className="authLinks" id="token-hint">
                  Token hanya berlaku untuk satu kelas dan berlaku 8 jam di
                  perangkat ini.
                </p>
              </form>
            ) : (
              <p className="emptyState">
                Token kelas belum dibuat. Guru dapat membuat token untuk tiap
                kelas dari panel guru.
              </p>
            )}
          </div>

          {kunciPerangkat ? (
            <div className="card">
              <h2 className="sectionTitle">Token perangkat</h2>
              <p className="sectionLead">
                Dimasukkan sekali per HP. Fungsinya mengunci absensi: satu HP
                hanya untuk satu siswa, dan satu siswa hanya dari satu HP.
              </p>

              {perangkatSiap ? (
                <>
                  <p className="authMessage authMessageSuccess" role="status">
                    Perangkat ini sudah terdaftar. Absensi bisa langsung diisi.
                  </p>

                  {/* Mengganti HP: token dilepas supaya bisa dimasukkan lagi,
                      tanpa mengubah token yang dipegang guru. */}
                  <form action={lupakanPerangkat}>
                    <button className="btn btnGhost btnSm" type="submit">
                      Ganti perangkat
                    </button>
                  </form>

                  <p className="authHint">
                    Bila guru baru mengganti token perangkat, halaman ini akan
                    meminta token baru pada absensi berikutnya.
                  </p>
                </>
              ) : (
                <form action={simpanTokenPerangkat}>
                  <div className="authField">
                    <label className="authLabel" htmlFor="token-perangkat">
                      Token perangkat
                    </label>
                    <input
                      className="authInput"
                      id="token-perangkat"
                      name="token"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      aria-describedby="perangkat-hint"
                    />
                  </div>

                  <button className="btn btnSecondary" type="submit">
                    Daftarkan perangkat
                  </button>

                  <p className="authLinks" id="perangkat-hint">
                    Masukkan satu kali saja. Token ini tidak membuka materi;
                    materi tetap memerlukan token kelas di atas.
                  </p>
                </form>
              )}
            </div>
          ) : null}

          {terbuka.length > 0 ? (
            <div className="authLinks">
              <p>
                Lanjutkan ke:{" "}
                {terbuka.map((slug, index) => (
                  <span key={slug}>
                    {index > 0 ? " · " : null}
                    <Link href={`/${jenjang.slug}/${slug}`}>
                      {namaKelas(slug)}
                    </Link>
                  </span>
                ))}
              </p>

              {/* Menghapus cookie akses semua kelas di perangkat ini. */}
              <form action={keluarKelas}>
                <button className="btn btnGhost btnSm" type="submit">
                  <IconLogout size={15} />
                  Keluar dari semua kelas
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
