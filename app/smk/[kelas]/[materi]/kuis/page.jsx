/*
 * Halaman kuis materi SMK (/smk/[kelas]/[materi]/kuis)
 *
 * Tanggung jawab: menampilkan kuis satu materi di halaman tersendiri.
 *
 * Materi dan jumlah soal dibaca dari tabel `materi`; bank soal dari
 * `kuis_bank`. Keduanya dikelola guru lewat /guru/materi dan /guru/kuis.
 * Komponen kuis tetap di components/Kuis/Kuis.jsx.
 *
 * Akses: memerlukan token kelas yang sudah dimasukkan di /smk.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getJenjangBySlug, getKelasBySlug } from "@/config/education";
import { ambilMateri } from "@/lib/materi/kelas";
import { punyaAksesKelas } from "@/lib/kelas/akses";
import { sudahAbsenHariIni } from "@/lib/kelas/absensi";
import { ambilBank } from "@/lib/kuis/bank";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Kuis from "@/components/Kuis/Kuis";
import {
  IconArrowLeft,
  IconTarget,
  IconTrophy,
} from "@/components/Icons/Icons";

const JENJANG_SLUG = "smk";

// Halaman membaca cookie token kelas, jadi selalu dirender per permintaan.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const materi = await ambilMateri(params.kelas, params.materi);
  if (!materi) return { title: "Kuis tidak ditemukan" };
  return { title: `Kuis: ${materi.judul}` };
}

export default async function KuisMateriPage({ params }) {
  const jenjang = getJenjangBySlug(JENJANG_SLUG);
  const kelas = getKelasBySlug(JENJANG_SLUG, params.kelas);
  const materi = await ambilMateri(params.kelas, params.materi);

  if (!jenjang || !kelas || !materi) notFound();

  // Kuis hanya terbuka setelah token kelasnya dimasukkan di /smk.
  if (!(await punyaAksesKelas(kelas.slug))) redirect("/smk?galat=akses");

  if (!(await sudahAbsenHariIni(kelas.slug))) {
    const lanjut = `/smk/${kelas.slug}/${materi.slug}/kuis`;
    redirect(
      `/smk/${kelas.slug}/absen?lanjut=${encodeURIComponent(lanjut)}`
    );
  }

  const jumlahSoalConfig = materi.kuis?.jumlahSoal;

  // Materi tanpa kuis tidak punya halaman kuis.
  if (!(jumlahSoalConfig > 0)) {
    redirect(`/${jenjang.slug}/${kelas.slug}/${materi.slug}`);
  }

  // Bank soal dibaca agar jumlah yang tampil sesuai isi bank dan siswa langsung
  // tahu bila guru belum menyusun soal, tanpa mengetik nama lebih dulu.
  const bank = await ambilBank(kelas.slug, materi.slug);
  const jumlahSoal = bank?.length ?? jumlahSoalConfig;

  // Daftar siswa kelas ini dipakai agar nama yang dipilih saat kuis sama
  // persis dengan nama di absensi. Tanpa ini, siswa mengetik nama bebas dan
  // riwayat nilainya tidak bisa dicocokkan kembali (lihat /smk/<kelas>/riwayat).
  const supabase = createSupabaseServerClient();
  const { data: daftarSiswa } = supabase
    ? await supabase
        .from("siswa")
        .select("id, nama")
        .eq("kelas", kelas.slug)
        .order("nama", { ascending: true })
    : { data: [] };

  const materiHref = `/${jenjang.slug}/${kelas.slug}/${materi.slug}`;

  return (
    <main id="main-content" className="page">
      <section className="page-header" aria-labelledby="kuis-materi-title">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${jenjang.slug}`}>{jenjang.singkatan}</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${jenjang.slug}/${kelas.slug}`}>{kelas.nama}</Link>
            <span aria-hidden="true">/</span>
            <Link href={materiHref}>{materi.judul}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Kuis</span>
          </nav>

          <p className="eyebrow">
            {jenjang.singkatan} &middot; {kelas.nama}
          </p>
          <h1 id="kuis-materi-title" className="page-title">
            Kuis {materi.judul}
          </h1>
          <p className="page-lead">
            Soal disiapkan guru dari isi materi dan urutannya diacak untuk
            setiap siswa, jadi nomor soalmu bisa berbeda dengan teman.
            Kerjakan tanpa membuka materi bila ingin mengukur pemahaman yang
            sebenarnya.
          </p>
          <div className="pageMeta">
            {bank ? (
              <span className="chip chipPrimary">
                <IconTarget size={15} />
                {jumlahSoal} soal
              </span>
            ) : (
              <span className="chip">
                <IconTarget size={15} />
                Soal belum disiapkan
              </span>
            )}
            <span className="chip">
              <IconTrophy size={15} />
              Papan skor materi
            </span>
          </div>
        </div>
      </section>

      <section className="content-section" aria-label="Kuis materi">
        <div className="container">
          {bank ? (
            <Kuis
              kelas={kelas.slug}
              materi={materi.slug}
              judul={materi.judul}
              jumlahSoal={jumlahSoal}
              daftarSiswa={daftarSiswa ?? []}
            />
          ) : (
            <p className="emptyState">
              Soal untuk materi ini belum disiapkan guru. Coba lagi setelah
              guru menyusunnya dari panel guru.
            </p>
          )}

          <div className="tocAction">
            <Link className="btn btnSecondary" href={materiHref}>
              <IconArrowLeft size={16} />
              Kembali ke materi
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
