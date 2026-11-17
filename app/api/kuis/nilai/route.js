import { bacaTokenKuis } from "@/lib/kuis/token";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/*
 * Route handler penilaian kuis (/api/kuis/nilai)
 *
 * Tanggung jawab: memeriksa jawaban siswa terhadap token soal, menghitung
 * skor, menyimpannya bersama nama, lalu mengembalikan papan skor materi.
 *
 * Kunci jawaban tidak pernah dikirim ke browser; browser hanya memegang token
 * terenkripsi. Skor dihitung di server, sehingga tidak bisa dimanipulasi.
 *
 * Nama berasal dari isian bebas siswa, sehingga divalidasi di server:
 * - harus string, dibersihkan dari karakter kontrol, spasi dirapikan;
 * - panjang 1-60 karakter setelah dirapikan;
 * - dirender oleh React sebagai teks biasa, jadi tidak dieksekusi sebagai HTML.
 *
 * Tidak ada akun pengguna: papan skor hanya memakai nama yang diketik siswa.
 * Database hanya diakses dari server memakai service role key.
 */

const BATAS_NAMA = 60;
const BATAS_PAPAN = 10; // jumlah baris yang dikirim ke browser
const BATAS_BARIS_PAPAN = 500; // baris terbaru yang dibaca untuk papan skor

function respons(data, status = 200) {
  return Response.json(data, { status });
}

/**
 * Membersihkan nama dari karakter kontrol, karakter tak terlihat, dan spasi
 * berlebih. Normalisasi NFKC mencegah nama "tampak sama" dari bentuk Unicode
 * lain. Mengembalikan null bila nama tidak sah.
 */
function bersihkanNama(nilai) {
  if (typeof nilai !== "string") return null;

  const bersih = nilai
    .normalize("NFKC")
    // \p{Cc} = karakter kontrol, \p{Cf} = karakter format tak terlihat
    // (zero-width, penanda arah teks, BOM).
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (bersih.length === 0 || bersih.length > BATAS_NAMA) return null;

  return bersih;
}

function bandingkanSkor(a, b) {
  // Persentase lebih dulu, karena total soal bisa berbeda antar materi.
  if (b.rasio !== a.rasio) return b.rasio - a.rasio;
  if (b.skor !== a.skor) return b.skor - a.skor;
  return a.dibuatPada < b.dibuatPada ? -1 : 1;
}

/**
 * Menyusun papan skor: satu baris per nama (skor terbaik), diurutkan dari
 * persentase tertinggi. Peringkat dihitung dari seluruh nama, bukan hanya
 * sepuluh teratas.
 */
async function ambilPapanSkor(supabase, kelas, materi, nama) {
  const { data, error } = await supabase
    .from("kuis_hasil")
    .select("nama, skor, total, dibuat_pada")
    .eq("kelas", kelas)
    .eq("materi", materi)
    .not("nama", "is", null)
    .order("dibuat_pada", { ascending: false })
    .limit(BATAS_BARIS_PAPAN);

  if (error) {
    console.error("Kuis: gagal membaca papan skor.", error.message);
    return { daftar: [], totalPeserta: 0, peringkat: null };
  }

  const terbaik = new Map();

  for (const baris of data ?? []) {
    if (!baris.total || baris.total <= 0) continue;

    const kunci = baris.nama.trim().toLowerCase();
    if (!kunci) continue;

    const rasio = baris.skor / baris.total;
    const calon = {
      nama: baris.nama.trim(),
      skor: baris.skor,
      total: baris.total,
      rasio,
      dibuatPada: baris.dibuat_pada,
    };
    const sebelumnya = terbaik.get(kunci);

    if (
      !sebelumnya ||
      calon.rasio > sebelumnya.rasio ||
      (calon.rasio === sebelumnya.rasio && calon.skor > sebelumnya.skor) ||
      (calon.rasio === sebelumnya.rasio &&
        calon.skor === sebelumnya.skor &&
        calon.dibuatPada < sebelumnya.dibuatPada)
    ) {
      terbaik.set(kunci, calon);
    }
  }

  const semua = [...terbaik.values()].sort(bandingkanSkor);
  const kunciNama = nama.toLowerCase();
  const indeks = semua.findIndex(
    (item) => item.nama.toLowerCase() === kunciNama
  );

  return {
    daftar: semua.slice(0, BATAS_PAPAN).map((item) => ({
      nama: item.nama,
      skor: item.skor,
      total: item.total,
      persen: Math.round(item.rasio * 100),
    })),
    totalPeserta: semua.length,
    peringkat: indeks >= 0 ? indeks + 1 : null,
  };
}

export async function POST(request) {
  let isiPermintaan;

  try {
    isiPermintaan = await request.json();
  } catch {
    return respons({ error: "Permintaan tidak valid." }, 400);
  }

  const { token, nama: namaMentah, jawaban } = isiPermintaan ?? {};
  const data = bacaTokenKuis(token);

  if (!data || !Array.isArray(data.soal) || data.soal.length === 0) {
    return respons(
      { error: "Sesi kuis tidak valid atau sudah kedaluwarsa. Buat soal baru." },
      400
    );
  }

  const nama = bersihkanNama(namaMentah);

  if (!nama) {
    return respons(
      { error: `Nama wajib diisi, 1-${BATAS_NAMA} karakter.` },
      400
    );
  }

  if (!Array.isArray(jawaban) || jawaban.length !== data.soal.length) {
    return respons({ error: "Jawaban tidak lengkap." }, 400);
  }

  const hasil = data.soal.map((item, index) => {
    const dipilih = jawaban[index];
    const sah = Number.isInteger(dipilih) && dipilih >= 0 && dipilih < 4;
    return {
      benar: sah && dipilih === item.jawaban,
      jawaban: item.jawaban,
      pembahasan: item.pembahasan,
    };
  });

  const total = data.soal.length;
  const skor = hasil.filter((item) => item.benar).length;

  let tersimpan = false;
  const supabase = createSupabaseServerClient();

  if (supabase) {
    const { error } = await supabase.from("kuis_hasil").insert({
      nama,
      kelas: data.kelas,
      materi: data.materi,
      skor,
      total,
    });

    if (error) {
      console.error("Kuis: gagal menyimpan hasil.", error.message);
    } else {
      tersimpan = true;
    }
  }

  const papanSkor = supabase
    ? await ambilPapanSkor(supabase, data.kelas, data.materi, nama)
    : { daftar: [], totalPeserta: 0, peringkat: null };

  return respons({ skor, total, hasil, tersimpan, papanSkor });
}
