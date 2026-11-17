"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/klien";
import { IconLogout } from "@/components/Icons/Icons";

/*
 * Tombol keluar panel guru
 *
 * Tanggung jawab: mengakhiri sesi Supabase Auth guru lalu kembali ke halaman
 * login.
 *
 * Sesi dihapus di browser karena cookie sesinya memang dikelola klien
 * Supabase. Setelah itu halaman dimuat ulang lewat `/guru/login?keluar=1`:
 * parameter itu membuat halaman login tidak memantulkan pengguna kembali ke
 * panel bila cookie sempat belum terhapus.
 *
 * Bila `auth.signOut()` gagal karena jaringan, cookie sesi lokal tetap
 * dibersihkan oleh klien Supabase dan pengguna tetap dibawa ke halaman login.
 */
export function TombolKeluarGuru() {
  const [memuat, setMemuat] = useState(false);

  async function keluar() {
    setMemuat(true);

    try {
      await createSupabaseBrowserClient().auth.signOut({
        scope: "local",
      });
    } catch {
      // Abaikan: pengguna tetap dibawa ke halaman login.
    }

    window.location.assign("/guru/login?keluar=1");
  }

  return (
    <button
      className="btn btnSecondary btnSm"
      type="button"
      onClick={keluar}
      disabled={memuat}
    >
      <IconLogout size={15} />
      {memuat ? "Keluar..." : "Keluar"}
    </button>
  );
}
