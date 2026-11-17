# Periksa PDF per bab yang sudah disiapkan di folder materi/.
#
# Memeriksa:
# - jumlah halaman tiap berkas (dibandingkan dengan Daftar Isi buku asli)
# - baris awal & akhir halaman pertama/terakhir (memastikan potongannya pas)
# - apakah gambar masih ada (banyak PDF hasil "print to PDF" membuang gambar)
#
#   python -I scripts/cek-bab-pdf.py
#
# Tidak mengubah apa pun.
import logging
import re
from pathlib import Path

from pypdf import PdfReader

logging.disable(logging.WARNING)

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / "materi"

# Harapan dari Daftar Isi buku asli (272 halaman, offset +12).
HARAPAN = {
    "Bab_1": (26, "Data, Informasi, dan Validasinya"),
    "Bab_2": (84, "Algoritma dan Struktur Data"),
    "Bab_3": (76, "Teknologi dan Budaya Digital"),
    "Bab_4": (53, "Keamanan dan Manajemen Informasi"),
}

berkas = sorted(FOLDER.glob("*.pdf"))
print(f"berkas ditemukan: {len(berkas)}\n")

for jalur in berkas:
    kunci = next((k for k in HARAPAN if jalur.name.startswith(k)), None)
    harap_halaman, harap_judul = HARAPAN.get(kunci, (None, "?"))

    try:
        reader = PdfReader(jalur)
    except Exception as galat:
        print(f"{jalur.name}: GAGAL DIBACA — {galat}\n")
        continue

    jumlah = len(reader.pages)
    ukuran_mb = jalur.stat().st_size / 1048576

    print(f"=== {jalur.name} ===")
    print(f"  ukuran        {ukuran_mb:.2f} MB")

    tanda = "OK  " if jumlah == harap_halaman else "BEDA"
    print(f"  halaman       {jumlah}  [{tanda}] harapan {harap_halaman}")
    if jumlah != harap_halaman:
        print(f"                selisih {jumlah - (harap_halaman or 0):+d}")

    # Baris awal halaman pertama dan baris akhir halaman terakhir.
    for label, indeks in [("halaman awal", 0), ("halaman akhir", jumlah - 1)]:
        try:
            teks = reader.pages[indeks].extract_text() or ""
        except Exception as galat:
            teks = ""
            print(f"  {label}: gagal diekstrak ({galat})")
            continue

        baris = [b for b in teks.strip().split("\n") if b.strip()]
        if label == "halaman awal":
            tampil = " | ".join(baris[:3])[:110]
            # Nomor halaman tercetak biasanya ada di baris pertama/terakhir.
            print(f"  {label}   {tampil}")
        else:
            tampil = " | ".join(baris[-3:])[:110]
            print(f"  {label}   {tampil}")

        nomor_tercetak = re.findall(r"^\s*(\d{1,3})\s*$", teks, re.M)
        print(f"                nomor tercetak terlihat: {nomor_tercetak[:6]}")

    # Gambar: hitung XObject bertipe Image di beberapa halaman awal.
    total_gambar = 0
    for halaman in reader.pages[: min(jumlah, 40)]:
        try:
            sumber = halaman.get("/Resources")
            if sumber is None:
                continue
            xobj = sumber.get("/XObject")
            if xobj is None:
                continue
            xobj = xobj.get_object()
            for nama in xobj:
                objek = xobj[nama].get_object()
                if objek.get("/Subtype") == "/Image":
                    total_gambar += 1
        except Exception:
            continue

    print(f"  gambar        {total_gambar} pada 40 halaman pertama")
    print()

# Total ukuran keempat bab. Perbandingan dengan buku asli dihapus: berkas
# sumbernya sudah tidak ada di repo, semua lampiran sekarang berasal dari
# folder materi/.
total_bab = sum(j.stat().st_size for j in berkas)
print(f"total {len(berkas)} bab: {total_bab / 1048576:.2f} MB")
