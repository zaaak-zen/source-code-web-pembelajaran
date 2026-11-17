import Link from "next/link";
import { redirect } from "next/navigation";
import { punyaAkses } from "@/lib/guru/akses";
import { TombolKeluarGuru } from "@/components/Guru/TombolKeluarGuru";
import {
  IconArrowRight,
  IconBook,
  IconClipboard,
  IconDashboard,
  IconLock,
  IconShield,
  IconSparkles,
  IconUsers,
} from "@/components/Icons/Icons";

/*
 * Panel guru (/guru)
 *
 * Tanggung jawab: menampilkan menu halaman guru yang tersedia.
 *
 * Akses memakai akun guru Supabase Auth yang sama dengan /guru/login. Bila
 * sesi tidak ada atau perannya bukan guru, pengunjung diarahkan ke
 * /guru/login untuk masuk. Bila Supabase Auth belum dikonfigurasi, halaman
 * login menampilkan pesan konfigurasi.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel guru",
};

export default async function PanelGuruPage() {
  if (!(await punyaAkses())) redirect("/guru/login");

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Panel guru</span>
          </nav>

          <p className="eyebrow">Panel guru</p>
          <h1 className="page-title">Panel guru</h1>
          <p className="page-lead">
            Pilih menu untuk mengelola materi, menyusun soal kuis, mencatat
            kehadiran siswa, atau melihat rekap nilai. Semua menu hanya dapat
            dibuka dengan akun guru.
          </p>

          <div className="pageMeta">
            <TombolKeluarGuru />
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Menu panel guru">
        <div className="container">
          <ul className="featureGrid">
            <li className="featureCard">
              <span className="iconTile" aria-hidden="true">
                <IconClipboard size={22} />
              </span>
              <h2 className="featureTitle">Absensi</h2>
              <p className="featureText">
                Tambah siswa dan catat kehadiran per tanggal. Status dapat
                diperbaiki pada tanggal yang sama.
              </p>
              <p className="panelAction">
                <Link className="btn btnPrimary btnSm" href="/guru/absen">
                  Buka absensi
                  <IconArrowRight size={15} />
                </Link>
              </p>
            </li>

            <li className="featureCard">
              <span className="iconTile" aria-hidden="true">
                <IconBook size={22} />
              </span>
              <h2 className="featureTitle">Materi</h2>
              <p className="featureText">
                Tambah dan ubah materi beserta blok penjelasan dan video.
                Perubahan langsung tampil di halaman siswa.
              </p>
              <p className="panelAction">
                <Link className="btn btnSecondary btnSm" href="/guru/materi">
                  Kelola materi
                  <IconArrowRight size={15} />
                </Link>
              </p>
            </li>

            <li className="featureCard">
              <span className="iconTile iconTileAccent" aria-hidden="true">
                <IconSparkles size={22} />
              </span>
              <h2 className="featureTitle">Soal kuis</h2>
              <p className="featureText">
                Susun soal sekali per materi dengan AI. Semua siswa mengerjakan
                soal yang sama, dengan urutan nomor yang diacak per siswa.
              </p>
              <p className="panelAction">
                <Link className="btn btnSecondary btnSm" href="/guru/kuis">
                  Kelola soal
                  <IconArrowRight size={15} />
                </Link>
              </p>
            </li>

            <li className="featureCard">
              <span className="iconTile iconTileAccent" aria-hidden="true">
                <IconDashboard size={22} />
              </span>
              <h2 className="featureTitle">Rekap nilai</h2>
              <p className="featureText">
                Lihat jumlah pengerjaan, rata-rata persentase, serta nilai
                terendah dan tertinggi per materi.
              </p>
              <p className="panelAction">
                <Link className="btn btnSecondary btnSm" href="/guru/nilai">
                  Lihat rekap
                  <IconArrowRight size={15} />
                </Link>
              </p>
            </li>

            <li className="featureCard">
              <span className="iconTile" aria-hidden="true">
                <IconUsers size={22} />
              </span>
              <h2 className="featureTitle">Kode riwayat</h2>
              <p className="featureText">
                Buat kode per siswa agar siswa dapat membuka riwayat nilainya
                sendiri di halaman Riwayat nilai.
              </p>
              <p className="panelAction">
                <Link className="btn btnSecondary btnSm" href="/guru/riwayat">
                  Kelola kode
                  <IconArrowRight size={15} />
                </Link>
              </p>
            </li>

            <li className="featureCard">
              <span className="iconTile" aria-hidden="true">
                <IconLock size={22} />
              </span>
              <h2 className="featureTitle">Token kelas</h2>
              <p className="featureText">
                Buat dan bagikan token masuk kelas. Ganti atau cabut token kapan
                saja tanpa menjalankan ulang server.
              </p>
              <p className="panelAction">
                <Link className="btn btnSecondary btnSm" href="/guru/token">
                  Kelola token
                  <IconArrowRight size={15} />
                </Link>
              </p>
            </li>

            <li className="featureCard">
              <span className="iconTile iconTileAccent" aria-hidden="true">
                <IconShield size={22} />
              </span>
              <h2 className="featureTitle">Keamanan</h2>
              <p className="featureText">
                Ganti password lewat tautan email yang dikirim Supabase. Tidak
                perlu mengedit file environment atau menjalankan ulang server.
              </p>
              <p className="panelAction">
                <Link className="btn btnSecondary btnSm" href="/guru/keamanan">
                  Ubah akun
                  <IconArrowRight size={15} />
                </Link>
              </p>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
