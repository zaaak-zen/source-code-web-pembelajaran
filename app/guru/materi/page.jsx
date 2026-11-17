import Link from "next/link";
import { redirect } from "next/navigation";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import { ambilSemuaMateri } from "@/lib/materi/kelas";
import { hapusMateriAksi, imporMateriAksi } from "@/lib/materi/aksi";
import TombolProses from "@/components/Guru/TombolProses";
import { TombolKeluarGuru } from "@/components/Guru/TombolKeluarGuru";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconX,
} from "@/components/Icons/Icons";

/*
 * Daftar materi guru (/guru/materi)
 *
 * Tanggung jawab: menampilkan seluruh materi dari tabel `materi`, menyediakan
 * tautan tambah/ubah, tombol hapus, dan impor awal dari config/education.js.
 *
 * Materi baru langsung muncul di halaman siswa karena semua halaman membaca
 * database, bukan config.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Materi",
};

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];

function labelKelas(slug) {
  return daftarKelas.find((item) => item.slug === slug)?.nama ?? `Kelas ${slug}`;
}

function formatWaktu(nilai) {
  if (!nilai) return "";

  const tanggal = new Date(nilai);
  if (Number.isNaN(tanggal.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(tanggal);
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

export default async function MateriGuruPage({ searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const kelasDipilih = daftarKelas.some(
    (item) => item.slug === searchParams?.kelas
  )
    ? searchParams.kelas
    : "";

  const semua = await ambilSemuaMateri();

  const daftar = (semua ?? []).filter(
    (item) => !kelasDipilih || item.kelas === kelasDipilih
  );

  const pesan =
    searchParams?.tersimpan === "baru"
      ? "Materi baru berhasil disimpan."
      : searchParams?.tersimpan === "ubah"
        ? "Perubahan materi berhasil disimpan."
        : searchParams?.dihapus
          ? "Materi dihapus beserta bank soalnya."
          : searchParams?.impor !== undefined
            ? `${searchParams.impor} materi diproses. Materi yang sudah ada tidak ditimpa.`
            : searchParams?.galat === "simpan"
              ? "Materi gagal disimpan. Periksa koneksi lalu coba lagi."
              : searchParams?.galat === "impor"
                ? "Impor gagal. Pastikan tabel materi sudah dibuat."
                : searchParams?.galat === "kelas"
                  ? "Kelas tidak dikenal."
                  : searchParams?.galat === "materi"
                    ? "Materi tidak ditemukan."
                    : "";

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/guru">Panel guru</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Materi</span>
          </nav>

          <p className="eyebrow">Materi</p>
          <h1 className="page-title">Kelola materi</h1>
          <p className="page-lead">
            Tambah, ubah, atau hapus materi beserta isinya. Perubahan langsung
            tampil di halaman siswa; tidak perlu mengedit file config.
          </p>

          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconBook size={15} />
              {daftar.length} materi
            </span>
            <TombolKeluarGuru />
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Filter materi">
        <div className="container">
          <form className="absenToolbar" method="get">
            <div className="authField">
              <label className="authLabel" htmlFor="kelas">
                Kelas
              </label>
              <select
                className="authInput"
                id="kelas"
                name="kelas"
                defaultValue={kelasDipilih}
              >
                <option value="">Semua kelas</option>
                {daftarKelas.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btnSecondary" type="submit">
              Tampilkan
            </button>

            <Link
              className="btn btnPrimary"
              href={`/guru/materi/baru${kelasDipilih ? `?kelas=${kelasDipilih}` : ""}`}
            >
              Tambah materi
              <IconArrowRight size={15} />
            </Link>
          </form>
        </div>
      </section>

      <section className="content-section" aria-label="Daftar materi">
        <div className="container">
          {pesan ? (
            <p
              className={
                searchParams?.galat
                  ? "authMessage authMessageError"
                  : "authMessage authMessageSuccess"
              }
              role={searchParams?.galat ? "alert" : "status"}
            >
              {pesan}
            </p>
          ) : null}

          {semua === null ? (
            <p className="emptyState">
              Materi belum dapat dimuat. Pastikan tabel <code>materi</code>{" "}
              sudah dibuat lewat <code>supabase/schema.sql</code>.
            </p>
          ) : (
            <>
              <div className="dashSectionHead">
                <h2 className="dashSectionTitle">Daftar materi</h2>
                <form action={imporMateriAksi}>
                  <TombolProses
                    className="btn btnGhost btnSm"
                    labelProses="Mengimpor..."
                  >
                    Impor dari config
                  </TombolProses>
                </form>
              </div>

              {daftar.length === 0 ? (
                <p className="emptyState">
                  Belum ada materi{kelasDipilih ? ` di ${labelKelas(kelasDipilih)}` : ""}.
                  Klik <strong>Tambah materi</strong>, atau impor 9 materi awal
                  dari <code>config/education.js</code>.
                </p>
              ) : (
                <div className="dashboardTableWrapper">
                  <table className="dashboardTable">
                    <thead>
                      <tr>
                        <th scope="col">Kelas</th>
                        <th scope="col">Materi</th>
                        <th scope="col">Durasi</th>
                        <th scope="col">Video</th>
                        <th scope="col">Kuis</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daftar.map((item) => (
                        <tr key={`${item.kelas}|${item.slug}`}>
                          <td>{labelKelas(item.kelas)}</td>
                          <th scope="row">
                            <span className="absenName">
                              <span className="absenNameText">{item.judul}</span>
                              <span className="absenNameNote">
                                /{item.kelas}/{item.slug}
                                {item.diperbaruiPada
                                  ? ` · Diperbarui ${formatWaktu(item.diperbaruiPada)}`
                                  : ""}
                              </span>
                            </span>
                          </th>
                          <td>{item.durasi || "-"}</td>
                          <td>{item.video ? "Ada" : "Belum"}</td>
                          <td>
                            {item.kuis.jumlahSoal > 0
                              ? `${item.kuis.jumlahSoal} soal`
                              : "-"}
                          </td>
                          <td>
                            <div className="tokenActions">
                              <Link
                                className="btn btnSecondary btnSm"
                                href={`/guru/materi/${item.kelas}/${item.slug}`}
                              >
                                Edit
                              </Link>

                              <form action={hapusMateriAksi}>
                                <input
                                  type="hidden"
                                  name="kelas"
                                  value={item.kelas}
                                />
                                <input
                                  type="hidden"
                                  name="slug"
                                  value={item.slug}
                                />
                                <TombolProses
                                  className="btn btnGhost btnSm"
                                  labelProses="Menghapus..."
                                >
                                  <IconX size={14} />
                                  Hapus
                                </TombolProses>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="rekapNote">
                Menghapus materi juga menghapus bank soal kuis materi tersebut.
                Materi yang punya jumlah soal &gt; 0 akan menampilkan tombol
                kuis di halaman siswa setelah bank soalnya disusun di{" "}
                <Link href="/guru/kuis">Soal kuis</Link>.
              </p>
            </>
          )}

          <div className="absenActions">
            <Link className="btn btnSecondary" href="/guru">
              <IconArrowLeft size={16} />
              Kembali ke panel
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
