import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  guruSiap,
  punyaAkses,
} from "@/lib/guru/akses";
import { hapusSiswa } from "@/lib/guru/absen";
import {
  kunciPerangkatAktif,
  lepasPerangkatSiswa,
} from "@/lib/guru/perangkat";
import educationConfig from "@/config/education";
import { TombolKeluarGuru } from "@/components/Guru/TombolKeluarGuru";
import {
  IconAlert,
  IconArrowLeft,
  IconCalendar,
  IconCheckCircle,
  IconClipboard,
  IconUsers,
  IconX,
} from "@/components/Icons/Icons";

/*
 * Halaman absensi guru (/guru/absen)
 *
 * Tanggung jawab: menampilkan daftar siswa dan memungkinkan guru mencatat
 * kehadiran per tanggal (hadir, izin, sakit, alfa).
 *
 * Akses:
 * - Akun guru Supabase Auth (email + password) yang diperiksa di /guru/login.
 * - Login yang benar menghasilkan cookie sesi Supabase (HttpOnly) yang
 *   disegarkan oleh middleware, berlaku 2 jam sejak login. Password tidak
 *   pernah disimpan aplikasi.
 * - Pemeriksaan dilakukan di halaman dan di setiap server action, karena
 *   server action dapat dipanggil langsung tanpa melewati halaman.
 *
 * Daftar siswa disimpan di tabel `siswa` (nama + kelas), bukan di akun.
 * Data siswa dapat ditambah dan dihapus dari halaman ini.
 *
 * Menghapus siswa bersifat permanen dan ikut menghapus absensi serta kode
 * riwayatnya (keduanya `on delete cascade`). Karena itu penghapusan dibuat dua
 * langkah: klik "Hapus" menampilkan panel dampak lebih dulu, dan penghapusan
 * sebenarnya hanya dijalankan setelah guru menekan tombol konfirmasi.
 */

export const dynamic = "force-dynamic";

const STATUS = [
  { nilai: "hadir", label: "Hadir", kelas: "statusHadir" },
  { nilai: "izin", label: "Izin", kelas: "statusIzin" },
  { nilai: "sakit", label: "Sakit", kelas: "statusSakit" },
  { nilai: "alfa", label: "Alfa", kelas: "statusAlfa" },
];

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const daftarKelas = educationConfig.jenjang[0]?.kelas ?? [];

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

function labelKelas(slug) {
  return daftarKelas.find((item) => item.slug === slug)?.nama ?? `Kelas ${slug}`;
}

function kelasSah(slug) {
  return slug === "" || daftarKelas.some((item) => item.slug === slug);
}

/**
 * Menyusun kueri halaman ini dengan mempertahankan filter yang sedang aktif,
 * supaya setelah menyimpan/menghapus guru kembali ke tampilan yang sama.
 */
function kueriHalaman({ tanggal, kelas, tambahan = {} }) {
  const bagian = new URLSearchParams();

  if (tanggal) bagian.set("tanggal", tanggal);
  if (kelas) bagian.set("kelas", kelas);

  for (const [kunci, nilai] of Object.entries(tambahan)) {
    if (nilai) bagian.set(kunci, String(nilai));
  }

  return `/guru/absen?${bagian.toString()}`;
}

/** Baris pertama hasil `count`, atau angka 0 bila kueri gagal. */
function jumlahDari(hasil) {
  const nilai = hasil?.count;
  return typeof nilai === "number" ? nilai : 0;
}

/**
 * Berapa banyak data yang akan ikut terhapus bersama seorang siswa.
 * Dipakai panel konfirmasi agar guru tahu akibatnya sebelum menekan tombol.
 */
async function hitungDampak(supabase, siswaId) {
  const [absensi, riwayatKode] = await Promise.all([
    supabase
      .from("absensi")
      .select("id", { count: "exact", head: true })
      .eq("siswa_id", siswaId),
    supabase
      .from("kode_riwayat")
      .select("id", { count: "exact", head: true })
      .eq("siswa_id", siswaId),
  ]);

  return {
    absensi: jumlahDari(absensi),
    kodeRiwayat: jumlahDari(riwayatKode),
    // Ditandai bila kueri gagal, agar panel tidak menampilkan angka 0 yang
    // menyesatkan seolah tidak ada data.
    gagal: Boolean(absensi.error || riwayatKode.error),
  };
}

