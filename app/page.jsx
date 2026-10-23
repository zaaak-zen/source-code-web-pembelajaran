import Link from "next/link";
import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import SchoolLogo from "@/components/SchoolLogo/SchoolLogo";
import Galeri from "@/components/Galeri/Galeri";
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

/*
 * Landing page CodeSpring.
 *
 * Tanggung jawab: memperkenalkan platform, menampilkan profil sekolah,
 * alur belajar, daftar kelas, sejarah sekolah, dan pembuat website.
 *
 * CARA EDIT:
 * - Profil sekolah, tahun berdiri, dan sejarah: ubah di config/education.js.
 * - Nama website: ubah di config/site.js.
 * - Daftar pembuat di bawah: ubah nilai `creator` di file ini.
 * - Navbar dan Footer dipasang otomatis dari app/layout.jsx.
 */

// Data pembuat website sengaja diletakkan di sini karena pemilik proyek
// belum menetapkan file konfigurasi untuk kredit pembuat.
const creatorGroup = {
  // EDIT: nama kelompok pembuat
  name: "Kelompok 6",
  // EDIT: biodata setiap anggota. Ganti `name` dan `role`, lalu isi `links`
  // bila ada tautan yang ingin ditampilkan (boleh lebih dari satu).
  members: [
    { name: "Anggota 1", role: "Tim Pengembang", links: [] },
    { name: "Anggota 2", role: "Tim Pengembang", links: [] },
    { name: "Anggota 3", role: "Tim Pengembang", links: [] },
    { name: "Anggota 4", role: "Tim Pengembang", links: [] },
  ],
};

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

