"use client";

/* eslint-disable @next/next/no-img-element */

/*
 * ProfilPembuat
 *
 * Tanggung jawab: menampilkan foto profil anggota tim yang bisa diklik.
 * Saat diklik, lapisan dialog terbuka: media profil ditampilkan dan lagu
 * anggota diputar (satu klik pengguna = satu gesture, jadi audio boleh bunyi).
 *
 * Data anggota datang dari `app/page.jsx`:
 *   { name, role, links, foto, video, lagu, laguJudul }
 *
 * - `video.src` terisi -> dialog memutar video (opsional, diputar berulang,
 *   dibisukan; lagu berjalan sendiri di sampingnya).
 * - `foto` kosong  -> tampilkan inisial seperti sebelumnya.
 * - `lagu` kosong  -> tidak ada audio yang diputar, sisanya tetap tampil.
 * - `pesanProfile` -> kalimat pendek yang tampil di bawah keterangan lagu.
 *
 * Lagu diputar sekali saat dialog dibuka dan berhenti saat dialog ditutup;
 * tidak ada tombol jeda/putar, jadi tidak ada kontrol media di dialog.
 * Video juga tidak memakai kontrol (hanya diputar, tanpa scrub/stop) agar
 * fokus dialog tetap sederhana: lihat profil, dengar lagu, tutup.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconX } from "@/components/Icons/Icons";
import styles from "./ProfilPembuat.module.css";

export default function ProfilPembuat({ member }) {
  const { name, foto, lagu, laguJudul, pesanProfile, tandaTangan } = member;
  const [terbuka, setTerbuka] = useState(false);
  const [laguGagal, setLaguGagal] = useState(false);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const tombolRef = useRef(null);
  // Diisi saat elemen audio masuk DOM, sehingga pemutaran tetap berada di
  // dalam gestur klik (bukan setelah effect berjalan).
  const laguBaru = useRef(false);
  const dialogRef = useRef(null);
  const idDialog = useId();

  const inisial = (name ?? "?").trim().charAt(0).toUpperCase();

  // Server (app/page.jsx) sudah memeriksa keberadaan setiap berkas, jadi
  // `foto`, `lagu`, dan `video` di sini hanya berisi path yang ada.
  const video = member.video || null;
  const videoTersedia = Boolean(video?.src);

  // Dialog dibuat lebih lebar hanya bila ada media yang ditampilkan, supaya
  // foto/video bisa tampil besar tanpa terpotong.
  const punyaMedia = videoTersedia || Boolean(foto);

  function putarLagu() {
    const audio = audioRef.current;
    if (!audio || !lagu) return;
    setLaguGagal(false);
    audio.currentTime = 0;
    const hasil = audio.play();
    if (hasil?.catch) hasil.catch(() => setLaguGagal(true));
  }

  // Video memakai atribut autoplay+loop dan dibisukan, jadi bisa langsung
  // berjalan tanpa menunggu event `canplay`.
  function putarVideo() {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = 0;
    const hasil = videoEl.play();
    if (hasil?.catch) hasil.catch(() => {});
  }

  function buka() {
    laguBaru.current = true;
    setTerbuka(true);
  }

  function pasangAudio(audio) {
    audioRef.current = audio;
    if (!audio || !laguBaru.current) return;
    laguBaru.current = false;
    putarLagu();
  }

  const hentikanMedia = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  }, []);

  const tutup = useCallback(() => {
    hentikanMedia();
    setTerbuka(false);
    tombolRef.current?.focus();
  }, [hentikanMedia]);

  // Lagu diputar dari `pasangAudio` (callback ref). Di sini hanya video,
  // yang dibisukan jadi tidak terhalang kebijakan autoplay.
  useEffect(() => {
    if (!terbuka) return;
    putarVideo();
  }, [terbuka]);

  useEffect(() => {
    if (!terbuka) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") tutup();
    }

    document.addEventListener("keydown", onKeyDown);
    const overflowAwal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowAwal;
    };
  }, [terbuka, tutup]);

  return (
    <>
      {/* preload="none": lagu diunduh saat dialog dibuka, bukan saat beranda
          dimuat. Dengan empat anggota, preload="auto" menarik seluruh berkas
          audio (~1,5 MB) sebelum ada yang mengklik apa pun. */}
      <audio
        ref={pasangAudio}
        src={lagu || undefined}
        preload={terbuka ? "auto" : "none"}
        loop
        onError={() => setLaguGagal(true)}
      />

      <button
        ref={tombolRef}
        type="button"
        className={styles.tombolFoto}
        onClick={buka}
        aria-label={`Buka profil ${name}`}
        aria-haspopup="dialog"
        aria-expanded={terbuka}
      >
        {foto ? (
          <img
            src={foto}
            alt=""
            width={44}
            height={44}
            className={styles.foto}
          />
        ) : (
          <span className={styles.inisial} aria-hidden="true">
            {inisial}
          </span>
        )}
      </button>

      {terbuka ? (
        <div
          className={styles.lapisan}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) tutup();
          }}
        >
          <div
            ref={dialogRef}
            className={`${styles.dialog} ${punyaMedia ? styles.dialogMedia : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idDialog}
            tabIndex={-1}
          >
            <div className={styles.kepala}>
              <p className={styles.label}>Profil pembuat</p>
              <button
                type="button"
                className={styles.tutup}
                onClick={tutup}
                aria-label="Tutup profil"
              >
                <IconX size={18} />
              </button>
            </div>

            <h3 id={idDialog} className={styles.nama}>
              {name}
            </h3>

            {videoTersedia ? (
              <figure className={styles.bingkai}>
                <video
                  ref={videoRef}
                  className={styles.gambar}
                  src={video.src}
                  poster={video.poster || undefined}
                  playsInline
                  loop
                  muted
                  preload="none"
                  aria-label={`Video profil ${name}`}
                  autoPlay
                >
                  Peramban Anda tidak mendukung pemutaran video.
                </video>
              </figure>
            ) : foto ? (
              <figure className={styles.bingkai}>
                <img
                  src={foto}
                  alt={`Foto profil ${name}`}
                  className={styles.gambar}
                  decoding="async"
                />
              </figure>
            ) : (
              <div
                className={`${styles.bingkai} ${styles.bingkaiKosong}`}
                aria-hidden="true"
              >
                <span className={styles.inisialBesar}>{inisial}</span>
              </div>
            )}

            {lagu || laguGagal ? (
              <p className={styles.laguInfo}>
                {laguGagal
                  ? "Lagu gagal diputar."
                  : laguJudul || "Lagu profil"}
              </p>
            ) : null}

            {pesanProfile || tandaTangan ? (
              <blockquote className={styles.pesanProfile}>
                {pesanProfile ? <span>{pesanProfile}</span> : null}
                {tandaTangan ? (
                  <cite className={styles.tandaTangan}>{tandaTangan}</cite>
                ) : null}
              </blockquote>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
