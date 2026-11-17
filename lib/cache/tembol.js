/*
 * Tembol (cache lintas-permintaan)
 *
 * Tanggung jawab: menyimpan hasil query yang jarang berubah (daftar materi,
 * bank soal, token kelas) agar tidak diambil ulang dari database pada setiap
 * permintaan. Tanpa ini, halaman dengan `revalidate` tetap membaca Supabase
 * setiap kali cache halaman kedaluwarsa, dan halaman `force-dynamic` membaca
 * Supabase setiap kali dibuka.
 *
 * Kenapa bukan `unstable_cache`:
 * `unstable_cache` menyimpan hasil di Data Cache Next.js per deployment dan
 * membersihkannya lewat `revalidateTag`, yang harus dipanggil di setiap tempat
 * data berubah (guru menyimpan materi, menghapus bank soal, mencabut token).
 * Bila satu tempat terlewat, guru melihat data basi tanpa cara memperbaikinya.
 * Di sini kedaluwarsa berbasis waktu: data paling lama tertinggal TTL detik,
 * lalu diambil sendiri. Tidak ada panggilan pembersihan yang bisa terlupa.
 *
 * Batas yang disadari:
 * - Cache hidup di memori proses. Beberapa instance server punya cache
 *   masing-masing, jadi data bisa tertinggal sampai TTL di instance lain.
 * - Cache hilang saat server dimulai ulang (deploy, restart). Itu aman:
 *   permintaan berikutnya mengisi ulang dari database.
 * - Bukan tempat untuk data per pengguna (cookie, absensi, nilai kuis).
 *   Data seperti itu harus tetap dibaca langsung agar tidak bocor antar siswa.
 *
 * Dipakai oleh:
 * - lib/materi/kelas.js
 * - lib/kuis/bank.js
 * - lib/kelas/akses.js
 */

const simpanan = new Map();

/**
 * Ambil dari cache, atau jalankan `muat()` lalu simpan hasilnya.
 *
 * @param {string} kunci   kunci unik, sertakan parameter yang membedakan hasil
 * @param {number} ttlDetik berapa lama hasil boleh dipakai (detik)
 * @param {() => Promise<any>} muat fungsi pengambil data sebenarnya
 */
export async function dariCache(kunci, ttlDetik, muat) {
  const sekarang = Date.now();
  const tersimpan = simpanan.get(kunci);

  if (tersimpan && sekarang < tersimpan.kedaluwarsa) return tersimpan.nilai;

  // Satu promise dibagi ke semua pemanggil yang menunggu, sehingga lima
  // permintaan bersamaan hanya menghasilkan satu query ke database.
  if (tersimpan?.sedangDimuat) return tersimpan.sedangDimuat;

  const janji = Promise.resolve()
    .then(muat)
    .then((nilai) => {
      simpanan.set(kunci, {
        nilai,
        kedaluwarsa: Date.now() + ttlDetik * 1000,
      });
      bersihkanSesekali();
      return nilai;
    })
    .catch((galat) => {
      // Gagal memuat: jangan simpan kegagalan, biarkan permintaan berikutnya
      // mencoba lagi. Galat tetap dilempar ke pemanggil.
      simpanan.delete(kunci);
      throw galat;
    });

  simpanan.set(kunci, { sedangDimuat: janji, kedaluwarsa: 0 });

  return janji;
}

/**
 * Buang entri yang sudah lewat masa berlakunya. Dipanggil sesekali (bukan
 * setiap kali) agar Map tidak tumbuh tanpa batas bila kunci terus bertambah
 * (misalnya satu kunci per materi).
 */
let penghitung = 0;

function bersihkanSesekali() {
  penghitung += 1;
  if (penghitung % 50 !== 0) return;

  const sekarang = Date.now();

  for (const [kunci, entri] of simpanan) {
    if (!entri.sedangDimuat && sekarang >= entri.kedaluwarsa) {
      simpanan.delete(kunci);
    }
  }
}

/** Hapus satu kunci. Dipakai guru setelah data terkait berubah. */
export function lupakan(kunci) {
  simpanan.delete(kunci);
}

/** Hapus semua entri yang kuncinya diawali `awalan`. */
export function lupakanAwalan(awalan) {
  for (const kunci of simpanan.keys()) {
    if (kunci.startsWith(awalan)) simpanan.delete(kunci);
  }
}
