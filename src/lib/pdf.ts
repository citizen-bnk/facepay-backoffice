/** Minimal single-font text PDF writer (no dependencies). Enough for statements and reports. */

const esc = (s: string) => s.replace(/[^\x20-\x7E]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function makePdf(title: string, lines: string[]): Uint8Array {
  const perPage = 46;
  const pages: string[][] = [];
  for (let i = 0; i < Math.max(lines.length, 1); i += perPage) pages.push(lines.slice(i, i + perPage));

  const objs: string[] = [];
  const add = (s: string) => (objs.push(s), objs.length);
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(""); // pages placeholder
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];
  pages.forEach((pg, pi) => {
    let c = `BT /F2 16 Tf 50 800 Td (${esc(title)}) Tj ET\nBT /F1 8 Tf 50 785 Td (FACEPAY | FACE YOUR MONEY - generated ${esc(new Date().toISOString().slice(0, 10))} - page ${pi + 1}/${pages.length}) Tj ET\n`;
    pg.forEach((l, i) => {
      c += `BT /F1 10 Tf 50 ${760 - i * 15} Td (${esc(l)}) Tj ET\n`;
    });
    const content = add(`<< /Length ${c.length} >>\nstream\n${c}endstream`);
    pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${content} 0 R /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> >>`));
  });
  objs[1] = `<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}
