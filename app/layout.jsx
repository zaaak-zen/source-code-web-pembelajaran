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
 * Tipografi dimuat dari Google Fonts (Plus Jakarta Sans) dengan fallback
 * sistem, sehingga tampilan tetap wajar bila font gagal dimuat.
 */

export const metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // Ikon tab browser memakai logo sekolah yang sama.
  icons: educationConfig.school.logo
    ? { icon: educationConfig.school.logo }
    : undefined,
};

export const viewport = {
  themeColor: "#4f46e5",
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
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
