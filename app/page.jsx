import Link from "next/link";
import { Suspense } from "react";
import { existsSync } from "node:fs";
import path from "node:path";
import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import { ambilSemuaMateri } from "@/lib/materi/kelas";
import { uraiYoutubeId } from "@/lib/materi/konten";
import SchoolLogo from "@/components/SchoolLogo/SchoolLogo";
import Galeri from "@/components/Galeri/Galeri";
import ProfilPembuat from "@/components/Tim/ProfilPembuat";
import {
  IconArrowRight,
  IconBook,
  IconCalendar,
  IconChat,
  IconCompass,
  IconSparkles,
  IconTarget,
  IconTrophy,
} from "@/components/Icons/Icons";


// EDIT: ganti berkas di public/tim/<slug>/ dengan foto, video, dan lagu asli.
// Nama berkas boleh diganti, cukup sesuaikan path di bawah.
// `pesanProfile` adalah kalimat penutup yang tampil di bawah pemutar lagu.
//
// Setiap path diperiksa keberadaannya di server sebelum dikirim ke browser.
// Berkas yang tidak ada otomatis dikosongkan, sehingga komponen menampilkan
// inisial/foto dan menonaktifkan lagu alih-alih memuat berkas yang hilang.
const creatorGroup = {
  name: "Kelompok 5",
  members: [
    {
      name: "M.Tirtarakha Al Azhar",
      role: "Tim Pengembang",
      links: [],
      foto: "/tim/tirtarakha/rakha.jpeg",
      video: { src: "/tim/tirtarakha/rakha.mp4", poster: "/tim/tirtarakha/rakha.jpeg" },
      lagu: "/tim/tirtarakha/lagu.mp3",
      laguJudul: "Confident - Justin Bieber",
      pesanProfile:
        "Terima kasih sudah mampir ke profil saya. Semoga karyanya bermanfaat.",
    },
    {
      name: "Rivana Ahmad Gustiawan",
      role: "Tim Pengembang",
      links: [],
      foto: "/tim/rivana/rivana.jpeg",
      video: { src: "/tim/rivana/rivana.mp4", poster: "/tim/rivana/rivana.jpeg" },
      lagu: "/tim/rivana/lagu.mp3",
      laguJudul: "To the bone — Pamungkas",
      pesanProfile:
        "Terima kasih sudah mampir ke profil saya. Semoga karyanya bermanfaat.",
    },
    {
      name: "Aditya Arief Maulana",
      role: "Tim Pengembang",
      links: [],
      foto: "/tim/aditya/adit.jpeg",
      video: { src: "/tim/aditya/adit.mp4", poster: "/tim/aditya/adit.jpeg" },
      lagu: "/tim/aditya/lagu.mp3",
      laguJudul: "The cure — Olivia Rodrigo",
      pesanProfile:
        "Terima kasih sudah mampir ke profil saya. Semoga karyanya bermanfaat.",
    },
    {
      name: "Muhammad Hamdan",
      role: "Tim Pengembang",
      links: [],
      foto: "/tim/hamdan/hamdan.jpeg",
      video: { src: "/tim/hamdan/hamdan.mp4", poster: "/tim/hamdan/hamdan.jpeg" },
      lagu: "/tim/hamdan/lagu.mp3",
      laguJudul: "Jodoh pasti bertemu - Afgan",
      // Baris baru (\\n) ditampilkan apa adanya, seperti bait puisi.
      pesanProfile: [
        "Aku menulis bukan karena pandai merangkai kata,",
        "melainkan karena ada rasa yang tak sempat terucap.",
      ].join("\n"),
      tandaTangan: "Garut, 2 November 2026",
    },
  ],
};

const PUBLIC_DIR = path.join(process.cwd(), "public");

const daftarKelasSemua = educationConfig.jenjang[0]?.kelas ?? [];

/*
 * `existsSync` di bawah hanya berguna untuk memastikan berkas tim benar-benar
 * ada, dan hasilnya sama di setiap permintaan. Dihitung sekali saat modul
 * dimuat, bukan 12 kali per permintaan: pemeriksaan berkas menyentuh disk, dan
 * daftar anggota tim ada di dalam berkas ini (bukan di database), jadi
 * hasilnya tidak mungkin berubah selama server berjalan.
 */
