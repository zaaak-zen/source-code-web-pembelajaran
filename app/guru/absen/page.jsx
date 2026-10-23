import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  IconArrowLeft,
  IconCalendar,
  IconCheckCircle,
  IconClipboard,
  IconUsers,
} from "@/components/Icons/Icons";

/*
 * Halaman absensi guru (/guru/absen)
 *
 * Tanggung jawab: menampilkan daftar siswa dan memungkinkan guru/admin
 * mencatat kehadiran per tanggal (hadir, izin, sakit, alfa).
 *
 * Akses:
 * - Middleware mengarahkan pengunjung tanpa sesi ke /login.
 * - Peran diperiksa ulang di halaman dan di server action, karena server
 *   action dapat dipanggil langsung tanpa melewati halaman.
 *
 * Siswa tidak dicatat kehadirannya di sini; lihat riwayat di /dashboard.
 */

export const dynamic = "force-dynamic";

const STATUS = [
  { nilai: "hadir", label: "Hadir", kelas: "statusHadir" },
  { nilai: "izin", label: "Izin", kelas: "statusIzin" },
  { nilai: "sakit", label: "Sakit", kelas: "statusSakit" },
  { nilai: "alfa", label: "Alfa", kelas: "statusAlfa" },
];

const PERAN_STAF = ["guru", "admin"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tanggalHariIni() {
  // Tanggal menurut zona waktu sekolah, bukan zona waktu server.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function tanggalSah(nilai) {
  if (typeof nilai !== "string" || !POLA_TANGGAL.test(nilai)) return false;

  const tanggal = new Date(`${nilai}T12:00:00Z`);
  return (
    !Number.isNaN(tanggal.getTime()) &&
    tanggal.toISOString().startsWith(nilai)
  );
}

function formatTanggal(nilai) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${nilai}T12:00:00Z`));
}

function labelStatus(nilai) {
  return STATUS.find((item) => item.nilai === nilai)?.label ?? nilai;
}

async function simpanAbsensi(formData) {
  "use server";

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/login?galat=konfigurasi");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("peran")
    .eq("id", user.id)
    .maybeSingle();

  if (!PERAN_STAF.includes(profil?.peran)) redirect("/dashboard");

  const tanggal = String(formData.get("tanggal") ?? "");
  if (!tanggalSah(tanggal)) redirect("/guru/absen");

  const baris = [];

  for (const [kunci, nilai] of formData.entries()) {
    if (!kunci.startsWith("status_")) continue;

    const userId = kunci.slice("status_".length);
    const status = String(nilai);

    if (!POLA_UUID.test(userId)) continue;
    if (!STATUS.some((item) => item.nilai === status)) continue;

    baris.push({
      user_id: userId,
      tanggal,
      status,
      dicatat_oleh: user.id,
    });
  }

  if (baris.length === 0) {
    redirect(`/guru/absen?tanggal=${tanggal}`);
  }

  const { error } = await supabase
    .from("absensi")
    .upsert(baris, { onConflict: "user_id,tanggal" });

  if (error) {
    console.error("Absensi: gagal menyimpan.", error.message);
    redirect(`/guru/absen?tanggal=${tanggal}&galat=simpan`);
  }

  revalidatePath("/guru/absen");
  redirect(`/guru/absen?tanggal=${tanggal}&tersimpan=1`);
}

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Absensi</p>
          <h1 className="page-title">Layanan belum dikonfigurasi</h1>
          <p className="page-lead">
            Variabel Supabase atau tabel <code>absensi</code> belum tersedia.
            Jalankan <code>supabase/schema.sql</code> di proyek Supabase.
          </p>
        </div>
      </header>
    </main>
  );
}

export default async function AbsenPage({ searchParams }) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil, error: galatProfil } = await supabase
    .from("profiles")
    .select("nama, peran")
    .eq("id", user.id)
    .maybeSingle();

  if (galatProfil) return <HalamanKonfigurasi />;

  if (!PERAN_STAF.includes(profil?.peran)) {
    return (
      <main id="main-content" className="page">
        <header className="page-header">
          <div className="container">
            <p className="eyebrow">Absensi</p>
            <h1 className="page-title">Akses terbatas</h1>
            <p className="page-lead">
              Halaman ini hanya dapat dibuka oleh guru dan admin. Akun Anda
              berperan <strong>{profil?.peran ?? "siswa"}</strong>.
            </p>
            <p className="authLinks">
              <Link href="/dashboard">Kembali ke dashboard</Link>
            </p>
          </div>
        </header>
      </main>
    );
  }

  const tanggal = tanggalSah(searchParams?.tanggal)
    ? searchParams.tanggal
    : tanggalHariIni();

  const [{ data: siswa, error: galatSiswa }, { data: catatan }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nama")
        .eq("peran", "siswa")
        .order("nama", { ascending: true }),
      supabase
        .from("absensi")
        .select("user_id, status")
        .eq("tanggal", tanggal),
    ]);

  const daftarSiswa = siswa ?? [];
  const statusSiswa = new Map(
    (catatan ?? []).map((item) => [item.user_id, item.status])
  );
  const sudahDicatat = daftarSiswa.filter((item) =>
    statusSiswa.has(item.id)
  ).length;
  const belumDicatat = daftarSiswa.length - sudahDicatat;

  const pesan =
    searchParams?.tersimpan === "1"
      ? "Absensi berhasil disimpan."
      : searchParams?.galat === "simpan"
        ? "Absensi gagal disimpan. Periksa koneksi lalu coba lagi."
        : "";

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Absensi</span>
          </nav>
          <p className="eyebrow">Absensi</p>
          <h1 className="page-title">Absensi siswa</h1>
          <p className="page-lead">
            Catat kehadiran siswa untuk tanggal yang dipilih. Hanya status yang
            Anda pilih yang disimpan.
          </p>
          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconCalendar size={15} />
              {formatTanggal(tanggal)}
            </span>
            <span className="chip">
              <IconUsers size={15} />
              {daftarSiswa.length} siswa
            </span>
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Formulir absensi">
        <div className="container">
          <form className="absenToolbar" method="get">
            <div className="authField">
              <label className="authLabel" htmlFor="tanggal">
                Tanggal
              </label>
              <input
                className="authInput"
                id="tanggal"
                name="tanggal"
                type="date"
                defaultValue={tanggal}
                required
              />
            </div>
            <button className="btn btnSecondary" type="submit">
              Tampilkan
            </button>
          </form>

          {pesan ? (
            <p
              className={
                searchParams?.galat === "simpan"
                  ? "authMessage authMessageError"
                  : "authMessage authMessageSuccess"
              }
              role={searchParams?.galat === "simpan" ? "alert" : "status"}
            >
              {pesan}
            </p>
          ) : null}

          <div className="dashSectionHead">
            <h2 className="dashSectionTitle">
              Kehadiran {formatTanggal(tanggal)}
            </h2>
          </div>

          {galatSiswa ? (
            <p className="emptyState">
              Daftar siswa belum dapat dimuat. Pastikan tabel{" "}
              <code>profiles</code> dan kebijakan aksesnya sudah dibuat.
            </p>
          ) : daftarSiswa.length === 0 ? (
            <p className="emptyState">
              Belum ada akun dengan peran siswa. Minta siswa mendaftar terlebih
              dahulu.
            </p>
          ) : (
            <form action={simpanAbsensi}>
              <input type="hidden" name="tanggal" value={tanggal} />

              <div className="absenSummary">
                <span className="chip chipSuccess">
                  <IconCheckCircle size={14} />
                  {sudahDicatat} dari {daftarSiswa.length} sudah dicatat
                </span>
                {belumDicatat > 0 ? (
                  <span className="chip">
                    <IconClipboard size={14} />
                    {belumDicatat} belum dicatat
                  </span>
                ) : null}
              </div>

              <div className="dashboardTableWrapper">
                <table className="dashboardTable">
                  <thead>
                    <tr>
                      <th scope="col">Siswa</th>
                      <th scope="col">Status kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarSiswa.map((item) => {
                      const sekarang = statusSiswa.get(item.id);
                      const nama = item.nama || "Tanpa nama";

                      return (
                        <tr key={item.id}>
                          <th scope="row">
                            <span className="absenName">
                              <span className="absenNameText">{nama}</span>
                              <span className="absenNameNote">
                                {sekarang
                                  ? `Tercatat: ${labelStatus(sekarang)}`
                                  : "Belum dicatat"}
                              </span>
                            </span>
                          </th>
                          <td>
                            <span className="statusGroup">
                              {STATUS.map((status) => (
                                <label
                                  key={status.nilai}
                                  className={`statusOption ${status.kelas}`}
                                >
                                  <input
                                    type="radio"
                                    name={`status_${item.id}`}
                                    value={status.nilai}
                                    defaultChecked={sekarang === status.nilai}
                                    aria-label={`${status.label} untuk ${nama}`}
                                  />
                                  <span>{status.label}</span>
                                </label>
                              ))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="absenActions">
                <button className="btn btnPrimary" type="submit">
                  Simpan absensi
                </button>
                <Link className="btn btnSecondary" href="/dashboard">
                  <IconArrowLeft size={16} />
                  Kembali ke dashboard
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
