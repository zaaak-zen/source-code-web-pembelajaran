"use client";

/*
 * Tombol formulir dengan status proses (Client Component)
 *
 * Tanggung jawab: menonaktifkan tombol dan mengganti labelnya selama server
 * action formulir induk berjalan. Dipakai di /guru/kuis karena penyusunan soal
 * AI dapat memakan waktu puluhan detik, sehingga guru perlu tahu prosesnya
 * masih berjalan.
 */

import { useFormStatus } from "react-dom";

export default function TombolProses({
  children,
  className = "btn btnPrimary btnSm",
  labelProses = "Memproses...",
  nonaktif = false,
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      type="submit"
      disabled={pending || nonaktif}
    >
      {pending ? labelProses : children}
    </button>
  );
}
