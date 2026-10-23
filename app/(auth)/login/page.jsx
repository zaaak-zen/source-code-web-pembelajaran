"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/*
 * Halaman masuk.
 *
 * Tanggung jawab: meminta email + kata sandi ke Supabase, menampilkan
 * kesalahan, lalu mengarahkan ke /dashboard.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [pesan, setPesan] = useState("");
  const [memuat, setMemuat] = useState(false);

  useEffect(() => {
    const galat = new URLSearchParams(window.location.search).get("galat");
    if (galat === "tautan-tidak-valid") {
      setPesan("Tautan dari email tidak valid atau sudah kedaluwarsa.");
    } else if (galat === "konfigurasi") {
      setPesan("Layanan akun belum dikonfigurasi. Hubungi pengelola situs.");
    }
  }, []);

  async function kirim(event) {
    event.preventDefault();
    setPesan("");
    setMemuat(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: sandi,
      });

      if (error) {
        setPesan("Email atau kata sandi salah, atau akun belum diverifikasi.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setPesan(error.message || "Gagal masuk. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="authCard">
      <p className="section-eyebrow">Akun</p>
      <h1 className="authTitle">Selamat datang kembali</h1>
      <p className="authLead">
        Masuk untuk menyimpan nilai kuis dan melihat progres belajar Anda.
      </p>

      <form className="authForm" onSubmit={kirim}>
        <div className="authField">
          <label className="authLabel" htmlFor="email">
            Email
          </label>
          <input
            className="authInput"
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="nama@sekolah.sch.id"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="authField">
          <label className="authLabel" htmlFor="sandi">
            Kata sandi
          </label>
          <input
            className="authInput"
            id="sandi"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            required
            value={sandi}
            onChange={(event) => setSandi(event.target.value)}
          />
        </div>

        {pesan ? (
          <p className="authMessage authMessageError" role="alert">
            {pesan}
          </p>
        ) : null}

        <button className="authButton" type="submit" disabled={memuat}>
          {memuat ? "Memeriksa..." : "Masuk"}
        </button>
      </form>

      <div className="authDivider">atau</div>

      <p className="authLinks">
        <Link href="/lupa-sandi">Lupa kata sandi?</Link>
        <Link href="/register">Belum punya akun? Daftar</Link>
      </p>
    </div>
  );
}
