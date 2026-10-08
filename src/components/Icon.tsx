const P: Record<string, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  wallet: "M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11M16 14h2",
  card: "M3 6h18v12H3zM3 10h18M7 15h3",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  swap: "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4m4 4H7",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6",
  alert: "M12 3l10 18H2zM12 10v4M12 17.5v.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2L10 21h4l.6-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1-1.5 2M12 17v.01",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3",
  bank: "M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
  users: "M16 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-2a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8",
  device: "M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  plug: "M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0zM12 18v4",
  team: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  store: "M3 9l2-5h14l2 5M3 9v11h18V9M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M9 20v-6h6v6",
  scale: "M12 3v18M5 7h14M5 7l-3 7a3.5 3.5 0 006 0zM19 7l-3 7a3.5 3.5 0 006 0zM8 21h8",
  log: "M5 3h14v18H5zM9 8h6M9 12h6M9 16h4",
  policy: "M4 4h16v6H4zM4 14h10v6H4zM17 15l2 2 3-3",
  flag: "M5 21V4M5 4h12l-2 4 2 4H5",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  key: "M14 10a5 5 0 11-4.6 3L3 19.4V21h2v-2h2v-2h2l1.6-1.6A5 5 0 0114 10zM16 8h.01",
  check: "M5 12l5 5 9-10",
  bell: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21a2 2 0 004 0",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  down: "M6 9l6 6 6-6",
  up: "M12 19V5M5 12l7-7 7 7",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  logout: "M9 21H5V3h4M16 17l5-5-5-5M21 12H9",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  face: "M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M9 10v1M15 10v1M9 15c1.5 1.2 4.5 1.2 6 0",
  scan: "M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3M7 12h10",
  plus: "M12 5v14M5 12h14",
  nfc: "M6 8a8 8 0 010 8M10 6a12 12 0 010 12M14 4a16 16 0 010 16",
};

export default function Icon({ name, className = "h-5 w-5", ...rest }: { name: string; className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false" {...rest}>
      <path d={P[name] ?? P.home} />
    </svg>
  );
}
