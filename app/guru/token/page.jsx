import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import {
  buatTokenPerangkat,
  lupakanTokenPerangkat,
} from "@/lib/guru/perangkat";
import { buatTokenAcak, kelasTerdaftar, lupakanToken } from "@/lib/kelas/akses";
import { TombolKeluarGuru } from "@/components/Guru/TombolKeluarGuru";
import {
  IconArrowLeft,
  IconCalendar,
  IconLock,
  IconShield,
} from "@/components/Icons/Icons";

/*
 * Halaman token kelas guru (/guru/token)
 *
 * Tanggung jawab: menampilkan token aktif per kelas dan memungkinkan guru
 * membuat, mengganti, atau mencabutnya. Siswa memakai token ini di /smk.
 *
 * Halaman yang sama juga mengatur satu token perangkat (satu untuk seluruh
 * sekolah, tabel `pengaturan_absensi`). Token itu diumumkan seperti token
 * kelas dan dimasukkan siswa sekali per HP; fungsinya mengunci satu HP ke satu
 * siswa saat absensi (lib/guru/perangkat.js). Mengganti token perangkat
 * memaksa semua HP memasukkan token baru, dan melepas ikatan HP yang sudah
 * terbentuk.
 *
 * Akses memakai akun guru yang sama dengan halaman /guru lainnya. Tanpa cookie
 * akses guru, pengunjung diarahkan ke /guru/login untuk masuk.
 *
 * Token disimpan di tabel `token_kelas` (lihat supabase/schema.sql). Mengganti
 * token membuat sidik cookie siswa yang lama otomatis tidak sah.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Token kelas",
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

async function buatToken(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  if (!kelasTerdaftar(kelas)) redirect("/guru/token?galat=kelas");

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/token?galat=konfigurasi");

  const { error } = await supabase.from("token_kelas").upsert(
    {
      kelas,
      token: buatTokenAcak(),
      diperbarui_pada: new Date().toISOString(),
    },
    { onConflict: "kelas" }
  );

  if (error) {
    console.error("Token kelas: gagal menyimpan.", error.message);
    redirect("/guru/token?galat=simpan");
  }

  // Token baru (atau token yang dihapus) harus terlihat langsung di /smk.
  lupakanToken();
  revalidatePath("/guru/token");
  redirect(`/guru/token?tersimpan=${kelas}`);
}

async function cabutToken(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  if (!kelasTerdaftar(kelas)) redirect("/guru/token?galat=kelas");

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/token?galat=konfigurasi");

  const { error } = await supabase
    .from("token_kelas")
    .delete()
    .eq("kelas", kelas);

  if (error) {
    console.error("Token kelas: gagal mencabut.", error.message);
    redirect("/guru/token?galat=simpan");
  }

  // Token yang dicabut harus langsung ditolak di /smk, bukan setelah 60 detik.
  lupakanToken();
  revalidatePath("/guru/token");
  redirect(`/guru/token?dicabut=${kelas}`);
}

/**
 * Server action: buat atau ganti token perangkat absensi.
 *
 * Token baru langsung berlaku: perangkat yang membawa token lama ditolak pada
 * absensi berikutnya dan diminta memasukkan token baru.
 */
