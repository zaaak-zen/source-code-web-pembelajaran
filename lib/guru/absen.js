import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { punyaAkses } from "@/lib/guru/akses";

/*
 * Penghapusan data siswa dari panel guru
 *
 * Tanggung jawab: menghapus satu baris tabel `siswa` setelah guru
 * mengonfirmasi, lalu menyegarkan halaman /guru/absen.
 *
 * Kenapa dihapus permanen dan bukan dinonaktifkan:
 * `absensi` dan `kode_riwayat` memakai `on delete cascade` ke `siswa`, jadi
 * menghapus siswa otomatis membersihkan absensinya dan kode riwayatnya. Itu
 * yang diinginkan untuk siswa yang salah ketik atau pindah kelas. Nilai kuis
 * (`kuis_hasil`) tidak terhubung lewat ID, hanya lewat nama, sehingga baris
 * nilai lama sengaja dibiarkan dan tetap muncul di rekap.
 *
 * Peringatan: absensi yang ikut terhapus tidak dapat dikembalikan. Karena itu
 * halaman /guru/absen memakai dua langkah (panel dampak lebih dulu) dan action
 * ini hanya dijalankan setelah guru menekan tombol konfirmasi.
 *
 * Server action ini disimpan di luar file halaman agar halaman tidak perlu
 * mengimpor `revalidatePath`, dan agar pemeriksaan akses guru selalu ikut
 * terbawa bersama action-nya.
 */

const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hanya menerima nilai filter yang bentuknya wajar, agar tidak ada teks bebas
// yang ikut masuk ke URL redirect.
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const POLA_KELAS = /^[a-z0-9-]{1,20}$/;

/** Kembali ke halaman absensi dengan filter yang sama seperti sebelumnya. */
function kembali({ tanggal, kelas, galat, tersimpan }) {
  const bagian = new URLSearchParams();

  if (typeof tanggal === "string" && POLA_TANGGAL.test(tanggal)) {
    bagian.set("tanggal", tanggal);
  }
  if (typeof kelas === "string" && POLA_KELAS.test(kelas)) {
    bagian.set("kelas", kelas);
  }
  if (galat) bagian.set("galat", galat);
  if (tersimpan) bagian.set("tersimpan", tersimpan);

  return `/guru/absen?${bagian.toString()}`;
}

/**
 * Server action: hapus satu siswa beserta absensi dan kode riwayatnya.
 *
 * `kelas` hanya dipakai untuk kembali ke filter yang sama, bukan untuk
 * membatasi penghapusan: id siswa sudah unik, dan pemeriksaan kelas tambahan
 * akan menyulitkan guru yang sedang melihat "Semua kelas".
 */
export async function hapusSiswa(formData) {
  "use server";

  if (!(await punyaAkses())) redirect("/guru/login");

  const siswaId = String(formData.get("siswaId") ?? "").trim();
  const kelas = String(formData.get("kelas") ?? "");
  const tanggal = String(formData.get("tanggal") ?? "");

  if (!POLA_UUID.test(siswaId)) {
    redirect(kembali({ tanggal, kelas, galat: "siswa" }));
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) redirect(kembali({ tanggal, kelas, galat: "konfigurasi" }));

  // `select("id")` membuat server tahu apakah ada baris yang benar-benar
  // terhapus; tanpa itu, siswa yang sudah tidak ada akan tetap dilaporkan
  // berhasil.
  const { data, error } = await supabase
    .from("siswa")
    .delete()
    .eq("id", siswaId)
    .select("id");

  if (error) {
    console.error("Absensi: gagal menghapus siswa.", error.message);
    redirect(kembali({ tanggal, kelas, galat: "hapus" }));
  }

  if ((data ?? []).length === 0) {
    redirect(kembali({ tanggal, kelas, galat: "siswa" }));
  }

  revalidatePath("/guru/absen");

  // Halaman absensi siswa dan halaman kuis juga membaca tabel `siswa`, tetapi
  // keduanya `force-dynamic` sehingga selalu membaca data terbaru pada setiap
  // permintaan. Tidak perlu revalidatePath tambahan untuk keduanya.

  redirect(kembali({ tanggal, kelas, tersimpan: "hapus" }));
}
