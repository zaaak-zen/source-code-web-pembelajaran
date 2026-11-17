/*
 * Route handler kuis (/api/kuis)
 *
 * Tanggung jawab: mengambil bank soal yang sudah dibuat guru dari database,
 * mengacak urutan soal dan pilihan untuk siswa ini, lalu mengirim soal tanpa
 * kunci jawaban.
 *
 * Alur:
 * 1. Guru menyusun soal sekali dari panel guru (/guru/kuis), memakai AI atau
 *    menulisnya manual, dan soal (beserta kunci) disimpan di `kuis_bank`.
 * 2. Setiap siswa meminta urutan acak dari bank yang sama. Karena bank tetap,
 *    semua siswa mengerjakan soal yang sama, tetapi nomor dan pilihan acaknya
 *    berbeda-beda.
 *
 * Keamanan:
 * - Kunci jawaban tidak pernah dikirim ke browser; ia disimpan di token
 *   terenkripsi (lib/kuis/token.js) dan dibuka lagi saat penilaian.
 * - Kelas harus sudah dibuka dengan token dan siswa harus sudah absen hari ini.
 */

import { ambilMateri } from "@/lib/materi/kelas";
import { punyaAksesKelas } from "@/lib/kelas/akses";
import { sudahAbsenHariIni } from "@/lib/kelas/absensi";
import { buatTokenKuis } from "@/lib/kuis/token";
import { ambilBank } from "@/lib/kuis/bank";
import { acakSoal } from "@/lib/kuis/soal";

function respons(data, status = 200) {
  return Response.json(data, { status });
}

// Hanya pertanyaan dan pilihan yang dikirim ke browser. Kunci jawaban dan
// pembahasan disimpan di token terenkripsi, lalu dibuka saat penilaian.
function soalPublik(soal) {
  return soal.map(({ pertanyaan, pilihan }) => ({ pertanyaan, pilihan }));
}

export async function POST(request) {
  let isiPermintaan;
  try {
    isiPermintaan = await request.json();
  } catch {
    return respons({ error: "Permintaan tidak valid." }, 400);
  }

  const { kelas, materi } = isiPermintaan ?? {};

  if (typeof kelas !== "string" || typeof materi !== "string") {
    return respons({ error: "Kelas dan materi wajib diisi." }, 400);
  }

  const dataMateri = await ambilMateri(kelas, materi);

  if (!dataMateri) {
    return respons({ error: "Materi tidak ditemukan." }, 404);
  }

  // Kelas hanya bisa diakses setelah token kelasnya dimasukkan di /smk.
  // Tanpa pemeriksaan ini, soal bisa diminta langsung lewat API.
  if (!(await punyaAksesKelas(kelas))) {
    return respons(
      { error: "Kelas ini belum terbuka. Masukkan token kelas di /smk." },
      403
    );
  }

  // Absensi harian juga menjadi syarat sebelum soal dikirim. Cookie absensi
  // memakai Path=/, sehingga ikut terkirim ke route API ini.
  if (!(await sudahAbsenHariIni(kelas))) {
    return respons(
      {
        error:
          "Isi kehadiran hari ini dulu di halaman kelas sebelum mengerjakan kuis.",
      },
      403
    );
  }

  const bank = await ambilBank(kelas, materi);

  if (!bank) {
    return respons(
      {
        error:
          "Soal materi ini belum disiapkan guru. Hubungi guru, lalu coba lagi.",
      },
      409
    );
  }

  // Urutan berbeda untuk setiap permintaan; isi soal tetap dari bank yang sama.
  const soal = acakSoal(bank);
  const token = buatTokenKuis({ kelas, materi, soal });

  if (!token) {
    return respons(
      { error: "Kuis belum dikonfigurasi. Hubungi pengelola situs." },
      503
    );
  }

  return respons({ token, soal: soalPublik(soal) });
}
