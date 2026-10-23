import { bacaTokenKuis } from "@/lib/kuis/token";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/*
 * Route handler penilaian kuis (/api/kuis/nilai)
 *
 * Tanggung jawab: memeriksa jawaban siswa terhadap token soal, menghitung
 * skor, dan menyimpannya bila pengguna sedang masuk.
 *
 * Kunci jawaban tidak pernah dikirim ke browser; browser hanya memegang token
 * terenkripsi. Skor dihitung di server, sehingga tidak bisa dimanipulasi.
 */

function respons(data, status = 200) {
  return Response.json(data, { status });
}

export async function POST(request) {
  let isiPermintaan;

  try {
    isiPermintaan = await request.json();
  } catch {
    return respons({ error: "Permintaan tidak valid." }, 400);
  }

  const { token, jawaban } = isiPermintaan ?? {};
  const data = bacaTokenKuis(token);

  if (!data || !Array.isArray(data.soal) || data.soal.length === 0) {
    return respons(
      { error: "Sesi kuis tidak valid atau sudah kedaluwarsa. Buat soal baru." },
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("kuis_hasil").insert({
        user_id: user.id,
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
  }

  return respons({ skor, total, hasil, tersimpan });
}
