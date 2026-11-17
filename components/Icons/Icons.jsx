/*
 * Ikon SVG inline.
 *
 * Tanggung jawab: menyediakan ikon garis yang konsisten untuk seluruh UI
 * tanpa menambah dependensi. Semua ikon dekoratif (aria-hidden), sehingga
 * makna tetap dibawa oleh teks di sekitarnya.
 *
 * CARA PAKAI:
 *   import { IconBook } from "@/components/Icons/Icons";
 *   <IconBook size={20} />
 */

function Svg({ size = 20, className, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconArrowRight(props) {
  return (
    <Svg {...props}>
      <path d="M4 12h16" />
      <path d="m13 5 7 7-7 7" />
    </Svg>
  );
}

export function IconArrowLeft(props) {
  return (
    <Svg {...props}>
      <path d="M20 12H4" />
      <path d="m11 19-7-7 7-7" />
    </Svg>
  );
}

export function IconChevronDown(props) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function IconCheck(props) {
  return (
    <Svg {...props}>
      <path d="m5 13 4 4L19 7" />
    </Svg>
  );
}

export function IconCheckCircle(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Svg>
  );
}

export function IconX(props) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

export function IconXCircle(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </Svg>
  );
}

export function IconBook(props) {
  return (
    <Svg {...props}>
      <path d="M12 6.5C10.4 5 8.3 4.4 4.8 4.4c-.8 0-1.3.5-1.3 1.3v11.1c0 .8.5 1.3 1.3 1.3 3.5 0 5.6.6 7.2 2.1 1.6-1.5 3.7-2.1 7.2-2.1.8 0 1.3-.5 1.3-1.3V5.7c0-.8-.5-1.3-1.3-1.3-3.5 0-5.6.6-7.2 2.1Z" />
      <path d="M12 6.5v13.7" />
    </Svg>
  );
}

export function IconSparkles(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
      <path d="M18.5 16.5 19.2 19l2.3.7-2.3.8-.7 2.5-.8-2.5-2.2-.8 2.2-.7.8-2.5Z" />
    </Svg>
  );
}

export function IconTrophy(props) {
  return (
    <Svg {...props}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5.5A2.5 2.5 0 0 0 8 9.5" />
      <path d="M16 5h2.5A2.5 2.5 0 0 1 16 9.5" />
      <path d="M12 12v4" />
      <path d="M9 20h6" />
      <path d="M10 16h4l.6 4H9.4l.6-4Z" />
    </Svg>
  );
}

export function IconUsers(props) {
  return (
    <Svg {...props}>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20" />
      <circle cx="9.2" cy="7.5" r="3.5" />
      <path d="M21.5 20v-1.5a4 4 0 0 0-3-3.9" />
      <path d="M16.5 4.1a3.5 3.5 0 0 1 0 6.8" />
    </Svg>
  );
}

export function IconCode(props) {
  return (
    <Svg {...props}>
      <path d="m8 7-5 5 5 5" />
      <path d="m16 7 5 5-5 5" />
      <path d="m13.5 4-3 16" />
    </Svg>
  );
}

export function IconClock(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function IconCalendar(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3.5 10h17" />
    </Svg>
  );
}

export function IconGraduation(props) {
  return (
    <Svg {...props}>
      <path d="m3 9 9-4.5L21 9l-9 4.5L3 9Z" />
      <path d="M6.5 11v4.6c0 1.5 2.5 2.9 5.5 2.9s5.5-1.4 5.5-2.9V11" />
      <path d="M21 9v5" />
    </Svg>
  );
}

export function IconLogout(props) {
  return (
    <Svg {...props}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M16 16l4-4-4-4" />
      <path d="M20 12H9" />
    </Svg>
  );
}

export function IconSend(props) {
  return (
    <Svg {...props}>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3 14.5 21l-4-7.5L3 9.5 21 3Z" />
    </Svg>
  );
}

export function IconMenu(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  );
}

export function IconPlay(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5 16 12l-6 3.5v-7Z" />
    </Svg>
  );
}

export function IconPause(props) {
  return (
    <Svg {...props}>
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </Svg>
  );
}

export function IconDashboard(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Svg>
  );
}

export function IconChat(props) {
  return (
    <Svg {...props}>
      <path d="M20.5 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-5.6A7.5 7.5 0 1 1 20.5 11.5Z" />
      <path d="M8.5 11.5h.01" />
      <path d="M12 11.5h.01" />
      <path d="M15.5 11.5h.01" />
    </Svg>
  );
}

export function IconTarget(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  );
}

export function IconMail(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </Svg>
  );
}

export function IconLock(props) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </Svg>
  );
}

export function IconEye(props) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </Svg>
  );
}

export function IconEyeOff(props) {
  return (
    <Svg {...props}>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4" />
      <path d="M6.4 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.8-.8" />
      <path d="M9.9 9.9a3.2 3.2 0 0 0 4.3 4.3" />
    </Svg>
  );
}

export function IconLogin(props) {
  return (
    <Svg {...props}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8.5 18.5 12 15 15.5" />
      <path d="M18.5 12H9" />
    </Svg>
  );
}

export function IconShield(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 19 6v6c0 4.2-2.8 7.4-7 8.5-4.2-1.1-7-4.3-7-8.5V6l7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

export function IconUser(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function IconVideo(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="m16 10 4.5-2.5v9L16 14" />
    </Svg>
  );
}

export function IconClipboard(props) {
  return (
    <Svg {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="3" />
      <path d="M9 4.5V3.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v.7" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h3" />
    </Svg>
  );
}

export function IconFile(props) {
  return (
    <Svg {...props}>
      <path d="M6 2.5h7.5L19 8v13.5H6z" />
      <path d="M13 2.5V8h5.5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </Svg>
  );
}

export function IconDownload(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v11" />
      <path d="m7.5 10 4.5 4.5L16.5 10" />
      <path d="M4.5 20h15" />
    </Svg>
  );
}

export function IconAlert(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 21 20H3l9-16.5Z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconCompass(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </Svg>
  );
}
