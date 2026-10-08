/** Masking helpers: staff portals only ever receive masked personal data. */

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(5, user.length - 1)))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${phone.slice(0, 3)} *** **${digits.slice(-2)}`;
}

export function maskId(id: string): string {
  if (id.length < 5) return "***";
  return `${id.slice(0, 2)}${"*".repeat(Math.max(4, id.length - 4))}${id.slice(-2)}`;
}

export function maskName(name: string): string {
  return name
    .split(" ")
    .map((p, i) => (i === 0 ? p : `${p.slice(0, 1)}.`))
    .join(" ");
}

export function maskCard(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}
