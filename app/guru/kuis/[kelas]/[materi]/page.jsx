import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import educationConfig from "@/config/education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";
import { ambilMateri } from "@/lib/materi/kelas";
import { ambilBank, simpanBank } from "@/lib/kuis/bank";
import { normalisasiSoal, MAX_SOAL } from "@/lib/kuis/soal";
import EditorSoal from "@/components/Guru/EditorSoal";
import { IconArrowLeft, IconArrowRight, IconTarget } from "@/components/Icons/Icons";

/*
 * Tulis soal manual (/guru/kuis/[kelas]/[materi])
 *
 * Tanggung jawab: menampilkan editor soal untuk satu materi. Guru dapat menulis
 * atau mengubah soal tanpa AI; hasilnya disimpan ke tabel `kuis_bank` dengan
 * bentuk yang sama seperti hasil AI, sehingga /api/kuis tidak perlu diubah.
 *
 * Akses memakai akun guru yang sama dengan halaman /guru lainnya.
 */

export const dynamic = "force-dynamic";

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];

const PESAN_GALAT = {
  jumlah: "Jumlah soal materi ini tidak valid (1-20). Ubah di menu Materi.",
  soal: "Soal belum lengkap. Isi pertanyaan dan keempat pilihan untuk setiap nomor.",
  simpan: "Soal gagal disimpan. Periksa koneksi lalu coba lagi.",
};

export async function generateMetadata({ params }) {
  const data = await ambilMateri(params.kelas, params.materi);
  return { title: data ? `Tulis soal ${data.judul}` : "Tulis soal" };
}

/** Server action: simpan soal manual ke bank soal. */
async function simpanSoal(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const kelas = String(formData.get("kelas") ?? "");
  const materi = String(formData.get("materi") ?? "");
  const kembali = `/guru/kuis/${kelas}/${materi}`;

  const dataMateri = await ambilMateri(kelas, materi);
  if (!dataMateri) redirect("/guru/kuis?galat=materi");

  const jumlah = Number(dataMateri.kuis?.jumlahSoal);
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAX_SOAL) {
    redirect(`${kembali}?galat=jumlah`);
  }

  let mentah;
  try {
    mentah = JSON.parse(String(formData.get("soal") ?? "[]"));
  } catch {
    mentah = null;
  }

  if (!Array.isArray(mentah)) redirect(`${kembali}?galat=soal`);

  const soal = mentah.map(normalisasiSoal);

  if (soal.some((item) => !item) || soal.length !== jumlah) {
    redirect(`${kembali}?galat=soal`);
  }

  const { error } = await simpanBank(kelas, materi, soal);
  if (error) redirect(`${kembali}?galat=simpan`);

  revalidatePath("/guru/kuis");
  revalidatePath(`/smk/${kelas}/${materi}/kuis`);
  redirect(`/guru/kuis?tersimpan=1&kelas=${kelas}&materi=${materi}`);
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
            <code>SUPABASE_SERVICE_ROLE_KEY</code> belum diisi, atau tabel{" "}
            <code>materi</code>/<code>kuis_bank</code> belum dibuat. Jalankan{" "}
            <code>supabase/schema.sql</code> lalu isi variabel tersebut di{" "}
            <code>.env.local</code>.
          </p>
        </div>
      </header>
    </main>
  );
}

export default async function TulisSoalPage({ params, searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const kelasSah = daftarKelas.some((item) => item.slug === params.kelas);
  if (!kelasSah) notFound();

  const materi = await ambilMateri(params.kelas, params.materi);
  if (!materi) notFound();

  const jumlahSoal = Number(materi.kuis?.jumlahSoal);

  if (!Number.isInteger(jumlahSoal) || jumlahSoal < 1) {
    redirect(`/guru/kuis?galat=jumlah&kelas=${params.kelas}`);
  }

  const bank = (await ambilBank(params.kelas, params.materi)) ?? [];
  const namaKelas =
    daftarKelas.find((item) => item.slug === params.kelas)?.nama ??
    params.kelas;

  const pesan = PESAN_GALAT[searchParams?.galat] ?? "";

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/guru">Panel guru</Link>
            <span aria-hidden="true">/</span>
            <Link href="/guru/kuis">Soal kuis</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{materi.judul}</span>
          </nav>

          <p className="eyebrow">{namaKelas}</p>
          <h1 className="page-title">Tulis soal: {materi.judul}</h1>
          <p className="page-lead">
            Tulis soal secara manual tanpa AI, atau rapikan soal yang sudah ada.
            Semua siswa mengerjakan bank soal ini dengan urutan yang diacak.
          </p>

          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconTarget size={15} />
              {jumlahSoal} soal
            </span>
            <span className="chip">
              {bank.length > 0
                ? `${bank.length} soal tersimpan`
                : "Belum ada soal tersimpan"}
            </span>
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Editor soal">
        <div className="container">
          {pesan ? (
            <p className="authMessage authMessageError" role="alert">
              {pesan}
            </p>
          ) : null}

          <EditorSoal
            kelas={params.kelas}
            materi={params.materi}
            jumlahSoal={jumlahSoal}
            awal={bank}
            aksi={simpanSoal}
          />

          <p className="rekapNote">
            Menyimpan di sini mengganti seluruh bank soal materi ini. Soal hasil
            AI sebelumnya akan tertimpa. Guru tetap dapat membuat ulang soal
            dengan AI dari halaman{" "}
            <Link href="/guru/kuis">Bank soal kuis</Link>.
          </p>

          <div className="absenActions">
            <Link className="btn btnSecondary" href="/guru/kuis">
              <IconArrowLeft size={16} />
              Kembali ke bank soal
            </Link>
            <Link
              className="btn btnGhost"
              href={`/smk/${params.kelas}/${params.materi}/kuis`}
            >
              Lihat halaman kuis siswa
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
