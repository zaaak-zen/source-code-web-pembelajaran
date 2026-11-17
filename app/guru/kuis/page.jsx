import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import educationConfig from "@/config/education";
import { ambilMateri, ambilSemuaMateri } from "@/lib/materi/kelas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import { ambilPetaBank, hapusBank, simpanBank } from "@/lib/kuis/bank";
import { aiSiap, buatSoalDariMateri } from "@/lib/kuis/ai";
import { MAX_SOAL } from "@/lib/kuis/soal";
import TombolProses from "@/components/Guru/TombolProses";
import { TombolKeluarGuru } from "@/components/Guru/TombolKeluarGuru";
import {
  IconArrowLeft,
  IconSparkles,
  IconTarget,
  IconX,
} from "@/components/Icons/Icons";

/*
 * Bank soal kuis guru (/guru/kuis)
 *
 * Tanggung jawab: menyusun soal kuis sekali per materi memakai AI, menyimpannya
 * di tabel `kuis_bank`, dan menampilkan status bank yang sudah ada.
 *
 * Mengapa di panel guru, bukan di halaman siswa:
 * - Soal dibuat satu kali sehingga semua siswa mengerjakan soal yang sama.
 * - Pemanggilan AI tidak lagi bergantung pada cache server, jadi tidak ada
 *   siswa yang mendapat soal berbeda karena cache kedaluwarsa.
 * - Urutan soal tetap diacak per siswa oleh /api/kuis, bukan di sini.
 *
 * Akses memakai akun guru yang sama dengan halaman /guru lainnya.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Soal kuis",
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

/** Server action: susun soal baru dengan AI lalu simpan ke bank. */
async function buatSoal(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  const materi = String(formData.get("materi") ?? "");
  const dataMateri = await ambilMateri(kelas, materi);

  if (!dataMateri) redirect("/guru/kuis?galat=materi");

  const jumlahSoal = Number(dataMateri.kuis?.jumlahSoal);

  if (
    !Number.isInteger(jumlahSoal) ||
    jumlahSoal < 1 ||
    jumlahSoal > MAX_SOAL
  ) {
    redirect(`/guru/kuis?galat=jumlah&kelas=${kelas}`);
  }

  if (!aiSiap()) redirect(`/guru/kuis?galat=ai&kelas=${kelas}`);

  if (!createSupabaseServerClient()) {
    redirect(`/guru/kuis?galat=konfigurasi&kelas=${kelas}`);
  }

  let soal = null;

  try {
    ({ soal } = await buatSoalDariMateri({ materi: dataMateri, jumlahSoal }));
  } catch (error) {
    console.error("Bank soal: gagal menyusun soal.", error.message);
  }

  // redirect() di luar blok try agar tidak tertangkap sebagai error biasa.
  if (!soal) redirect(`/guru/kuis?galat=ai&kelas=${kelas}`);

  const { error } = await simpanBank(kelas, materi, soal);

  if (error) redirect(`/guru/kuis?galat=simpan&kelas=${kelas}`);

  // simpanBank sudah membuang cache bank soal; halaman siswa diberi tahu
  // lewat revalidatePath agar tersehat juga saat halaman itu di-cache.
  revalidatePath("/guru/kuis");
  revalidatePath(`/smk/${kelas}/${materi}/kuis`);
  redirect(`/guru/kuis?tersimpan=1&kelas=${kelas}&materi=${materi}`);
}

/** Server action: hapus bank soal satu materi. */
async function hapusSoal(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  const materi = String(formData.get("materi") ?? "");

  if (!(await ambilMateri(kelas, materi))) {
    redirect("/guru/kuis?galat=materi");
  }

  const { error } = await hapusBank(kelas, materi);

  if (error) redirect(`/guru/kuis?galat=simpan&kelas=${kelas}`);

  revalidatePath("/guru/kuis");
  revalidatePath(`/smk/${kelas}/${materi}/kuis`);
  redirect(`/guru/kuis?dihapus=1&kelas=${kelas}&materi=${materi}`);
}

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Soal kuis</p>
          <h1 className="page-title">Layanan belum dikonfigurasi</h1>
          <p className="page-lead">
            Variabel <code>SUPABASE_URL</code> dan{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> belum diisi. Jalankan{" "}
            <code>supabase/schema.sql</code> lalu isi variabel tersebut di{" "}
            <code>.env.local</code>.
          </p>
        </div>
      </header>
    </main>
  );
}

