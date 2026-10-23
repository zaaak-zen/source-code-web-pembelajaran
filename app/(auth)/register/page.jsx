"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/*
 * Halaman daftar akun.
 *
 * Tanggung jawab: membuat akun Supabase dengan metadata nama, lalu meminta
 * verifikasi email.
 *
 * Peran tidak dipilih di sini. Akun baru selalu berperan "siswa"; peran guru
 * atau admin diberikan lewat dashboard Supabase agar tidak bisa dipilih sendiri.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [pesan, setPesan] = useState("");
  const [selesai, setSelesai] = useState(false);
  const [memuat, setMemuat] = useState(false);

  async function kirim(event) {
    event.preventDefault();
    setPesan("");

    if (sandi.length < 8) {
      setPesan("Kata sandi minimal 8 karakter.");
      return;
    }

    setMemuat(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: sandi,
        options: {
          data: { nama: nama.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setPesan(
          error.message.toLowerCase().includes("already")
            ? "Email sudah terdaftar. Coba masuk atau gunakan email lain."
            : "Pendaftaran gagal. Periksa data lalu coba lagi."
        );
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setSelesai(true);
    } catch (error) {
      setPesan(error.message || "Pendaftaran gagal. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  if (selesai) {
    return (
      <div className="authCard">
        <p className="section-eyebrow">Akun</p>
        <h1 className="authTitle">Periksa email Anda</h1>
        <p className="authLead">
          Kami mengirim tautan verifikasi ke <strong>{email}</strong>. Buka
          tautan tersebut untuk mengaktifkan akun, lalu masuk.
        </p>
        <p className="authLinks">
          <Link href="/login">Ke halaman masuk</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="authCard">
      <p className="section-eyebrow">Akun</p>
      <h1 className="authTitle">Buat akun siswa</h1>
      <p className="authLead">
        Simpan nilai kuis dan progres belajar. Peran guru diberikan oleh
        pengelola sekolah setelah akun dibuat.
      </p>

      <form className="authForm" onSubmit={kirim}>
        <div className="authField">
          <label className="authLabel" htmlFor="nama">
            Nama lengkap
          </label>
          <input
            className="authInput"
            id="nama"
            type="text"
            name="nama"
            autoComplete="name"
            placeholder="Nama lengkap kamu"
            required
            value={nama}
            onChange={(event) => setNama(event.target.value)}
          />
        </div>

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
            autoComplete="new-password"
            minLength={8}
            placeholder="Minimal 8 karakter"
            required
            value={sandi}
            onChange={(event) => setSandi(event.target.value)}
          />
          <p className="authHint">Gunakan minimal 8 karakter.</p>
        </div>

        {pesan ? (
          <p className="authMessage authMessageError" role="alert">
            {pesan}
          </p>
        ) : null}

        <button className="authButton" type="submit" disabled={memuat}>
          {memuat ? "Mendaftarkan..." : "Daftar"}
        </button>
      </form>

      <div className="authDivider">atau</div>

      <p className="authLinks">
        <Link href="/login">Sudah punya akun? Masuk</Link>
      </p>
    </div>
  );
}
