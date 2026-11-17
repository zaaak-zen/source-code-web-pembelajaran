"use client";

import { useState } from "react";
import { IconEye, IconEyeOff, IconLogin } from "@/components/Icons/Icons";

/*
 * FormLoginGuru
 *
 * Tanggung jawab: form masuk guru dengan toggle "lihat password".
 *
 * Kenapa komponen klien terpisah: server action `masukGuru` tetap dipakai
 * lewat prop `action`, jadi logika autentikasi tetap di server. Hanya status
 * tampil/sembunyi password yang hidup di browser.
 *
 * Catatan aksesibilitas:
 * - Tombol mata memakai `type="button"` agar tidak ikut mengirim form.
 * - `aria-pressed` membawa status aktif supaya pembaca layar mengumumkannya.
 * - Input tetap `type="password"` saat disembunyikan; hanya atribut `type`
 *   yang berubah, sehingga nilai dan validasi form tidak terpengaruh.
 */
export default function FormLoginGuru({ action, galat = "", baruKeluar = false }) {
  const [lihat, setLihat] = useState(false);

  return (
    <form action={action} className="loginForm">
      {baruKeluar ? (
        <p className="loginAlert loginAlertSuccess" role="status">
          Anda sudah keluar dari panel guru.
        </p>
      ) : null}

      {galat ? (
        <p className="loginAlert loginAlertError" role="alert">
          {galat}
        </p>
      ) : null}

      <div className="loginField">
        <label className="loginLabel" htmlFor="email">
          Email
        </label>
        <input
          className="loginInput"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          placeholder="nama@sekolah.sch.id"
          maxLength={120}
          required
          autoFocus
        />
      </div>

      <div className="loginField">
        <div className="loginLabelRow">
          <label className="loginLabel" htmlFor="sandi">
            Password
          </label>
          <a className="loginHelp" href="#bantuan-password">
            Lupa password?
          </a>
        </div>
        <div className="loginPassword">
          <input
            className="loginInput"
            id="sandi"
            name="sandi"
            type={lihat ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password"
            maxLength={200}
            required
          />
          <button
            className="loginReveal"
            type="button"
            aria-label={lihat ? "Sembunyikan password" : "Lihat password"}
            aria-controls="sandi"
            aria-pressed={lihat}
            tabIndex={0}
            onClick={() => setLihat((nyala) => !nyala)}
          >
            {lihat ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </div>
      </div>

      <button className="loginSubmit" type="submit">
        <IconLogin size={18} />
        Masuk
      </button>

      <p className="loginNote" id="bantuan-password">
        <strong>Sesi berakhir otomatis 2 jam setelah masuk.</strong> Demi
        keamanan, panel guru tidak menyediakan opsi sesi panjang. Password
        diganti dari halaman <strong>Keamanan</strong> setelah masuk, atau minta
        pengelola situs mengatur ulang lewat Supabase. Akun guru tidak dibuat
        dari halaman ini.
      </p>
    </form>
  );
}
