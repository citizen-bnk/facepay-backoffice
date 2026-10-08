const TZ = "Africa/Johannesburg";

export function formatMoney(minor: number, opts: { decimals?: number; sign?: boolean } = {}): string {
  const decimals = opts.decimals ?? 2;
  const abs = Math.abs(minor) / 100;
  const body = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const sign = minor < 0 ? "-" : opts.sign && minor > 0 ? "+" : "";
  return `${sign}R ${body}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

const dtf = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dtf.format(d).replace(",", "");
}

const dayf = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dayf.format(d);
}

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

/** "Today 14:32" / "Yesterday 09:10" / "03 Aug 2026". */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const today = ymd.format(now);
  const yest = ymd.format(new Date(now.getTime() - 86_400_000));
  const day = ymd.format(d);
  if (day === today) return `Today ${hm.format(d)}`;
  if (day === yest) return `Yesterday ${hm.format(d)}`;
  return formatDate(iso);
}

export const CHANNEL_LABEL: Record<string, string> = {
  face: "Face Pay",
  nfc: "NFC / Tap",
  qr: "QR Code",
  card: "Card",
  palm: "Palm",
  fingerprint: "Fingerprint",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  authorised: "Authorised",
  captured: "Captured",
  declined: "Declined",
  refunded: "Refunded",
};
