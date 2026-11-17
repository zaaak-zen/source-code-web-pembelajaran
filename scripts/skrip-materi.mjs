// Skrip sementara: memeriksa isi tabel `materi` dan bucket `materi`.
// Jalankan (dari root proyek): node scripts/skrip-materi.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Skrip ini berada di scripts/, sedangkan .env.local ada di root proyek.
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .map((baris) => baris.trim())
    .filter((baris) => baris && !baris.startsWith("#"))
    .map((baris) => {
      const pisah = baris.indexOf("=");
      return [baris.slice(0, pisah), baris.slice(pisah + 1)];
    })
);

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: materi, error } = await supabase
  .from("materi")
  .select("kelas, slug, judul, urutan, kuis_jumlah, berkas, konten")
  .order("kelas")
  .order("urutan");

if (error) {
  console.error("GALAT:", error.code, error.message);
  process.exit(1);
}

for (const baris of materi ?? []) {
  console.log(
    `${baris.kelas}/${baris.slug} | urutan=${baris.urutan} | kuis=${baris.kuis_jumlah} | blok=${(baris.konten ?? []).length} | berkas=${(baris.berkas ?? []).length} | ${baris.judul}`
  );
}
console.log("Total baris:", (materi ?? []).length);

const { data: isiBucket, error: galatBucket } = await supabase.storage
  .from("materi")
  .list("materi", { limit: 100 });

console.log(
  "Bucket `materi`:",
  galatBucket ? `GALAT ${galatBucket.message}` : `${(isiBucket ?? []).length} berkas`
);

const { data: siswa } = await supabase.from("siswa").select("kelas");
const perKelas = {};
for (const s of siswa ?? []) perKelas[s.kelas] = (perKelas[s.kelas] ?? 0) + 1;
console.log("Siswa per kelas:", perKelas);