async function buatTokenPerangkatHandler() {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/token?galat=konfigurasi");

  const { error } = await supabase.from("pengaturan_absensi").upsert(
    {
      id: 1,
      token_perangkat: buatTokenPerangkat(),
      diperbarui_pada: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Token perangkat: gagal menyimpan.", error.message);
    redirect("/guru/token?galat=simpan");
  }

  lupakanTokenPerangkat();
  revalidatePath("/guru/token");
  revalidatePath("/smk");
  redirect("/guru/token?perangkat=baru");
}

/** Server action: hapus token perangkat. Kunci perangkat berhenti berlaku. */
async function cabutTokenPerangkat() {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/token?galat=konfigurasi");

  const { error } = await supabase
    .from("pengaturan_absensi")
    .delete()
    .eq("id", 1);

  if (error) {
    console.error("Token perangkat: gagal mencabut.", error.message);
    redirect("/guru/token?galat=simpan");
  }

  lupakanTokenPerangkat();
  revalidatePath("/guru/token");
  revalidatePath("/smk");
  redirect("/guru/token?perangkat=dicabut");
}

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Token kelas</p>
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

export default async function TokenPage({ searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const [{ data, error }, { data: perangkat, error: galatPerangkat }] =
    await Promise.all([
      supabase.from("token_kelas").select("kelas, token, diperbarui_pada"),
      supabase
        .from("pengaturan_absensi")
        .select("token_perangkat, diperbarui_pada")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  const peta = new Map((data ?? []).map((baris) => [baris.kelas, baris]));

  /*
   * `pengaturan_absensi` ada tetapi tokennya belum dibuat: kartu ini tetap
   * menampilkan tombol buat token. Kode galat 42P01 berarti tabelnya belum
   * ada, dan itu yang menampilkan arahan menjalankan skema; galat lain juga
   * dianggap belum siap supaya guru tidak menekan tombol yang pasti gagal.
   */
  const tabelAda = !galatPerangkat || galatPerangkat.code !== "42P01";
  const tokenPerangkat = perangkat?.token_perangkat ?? "";
  const waktuPerangkat = formatWaktu(perangkat?.diperbarui_pada);

  const pesan =
    searchParams?.tersimpan
      ? `Token ${labelKelas(searchParams.tersimpan)} berhasil dibuat.`
      : searchParams?.dicabut
        ? `Token ${labelKelas(searchParams.dicabut)} dicabut.`
        : searchParams?.perangkat === "baru"
          ? "Token perangkat dibuat. Bagikan ke siswa; HP yang masih memakai token lama harus memasukkannya lagi."
          : searchParams?.perangkat === "dicabut"
            ? "Token perangkat dicabut. Kunci satu HP satu siswa berhenti berlaku."
            : searchParams?.galat === "simpan"
              ? "Token gagal disimpan. Periksa koneksi lalu coba lagi."
              : searchParams?.galat === "kelas"
                ? "Kelas tidak dikenal."
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
            <span aria-current="page">Token kelas</span>
          </nav>
          <p className="eyebrow">Token kelas</p>
          <h1 className="page-title">Token masuk kelas</h1>
          <p className="page-lead">
            Bagikan token kepada siswa. Mereka memasukkan token di halaman Materi
            SMK untuk membuka kelas selama 8 jam di perangkatnya.
          </p>
          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconLock size={15} />
              {daftarKelas.length} kelas
            </span>
            <TombolKeluarGuru />
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Daftar token kelas">
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

          {error ? (
            <p className="emptyState">
              Token belum dapat dimuat. Pastikan tabel{" "}
              <code>token_kelas</code> sudah dibuat lewat{" "}
              <code>supabase/schema.sql</code>.
            </p>
          ) : (
            <>
              <div className="card">
                <h2 className="dashSectionTitle">Cara membuat token</h2>
                <ol className="tokenSteps">
                  <li>
                    Klik <strong>Buat token</strong> pada kelas yang dituju.
                  </li>
                  <li>
                    Token muncul di kolom <strong>Token aktif</strong>. Klik
                    teks token untuk memilih seluruhnya, lalu salin.
                  </li>
                  <li>
                    Bagikan token ke siswa. Mereka memasukkannya di halaman
                    Materi SMK untuk membuka kelas selama 8 jam di perangkatnya.
                  </li>
                </ol>
              </div>

              <div className="dashSectionHead">
                <h2 className="dashSectionTitle">Token per kelas</h2>
              </div>

              <div className="dashboardTableWrapper">
                <table className="dashboardTable">
                  <thead>
                    <tr>
                      <th scope="col">Kelas</th>
                      <th scope="col">Token aktif</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarKelas.map((item) => {
                      const baris = peta.get(item.slug);
                      const token = baris?.token ?? "";
                      const waktu = formatWaktu(baris?.diperbarui_pada);

                      return (
                        <tr key={item.slug}>
                          <th scope="row">
                            <span className="absenName">
                              <span className="absenNameText">{item.nama}</span>
                              <span className="absenNameNote">
                                {waktu
                                  ? `Diperbarui ${waktu}`
                                  : "Belum dibuat"}
                              </span>
                            </span>
                          </th>
                          <td>
                            {token ? (
                              <code className="tokenNilai">{token}</code>
                            ) : (
                              <span className="authHint">
                                Belum ada token
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="tokenActions">
                              <form action={buatToken}>
                                <input
                                  type="hidden"
                                  name="kelas"
                                  value={item.slug}
                                />
                                <button
                                  className="btn btnPrimary btnSm"
                                  type="submit"
                                >
                                  {token ? "Ganti token" : "Buat token"}
                                </button>
                              </form>

                              {token ? (
                                <form action={cabutToken}>
                                  <input
                                    type="hidden"
                                    name="kelas"
                                    value={item.slug}
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
                Menekan token akan memilih seluruh teksnya, sehingga bisa
                disalin tanpa tombol khusus. Mengganti atau mencabut token
                membuat siswa harus memasukkan token baru.
              </p>

              {/* Kunci perangkat: satu token untuk seluruh sekolah. */}
              <div className="dashSectionHead">
                <h2 className="dashSectionTitle">Token perangkat absensi</h2>
              </div>

              <div className="card">
                <p className="sectionLead">
                  Satu token untuk semua kelas. Siswa memasukkan token ini di
                  halaman Materi SMK, sekali per HP. Setelah itu satu HP hanya
                  bisa dipakai <strong>satu siswa</strong> untuk absensi, dan
                  satu siswa hanya bisa absen dari <strong>satu HP</strong>.
                </p>

                {!tabelAda ? (
                  <p className="emptyState">
                    Tabel <code>pengaturan_absensi</code> belum dibuat. Jalankan{" "}
                    <code>supabase/schema.sql</code> untuk mengaktifkan kunci
                    perangkat. Tanpa token, absensi tetap berjalan tanpa kunci.
                  </p>
                ) : (
                  <>
                    {tokenPerangkat ? (
                      <p className="absenTercatat">
                        <IconShield size={16} />
                        <span>
                          Token perangkat aktif:{" "}
                          <code className="tokenNilai">{tokenPerangkat}</code>
                          {waktuPerangkat ? ` · diperbarui ${waktuPerangkat}` : null}
                        </span>
                      </p>
                    ) : (
                      <p className="authHint">
                        Belum ada token perangkat. Selama belum dibuat, absensi
                        berjalan tanpa kunci HP: satu HP masih bisa mencatat
                        lebih dari satu siswa pada hari yang berbeda.
                      </p>
                    )}

                    <div className="tokenActions">
                      <form action={buatTokenPerangkatHandler}>
                        <button className="btn btnPrimary btnSm" type="submit">
                          {tokenPerangkat ? "Ganti token perangkat" : "Buat token perangkat"}
                        </button>
                      </form>

                      {tokenPerangkat ? (
                        <form action={cabutTokenPerangkat}>
                          <button className="btn btnGhost btnSm" type="submit">
                            Cabut token perangkat
                          </button>
                        </form>
                      ) : null}

                      <Link className="btn btnGhost btnSm" href="/guru/absen">
                        Kelola HP siswa
                      </Link>
                    </div>

                    <p className="authHint">
                      Mengganti token perangkat melepas ikatan HP yang sudah
                      terbentuk: siswa akan diminta mengisi absensi sekali lagi
                      dari HP masing-masing. Siswa yang berganti HP dilepas
                      satu per satu lewat tombol <strong>Lepas HP</strong> di
                      halaman absensi.
                    </p>
                  </>
                )}
              </div>

              <div className="absenActions">
                <Link className="btn btnSecondary" href="/guru">
                  <IconArrowLeft size={16} />
                  Kembali ke panel
                </Link>
                <Link className="btn btnGhost" href="/guru/absen">
                  <IconCalendar size={16} />
                  Buka absensi
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