async function tambahSiswa(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/absen?galat=konfigurasi");

  const nama = String(formData.get("nama") ?? "").trim();
  const kelas = String(formData.get("kelas") ?? "");

  if (!nama || nama.length > 80) redirect("/guru/absen?galat=nama");
  if (!kelasSah(kelas) || kelas === "") redirect("/guru/absen?galat=kelas");

  const { error } = await supabase
    .from("siswa")
    .insert({ nama, kelas });

  if (error) {
    console.error("Absensi: gagal menambah siswa.", error.message);
    redirect(`/guru/absen?kelas=${kelas}&galat=simpan`);
  }

  revalidatePath("/guru/absen");
  redirect(`/guru/absen?kelas=${kelas}&tersimpan=siswa`);
}

async function simpanAbsensi(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/guru/absen?galat=konfigurasi");

  const tanggal = String(formData.get("tanggal") ?? "");
  const kelas = String(formData.get("kelas") ?? "");
  if (!tanggalSah(tanggal)) redirect("/guru/absen");

  const baris = [];

  for (const [kunci, nilai] of formData.entries()) {
    if (!kunci.startsWith("status_")) continue;

    const siswaId = kunci.slice("status_".length);
    const status = String(nilai);

    if (!POLA_UUID.test(siswaId)) continue;
    if (!STATUS.some((item) => item.nilai === status)) continue;

    baris.push({ siswa_id: siswaId, tanggal, status });
  }

  const kembali = `/guru/absen?tanggal=${tanggal}${
    kelasSah(kelas) && kelas ? `&kelas=${kelas}` : ""
  }`;

  if (baris.length === 0) redirect(kembali);

  const { error } = await supabase
    .from("absensi")
    .upsert(baris, { onConflict: "siswa_id,tanggal" });

  if (error) {
    console.error("Absensi: gagal menyimpan.", error.message);
    redirect(`${kembali}&galat=simpan`);
  }

  revalidatePath("/guru/absen");
  redirect(`${kembali}&tersimpan=1`);
}

/**
 * Server action: lepas ikatan siswa dengan HP-nya.
 *
 * Dipakai saat siswa berganti HP: seluruh `perangkat_hash` milik siswa itu
 * dikosongkan, sehingga ia bisa absen dari HP baru. Baris absensinya tidak
 * dihapus, hanya kuncinya dilepas.
 */
