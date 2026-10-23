"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/*
 * Halaman lupa kata sandi.
 *
 * Tanggung jawab: meminta email tautan reset. Pesan sukses selalu sama agar
 * keberadaan sebuah akun tidak bisa ditebak dari halaman ini.
 */
export default function LupaSandiPage() {
  const [email, setEmail] = useState("");
  const [pesan, setPesan] = useState("");
  const [terkirim, setTerkirim] = useState(false);
  const [memuat, setMemuat] = useState(false);

  async function kirim(event) {
    event.preventDefault();
    setPesan("");
    setMemuat(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-sandi`,
        }
      );

      if (error) {
        setPesan("Permintaan gagal diproses. Coba lagi beberapa saat lagi.");
        return;
      }

      setTerkirim(true);
    } catch (error) {
      setPesan(error.message || "Permintaan gagal diproses.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="authCard">
      <p className="section-eyebrow">Akun</p>
      <h1 className="authTitle">Lupa kata sandi</h1>

      {terkirim ? (
        <>
          <p className="authLead">
            Jika email tersebut terdaftar, kami sudah mengirim tautan untuk
            mengatur ulang kata sandi. Periksa kotak masuk dan folder spam.
          </p>
          <p className="authLinks">
            <Link href="/login">Kembali ke halaman masuk</Link>
          </p>
        </>
      ) : (
        <>
          <p className="authLead">
            Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat
            kata sandi baru.
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

            {pesan ? (
              <p className="authMessage authMessageError" role="alert">
                {pesan}
              </p>
            ) : null}

            <button className="authButton" type="submit" disabled={memuat}>
              {memuat ? "Mengirim..." : "Kirim tautan"}
            </button>
          </form>

          <div className="authDivider">atau</div>

          <p className="authLinks">
            <Link href="/login">Kembali ke halaman masuk</Link>
          </p>
        </>
      )}
    </div>
  );
}
