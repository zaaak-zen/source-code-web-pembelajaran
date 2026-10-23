import Link from "next/link";
import { IconArrowLeft, IconCompass } from "@/components/Icons/Icons";

/*
 * Halaman 404.
 *
 * Tanggung jawab: memberi jalan keluar ketika pengguna membuka alamat yang
 * tidak ada, tanpa membuat mereka buntu.
 */

export const metadata = {
  title: "Halaman tidak ditemukan",
};

export default function NotFound() {
  return (
    <main id="main-content" className="notFound">
      <div className="container notFoundInner">
        <p className="notFoundCode" aria-hidden="true">
          404
        </p>
        <h1 className="notFoundTitle">Halaman tidak ditemukan</h1>
        <p className="notFoundText">
          Alamat yang Anda buka mungkin salah ketik, sudah dipindahkan, atau
          materinya belum tersedia.
        </p>
        <div className="notFoundActions">
          <Link className="btn btnPrimary" href="/">
            <IconArrowLeft size={17} />
            Kembali ke beranda
          </Link>
          <Link className="btn btnSecondary" href="/smk">
            <IconCompass size={17} />
            Jelajahi materi
          </Link>
        </div>
      </div>
    </main>
  );
}