const ANGGOTA_PEMBUAT = creatorGroup.members.map(siapkanAnggota);

/**
 * Ubah path publik ("/tim/x/foto.jpg") menjadi URL yang bisa dipakai, atau
 * null bila berkasnya tidak ada. Hanya membaca stat berkas; isi berkas tidak
 * pernah dibuka.
 */
function berkasPublik(pathPublik) {
  if (!pathPublik || typeof pathPublik !== "string") return null;
  const relatif = pathPublik.replace(/^\/+/, "");
  if (!relatif || relatif.includes("..")) return null;
  const penuh = path.join(PUBLIC_DIR, relatif);
  return existsSync(penuh) ? pathPublik : null;
}

function siapkanAnggota(member) {
  return {
    ...member,
    foto: berkasPublik(member.foto),
    lagu: berkasPublik(member.lagu),
    laguJudul: member.laguJudul || "",
    video: member.video?.src
      ? {
          src: berkasPublik(member.video.src),
          poster: berkasPublik(member.video.poster),
        }
      : null,
  };
}

/*
 * Statistik materi, dipakai tiga tempat: chip di hero dan angka "materi" pada
 * setiap baris indeks kelas. Dihitung sekali di sini supaya logikanya tidak
 * tersebar dan mudah dibaca.
 */
function hitungStatistik(semuaMateri) {
  if (!semuaMateri) {
    const totalMateri = daftarKelasSemua.reduce(
      (total, kelas) => total + kelas.materi.length,
      0
    );
    const totalKuis = daftarKelasSemua.reduce(
      (total, kelas) =>
        total +
        kelas.materi.filter((materi) => materi.kuis?.jumlahSoal > 0).length,
      0
    );

    return {
      jumlahMateri: totalMateri,
      jumlahKuis: totalKuis,
      perKelas: (slug) =>
        daftarKelasSemua.find((kelas) => kelas.slug === slug)?.materi.length ?? 0,
    };
  }

  const perKelas = new Map();

  for (const materi of semuaMateri) {
    perKelas.set(materi.kelas, (perKelas.get(materi.kelas) ?? 0) + 1);
  }

  return {
    jumlahMateri: semuaMateri.length,
    jumlahKuis: semuaMateri.filter((materi) => materi.kuis?.jumlahSoal > 0)
      .length,
    perKelas: (slug) => perKelas.get(slug) ?? 0,
  };
}

/*
 * Angka statistik di hero dan indeks kelas.
 *
 * Dibuat sebagai komponen async tersendiri agar bisa dibungkus Suspense:
 * halaman terkirim lebih dulu, angka menyusul setelah database menjawab.
 * Bila database belum siap, angka kembali memakai config/education.js supaya
 * beranda tetap menampilkan isi yang wajar.
 */
async function RingkasanMateri({ bagian }) {
  // true = pakai klien cache. Beranda dibatasi revalidate = 300 dan setiap
  // aksi guru memanggil revalidatePath("/"), jadi tidak ada data tertinggal.
  const semuaMateri = await ambilSemuaMateri(true);
  const statistik = hitungStatistik(semuaMateri);

  if (bagian === "angka") {
    return (
      <StatsAngka
        jumlahMateri={statistik.jumlahMateri}
        jumlahKuis={statistik.jumlahKuis}
      />
    );
  }

  return <IndeksKelas perKelas={statistik.perKelas} />;
}

/** Tiga angka di hero. */
function StatsAngka({ jumlahMateri = "—", jumlahKuis = "—" }) {
  return (
    <dl className="heroStats">
      <div className="heroStat">
        <dt className="sr-only">Jumlah kelas</dt>
        <dd>
          <strong>{daftarKelasSemua.length}</strong>
          <span>Kelas tersedia</span>
        </dd>
      </div>
      <div className="heroStat">
        <dt className="sr-only">Jumlah materi</dt>
        <dd>
          <strong>{jumlahMateri}</strong>
          <span>Materi terstruktur</span>
        </dd>
      </div>
      <div className="heroStat">
        <dt className="sr-only">Jumlah kuis</dt>
        <dd>
          <strong>{jumlahKuis}</strong>
          <span>Kuis otomatis</span>
        </dd>
      </div>
    </dl>
  );
}

