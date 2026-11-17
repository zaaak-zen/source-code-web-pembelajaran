import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getKelasBySlug, getJenjangBySlug } from "@/config/education";
import { punyaAksesKelas } from "@/lib/kelas/akses";
import {
  lupakanKode,
  masukRiwayat,
  punyaAksesRiwayat,
  siswaRiwayatAktif,
} from "@/lib/kelas/riwayat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconLogout,
  IconTrophy,
  IconUser,
} from "@/components/Icons/Icons";

/*
 * Riwayat nilai siswa (/smk/[kelas]/riwayat)
 *
 * Tanggung jawab: menampilkan seluruh nilai kuis seorang siswa di satu kelas,
 * setelah siswa memasukkan kode akses yang dibuat guru.
 *
 * Akses: dua lapis. Pertama token kelas (cookie `akses_kelas`), kedua kode
 * riwayat per siswa (cookie `riwayat_kelas`). Tanpa salah satunya, halaman
 * menampilkan formulir kode atau mengalihkan ke /smk.
 *
 * Identitas: siswa tidak punya akun dan tanggal lahir tidak pernah disimpan.
 * Kode 6 karakter itulah pengganti identitas, dan hanya membuka riwayat satu
 * siswa di satu kelas.
 */

const JENJANG_SLUG = "smk";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Riwayat nilai",
};

const PESAN_GALAT = {
  kode: "Kode tidak cocok. Periksa kembali kode yang diberikan guru.",
  batas: "Terlalu banyak percobaan. Tunggu 10 menit lalu coba lagi.",
  konfigurasi: "Supabase belum dikonfigurasi di server.",
};

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Riwayat nilai</p>
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

function formatWaktu(nilai) {
  if (!nilai) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(nilai));
}

function persen(skor, total) {
  if (!total) return 0;
  return Math.round((skor / total) * 100);
}

/** Server action: lupakan kode yang tersimpan di perangkat ini. */
async function keluarRiwayat(formData) {
  "use server";

  const kelas = String(formData.get("kelas") ?? "");
  lupakanKode(kelas);
  redirect(`/smk/${kelas}/riwayat`);
}