async function lepasPerangkat(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const siswaId = String(formData.get("siswaId") ?? "");
  const siswaNama = String(formData.get("nama") ?? "");
  const tanggal = String(formData.get("tanggal") ?? "");
  const kelas = String(formData.get("kelas") ?? "");
  const tahap = String(formData.get("tahap") ?? "");

  const kembali = kueriHalaman({
    tanggal: tanggalSah(tanggal) ? tanggal : "",
    kelas: kelasSah(kelas) && kelas ? kelas : "",
  });
  const pemisah = kembali.includes("?") ? "&" : "?";

  if (!POLA_UUID.test(siswaId)) {
    redirect(`${kembali}${pemisah}galat=siswa`);
  }

  /*
   * Dua langkah seperti tombol Hapus: formulir pertama hanya membuka panel
   * konfirmasi. Pelepasan sebenarnya baru berjalan setelah guru melihat
   * namanya dan menekan tombol konfirmasi.
   */
  if (tahap !== "konfirmasi") {
    redirect(
      `${kembali}${pemisah}lepas=${siswaId}${siswaNama ? `#lepas-${siswaId}` : ""}`
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect(`${kembali}${pemisah}galat=konfigurasi`);

  // Nama ikut diperiksa agar panel konfirmasi milik siswa lain tidak bisa
  // dipakai melepas perangkat siswa yang berbeda.
  const { data: siswa } = await supabase
    .from("siswa")
    .select("id, nama")
    .eq("id", siswaId)
    .maybeSingle();

  if (!siswa) redirect(`${kembali}${pemisah}galat=siswa`);

  if (String(siswaNama).trim() !== String(siswa.nama).trim()) {
    redirect(`${kembali}${pemisah}galat=siswa`);
  }

  const { error } = await lepasPerangkatSiswa(siswaId);

  if (error) {
    console.error("Absensi: gagal melepas perangkat.", error);
    redirect(`${kembali}${pemisah}galat=simpan`);
  }


  revalidatePath("/guru/absen");
  redirect(`${kembali}${pemisah}tersimpan=perangkat`);
}

function HalamanKonfigurasi() {
  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <p className="eyebrow">Absensi</p>
          <h1 className="page-title">Layanan belum dikonfigurasi</h1>
          <p className="page-lead">
            Variabel <code>SUPABASE_URL</code>,{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code>, atau{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> belum diisi. Jalankan{" "}
            <code>supabase/schema.sql</code> lalu isi variabel tersebut di{" "}
            <code>.env.local</code>.
          </p>
        </div>
      </header>
    </main>
  );
}

export default async function AbsenPage({ searchParams }) {
  if (!(await guruSiap())) return <HalamanKonfigurasi />;
  if (!(await punyaAkses())) redirect("/guru/login");

  const supabase = createSupabaseServerClient();
  if (!supabase) return <HalamanKonfigurasi />;

  const tanggal = tanggalSah(searchParams?.tanggal)
    ? searchParams.tanggal
    : tanggalHariIni();

  const kelas = kelasSah(searchParams?.kelas) ? String(searchParams.kelas) : "";

  /*
   * ID siswa yang konfirmasi hapusnya sedang dibuka. Hanya satu pada satu
   * waktu, dan hanya dipakai untuk menampilkan panel dampak — tidak ada data
   * yang diubah sampai guru menekan tombol konfirmasi.
   */
  const calonHapus = POLA_UUID.test(String(searchParams?.hapus ?? ""))
    ? String(searchParams.hapus)
    : "";

  let kueriSiswa = supabase
    .from("siswa")
    .select("id, nama, kelas")
    .order("kelas", { ascending: true })
    .order("nama", { ascending: true });

  if (kelas) kueriSiswa = kueriSiswa.eq("kelas", kelas);

  const kunciAktif = await kunciPerangkatAktif();

  const [
    { data: siswa, error: galatSiswa },
    { data: catatan, error: galatAbsen },
    { data: calon, error: galatCalon },
  ] = await Promise.all([
    kueriSiswa,
    supabase
      .from("absensi")
      .select("siswa_id, status, perangkat_hash")
      .eq("tanggal", tanggal),
    calonHapus
      ? supabase
          .from("siswa")
          .select("id, nama, kelas")
          .eq("id", calonHapus)
          .maybeSingle()
      : { data: null, error: null },
  ]);

  const daftarSiswa = siswa ?? [];
  const statusSiswa = new Map(
    (catatan ?? []).map((item) => [item.siswa_id, item.status])
  );

  /*
   * Siswa yang sudah terikat ke sebuah HP, sebagai Map id -> true. Hanya baris
   * absensi yang punya `perangkat_hash` yang dihitung; baris lama dan baris
   * yang dicatat guru bernilai null. Dipakai tabel di bawah untuk menandai
   * siswa mana yang sudah terkunci ke HP-nya.
   */
  const terikatPerangkat = new Set(
    (catatan ?? [])
      .filter((item) => Boolean(item.perangkat_hash))
      .map((item) => item.siswa_id)
  );

  /*
   * Siswa yang panel konfirmasi "Lepas perangkat"nya sedang dibuka guru.
   * Hanya berlaku bila kunci perangkat memang aktif; tanpa token guru, tidak
   * ada ikatan yang perlu dilepas.
   */
  const idLepas =
    kunciAktif && POLA_UUID.test(String(searchParams?.lepas ?? ""))
      ? String(searchParams.lepas)
      : "";

  const calonLepas = idLepas
    ? daftarSiswa.find((item) => item.id === idLepas) ?? null
    : null;

  const sudahDicatat = daftarSiswa.filter((item) =>
    statusSiswa.has(item.id)
  ).length;
  const belumDicatat = daftarSiswa.length - sudahDicatat;

  // Dampak dihitung hanya bila panel konfirmasi benar-benar ditampilkan.
  const dampak =
    calon && !galatCalon ? await hitungDampak(supabase, calon.id) : null;

  /*
   * Galat didahulukan atas pesan berhasil: keduanya bisa muncul bersamaan
   * (misalnya `?galat=simpan&tersimpan=1` dari peramban yang mengulang
   * permintaan), dan pesan berhasil akan menutupi kegagalan yang perlu
   * ditindaklanjuti guru.
   */
  const pesan = searchParams?.galat
    ? searchParams.galat === "simpan"
      ? "Data gagal disimpan. Periksa koneksi lalu coba lagi."
      : searchParams.galat === "nama"
        ? "Nama siswa tidak boleh kosong atau lebih dari 80 karakter."
        : searchParams.galat === "hapus"
          ? "Siswa gagal dihapus. Periksa koneksi lalu coba lagi."
          : searchParams.galat === "siswa"
            ? "Siswa tidak ditemukan. Mungkin sudah dihapus dari perangkat lain."
            : searchParams.galat === "konfigurasi"
              ? "Supabase belum dikonfigurasi di server."
              : "Permintaan tidak dikenali."
    : searchParams?.tersimpan === "1"
      ? "Absensi berhasil disimpan."
      : searchParams?.tersimpan === "siswa"
        ? "Siswa berhasil ditambahkan."
        : searchParams?.tersimpan === "hapus"
          ? "Siswa berhasil dihapus."
          : searchParams?.tersimpan === "perangkat"
            ? "Kunci HP siswa dilepas. Ia bisa mengisi absensi dari HP baru."
            : "";

  const galatTabel = galatSiswa || galatAbsen;

  return (
    <main id="main-content" className="page">
      <header className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/smk">Materi</Link>
            <span aria-hidden="true">/</span>
            <Link href="/guru">Panel guru</Link>
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
            <TombolKeluarGuru />
          </div>
        </div>
      </header>

      <section className="content-section" aria-label="Pilih tanggal dan kelas">
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

            <div className="authField">
              <label className="authLabel" htmlFor="kelas">
                Kelas
              </label>
              <select
                className="authInput"
                id="kelas"
                name="kelas"
                defaultValue={kelas}
              >
                <option value="">Semua kelas</option>
                {daftarKelas.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btnSecondary" type="submit">
              Tampilkan
            </button>
          </form>

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
        </div>
      </section>

      <section className="content-section" aria-label="Tambah siswa">
        <div className="container">
          <div className="dashSectionHead">
            <h2 className="dashSectionTitle">Tambah siswa</h2>
          </div>
          <form className="absenToolbar" action={tambahSiswa}>
            <div className="authField">
              <label className="authLabel" htmlFor="nama">
                Nama siswa
              </label>
              <input
                className="authInput"
                id="nama"
                name="nama"
                type="text"
                maxLength={80}
                required
              />
            </div>

            <div className="authField">
              <label className="authLabel" htmlFor="kelas-baru">
                Kelas
              </label>
              <select
                className="authInput"
                id="kelas-baru"
                name="kelas"
                required
                defaultValue={kelas || daftarKelas[0]?.slug || ""}
              >
                {daftarKelas.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btnPrimary" type="submit">
              Tambah
            </button>
          </form>
        </div>
      </section>

      {/* Panel konfirmasi hapus. Muncul hanya setelah guru menekan "Hapus"
          pada satu baris, dan menjelaskan apa saja yang ikut terhapus
          sebelum tombol konfirmasi ditekan. */}
      {calon ? (
        <section
          className="content-section"
          aria-label="Konfirmasi hapus siswa"
        >
          <div className="container">
            {/* Wadah interaktif, jadi bukan role="alert" (yang untuk
                pengumuman teks). Tombol konfirmasi sengaja tidak diberi
                autoFocus: kalau fokus langsung mendarat di tombol merusak,
                satu Enter yang tidak sengaja bisa menghapus data. */}
            <div
              className="hapusPanel"
              role="group"
              aria-labelledby="hapus-panel-judul"
            >
              <h2 className="hapusPanelTitle" id="hapus-panel-judul">
                <IconAlert size={18} />
                Hapus {calon.nama}?
              </h2>

              <p className="hapusPanelText">
                Siswa ini akan dihapus dari {labelKelas(calon.kelas)} secara
                permanen. Tindakan ini tidak dapat dibatalkan.
              </p>

              <ul className="hapusPanelList">
                <li>
                  <strong>{dampak ? dampak.absensi : "…"}</strong> catatan
                  absensi ikut terhapus
                </li>
                <li>
                  <strong>{dampak ? dampak.kodeRiwayat : "…"}</strong> kode
                  riwayat nilai ikut terhapus
                </li>
                <li>
                  Nilai kuis yang sudah dikerjakan <strong>tetap tersimpan</strong>{" "}
                  di rekap, karena dicocokkan lewat nama, bukan ID siswa.
                </li>
              </ul>

              {dampak?.gagal ? (
                <p className="authMessage authMessageError" role="alert">
                  Jumlah data yang ikut terhapus belum dapat dihitung. Pastikan
                  tabel <code>absensi</code> dan <code>kode_riwayat</code> sudah
                  dibuat lewat <code>supabase/schema.sql</code>.
                </p>
              ) : null}

              <div className="absenActions hapusPanelActions">
                <form action={hapusSiswa}>
                  <input type="hidden" name="siswaId" value={calon.id} />
                  <input type="hidden" name="kelas" value={kelas} />
                  <input type="hidden" name="tanggal" value={tanggal} />
                  <button className="btn btnDanger" type="submit">
                    <IconX size={16} />
                    Ya, hapus permanen
                  </button>
                </form>

                <Link
                  className="btn btnSecondary"
                  href={kueriHalaman({ tanggal, kelas })}
                >
                  Batal
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Panel konfirmasi lepas perangkat. Muncul setelah guru menekan
          "Lepas HP" pada satu baris. Melepas ikatan tidak menghapus absensi;
          hanya kuncinya yang dikosongkan, sehingga siswa bisa absen dari HP
          baru. */}
      {calonLepas ? (
        <section
          className="content-section"
          aria-label="Konfirmasi lepas perangkat siswa"
        >
          <div className="container">
            <div
              className="hapusPanel"
              role="group"
              aria-labelledby="lepas-panel-judul"
            >
              <h2 className="hapusPanelTitle" id="lepas-panel-judul">
                <IconAlert size={18} />
                Lepas HP {calonLepas.nama}?
              </h2>

              <p className="hapusPanelText">
                {calonLepas.nama} akan bisa mengisi absensi dari HP lain.
                Catatan absensinya <strong>tidak dihapus</strong>; hanya kunci
                perangkatnya yang dilepas.
              </p>

              <p className="authHint">
                Pakai ini hanya bila siswa memang berganti HP. Selama tombol ini
                tidak ditekan, satu HP hanya bisa dipakai satu siswa.
              </p>

              <div className="absenActions hapusPanelActions">
                <form action={lepasPerangkat}>
                  <input type="hidden" name="siswaId" value={calonLepas.id} />
                  <input type="hidden" name="nama" value={calonLepas.nama} />
                  <input type="hidden" name="tahap" value="konfirmasi" />
                  <input type="hidden" name="kelas" value={kelas} />
                  <input type="hidden" name="tanggal" value={tanggal} />
                  <button className="btn btnPrimary" type="submit">
                    Ya, lepas HP-nya
                  </button>
                </form>

                <Link
                  className="btn btnSecondary"
                  href={kueriHalaman({ tanggal, kelas })}
                >
                  Batal
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="content-section" aria-label="Formulir absensi">
        <div className="container">
          <div className="dashSectionHead">
            <h2 className="dashSectionTitle">
              Kehadiran {formatTanggal(tanggal)}
            </h2>
          </div>

          {galatTabel ? (
            <p className="emptyState">
              Data belum dapat dimuat. Pastikan tabel <code>siswa</code> dan{" "}
              <code>absensi</code> sudah dibuat lewat{" "}
              <code>supabase/schema.sql</code>.
            </p>
          ) : daftarSiswa.length === 0 ? (
            <p className="emptyState">
              Belum ada siswa{kelas ? ` di ${labelKelas(kelas)}` : ""}.
              Tambahkan lewat formulir di atas.
            </p>
          ) : (
            <form action={simpanAbsensi}>
              <input type="hidden" name="tanggal" value={tanggal} />
              <input type="hidden" name="kelas" value={kelas} />

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
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarSiswa.map((item) => {
                      const sekarang = statusSiswa.get(item.id);

                      return (
                        <tr key={item.id}>
                          <th scope="row">
                            <span className="absenName">
                              <span className="absenNameText">{item.nama}</span>
                              <span className="absenNameNote">
                                {labelKelas(item.kelas)}
                                {sekarang
                                  ? ` · Tercatat: ${labelStatus(sekarang)}`
                                  : " · Belum dicatat"}
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
                                    aria-label={`${status.label} untuk ${item.nama}`}
                                  />
                                  <span>{status.label}</span>
                                </label>
                              ))}
                            </span>
                          </td>
                          <td>
                            {/* Tautan, bukan tombol hapus: membuka panel
                                konfirmasi lebih dulu, tidak langsung
                                menghapus. */}
                            <Link
                              className="btn btnGhost btnSm"
                              href={kueriHalaman({
                                tanggal,
                                kelas,
                                tambahan: { hapus: item.id },
                              })}
                              aria-label={`Hapus ${item.nama}`}
                            >
                              <IconX size={14} />
                              Hapus
                            </Link>

                            {/* Lepas kunci HP. Hanya muncul bila siswa sudah
                                terikat ke sebuah perangkat, karena tanpa
                                ikatan tidak ada yang perlu dilepas. */}
                            {terikatPerangkat.has(item.id) ? (
                              <Link
                                className="btn btnGhost btnSm"
                                href={kueriHalaman({
                                  tanggal,
                                  kelas,
                                  tambahan: { lepas: item.id },
                                })}
                                aria-label={`Lepas HP ${item.nama}`}
                              >
                                Lepas HP
                              </Link>
                            ) : null}
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
                <Link className="btn btnSecondary" href="/smk">
                  <IconArrowLeft size={16} />
                  Kembali ke materi
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
