"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/*
 * Halaman atur ulang kata sandi.
 *
 * Tanggung jawab: memeriksa apakah sesi pemulihan aktif, lalu menyimpan kata
 * sandi baru. Sesi hanya ada jika pengguna datang lewat tautan email yang sah.
 */
export default function ResetSandiPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [sandi, setSandi] = useState("");
  const [ulangi, setUlangi] = useState("");
  const [pesan, setPesan] = useState("");
  const [memuat, setMemuat] = useState(false);

  useEffect(() => {
    let aktif = true;

    async function periksaSesi() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (aktif) setSiap(Boolean(data.session));
      } catch {
        if (aktif) setSiap(false);
      }
    }

    periksaSesi();
    return () => {
      aktif = false;
    };
  }, []);

  async function kirim(event) {
    event.preventDefault();
    setPesan("");

    if (sandi.length < 8) {
      setPesan("Kata sandi minimal 8 karakter.");
      return;
    }

    if (sandi !== ulangi) {
      setPesan("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setMemuat(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: sandi });

      if (error) {
        setPesan("Kata sandi gagal diubah. Minta tautan baru lalu coba lagi.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setPesan(error.message || "Kata sandi gagal diubah.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="authCard">
      <p className="section-eyebrow">Akun</p>
      <h1 className="authTitle">Atur ulang kata sandi</h1>

      {siap ? (
        <>
          <p className="authLead">
            Masukkan kata sandi baru untuk akun Anda.
          </p>

          <form className="authForm" onSubmit={kirim}>
            <div className="authField">
              <label className="authLabel" htmlFor="sandi">
                Kata sandi baru
              </label>
              <input
                className="authInput"
                id="sandi"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Minimal 8 karakter"
                required
                value={sandi}
                onChange={(event) => setSandi(event.target.value)}
              />
            </div>

            <div className="authField">
              <label className="authLabel" htmlFor="ulangi">
                Ulangi kata sandi baru
              </label>
              <input
                className="authInput"
                id="ulangi"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Ketik ulang kata sandi"
                required
                value={ulangi}
                onChange={(event) => setUlangi(event.target.value)}
              />
            </div>

            {pesan ? (
              <p className="authMessage authMessageError" role="alert">
                {pesan}
              </p>
            ) : null}

            <button className="authButton" type="submit" disabled={memuat}>
              {memuat ? "Menyimpan..." : "Simpan kata sandi"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="authLead">
            Tautan pemulihan tidak valid atau sudah kedaluwarsa. Silakan minta
            tautan baru.
          </p>
          <div className="authDivider">atau</div>
          <p className="authLinks">
            <Link href="/lupa-sandi">Minta tautan baru</Link>
            <Link href="/login">Ke halaman masuk</Link>
          </p>
        </>
      )}
    </div>
  );
}