export default function HomePage() {
  const { school, galeri, sejarah, tahunBerdiri } = educationConfig;
  const jenjang = educationConfig.jenjang[0] ?? null;
  const daftarKelas = jenjang?.kelas ?? [];
  const jumlahMateri = daftarKelas.reduce(
    (total, kelas) => total + kelas.materi.length,
    0
  );
  const jumlahKuis = daftarKelas.reduce(
    (total, kelas) =>
      total + kelas.materi.filter((materi) => materi.kuis?.jumlahSoal > 0).length,
    0
  );

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
                <Link className="btn btnSecondary" href="/login">
                  Masuk ke akun
                </Link>
              </div>

              <dl className="heroStats">
                <div className="heroStat">
                  <dt className="sr-only">Jumlah kelas</dt>
                  <dd>
                    <strong>{daftarKelas.length}</strong>
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
            </div>

            {/* Panel dekoratif: ilustrasi potongan kode dan progres kuis. */}
            <div className="heroVisual" aria-hidden="true">
              <div className="heroPanel">
                <div className="heroPanelTop">
                  <span className="heroDot heroDot1" />
                  <span className="heroDot heroDot2" />
                  <span className="heroDot heroDot3" />
                  <span className="heroPanelFile">kuis_hari_ini.py</span>
                </div>

                <pre className="heroCode">
                  <code>
                    <span className="tokCom"># belajar itu proses</span>
                    {"\n"}
                    <span className="tokKey">def</span>{" "}
                    <span className="tokFn">mulai_belajar</span>(siswa):{"\n"}
                    {"    "}langkah = [<span className="tokStr">&quot;pahami&quot;</span>,{" "}
                    <span className="tokStr">&quot;tanya&quot;</span>,{" "}
                    <span className="tokStr">&quot;uji&quot;</span>]{"\n"}
                    {"    "}
                    <span className="tokKey">for</span> l <span className="tokKey">in</span>{" "}
                    langkah:{"\n"}
                    {"        "}siswa.kerjakan(l){"\n"}
                    {"    "}
                    <span className="tokKey">return</span>{" "}
                    <span className="tokStr">&quot;siap!&quot;</span>
                  </code>
                </pre>

                <div className="heroPanelFoot">
                  <span className="heroPanelLabel">Progres materi</span>
                  <span className="heroBar">
                    <span />
                  </span>
                  <span className="heroPanelLabel">72%</span>
                </div>
              </div>

              <span className="heroFloat heroFloatTop">
                <IconTrophy size={16} />
                Kuis otomatis
              </span>
              <span className="heroFloat heroFloatBottom">
                <IconChat size={16} />
                Tanya AI
              </span>
            </div>
          </div>
        </section>

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
                  Kuis berisi soal pilihan ganda dengan pembahasan. Nilaimu
                  tersimpan di dashboard bila kamu masuk ke akun.
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
                <h3 className="featureTitle">Rekap nilai</h3>
                <p className="featureText">
                  Skor terbaik per materi dan riwayat kuis tersimpan di
                  dashboard akunmu.
                </p>
              </li>
              <li className="featureCard">
                <span className="iconTile iconTileAccent" aria-hidden="true">
                  <IconCalendar size={22} />
                </span>
                <h3 className="featureTitle">Absensi jelas</h3>
                <p className="featureText">
                  Guru mencatat kehadiran, siswa bisa melihat riwayat
                  kehadirannya sendiri.
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

        {/* ---------- Daftar kelas ---------- */}
        {jenjang && daftarKelas.length > 0 ? (
          <section className="section" aria-labelledby="kelas-preview">
            <div className="container">
              <SectionHeading
                eyebrow="Materi SMK"
                id="kelas-preview"
                title="Pilih kelas, mulai dari yang relevan"
                lead={jenjang.deskripsi}
              />

              <ul className="classGrid">
                {daftarKelas.map((kelas) => (
                  <li key={kelas.slug}>
                    <Link
                      className="classCard"
                      href={`/${jenjang.slug}/${kelas.slug}`}
                    >
                      <span className="classTop">
                        <span className="classBadge" aria-hidden="true">
                          {kelas.slug}
                        </span>
                        <span className="chip chipPrimary">
                          {kelas.materi.length} materi
                        </span>
                      </span>
                      <span className="className">{kelas.nama}</span>
                      <span className="classDesc">{kelas.deskripsi}</span>

                      {kelas.materi.length > 0 ? (
                        <span className="classTopics">
                          {kelas.materi.slice(0, 2).map((materi) => (
                            <span key={materi.slug} className="chip">
                              {materi.judul}
                            </span>
                          ))}
                        </span>
                      ) : null}

                      <span className="classMeta">
                        <span className="classMetaIcon">
                          <IconBook size={15} />
                          Lihat materi
                        </span>
                        <span className="classArrow" aria-hidden="true">
                          <IconArrowRight size={16} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ---------- Profil sekolah ---------- */}
        <section className="section sectionAlt" aria-labelledby="profil-sekolah">
          <div className="container">
            <SectionHeading
              eyebrow="Profil Sekolah"
              id="profil-sekolah"
              title="Tentang sekolah kami"
            />

            <div className="profileGrid">
              <article className="card profileCard">
                <div className="profileSchool">
                  <SchoolLogo
                    size={58}
                    decorative
                    className="profileLogo"
                  />
                  <h3 className="profileName">{school.name}</h3>
                </div>
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

            <div className="card">
              <div className="visionBox">
                <p className="vision-label">Berdiri sejak {tahunBerdiri}</p>
                <p className="vision-text">{sejarah}</p>
              </div>
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
                  <Link className="btn btnSecondary" href="/register">
                    Buat akun
                  </Link>
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
              title="Di balik CodeSpring"
            />

            <p className="creatorGroupName">{creatorGroup.name}</p>
            <div className="creatorGrid">
              {creatorGroup.members.map((member, index) => (
                <article key={index} className="creatorCard">
                  <div className="creatorAvatar" aria-hidden="true">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="creatorName">{member.name}</h3>
                    <p className="creatorRole">{member.role}</p>
                    {member.links.length > 0 ? (
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

            <p className="section-note">
              Ganti nama dan peran anggota di <code>app/page.jsx</code> agar
              kredit sesuai.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
