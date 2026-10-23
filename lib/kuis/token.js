import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/*
 * Token kuis
 *
 * Tanggung jawab: menyembunyikan kunci jawaban dari browser dan memastikan
 * hasil penilaian tidak bisa dipalsukan.
 *
 * Soal lengkap (termasuk kunci) dienkripsi AES-256-GCM lalu dikirim sebagai
 * token. Server tidak perlu menyimpan sesi kuis di memori, sehingga penilaian
 * tetap bekerja meski permintaan ditangani instance server yang berbeda.
 *
 * Kunci diambil dari KUIS_SECRET (hanya server). Tanpa variabel ini kuis
 * tidak dapat dibuat maupun dinilai.
 */

const MASA_BERLAKU = 2 * 60 * 60 * 1000; // 2 jam
const PANJANG_IV = 12;
const PANJANG_TAG = 16;

function kunciEnkripsi() {
  const rahasia = process.env.KUIS_SECRET;
  if (!rahasia) return null;
  // SHA-256 selalu menghasilkan 32 byte, sesuai panjang kunci AES-256.
  return createHash("sha256").update(rahasia).digest();
}

export function buatTokenKuis(data) {
  const kunci = kunciEnkripsi();
  if (!kunci) return null;

  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv("aes-256-gcm", kunci, iv);
  const isi = Buffer.from(
    JSON.stringify({ ...data, kedaluwarsa: Date.now() + MASA_BERLAKU }),
    "utf8"
  );
  const terenkripsi = Buffer.concat([cipher.update(isi), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, terenkripsi]).toString("base64url");
}

export function bacaTokenKuis(token) {
  const kunci = kunciEnkripsi();
  if (!kunci || typeof token !== "string" || !token) return null;

  try {
    const mentah = Buffer.from(token, "base64url");
    if (mentah.length <= PANJANG_IV + PANJANG_TAG) return null;

    const iv = mentah.subarray(0, PANJANG_IV);
    const tag = mentah.subarray(PANJANG_IV, PANJANG_IV + PANJANG_TAG);
    const terenkripsi = mentah.subarray(PANJANG_IV + PANJANG_TAG);

    const decipher = createDecipheriv("aes-256-gcm", kunci, iv);
    decipher.setAuthTag(tag);

    const isi = Buffer.concat([
      decipher.update(terenkripsi),
      decipher.final(),
    ]).toString("utf8");

    const data = JSON.parse(isi);

    if (
      !data ||
      typeof data.kedaluwarsa !== "number" ||
      data.kedaluwarsa < Date.now()
    ) {
      return null;
    }

    return data;
  } catch {
    // Token rusak, dipalsukan, atau kedaluwarsa.
    return null;
  }
}
