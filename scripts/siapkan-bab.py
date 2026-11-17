# Siapkan teks tiap bab untuk kolom `konten` materi.
#
# Sumber: 4 PDF bab di folder materi/ (buku asli 272 halaman sudah tidak ada).
# Tiap PDF bab menjadi satu baris `materi`, dengan teksnya sendiri sebagai
# `konten` dan berkas PDF-nya sebagai lampiran.
#
#   python -I scripts/siapkan-bab.py            -> laporan mutu teks
#   python -I scripts/siapkan-bab.py --contoh 3 -> perlihatkan 3 paragraf awal
#   python -I scripts/siapkan-bab.py --simpan   -> tulis data/bab-teks.json
#
# Tidak menyentuh database maupun Storage.
import json
import logging
import re
import sys
from pathlib import Path

from pypdf import PdfReader

logging.disable(logging.WARNING)

ROOT = Path(__file__).resolve().parent.parent
FOLDER_BAB = ROOT / "materi"
KELUARAN = ROOT / "data" / "bab-teks.json"

arg = sys.argv[1:]
SIMPAN = "--simpan" in arg
JUMLAH_CONTOH = 2
if "--contoh" in arg:
    JUMLAH_CONTOH = int(arg[arg.index("--contoh") + 1])

BAB = [
    {
        "nomor": 1,
        "slug": "informatika-bab-1",
        "judul": "Bab 1 — Data, Informasi, dan Validasinya",
        "berkas": "Bab_1_Data_Informasi_dan_Validasinya.pdf",
        "deskripsi": "Data, informasi, dan cara memvalidasinya: pencarian dengan banyak variabel, koleksi data, ekosistem periksa fakta, serta evaluasi data dan sumbernya.",
    },
    {
        "nomor": 2,
        "slug": "informatika-bab-2",
        "judul": "Bab 2 — Algoritma dan Struktur Data",
        "berkas": "Bab_2_Algoritma_dan_Struktur_Data.pdf",
        "deskripsi": "Algoritma dan pemrograman, struktur kendali, pemilihan algoritma, dan pemilihan struktur data untuk masalah nyata.",
    },
    {
        "nomor": 3,
        "slug": "informatika-bab-3",
        "judul": "Bab 3 — Teknologi dan Budaya Digital",
        "berkas": "Bab_3_Teknologi_dan_Budaya_Digital.pdf",
        "deskripsi": "Sistem komputer, otomatisasi dan pemrosesan dokumen dengan perangkat lunak perkantoran, budaya baru era Informatika, serta budaya karier dan sertifikasi.",
    },
    {
        "nomor": 4,
        "slug": "informatika-bab-4",
        "judul": "Bab 4 — Keamanan dan Manajemen Informasi",
        "berkas": "Bab_4_Keamanan_dan_Manajemen_Informasi.pdf",
        "deskripsi": "Jaringan komputer dan internet, proteksi data di internet, serta peningkatan keamanan informasi.",
    },
]

# Satu blok konten dibatasi 20.000 karakter di lib/materi/konten.js; 18.000
# menyisakan ruang untuk judul blok.
MAKS_BLOK = 18000

# --- Pembersihan -----------------------------------------------------------
# Header berjalan tiap halaman ("Bab 1 Data, ..." + nomor halaman) dibuang agar
# teks yang dikirim ke AI tidak didominasi pengulangan.
POLA_HEADER = re.compile(r"^\s*Bab\s+\d{1,2}\s+[^\n]*\d{1,3}\s*$", re.M)
POLA_NOMOR = re.compile(r"^\s*\d{1,3}\s*$", re.M)
POLA_ROMAWI = re.compile(r"^\s*[ivxlcdm]{1,5}\s*$", re.M)
POLA_TITIK = re.compile(r"\.{4,}")
# Judul bab yang terduplikasi tanpa spasi, mis. "BabBab" -> "Bab".
POLA_JUDUL_GANDA = re.compile(r"\b([A-Z][A-Za-z]{2,})\1\b")


def bersihkan(teks):
    teks = POLA_JUDUL_GANDA.sub(r"\1", teks)
    teks = POLA_HEADER.sub("", teks)
    teks = POLA_TITIK.sub(" ", teks)
    teks = POLA_NOMOR.sub("", teks)
    teks = POLA_ROMAWI.sub("", teks)
    teks = teks.replace("­", "")  # soft hyphen
    teks = re.sub(r"[ \t]+", " ", teks)
    teks = re.sub(r"\n{3,}", "\n\n", teks)

    return teks.strip()


