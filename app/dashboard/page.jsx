import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  IconArrowRight,
  IconBook,
  IconCalendar,
  IconDashboard,
  IconLogout,
  IconTrophy,
  IconUsers,
} from "@/components/Icons/Icons";

/*
 * Dashboard siswa.
 *
 * Tanggung jawab: menampilkan identitas, ringkasan skor terbaik per materi,
 * dan riwayat kuis pengguna yang sedang masuk. Akses dijaga middleware dan
 * diperiksa ulang di sini.
 */

export const dynamic = "force-dynamic";

const LABEL_STATUS = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alfa: "Alfa",
};

const KELAS_STATUS = {
  hadir: "chip chipSuccess",
  izin: "chip chipInfo",
  sakit: "chip chipWarning",
  alfa: "chip chipDanger",
};

function formatTanggal(nilai) {
  if (!nilai) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(nilai));
}

// Tanggal absensi disimpan sebagai date (tanpa jam); format tanpa waktu.
function formatTanggalSaja(nilai) {
  if (!nilai) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${nilai}T12:00:00Z`));
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return (
      <main id="main-content" className="page">
        <header className="page-header">
          <div className="container">
            <p className="eyebrow">Dashboard</p>
            <h1 className="page-title">Layanan akun belum dikonfigurasi</h1>
            <p className="page-lead">
              Isi variabel Supabase di <code>.env.local</code> lalu jalankan
              ulang server.
            </p>
          </div>
        </header>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("nama, peran")
    .eq("id", user.id)
    .maybeSingle();

  const { data: hasil, error: galatHasil } = await supabase
    .from("kuis_hasil")
    .select("kelas, materi, skor, total, dibuat_pada")
    .eq("user_id", user.id)
    .order("dibuat_pada", { ascending: false })
    .limit(50);

  const riwayat = hasil ?? [];

  const { data: absensi, error: galatAbsensi } = await supabase
    .from("absensi")
    .select("tanggal, status")
    .eq("user_id", user.id)
    .order("tanggal", { ascending: false })
    .limit(10);

  const riwayatAbsensi = absensi ?? [];

  const terbaik = new Map();
  for (const item of riwayat) {
    const kunci = `${item.kelas}/${item.materi}`;
    const sekarang = terbaik.get(kunci);
    const persen = item.total > 0 ? item.skor / item.total : 0;
    if (!sekarang || persen > sekarang.persen) {
      terbaik.set(kunci, {
        kelas: item.kelas,
        materi: item.materi,
        skor: item.skor,
        total: item.total,
        persen,
      });
    }
  }

  const nilaiTerbaik = [...terbaik.values()];
  const rataRata = nilaiTerbaik.length
    ? Math.round(
        (nilaiTerbaik.reduce((total, item) => total + item.persen, 0) /
          nilaiTerbaik.length) *
          100
      )
    : 0;
  const jumlahHadir = riwayatAbsensi.filter(
    (item) => item.status === "hadir"
  ).length;
  const persenHadir = riwayatAbsensi.length
    ? Math.round((jumlahHadir / riwayatAbsensi.length) * 100)
    : null;

  const staf = profil?.peran === "guru" || profil?.peran === "admin";

  async function keluar() {
    "use server";
    const klien = createSupabaseServerClient();
    if (klien) await klien.auth.signOut();
    redirect("/");
  }

  return (
    <main id="main-content" className="page dashboard">
      <header className="dashHeader">
        <div className="container">
          <div className="dashTop">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h1 className="dashTitle">
                Halo, {profil?.nama || user.email}
              </h1>
              <p className="dashLead">
                Peran akun: <strong>{profil?.peran ?? "siswa"}</strong>. Nilai
                kuis yang Anda kerjakan saat masuk akan tersimpan di sini.
              </p>
            </div>

            <div className="dashActions">
              {staf ? (
                <Link className="btn btnSecondary btnSm" href="/guru/absen">
                  <IconUsers size={16} />
                  Absensi siswa
                </Link>
              ) : null}
              <form action={keluar}>
                <button className="btn btnSecondary btnSm" type="submit">
                  <IconLogout size={16} />
                  Keluar
                </button>
              </form>
            </div>
          </div>

          <dl className="statGrid">
            <div className="statCard">
              <dt className="statLabel">
                <IconTrophy size={15} />
                Rata-rata nilai terbaik
              </dt>
              <dd>
                <p className="statValue">
                  {nilaiTerbaik.length > 0 ? `${rataRata}%` : "—"}
                </p>
                <p className="statHint">
                  {nilaiTerbaik.length} materi sudah dinilai
                </p>
              </dd>
            </div>

            <div className="statCard">
              <dt className="statLabel">
                <IconDashboard size={15} />
                Kuis dikerjakan
              </dt>
              <dd>
                <p className="statValue">{riwayat.length}</p>
                <p className="statHint">Sepanjang waktu</p>
              </dd>
            </div>

            <div className="statCard">
              <dt className="statLabel">
                <IconBook size={15} />
                Materi diikuti
              </dt>
              <dd>
                <p className="statValue">{terbaik.size}</p>
                <p className="statHint">Dengan nilai tersimpan</p>
              </dd>
            </div>

            <div className="statCard">
              <dt className="statLabel">
                <IconCalendar size={15} />
                Kehadiran
              </dt>
              <dd>
                <p className="statValue">
                  {persenHadir === null ? "—" : `${persenHadir}%`}
                </p>
                <p className="statHint">
                  {riwayatAbsensi.length > 0
                    ? `Hadir ${jumlahHadir} dari ${riwayatAbsensi.length} catatan`
                    : "Belum ada catatan"}
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="container">
        <section className="dashSection" aria-labelledby="skor-title">
          <div className="dashSectionHead">
            <h2 id="skor-title" className="dashSectionTitle">
              Skor terbaik per materi
            </h2>
            <Link className="dashSectionLink" href="/smk">
              Buka materi SMK <IconArrowRight size={14} />
            </Link>
          </div>

          {terbaik.size === 0 ? (
            <p className="emptyState">
              Belum ada nilai. Buka <Link href="/smk">materi SMK</Link> lalu
              kerjakan kuisnya.
            </p>
          ) : (
            <ul className="scoreGrid">
              {nilaiTerbaik.map((item) => {
                const persen = Math.round(item.persen * 100);

                return (
                  <li key={`${item.kelas}/${item.materi}`}>
                    <Link
                      className="scoreCard"
                      href={`/smk/${item.kelas}/${item.materi}`}
                    >
                      <span className="scoreTop">
                        <span className="scoreName">{item.materi}</span>
                        <span className="scoreValue">
                          {item.skor} / {item.total}
                        </span>
                      </span>

                      <span
                        className="scoreBar"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={persen}
                        aria-label={`Nilai ${item.materi}`}
                      >
                        <span
                          className="scoreBarFill"
                          style={{ width: `${persen}%` }}
                        />
                      </span>

                      <span className="scoreMeta">
                        <span>Kelas {item.kelas}</span>
                        <span>{persen}% benar</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dashSection" aria-labelledby="riwayat-title">
          <div className="dashSectionHead">
            <h2 id="riwayat-title" className="dashSectionTitle">
              Riwayat kuis
            </h2>
          </div>

          {galatHasil ? (
            <p className="emptyState">
              Riwayat belum dapat dimuat. Pastikan tabel{" "}
              <code>kuis_hasil</code> sudah dibuat dan kebijakan RLS aktif.
            </p>
          ) : riwayat.length === 0 ? (
            <p className="emptyState">Belum ada riwayat kuis.</p>
          ) : (
            <div className="dashboardTableWrapper">
              <table className="dashboardTable">
                <thead>
                  <tr>
                    <th scope="col">Waktu</th>
                    <th scope="col">Kelas</th>
                    <th scope="col">Materi</th>
                    <th scope="col">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.map((item, index) => (
                    <tr key={index}>
                      <td>{formatTanggal(item.dibuat_pada)}</td>
                      <td>{item.kelas}</td>
                      <td>{item.materi}</td>
                      <td>
                        <span className="chip chipPrimary">
                          {item.skor} / {item.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashSection" aria-labelledby="hadir-title">
          <div className="dashSectionHead">
            <h2 id="hadir-title" className="dashSectionTitle">
              Kehadiran
            </h2>
          </div>

          {galatAbsensi ? (
            <p className="emptyState">
              Riwayat kehadiran belum dapat dimuat. Pastikan tabel{" "}
              <code>absensi</code> sudah dibuat dan kebijakan RLS aktif.
            </p>
          ) : riwayatAbsensi.length === 0 ? (
            <p className="emptyState">
              Belum ada catatan kehadiran. Kehadiran dicatat oleh guru.
            </p>
          ) : (
            <ul className="attendanceList">
              {riwayatAbsensi.map((item, index) => (
                <li key={index} className="attendanceItem">
                  <span className="attendanceDate">
                    {formatTanggalSaja(item.tanggal)}
                  </span>
                  <span
                    className={KELAS_STATUS[item.status] ?? "chip"}
                  >
                    {LABEL_STATUS[item.status] ?? item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
