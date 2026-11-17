# Bandingkan mesin ekstraksi teks PDF dengan tes objektif.
#
# Masalah: pypdf (mode bawaan) menyisipkan spasi di tengah kata pada teks
# yang dijustify — "dasar-das ar", "pent ing", "teknolo gi". Pemisahnya spasi
# biasa di dalam baris, bukan baris baru, jadi aturan penyambungan baris tidak
# menolong.
#
# Tes: 10 kata yang sudah diketahui terpecah di pypdf. Mesin yang baik
# menghasilkan semuanya utuh.
#
#   python -I scripts/banding-ekstraksi.py
#   python -I scripts/banding-ekstraksi.py --bab 1
#
# Tidak mengubah apa pun.
import importlib.util
import logging
import re
import sys
from pathlib import Path

from pypdf import PdfReader

logging.disable(logging.WARNING)

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / "materi"

arg = sys.argv[1:]
BAB_FILTER = int(arg[arg.index("--bab") + 1]) if "--bab" in arg else None

BAB = [
    (1, "Bab_1_Data_Informasi_dan_Validasinya.pdf"),
    (2, "Bab_2_Algoritma_dan_Struktur_Data.pdf"),
    (3, "Bab_3_Teknologi_dan_Budaya_Digital.pdf"),
    (4, "Bab_4_Keamanan_dan_Manajemen_Informasi.pdf"),
]

# Kata utuh yang harus muncul, beserta bentuk rusaknya di pypdf (mode bawaan).
UJI = [
    ("dasar-dasar", "dasar-das ar"),
    ("buku", "b uku"),
    ("iklim", "ik lim"),
    ("tidak", "tid ak"),
    ("menganalisisnya", "menganali sisnya"),
    ("berinteraksi", "berin teraksi"),
    ("perkembangan", "perkembang an"),
    ("penting", "pent ing"),
    ("lunaknya", "lu naknya"),
    ("teknologi", "teknolo gi"),
]

PUNYA = {nama: importlib.util.find_spec(nama) is not None
         for nama in ["pdfplumber", "pdfminer", "fitz"]}

print("mesin yang tersedia:")
for nama, ada in PUNYA.items():
    print(f"  {nama:12} {'ADA' if ada else 'tidak terpasang'}")
print()


def dari_pypdf(jalur, mode=None):
    reader = PdfReader(jalur)
    bagian = []

    for h in reader.pages:
        try:
            bagian.append(
                h.extract_text(extraction_mode="layout") if mode == "layout"
                else h.extract_text() or ""
            )
        except Exception:
            continue

    return re.sub(r"\s+", " ", " ".join(bagian))


def dari_pdfplumber(jalur):
    import pdfplumber

    bagian = []

    with pdfplumber.open(jalur) as pdf:
        for halaman in pdf.pages:
            # x_tolerance bawaan 3; dinaikkan supaya jarak antar huruf yang
            # melebar karena justify tidak dianggap spasi.
            bagian.append(halaman.extract_text(x_tolerance=1.5) or "")

    return re.sub(r"\s+", " ", " ".join(bagian))


def dari_fitz(jalur):
    import fitz

    dokumen = fitz.open(jalur)

    return re.sub(r"\s+", " ", " ".join(p.get_text() for p in dokumen))


MESIN = [("pypdf bawaan", lambda j: dari_pypdf(j))]
MESIN.append(("pypdf layout", lambda j: dari_pypdf(j, "layout")))
if PUNYA["pdfplumber"]:
    MESIN.append(("pdfplumber", dari_pdfplumber))
if PUNYA["fitz"]:
    MESIN.append(("pymupdf(fitz)", dari_fitz))

for nomor, nama in BAB:
    if BAB_FILTER is not None and nomor != BAB_FILTER:
        continue

    jalur = FOLDER / nama
    if not jalur.exists():
        continue

    print(f"=== Bab {nomor}: {nama} ===")

    for label, mesin in MESIN:
        try:
            teks = mesin(jalur)
        except Exception as galat:
            print(f"  {label:16} GAGAL: {galat}")
            continue

        benar = 0
        masih_rusak = []

        for utuh, rusak in UJI:
            # Kata utuh dianggap ada bila muncul sebagai kata berdiri.
            ada_utuh = re.search(rf"\b{re.escape(utuh)}\b", teks, re.I)
            ada_rusak = re.search(re.escape(rusak), teks, re.I)

            if ada_utuh and not ada_rusak:
                benar += 1
            elif ada_rusak:
                masih_rusak.append(rusak)

        print(
            f"  {label:16} {benar}/{len(UJI)} kata utuh"
            + (f"  sisa rusak: {masih_rusak}" if masih_rusak else "  BERSIH")
        )

        # Panjang teks sebagai pembanding: mesin yang membuang banyak karakter
        # berarti ada isi yang hilang.
        print(f"  {'':16} {len(teks)} karakter")

    print()
