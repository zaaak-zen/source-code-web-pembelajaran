import Link from "next/link";
import { redirect } from "next/navigation";
import {
  emailGuru,
  mintaGantiSandi,
  punyaAkses,
  sidikGuru,
} from "@/lib/guru/akses";
import { TombolKeluarGuru } from "@/components/Guru/TombolKeluarGuru";
import {
  IconArrowLeft,
  IconLock,
  IconMail,
  IconShield,
  IconUser,
} from "@/components/Icons/Icons";

/*
 * Keamanan akun guru (/guru/keamanan)
 *
 * Tanggung jawab: menampilkan akun guru yang sedang masuk dan menyediakan
 * tautan ganti password. Akun guru adalah pengguna Supabase Auth, sehingga
 * password dikelola Supabase (email berisi tautan ganti password), bukan
 * disimpan aplikasi ini.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Keamanan akun guru",
};

const PESAN_GALAT = {
  konfigurasi: "Supabase Auth belum dikonfigurasi di server.",
  kirim: "Email ganti password gagal dikirim. Periksa koneksi lalu coba lagi.",
};

export default async function KeamananPage({ searchParams }) {
  if (!(await punyaAkses())) redirect("/guru/login");

  const email = await emailGuru();
  const samar = await sidikGuru();
  const pesan = PESAN_GALAT[searchParams?.galat] ?? "";
  const terkirim = Boolean(searchParams?.kirim);

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/guru">Panel guru</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Keamanan</span>
          </nav>
          <p className="eyebrow">Keamanan</p>
          <h1 className="page-title">Akun guru</h1>
          <p className="page-lead">
            Satu akun ini membuka absensi, materi, soal kuis, rekap nilai, dan
            token kelas. Akun dikelola Supabase Auth; aplikasi tidak menyimpan
            password.
          </p>
          <div className="pageMeta">
            <span className="chip chipPrimary">
              <IconUser size={15} />
              {samar}
            </span>
            <span className="chip">
              <IconShield size={15} />
              Supabase Auth
            </span>
            <TombolKeluarGuru />
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Akun guru">
        <div className="container">
          <div className="card">
            <h2 className="dashSectionTitle">
              <IconMail size={18} aria-hidden="true" /> Email akun
            </h2>
            <p className="authHint">
              Email dipakai untuk masuk dan untuk tautan ganti password. Untuk
              menggantinya, ubah lewat Supabase Dashboard (Authentication &rarr;
              Users) memakai akun pengelola situs.
            </p>
            <p className="chip">{email}</p>
          </div>

          <div className="card">
            <h2 className="dashSectionTitle">
              <IconLock size={18} aria-hidden="true" /> Ganti password
            </h2>
            <p className="authHint">
              Password tidak diganti di halaman ini. Kirim tautan ganti password
              ke email di atas, buka tautannya, lalu isi password baru. Setelah
              password berganti, semua perangkat yang masih membuka panel guru
              otomatis keluar.
            </p>

            {terkirim ? (
              <p className="authMessage authMessageSuccess" role="status">
                Tautan ganti password sudah dikirim ke email akun. Periksa kotak
                masuk dan folder spam.
              </p>
            ) : null}

            {pesan ? (
              <p className="authMessage authMessageError" role="alert">
                {pesan}
              </p>
            ) : null}

            <form action={mintaGantiSandi}>
              <button className="btn btnPrimary" type="submit">
                Kirim tautan ganti password
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="dashSectionTitle">Yang perlu diketahui</h2>
            <ul className="tokenSteps">
              <li>
                Hanya akun dengan{" "}
                <code>app_metadata.role = &quot;guru&quot;</code> yang bisa
                membuka panel guru. Akun tanpa peran itu ditolak saat login.
              </li>
              <li>
                Lupa password dan email juga tidak bisa dibuka? Atur ulang
                password akun lewat Supabase Dashboard (Authentication &rarr;
                Users), lalu masuk lagi di sini.
              </li>
              <li>
                Sesi berlaku sampai keluar atau sampai password diganti. Jangan
                tinggalkan panel terbuka di perangkat bersama.
              </li>
            </ul>
          </div>

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