/** Daftar kelas beserta jumlah materinya. */
function IndeksKelas({ perKelas }) {
  return (
    <ol className="heroIndexList">
      {daftarKelasSemua.map((kelas, index) => (
        <li key={kelas.slug} className="heroIndexItem">
          <Link className="heroIndexLink" href="/smk">
            <span className="heroIndexNo" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="heroIndexName">{kelas.nama}</span>
              <span className="heroIndexMeta">{perKelas(kelas.slug)} materi</span>
            </span>
            <IconArrowRight
              size={18}
              className="heroIndexArrow"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}

function SectionHeading({ eyebrow, id, title, lead }) {
  return (
    <header className="sectionHead">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="sectionTitle">
        {title}
      </h2>
      {lead ? <p className="sectionLead">{lead}</p> : null}
    </header>
  );
}

/*
 * Beranda sengaja tidak memakai "force-dynamic".
 *
 * Isi halaman ini hanya berubah saat guru menyimpan materi, menyimpan soal,
 * atau mengganti token. Ketiga aksi itu sudah memanggil revalidatePath("/"),
 * jadi halaman ini dibangun ulang saat datanya berubah. `revalidate` di bawah
 * hanya jaring pengaman agar perubahan yang dilakukan langsung lewat
 * dashboard Supabase tetap muncul.
 *
 * Catatan: halaman ini tetap bisa menampilkan cookie karena Navbar dan Footer
 * adalah komponen klien. Angka statistik di hero dibaca di dalam Suspense,
 * sehingga halaman terkirim lebih dulu dan siswa tidak menunggu database.
 */
export const revalidate = 300;

export default async function HomePage() {
  const { school, galeri, sejarah, tahunBerdiri } = educationConfig;
  const jenjang = educationConfig.jenjang[0] ?? null;
  const daftarKelas = jenjang?.kelas ?? [];
  const videoSosialisasi = school.videoSosialisasi ?? null;
  const videoSosialisasiId = uraiYoutubeId(videoSosialisasi?.youtubeId);
  const anggotaPembuat = ANGGOTA_PEMBUAT;

  return (
    <div className="page">
      <main id="main-content">
        {/* ---------- Hero ---------- */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="container heroGrid">
            <div>
              <div className="heroSchool">
                <SchoolLogo
                  size={46}
                  decorative
                  className="heroSchoolLogo"
                />
                <span className="heroSchoolText">
                  <span className="heroSchoolName">{school.name}</span>
                  <span className="heroSchoolMeta">
                    Platform belajar Informatika
                  </span>
                </span>
              </div>

              <span className="heroBadge">
                <IconSparkles size={15} />
                Informatika SMK &middot; Kurikulum Merdeka
              </span>

              <h1 id="hero-title" className="heroTitle">
                Belajar Informatika,{" "}
                <span className="heroHighlight">dari rasa penasaran.</span>
              </h1>

              <p className="heroSubtitle">
                {siteConfig.tagline}. Pelajari materi yang runtut, tanyakan
                bagian yang sulit, lalu uji pemahaman lewat kuis yang disusun
                dari materi itu sendiri.
              </p>

              <div className="heroActions">
                <Link className="btn btnPrimary" href="/smk">
                  Mulai belajar
                  <IconArrowRight size={18} />
                </Link>
                <a className="btn btnSecondary" href="#fitur">
                  Lihat fitur
                </a>
              </div>

              {/* Angka materi dan kuis datang dari database, jadi dihitung di
                  dalam Suspense: sisa halaman terkirim lebih dulu dan siswa
                  tidak menunggu query selesai. */}
              <Suspense fallback={<StatsAngka />}>
                <RingkasanMateri bagian="angka" />
              </Suspense>
            </div>

            {/* Indeks kelas: daftar editorial, bukan panel dekoratif. */}
            <div className="heroIndex" aria-label="Indeks kelas">
              <div className="heroIndexHead">
                <span>Indeks kelas</span>
                <span>{daftarKelas.length} kelas</span>
              </div>

              {/* Daftar ini memuat jumlah materi per kelas, yang juga datang
                  dari database. Hasilnya sama dengan chip di hero, dan
                  ambilSemuaMateri sudah dibungkus cache, jadi keduanya berbagi
                  satu query. */}
              <Suspense fallback={null}>
                <RingkasanMateri bagian="indeks" />
              </Suspense>

              <p className="heroIndexNote">
                Materi dibuka dengan token kelas dari guru.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Video sosialisasi ---------- */}
        {videoSosialisasiId ? (
          <section
            className="section sectionVideo"
            aria-labelledby="video-sosialisasi"
          >
            <div className="container">
              <SectionHeading
                eyebrow="Sosialisasi"
                id="video-sosialisasi"
                title={videoSosialisasi.judul}
                lead={videoSosialisasi.deskripsi}
              />

              <div className="videoFrame videoSosialisasi">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoSosialisasiId}`}
                  title={videoSosialisasi.judul}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------- Galeri sekolah ---------- */}
        {galeri?.foto?.length > 0 ? (
          <section className="section" aria-labelledby="galeri-sekolah">
            <div className="container">
              <SectionHeading
                eyebrow="Galeri Sekolah"
                id="galeri-sekolah"
                title={galeri.judul}
                lead={galeri.deskripsi}
              />

              <Galeri foto={galeri.foto} label={galeri.judul} />
            </div>
          </section>
        ) : null}

        {/* ---------- Cara belajar ---------- */}
        <section className="section" aria-labelledby="cara-belajar">
          <div className="container">
            <SectionHeading
              eyebrow="Cara Belajar"
              id="cara-belajar"
              title="Tiga langkah, satu kebiasaan"
              lead="Belajar tidak harus langsung paham. Mulai dari membaca, bertanya saat bingung, lalu menguji diri dengan kuis."
            />

            <ol className="stepGrid">
              <li className="stepCard">
                <span className="stepNumber" aria-hidden="true">
                  1
                </span>
                <h3 className="stepTitle">Baca materinya</h3>
                <p className="featureText">
                  Setiap materi disusun runtut: tujuan belajar, penjelasan,
                  contoh kode, dan catatan penting. Kamu bisa membaca ulang
                  kapan saja.
                </p>
              </li>
              <li className="stepCard">
                <span className="stepNumber" aria-hidden="true">
                  2
                </span>
                <h3 className="stepTitle">Tanyakan yang sulit</h3>
                <p className="featureText">
                  Pembantu AI menjawab berdasarkan isi materi yang sedang
                  dibuka, jadi jawabannya tetap nyambung dengan pelajaran.
                </p>
              </li>
              <li className="stepCard">
                <span className="stepNumber" aria-hidden="true">
                  3
                </span>
                <h3 className="stepTitle">Uji pemahaman</h3>
                <p className="featureText">
                  Kuis berisi soal pilihan ganda dengan pembahasan. Skormu
                  langsung tampil setelah semua soal dijawab.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ---------- Fitur ---------- */}
        <section className="section sectionAlt" aria-labelledby="fitur">
          <div className="container">
            <SectionHeading
              eyebrow="Fitur"
              id="fitur"
              title="Yang membuat belajar lebih ringan"
              lead="Semua fitur dirancang untuk membantu siswa SMK memahami Informatika, bukan sekadar menghafal."
            />

            <ul className="featureGrid">
              <li className="featureCard">
                <span className="iconTile" aria-hidden="true">
                  <IconBook size={22} />
                </span>
                <h3 className="featureTitle">Materi terstruktur</h3>
                <p className="featureText">
                  Disusun per kelas dan per topik, mengikuti elemen Informatika
                  Kurikulum Merdeka.
                </p>
              </li>
              <li className="featureCard">
                <span className="iconTile iconTileAccent" aria-hidden="true">
                  <IconChat size={22} />
                </span>
                <h3 className="featureTitle">Pembantu AI</h3>
                <p className="featureText">
                  Bertanya tentang bagian yang belum dipahami tanpa harus
                  menunggu jam pelajaran.
                </p>
              </li>
              <li className="featureCard">
                <span className="iconTile iconTileSuccess" aria-hidden="true">
                  <IconTarget size={22} />
                </span>
                <h3 className="featureTitle">Kuis dan pembahasan</h3>
                <p className="featureText">
                  Soal dibuat dari isi materi, lengkap dengan kunci dan
                  penjelasan setelah dinilai.
                </p>
              </li>
              <li className="featureCard">
                <span className="iconTile" aria-hidden="true">
                  <IconTrophy size={22} />
                </span>
                <h3 className="featureTitle">Nilai langsung</h3>
                <p className="featureText">
                  Skor, kunci jawaban, dan pembahasan tampil begitu kuis
                  selesai dinilai.
                </p>
              </li>
              <li className="featureCard">
                <span className="iconTile iconTileAccent" aria-hidden="true">
                  <IconCalendar size={22} />
                </span>
                <h3 className="featureTitle">Absensi jelas</h3>
                <p className="featureText">
                  Guru mencatat kehadiran lewat halaman absensi khusus yang
                  dibuka dengan kode akses.
                </p>
              </li>
              <li className="featureCard">
                <span className="iconTile iconTileSuccess" aria-hidden="true">
                  <IconCompass size={22} />
                </span>
                <h3 className="featureTitle">Belajar mandiri</h3>
                <p className="featureText">
                  Buka dari mana saja, lanjutkan materi berikutnya tanpa
                  kehilangan jejak.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* ---------- Profil sekolah ---------- */}
        <section className="section sectionAlt" aria-labelledby="profil-sekolah">
          <div className="container">
            <SectionHeading
              eyebrow="Profil Sekolah"
              id="profil-sekolah"
              title="Tentang sekolah kami"
            />

            <div className="profileGrid">
              <article className="profileCard">
                <h3 className="profileName">{school.name}</h3>
                <p className="profileDescription">{school.description}</p>
              </article>

              <ul className="profileList" aria-label="Informasi sekolah">
                <li className="profileItem">
                  <span className="profileItemIcon" aria-hidden="true">
                    <IconCompass size={17} />
                  </span>
                  <span>
                    <span className="profileLabel">Alamat</span>
                    <span className="profileValue">{school.address}</span>
                  </span>
                </li>
                <li className="profileItem">
                  <span className="profileItemIcon" aria-hidden="true">
                    <IconCalendar size={17} />
                  </span>
                  <span>
                    <span className="profileLabel">Berdiri sejak</span>
                    <span className="profileValue">{tahunBerdiri}</span>
                  </span>
                </li>
                <li className="profileItem">
                  <span className="profileItemIcon" aria-hidden="true">
                    <IconBook size={17} />
                  </span>
                  <span>
                    <span className="profileLabel">Jenjang</span>
                    <span className="profileValue">
                      {jenjang ? jenjang.nama : "Sekolah Menengah Kejuruan"}
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- Sejarah ---------- */}
        <section className="section" aria-labelledby="sejarah">
          <div className="container">
            <SectionHeading
              eyebrow="Sejarah Sekolah"
              id="sejarah"
              title="Perjalanan sekolah kami"
            />

            <div className="visionBox">
              <p className="vision-label">Berdiri sejak {tahunBerdiri}</p>
              <p className="vision-text">{sejarah}</p>
            </div>
          </div>
        </section>

        {/* ---------- Ajakan ---------- */}
        <section className="section" aria-labelledby="ajakan">
          <div className="container">
            <div className="ctaBand">
              <div className="ctaBandInner">
                <div>
                  <h2 id="ajakan" className="ctaTitle">
                    Siap mulai belajar?
                  </h2>
                  <p className="ctaText">
                    Pilih kelasmu, baca materi pertama, dan uji pemahaman
                    dengan kuis. Tidak perlu menunggu semuanya sempurna.
                  </p>
                </div>
                <div className="ctaActions">
                  <Link className="btn btnPrimary" href="/smk">
                    Buka materi SMK
                    <IconArrowRight size={18} />
                  </Link>
                  <a className="btn btnSecondary" href="#cara-belajar">
                    Lihat cara belajar
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Pembuat ---------- */}
        <section className="section sectionAlt" aria-labelledby="pembuat">
          <div className="container">
            <SectionHeading
              eyebrow="Pembuat Website"
              id="pembuat"
              title="Di balik Warung Kode"
            />

            <p className="creatorGroupName">{creatorGroup.name}</p>
            <div className="creatorGrid">
              {anggotaPembuat.map((member, index) => (
                <article key={index} className="creatorCard">
                  <ProfilPembuat member={member} />
                  <div>
                    <h3 className="creatorName">{member.name}</h3>
                    <p className="creatorRole">{member.role}</p>
                    {member.links?.length > 0 ? (
                      <div className="creatorLinks">
                        {member.links.map((link) => (
                          <a
                            key={link.label}
                            className="creatorLink"
                            href={link.href}
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