export default async function BankSoalPage({ searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const kelasDipilih = daftarKelas.some(
    (item) => item.slug === searchParams?.kelas
  )
    ? searchParams.kelas
    : "";

  const peta = await ambilPetaBank();
  const semuaMateri = await ambilSemuaMateri();

  // Materi tanpa jumlah soal tidak punya kuis, jadi tidak perlu bank soal.
  const daftarMateri = (semuaMateri ?? [])
    .filter(
      (materi) =>
        (!kelasDipilih || materi.kelas === kelasDipilih) &&
        materi.kuis.jumlahSoal > 0
    )
    .map((materi) => ({
      kelas: materi.kelas,
      kelasNama: labelKelas(materi.kelas),
      materi: materi.slug,
      materiJudul: materi.judul,
      jumlahSoal: materi.kuis.jumlahSoal,
    }));

  const jumlahBank = daftarMateri.filter((item) =>
    peta?.has(`${item.kelas}|${item.materi}`)
  ).length;

  const aiBelumSiap = !aiSiap();

  const namaMateri =
    (semuaMateri ?? []).find(
      (item) =>
        item.kelas === searchParams?.kelas &&
        item.slug === searchParams?.materi
    )?.judul ??
    searchParams?.materi ??
    "Materi";

  const pesan =
    searchParams?.tersimpan
      ? `Soal ${namaMateri} berhasil disimpan.`
      : searchParams?.dihapus
        ? `Soal ${namaMateri} dihapus.`
        : searchParams?.galat === "ai"
          ? "Soal gagal disusun. Periksa konfigurasi AI lalu coba lagi."
          : searchParams?.galat === "simpan"
            ? "Soal gagal disimpan. Periksa koneksi lalu coba lagi."
            : searchParams?.galat === "jumlah"
              ? "Jumlah soal di config tidak valid (1-20)."
              : searchParams?.galat === "materi"
                ? "Materi tidak dikenal."
                : searchParams?.galat === "konfigurasi"
                  ? "Supabase belum dikonfigurasi di server."
                  : "";

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/guru">Panel guru</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Soal kuis</span>
          </nav>

          <p className="eyebrow">Soal kuis</p>
          <h1 className="page-title">Bank soal kuis</h1>
          <p className="page-lead">
            Susun soal sekali per materi dengan AI atau tulis manual, lalu
            simpan. Semua siswa mengerjakan soal yang sama, tetapi urutan soal
            dan pilihan diacak sehingga nomor soalnya bisa berbeda dengan teman.
          </p>

          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconSparkles size={15} />
              {jumlahBank} materi siap
            </span>
            <span className="chip">
              <IconTarget size={15} />
              {daftarMateri.length} materi berkuis
            </span>
            <TombolKeluarGuru />
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Filter bank soal">
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
          </form>
        </div>
      </section>

      <section className="content-section" aria-label="Daftar bank soal">
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

          {aiBelumSiap ? (
            <p className="authMessage authMessageError" role="alert">
              Layanan AI belum dikonfigurasi. Isi <code>AI_API_KEY</code>,{" "}
              <code>AI_BASE_URL</code>, dan <code>AI_MODEL</code> di{" "}
              <code>.env.local</code> terlebih dahulu.
            </p>
          ) : null}

          {semuaMateri === null ? (
            <p className="emptyState">
              Materi belum dapat dimuat. Pastikan tabel <code>materi</code>{" "}
              sudah dibuat lewat <code>supabase/schema.sql</code>.
            </p>
          ) : daftarMateri.length === 0 ? (
            <p className="emptyState">
              Belum ada materi dengan jumlah soal kuis. Atur jumlah soal di{" "}
              <Link href="/guru/materi">menu Materi</Link>.
            </p>
          ) : (
            <div className="dashboardTableWrapper">
              <table className="dashboardTable">
                <thead>
                  <tr>
                    <th scope="col">Kelas</th>
                    <th scope="col">Materi</th>
                    <th scope="col">Soal</th>
                    <th scope="col">Bank soal</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarMateri.map((item) => {
                    const bank = peta?.get(`${item.kelas}|${item.materi}`);
                    const waktu = formatWaktu(bank?.diperbaruiPada);

                    return (
                      <tr key={`${item.kelas}|${item.materi}`}>
                        <td>{item.kelasNama}</td>
                        <th scope="row">{item.materiJudul}</th>
                        <td>{item.jumlahSoal}</td>
                        <td>
                          {bank ? (
                            <span className="absenName">
                              <span className="absenNameText">
                                {bank.jumlah} soal tersimpan
                              </span>
                              <span className="absenNameNote">
                                Diperbarui {waktu}
                              </span>
                            </span>
                          ) : (
                            <span className="authHint">Belum dibuat</span>
                          )}
                        </td>
                        <td>
                          <div className="tokenActions">
                            <Link
                              className="btn btnSecondary btnSm"
                              href={`/guru/kuis/${item.kelas}/${item.materi}`}
                            >
                              Tulis manual
                            </Link>

                            <form action={buatSoal}>
                              <input
                                type="hidden"
                                name="kelas"
                                value={item.kelas}
                              />
                              <input
                                type="hidden"
                                name="materi"
                                value={item.materi}
                              />
                              <TombolProses
                                className="btn btnPrimary btnSm"
                                labelProses="Menyusun soal..."
                                nonaktif={aiBelumSiap}
                              >
                                {bank ? "Buat ulang soal" : "Buat soal"}
                              </TombolProses>
                            </form>

                            {bank ? (
                              <form action={hapusSoal}>
                                <input
                                  type="hidden"
                                  name="kelas"
                                  value={item.kelas}
                                />
                                <input
                                  type="hidden"
                                  name="materi"
                                  value={item.materi}
                                />
                                <TombolProses
                                  className="btn btnGhost btnSm"
                                  labelProses="Menghapus..."
                                >
                                  <IconX size={14} />
                                  Hapus
                                </TombolProses>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="rekapNote">
            Tombol <strong>Buat soal</strong> memakai AI dan bisa memakan waktu
            puluhan detik. Tombol <strong>Tulis manual</strong> membuka editor
            untuk menulis atau merapikan soal sendiri. Keduanya mengganti
            seluruh bank soal materi. Siswa tidak bisa membuat soal sendiri;
            kuis hanya bisa dikerjakan setelah bank soal materi ini dibuat.
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
