import siteConfig from "@/config/site";
import educationConfig from "@/config/education";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import "./globals.css";

/*
 * Root layout
 *
 * Tanggung jawab: kerangka HTML untuk seluruh halaman.
 * Navbar dan Footer dipasang di sini agar tampil di semua halaman.
 * Jangan menaruh konten halaman di file ini.
 *
 * Tipografi dimuat dari Google Fonts: Inter (satu keluarga untuk judul, teks,
 * dan label), mengikuti gaya antarmuka Meta — Instagram, Facebook, WhatsApp.
 * Fallback sistem dipakai bila font gagal dimuat.
 */

export const metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // Ikon tab browser memakai logo sekolah yang sama. Nama berkas boleh
  // mengandung spasi, jadi path di-encode dulu (browser pun menerima spasi
  // mentah, tetapi URL yang di-encode lebih aman untuk crawler & favicon).
  icons: educationConfig.school.logo
    ? { icon: encodeURI(educationConfig.school.logo) }
    : undefined,
};

export const viewport = {
  themeColor: "#f4f0e6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang={siteConfig.language}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Root layout berlaku untuk semua halaman, sehingga aturan
            no-page-custom-font (khusus Pages Router) tidak relevan. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..800;1,14..32,300..800&display=swap"
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Langsung ke konten utama
        </a>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