export default async function RiwayatKelasPage({ params, searchParams }) {
  const jenjang = getJenjangBySlug(JENJANG_SLUG);
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);
  if (!jenjang || !kelas) notFound();

  if (!(await punyaAksesKelas(kelas.slug))) redirect("/smk?galat=akses");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const pesanKode = PESAN_GALAT[searchParams?.galat] ?? "";
  const sudahPunyaKode = punyaAksesRiwayat(kelas.slug);

  // Belum memasukkan kode: tampilkan formulir kode saja.
  if (!sudahPunyaKode) {
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
              <span aria-current="page">Riwayat nilai</span>
            </nav>

            <p className="eyebrow">
              {jenjang.singkatan} &middot; {kelas.nama}
            </p>
            <h1 className="page-title">Riwayat nilai</h1>
            <p className="page-lead">
              Masukkan kode yang diberikan guru untuk melihat nilai kuis Anda di{" "}
              {kelas.nama}.
            </p>
          </div>
        </header>

        <section className="content-section" aria-label="Formulir kode riwayat">
          <div className="container">
            <div className="card">
              <h2 className="dashSectionTitle">Kode riwayat</h2>

              {pesanKode ? (
                <p className="authMessage authMessageError" role="alert">
                  {pesanKode}
                </p>
              ) : null}

              <form action={masukRiwayat}>
                <input type="hidden" name="kelas" value={kelas.slug} />

                <div className="authField">
                  <label className="authLabel" htmlFor="kode">
                    Kode dari guru
                  </label>
                  <input
                    className="authInput"
                    id="kode"
                    name="kode"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={12}
                    placeholder="Contoh: K7M2QP"
                    required
                  />
                  <p className="authHint">
                    6 karakter. Huruf besar dan kecil dianggap sama.
                  </p>
                </div>

                <button className="btn btnPrimary" type="submit">
                  <IconTrophy size={16} />
                  Lihat riwayat
                </button>
              </form>

              <p className="authHint">
                Belum punya kode? Minta guru Informatika Anda membuatkannya.
              </p>
            </div>

            <div className="absenActions">
              <Link className="btn btnSecondary" href={`/smk/${kelas.slug}`}>
                <IconArrowLeft size={16} />
                Kembali ke {kelas.nama}
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Sudah punya kode: tentukan siswanya, lalu muat riwayatnya.
  const siswa = await siswaRiwayatAktif(kelas.slug);

  if (!siswa) {
    return (
      <main id="main-content" className="page">
        <header className="page-header">
          <div className="container">
            <p className="eyebrow">
              {jenjang.singkatan} &middot; {kelas.nama}
            </p>
            <h1 className="page-title">Kode tidak lagi berlaku</h1>
            <p className="page-lead">
              Kode yang tersimpan di perangkat ini sudah tidak sah — mungkin
              guru sudah menggantinya, atau siswanya sudah dihapus.
            </p>
          </div>
        </header>

        <section className="content-section">
          <div className="container">
            <div className="absenActions">
              <form action={keluarRiwayat}>
                <input type="hidden" name="kelas" value={kelas.slug} />
                <button className="btn btnPrimary" type="submit">
                  <IconLogout size={16} />
                  Masukkan kode baru
                </button>
              </form>
              <Link className="btn btnSecondary" href={`/smk/${kelas.slug}`}>
                <IconArrowLeft size={16} />
                Kembali ke {kelas.nama}
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: hasil, error } = await supabase
    .from("kuis_hasil")
    .select("id, materi, skor, total, dibuat_pada")
    .eq("kelas", kelas.slug)
    .ilike("nama", siswa.nama.trim())
    .order("dibuat_pada", { ascending: false })
    .limit(200);

  // Judul materi diambil dari tabel `materi` supaya riwayat menampilkan nama
  // yang dibaca siswa, bukan slug.
  const { data: daftarMateri } = await supabase
    .from("materi")
    .select("slug, judul")
    .eq("kelas", kelas.slug);

  const judulMateri = new Map(
    (daftarMateri ?? []).map((baris) => [baris.slug, baris.judul])
  );

  const baris = hasil ?? [];
  const jumlahKuis = baris.length;
  const rataRata = jumlahKuis
    ? Math.round(
        baris.reduce((jumlah, item) => jumlah + persen(item.skor, item.total), 0) /
          jumlahKuis
      )
    : 0;
  const tertinggi = jumlahKuis
    ? Math.max(...baris.map((item) => persen(item.skor, item.total)))
    : 0;

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
            <span aria-current="page">Riwayat nilai</span>
          </nav>

          <p className="eyebrow">
            {jenjang.singkatan} &middot; {kelas.nama}
          </p>
          <h1 className="page-title">Riwayat nilai</h1>
          <p className="page-lead">
            Seluruh nilai kuis {siswa.nama} di {kelas.nama}.
          </p>

          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconUser size={15} />
              {siswa.nama}
            </span>
            <span className="chip">
              <IconTrophy size={15} />
              {jumlahKuis} pengerjaan
            </span>
            {jumlahKuis ? (
              <>
                <span className="chip">Rata-rata {rataRata}%</span>
                <span className="chip">Tertinggi {tertinggi}%</span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Daftar nilai kuis">
        <div className="container">
          {error ? (
            <p className="authMessage authMessageError" role="alert">
              Riwayat belum dapat dimuat. Pastikan tabel <code>kuis_hasil</code>{" "}
              sudah dibuat lewat <code>supabase/schema.sql</code>.
            </p>
          ) : null}

          {!error && baris.length === 0 ? (
            <div className="card">
              <h2 className="dashSectionTitle">
                <IconCheckCircle size={18} /> Belum ada nilai
              </h2>
              <p className="authHint">
                Anda belum mengerjakan kuis apa pun di {kelas.nama}. Kerjakan
                dulu salah satu kuis, lalu buka halaman ini lagi.
              </p>
              <p className="panelAction">
                <Link className="btn btnPrimary" href={`/smk/${kelas.slug}`}>
                  Lihat daftar materi
                </Link>
              </p>
            </div>
          ) : null}

          {baris.length > 0 ? (
            <div className="dashboardTableWrapper">
              <table className="dashboardTable">
                <caption className="sr-only">
                  Daftar nilai kuis {siswa.nama} di {kelas.nama}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Materi</th>
                    <th scope="col">Skor</th>
                    <th scope="col">Nilai</th>
                    <th scope="col">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((item) => (
                    <tr key={item.id}>
                      <th scope="row">
                        {judulMateri.get(item.materi) ?? item.materi}
                      </th>
                      <td>
                        {item.skor}/{item.total}
                      </td>
                      <td>{persen(item.skor, item.total)}%</td>
                      <td>{formatWaktu(item.dibuat_pada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="rekapNote">
            Riwayat hanya menampilkan skor akhir, bukan jawaban per soal. Skor
            dihitung dari kode yang Anda masukkan, jadi pastikan kode itu benar
            milik Anda.
          </p>

          <div className="absenActions">
            <form action={keluarRiwayat}>
              <input type="hidden" name="kelas" value={kelas.slug} />
              <button className="btn btnGhost" type="submit">
                <IconLogout size={16} />
                Lupakan kode di perangkat ini
              </button>
            </form>
            <Link className="btn btnSecondary" href={`/smk/${kelas.slug}`}>
              <IconArrowLeft size={16} />
              Kembali ke {kelas.nama}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
