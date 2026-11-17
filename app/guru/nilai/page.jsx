import Link from "next/link";
import { redirect } from "next/navigation";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import { petaJudulMateri } from "@/lib/materi/kelas";
import {
  IconArrowLeft,
  IconClipboard,
  IconDashboard,
  IconTarget,
} from "@/components/Icons/Icons";

/*
 * Rekap nilai kuis (/guru/nilai)
 *
 * Tanggung jawab: menampilkan statistik agregat hasil kuis per kelas dan
 * per materi dari tabel `kuis_hasil`.
 *
 * Catatan:
 * - Tidak ada akun siswa, sehingga rekap tidak menampilkan identitas.
 *   Satu baris = satu pengerjaan, bukan satu siswa.
 * - Persentase (`skor / total`) dipakai, bukan skor mentah, karena jumlah
 *   soal antar materi bisa berbeda.
 * - Database hanya dibaca dari server memakai service role key.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rekap nilai",
};

// Batas baris yang dibaca untuk agregasi. Skala sekolah jauh di bawah angka
// ini; batas ini hanya mencegah satu permintaan membaca tabel tanpa henti.
const BATAS_BARIS = 5000;

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];

function labelKelas(slug) {
  return daftarKelas.find((item) => item.slug === slug)?.nama ?? `Kelas ${slug}`;
}

function formatPersen(nilai) {
  return `${Math.round(nilai)}%`;
}

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Rekap nilai</p>
          <h1 className="page-title">Layanan belum dikonfigurasi</h1>
          <p className="page-lead">
            Variabel <code>SUPABASE_URL</code> atau{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> belum diisi. Jalankan{" "}
            <code>supabase/schema.sql</code> lalu isi variabel tersebut di{" "}
            <code>.env.local</code>.
          </p>
        </div>
      </header>
    </main>
  );
}

export default async function RekapNilaiPage({ searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const kelas = daftarKelas.some((item) => item.slug === searchParams?.kelas)
    ? searchParams.kelas
    : "";

  let kueri = supabase
    .from("kuis_hasil")
    .select("kelas, materi, skor, total")
    .order("dibuat_pada", { ascending: false })
    .limit(BATAS_BARIS);

  if (kelas) kueri = kueri.eq("kelas", kelas);

  const { data, error } = await kueri;

  const judulMateri = await petaJudulMateri();

  // Agregasi per kelas + materi.
  const peta = new Map();

  for (const baris of data ?? []) {
    if (!Number.isFinite(baris.total) || baris.total <= 0) continue;

    const kunci = `${baris.kelas}|${baris.materi}`;
    const persen = (baris.skor / baris.total) * 100;
    const entri = peta.get(kunci) ?? {
      kelas: baris.kelas,
      materi: baris.materi,
      jumlah: 0,
      jumlahPersen: 0,
      terendah: 100,
      tertinggi: 0,
    };

    entri.jumlah += 1;
    entri.jumlahPersen += persen;
    entri.terendah = Math.min(entri.terendah, persen);
    entri.tertinggi = Math.max(entri.tertinggi, persen);

    peta.set(kunci, entri);
  }

  // Materi dengan rata-rata terendah tampil lebih dulu: guru langsung melihat
  // bagian yang paling perlu diperbaiki.
  const rekap = [...peta.values()]
    .map((entri) => ({
      ...entri,
      rataRata: entri.jumlahPersen / entri.jumlah,
    }))
    .sort((a, b) => a.rataRata - b.rataRata);

  const totalPengerjaan = rekap.reduce((jumlah, item) => jumlah + item.jumlah, 0);
  const rataKeseluruhan =
    totalPengerjaan > 0
      ? rekap.reduce((jumlah, item) => jumlah + item.jumlahPersen, 0) /
        totalPengerjaan
      : 0;

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/guru">Panel guru</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Rekap nilai</span>
          </nav>

          <p className="eyebrow">Rekap nilai</p>
          <h1 className="page-title">Rekap nilai kuis</h1>
          <p className="page-lead">
            Statistik agregat hasil kuis per materi. Rekap bersifat anonim:
            setiap baris adalah satu pengerjaan, bukan satu siswa, sehingga satu
            siswa yang mengulang kuis terhitung lebih dari sekali.
          </p>

          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconClipboard size={15} />
              {totalPengerjaan} pengerjaan
            </span>
            <span className="chip">
              <IconDashboard size={15} />
              {rekap.length} materi
            </span>
            {totalPengerjaan > 0 ? (
              <span className="chip chipInfo">
                <IconTarget size={15} />
                Rata-rata {formatPersen(rataKeseluruhan)}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Filter rekap">
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
                defaultValue={kelas}
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
          </form>
        </div>
      </section>

      <section className="content-section" aria-label="Tabel rekap nilai">
        <div className="container">
          {error ? (
            <p className="emptyState">
              Data belum dapat dimuat. Pastikan tabel <code>kuis_hasil</code>{" "}
              sudah dibuat lewat <code>supabase/schema.sql</code>.
            </p>
          ) : rekap.length === 0 ? (
            <p className="emptyState">
              Belum ada hasil kuis{kelas ? ` di ${labelKelas(kelas)}` : ""}.
              Rekap akan terisi setelah siswa mengerjakan kuis.
            </p>
          ) : (
            <div className="dashboardTableWrapper">
              <table className="dashboardTable">
                <thead>
                  <tr>
                    <th scope="col">Kelas</th>
                    <th scope="col">Materi</th>
                    <th scope="col">Pengerjaan</th>
                    <th scope="col">Rata-rata</th>
                    <th scope="col">Terendah</th>
                    <th scope="col">Tertinggi</th>
                  </tr>
                </thead>
                <tbody>
                  {rekap.map((item) => (
                    <tr key={`${item.kelas}|${item.materi}`}>
                      <td>{labelKelas(item.kelas)}</td>
                      <th scope="row">
                        {judulMateri.get(`${item.kelas}|${item.materi}`) ??
                          item.materi}
                      </th>
                      <td>{item.jumlah}</td>
                      <td>{formatPersen(item.rataRata)}</td>
                      <td>{formatPersen(item.terendah)}</td>
                      <td>{formatPersen(item.tertinggi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="rekapNote">
            Persentase dihitung dari jumlah jawaban benar dibagi jumlah soal
            materi tersebut. Data tidak dapat dirinci per siswa karena hasil
            kuis disimpan tanpa identitas.
          </p>

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
