import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import { buatKodeAcak } from "@/lib/kelas/riwayat";
import { kelasTerdaftar } from "@/lib/kelas/akses";
import { TombolKeluarGuru } from "@/components/Guru/TombolKeluarGuru";
import {
  IconArrowLeft,
  IconFile,
  IconTrophy,
  IconUsers,
} from "@/components/Icons/Icons";

/*
 * Kode riwayat nilai (/guru/riwayat)
 *
 * Tanggung jawab: membuat, mengganti, dan mencabut kode akses riwayat nilai
 * per siswa. Kode ini yang dibagikan guru kepada siswa untuk membuka
 * /smk/<kelas>/riwayat.
 *
 * Halaman ini sengaja terpisah dari /guru/nilai: rekap nilai tetap menampilkan
 * agregat tanpa nama siswa (keputusan 28 Oktober 2026, lihat rencana.md).
 * Daftar nama siswa hanya muncul di sini, karena kode memang dibuat per siswa.
 *
 * Kode disimpan apa adanya di tabel `kode_riwayat` agar guru dapat melihatnya
 * kembali untuk dibagikan, sama seperti `token_kelas`.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kode riwayat nilai",
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
          <p className="eyebrow">Kode riwayat</p>
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

async function buatKode(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  const siswaId = String(formData.get("siswaId") ?? "");

  if (!kelasTerdaftar(kelas) || !siswaId) {
    redirect("/guru/riwayat?galat=siswa");
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/riwayat?galat=konfigurasi");

  // Pastikan siswa benar-benar ada di kelas itu.
  const { data: siswa, error: galatSiswa } = await supabase
    .from("siswa")
    .select("id")
    .eq("id", siswaId)
    .eq("kelas", kelas)
    .maybeSingle();

  if (galatSiswa || !siswa) redirect("/guru/riwayat?galat=siswa");

  // Kode dibuat di server. Peluang bentrok sangat kecil, tetapi tetap dicoba
  // beberapa kali agar uniq index tidak pernah menjadi galat bagi guru.
  let kode = buatKodeAcak();
  let berhasil = false;

  for (let percobaan = 0; percobaan < 5 && !berhasil; percobaan += 1) {
    const { error } = await supabase.from("kode_riwayat").upsert(
      {
        siswa_id: siswa.id,
        kelas,
        kode,
        diperbarui_pada: new Date().toISOString(),
      },
      { onConflict: "siswa_id" }
    );

    if (!error) {
      berhasil = true;
      break;
    }

    // 23505 = pelanggaran unique (kode sudah dipakai siswa lain).
    if (error.code !== "23505") {
      console.error("Riwayat: gagal menyimpan kode.", error.message);
      redirect(`/guru/riwayat?galat=simpan&kelas=${kelas}`);
    }

    kode = buatKodeAcak();
  }

  if (!berhasil) redirect(`/guru/riwayat?galat=simpan&kelas=${kelas}`);

  revalidatePath("/guru/riwayat");
  redirect(`/guru/riwayat?tersimpan=${kelas}`);
}

async function cabutKode(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  const siswaId = String(formData.get("siswaId") ?? "");

  if (!kelasTerdaftar(kelas) || !siswaId) {
    redirect("/guru/riwayat?galat=siswa");
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/riwayat?galat=konfigurasi");

  const { error } = await supabase
    .from("kode_riwayat")
    .delete()
    .eq("siswa_id", siswaId)
    .eq("kelas", kelas);

  if (error) {
    console.error("Riwayat: gagal mencabut kode.", error.message);
    redirect(`/guru/riwayat?galat=simpan&kelas=${kelas}`);
  }

  revalidatePath("/guru/riwayat");
  redirect(`/guru/riwayat?dicabut=${kelas}`);
}

export default async function RiwayatGuruPage({ searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const kelasDipilih = kelasTerdaftar(searchParams?.kelas)
    ? String(searchParams.kelas)
    : daftarKelas[0]?.slug ?? "";

  const [hasilSiswa, hasilKode] = await Promise.all([
    supabase
      .from("siswa")
      .select("id, nama, kelas")
      .eq("kelas", kelasDipilih)
      .order("nama", { ascending: true }),
    supabase
      .from("kode_riwayat")
      .select("siswa_id, kode, diperbarui_pada")
      .eq("kelas", kelasDipilih),
  ]);

  const galatTabel = hasilSiswa.error || hasilKode.error;
  const daftarSiswa = hasilSiswa.data ?? [];
  const petaKode = new Map(
    (hasilKode.data ?? []).map((baris) => [baris.siswa_id, baris])
  );

  const pesan = searchParams?.tersimpan
    ? `Kode riwayat ${labelKelas(searchParams.tersimpan)} berhasil dibuat.`
    : searchParams?.dicabut
      ? `Kode riwayat ${labelKelas(searchParams.dicabut)} dicabut.`
      : searchParams?.galat === "simpan"
        ? "Kode gagal disimpan. Periksa koneksi lalu coba lagi."
        : searchParams?.galat === "siswa"
          ? "Siswa tidak ditemukan di kelas itu."
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
            <span aria-current="page">Kode riwayat</span>
          </nav>
          <p className="eyebrow">Kode riwayat</p>
          <h1 className="page-title">Kode riwayat nilai siswa</h1>
          <p className="page-lead">
            Buat kode per siswa, lalu bagikan kodenya. Siswa memakai kode itu di
            halaman Riwayat nilai untuk melihat seluruh nilainya di kelas ini.
          </p>
          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconUsers size={15} />
              {daftarSiswa.length} siswa di {labelKelas(kelasDipilih)}
            </span>
            <TombolKeluarGuru />
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Kode riwayat per siswa">
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

          <div className="card">
            <h2 className="dashSectionTitle">Cara memakai kode</h2>
            <ol className="tokenSteps">
              <li>
                Pilih kelas, lalu klik <strong>Buat kode</strong> pada siswa yang
                dituju.
              </li>
              <li>
                Kode 6 karakter muncul. Klik teksnya untuk memilih seluruhnya,
                lalu salin.
              </li>
              <li>
                Bagikan kode hanya kepada siswa itu. Kode membuka riwayat satu
                siswa di satu kelas.
              </li>
              <li>
                Klik <strong>Ganti</strong> untuk kode baru, atau{" "}
                <strong>Cabut</strong> untuk mematikan akses.
              </li>
            </ol>
          </div>

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

          {galatTabel ? (
            <p className="emptyState">
              Daftar belum dapat dimuat. Pastikan tabel <code>siswa</code> dan{" "}
              <code>kode_riwayat</code> sudah dibuat lewat{" "}
              <code>supabase/schema.sql</code>.
            </p>
          ) : daftarSiswa.length === 0 ? (
            <div className="card">
              <h2 className="dashSectionTitle">
                <IconFile size={18} /> Belum ada siswa
              </h2>
              <p className="authHint">
                Belum ada siswa terdaftar di {labelKelas(kelasDipilih)}. Tambah
                siswa lebih dulu di halaman absensi.
              </p>
              <p className="panelAction">
                <Link className="btn btnPrimary" href="/guru/absen">
                  Buka absensi
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div className="dashSectionHead">
                <h2 className="dashSectionTitle">
                  Siswa {labelKelas(kelasDipilih)}
                </h2>
              </div>

              <div className="dashboardTableWrapper">
                <table className="dashboardTable">
                  <thead>
                    <tr>
                      <th scope="col">Siswa</th>
                      <th scope="col">Kode riwayat</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarSiswa.map((siswa) => {
                      const baris = petaKode.get(siswa.id);
                      const kode = baris?.kode ?? "";
                      const waktu = formatWaktu(baris?.diperbarui_pada);

                      return (
                        <tr key={siswa.id}>
                          <th scope="row">
                            <span className="absenName">
                              <span className="absenNameText">{siswa.nama}</span>
                              <span className="absenNameNote">
                                {waktu ? `Diperbarui ${waktu}` : "Belum dibuat"}
                              </span>
                            </span>
                          </th>
                          <td>
                            {kode ? (
                              <code className="tokenNilai">{kode}</code>
                            ) : (
                              <span className="authHint">Belum ada kode</span>
                            )}
                          </td>
                          <td>
                            <div className="tokenActions">
                              <form action={buatKode}>
                                <input
                                  type="hidden"
                                  name="kelas"
                                  value={kelasDipilih}
                                />
                                <input
                                  type="hidden"
                                  name="siswaId"
                                  value={siswa.id}
                                />
                                <button
                                  className="btn btnPrimary btnSm"
                                  type="submit"
                                >
                                  {kode ? "Ganti" : "Buat kode"}
                                </button>
                              </form>

                              {kode ? (
                                <form action={cabutKode}>
                                  <input
                                    type="hidden"
                                    name="kelas"
                                    value={kelasDipilih}
                                  />
                                  <input
                                    type="hidden"
                                    name="siswaId"
                                    value={siswa.id}
                                  />
                                  <button
                                    className="btn btnGhost btnSm"
                                    type="submit"
                                  >
                                    Cabut
                                  </button>
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

              <p className="authHint">
                Menekan kode akan memilih seluruh teksnya, sehingga bisa disalin
                tanpa tombol khusus. Mengganti atau mencabut kode membuat siswa
                harus memasukkan kode baru.
              </p>
            </>
          )}

          <p className="rekapNote">
            Kode ini tidak memakai data pribadi siswa. Siapa pun yang tahu kodenya
            dapat membuka riwayat itu, jadi bagikan hanya kepada siswa
            bersangkutan.
          </p>

          <div className="absenActions">
            <Link className="btn btnSecondary" href="/guru">
              <IconArrowLeft size={16} />
              Kembali ke panel
            </Link>
            <Link className="btn btnGhost" href="/guru/nilai">
              <IconTrophy size={16} />
              Buka rekap nilai
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