def ekstrak(reader):
    potongan = []

    for halaman in reader.pages:
        try:
            potongan.append(halaman.extract_text() or "")
        except Exception:
            continue

    return bersihkan("\n\n".join(potongan))


def ukur_mutu(teks):
    """Perkiraan kasar kerusakan hasil ekstraksi PDF."""
    # Pola tanpa lookbehind: Python hanya menerima lookbehind berpanjang tetap.
    # "dioto masi" / "menge nai" terhitung sebagai satu kata panjang diikuti
    # kata sangat pendek. Ini metrik kasar, bukan hitungan tepat.
    return {
        "kataTerpecah": len(re.findall(r"\b[a-z]{4,}\s[a-z]{2,3}\b", teks)),
        "kataGanda": len(re.findall(r"\b(\w+)\s+\1\b", teks, re.I)),
        "judulGanda": len(POLA_JUDUL_GANDA.findall(teks)),
    }


def pecah_blok(teks, judul_bab):
    """
    Bagi teks menjadi blok <= MAKS_BLOK karakter.

    Paragraf digabung selama masih muat; paragraf yang sendirinya lebih panjang
    dipotong di akhir kalimat terdekat agar tidak terputus di tengah kata.
    """
    paragraf = [p.strip() for p in re.split(r"\n{2,}", teks) if p.strip()]
    potongan = []
    buf = []
    panjang = 0

    def sisip(bagian):
        nonlocal buf, panjang

        if buf and panjang + len(bagian) > MAKS_BLOK:
            potongan.append("\n\n".join(buf))
            buf, panjang = [], 0

        buf.append(bagian)
        panjang += len(bagian)

    for p in paragraf:
        while len(p) > MAKS_BLOK:
            potong = p.rfind(". ", 0, MAKS_BLOK)
            potong = MAKS_BLOK if potong < MAKS_BLOK // 2 else potong + 1

            sisip(p[:potong])
            p = p[potong:].lstrip()

        sisip(p)

    if buf:
        potongan.append("\n\n".join(buf))

    return [
        {
            "tipe": "teks",
            "judul": judul_bab if i == 0 else f"{judul_bab} (lanjutan {i + 1})",
            "isi": bagian,
        }
        for i, bagian in enumerate(potongan)
    ]


# --- Proses ----------------------------------------------------------------
print(f"sumber: {FOLDER_BAB.relative_to(ROOT)}/\n")

hasil = []
total_kar = 0
total_blok = 0

for bab in BAB:
    jalur = FOLDER_BAB / bab["berkas"]
    if not jalur.exists():
        print(f"Bab {bab['nomor']}: BERKAS TIDAK ADA — {jalur.name}\n")
        continue

    reader = PdfReader(jalur)
    teks = ekstrak(reader)
    mutu = ukur_mutu(teks)
    blok = pecah_blok(teks, bab["judul"])

    total_kar += len(teks)
    total_blok += len(blok)

    print(f"--- Bab {bab['nomor']}: {bab['judul']} ---")
    print(f"  berkas      {jalur.name}")
    print(f"  halaman     {len(reader.pages)}")
    print(f"  teks        {len(teks)} karakter -> {len(blok)} blok")
    print(
        f"  mutu        kataTerpecah={mutu['kataTerpecah']} "
        f"kataGanda={mutu['kataGanda']} judulGanda={mutu['judulGanda']}"
    )

    contoh = [
        re.sub(r"\s+", " ", p).strip()[:260]
        for p in re.split(r"\n{2,}", teks)
        if len(p.strip()) > 120
    ][:JUMLAH_CONTOH]

    for i, c in enumerate(contoh, start=1):
        print(f"  contoh {i}    {c}")
    print()

    # Sisipkan juga halaman pertama tiap blok agar guru bisa menilai asal teks.
    hasil.append(
        {
            "nomor": bab["nomor"],
            "slug": bab["slug"],
            "judul": bab["judul"],
            "deskripsi": bab["deskripsi"],
            "berkas": bab["berkas"],
            "jumlahKarakter": len(teks),
            "konten": blok,
        }
    )

print("=== RINGKASAN ===")
print(f"  total teks   {total_kar} karakter")
print(f"  total blok   {total_blok}")
print(f"  total bab    {len(hasil)}")

if SIMPAN:
    KELUARAN.parent.mkdir(parents=True, exist_ok=True)
    KELUARAN.write_text(
        json.dumps(hasil, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"\nTersimpan: {KELUARAN.relative_to(ROOT)}")
else:
    print("\n( Laporan saja. Tambahkan --simpan untuk menulis JSON. )")
