import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { guruSiap, masukGuru, punyaAkses } from "@/lib/guru/akses";
import educationConfig from "@/config/education";
import siteConfig from "@/config/site";
import { IconArrowLeft, IconLock, IconShield } from "@/components/Icons/Icons";
import FormLoginGuru from "@/components/Guru/FormLoginGuru";

/*
 * Login guru (/guru/login)
 *
 * Tanggung jawab: satu-satunya pintu masuk panel guru. Guru memasukkan email
 * dan password akun Supabase Auth-nya; bila cocok, sesi Supabase dipasang dan
 * pengunjung dibawa ke /guru. Halaman ini tidak ditampilkan kepada pengunjung
 * yang sudah punya sesi guru.
 *
 * Akun dibuat lewat Supabase Dashboard (Authentication -> Users) dengan
 * `app_metadata.role = "guru"`. Tidak ada password yang disimpan aplikasi ini.
 *
 * Tata letak: halaman ini MEMATIKAN navbar dan footer bawaan root layout
 * (lewat style inline di pembungkus terluar) dan memakai satu panel layar
 * penuh dengan kartu form di tengah. Alasannya: login adalah pintu masuk
 * satu-tugas, bukan halaman isi situs. Navigasi situs hanya akan mengalihkan
 * perhatian dari satu-satunya aksi di halaman ini. Gaya visual (warna, garis,
 * tipografi) tetap mengikuti token globals.css supaya tidak terasa sebagai
 * situs lain.
 *
 * Kenapa style inline dan bukan kelas CSS: menyembunyikan navbar/footer hanya
 * berlaku di halaman ini. Bila dijadikan kelas global, Navbar dan Footer di
 * root layout tidak tahu halaman mana yang sedang aktif, sehingga perlu
 * pengukuran rute di klien. Style inline terbatas pada subtree ini dan tidak
 * membocorkan aturan ke halaman lain.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Masuk guru",
  robots: { index: false, follow: false },
};

const PESAN = {
  kredensial: "Email atau password salah. Periksa lalu coba lagi.",
  konfigurasi: "Akun guru belum diatur di server. Hubungi pengelola situs.",
  batas: "Terlalu banyak percobaan masuk. Tunggu 10 menit lalu coba lagi.",
  akses: "Sesi guru Anda sudah berakhir. Silakan masuk lagi.",
  sesi: "Sesi berakhir setelah 2 jam. Masuk lagi untuk melanjutkan.",
  peran:
    "Akun ini tidak punya akses panel guru. Hubungi pengelola situs untuk memberi peran guru.",
};

/** Menyembunyikan navbar & footer bawaan root layout hanya untuk halaman ini. */
const sembunyikanKerangka = {
  nav: { display: "none" },
  footer: { display: "none" },
  header: { display: "none" },
};

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="loginScreen">
      <div style={sembunyikanKerangka} aria-hidden="true" />
      <div className="loginPanel">
        <section className="loginCard" aria-labelledby="login-title">
          <div className="loginBrand">
            {educationConfig.school.logo ? (
              <Image
                src={educationConfig.school.logo}
                alt={educationConfig.school.logoAlt}
                width={44}
                height={44}
                unoptimized
                className="loginBrandLogo"
              />
            ) : (
              <span className="loginBrandFallback" aria-hidden="true">
                <IconLock size={22} />
              </span>
            )}
            <span className="loginBrandText">
              <span className="loginBrandName">{siteConfig.name}</span>
              <span className="loginBrandSchool">
                {educationConfig.school.name}
              </span>
            </span>
          </div>

          <h1 className="loginTitle" id="login-title">
            Supabase Auth belum dikonfigurasi
          </h1>
          <p className="loginLead">
            Isi <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_URL</code>
            , dan <code>SUPABASE_SERVICE_ROLE_KEY</code> di{" "}
            <code>.env.local</code>, lalu jalankan ulang server.
          </p>

          <p className="loginFooter">
            <Link href="/">
              <IconArrowLeft size={14} />
              Kembali ke beranda
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function LoginGuruPage({ searchParams }) {
  if (!searchParams?.keluar && (await punyaAkses())) redirect("/guru");
  if (!(await guruSiap())) return <HalamanKonfigurasi />;

  const pesan = PESAN[searchParams?.galat] ?? "";
  const baruKeluar = Boolean(searchParams?.keluar);

  return (
    <main id="main-content" className="loginScreen">
      <div style={sembunyikanKerangka} aria-hidden="true" />

      <div className="loginPanel">
        <section className="loginCard" aria-labelledby="login-title">
          <div className="loginBrand">
            {educationConfig.school.logo ? (
              <Image
                src={educationConfig.school.logo}
                alt={educationConfig.school.logoAlt}
                width={44}
                height={44}
                unoptimized
                className="loginBrandLogo"
              />
            ) : (
              <span className="loginBrandFallback" aria-hidden="true">
                <IconLock size={22} />
              </span>
            )}
            <span className="loginBrandText">
              <span className="loginBrandName">{siteConfig.name}</span>
              <span className="loginBrandSchool">
                {educationConfig.school.name}
              </span>
            </span>
          </div>

          <h1 className="loginTitle" id="login-title">
            Masuk panel guru
          </h1>
          <p className="loginLead">
            Gunakan akun guru Informatika untuk mengelola absensi, materi, soal
            kuis, rekap nilai, dan token kelas.
          </p>

          <FormLoginGuru
            action={masukGuru}
            galat={pesan}
            baruKeluar={baruKeluar}
          />

          <p className="loginFooter">
            <Link href="/smk">
              <IconArrowLeft size={14} />
              Kembali ke materi
            </Link>
            <span className="loginFooterTrust">
              <IconShield size={14} />
              Diverifikasi Supabase Auth
            </span>
          </p>
        </section>

        <p className="loginSiteLink">
          <Link href="/">Situs utama {siteConfig.name}</Link>
        </p>
      </div>
    </main>
  );
}
