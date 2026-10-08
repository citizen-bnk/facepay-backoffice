"use client";

import { useMemo, useState } from "react";
import { Badge } from "./ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import Icon from "./Icon";

export type ColKind = "text" | "money" | "badge" | "date" | "mono" | "number";
export interface Col { key: string; header: string; kind?: ColKind; align?: "right" }
export type Row = Record<string, string | number | boolean | null | undefined>;

interface Props {
  caption: string;
  columns: Col[];
  rows: Row[];
  /** column key to build a status/type filter from */
  filterKey?: string;
  filterLabel?: string;
  searchPlaceholder?: string;
  /** keys shown in the drill-down panel (default: all columns) */
  detailTitleKey?: string;
  exportName?: string;
  pageSize?: number;
  /** extra read-only note for the drill-down panel */
  detailNote?: string;
}

function cell(r: Row, c: Col) {
  const v = r[c.key];
  if (v === null || v === undefined || v === "") return <span className="text-slate-500">-</span>;
  switch (c.kind) {
    case "money": return formatMoney(Number(v));
    case "date": return formatDateTime(String(v));
    case "badge": return <Badge>{String(v)}</Badge>;
    case "mono": return <span className="font-mono text-xs">{String(v)}</span>;
    case "number": return Number(v).toLocaleString("en-US");
    default: return String(v);
  }
}

function plain(r: Row, c: Col): string {
  const v = r[c.key];
  if (v === null || v === undefined) return "";
  if (c.kind === "money") return (Number(v) / 100).toFixed(2);
  return String(v);
}

export default function DataTable({ caption, columns, rows, filterKey, filterLabel = "Status", searchPlaceholder = "Search…", detailTitleKey, exportName, pageSize = 12, detailNote }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const options = useMemo(() => (filterKey ? Array.from(new Set(rows.map((r) => String(r[filterKey] ?? "")))).filter(Boolean).sort() : []), [rows, filterKey]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => (filter === "all" || String(r[filterKey ?? ""]) === filter) && (!needle || columns.some((c) => plain(r, c).toLowerCase().includes(needle))));
    if (sort) out = [...out].sort((a, b) => (plain(a, columns.find((c) => c.key === sort.key)!) > plain(b, columns.find((c) => c.key === sort.key)!) ? 1 : -1) * sort.dir);
    return out;
  }, [rows, q, filter, filterKey, columns, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * pageSize, cur * pageSize + pageSize);

  function exportCsv() {
    const esc = (s: string) => {
      const t = /^[=+\-@]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const csv = [columns.map((c) => esc(c.header)).join(","), ...filtered.map((r) => columns.map((c) => esc(plain(r, c))).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <div className="min-w-[200px] flex-1">
          <label htmlFor={`q-${caption}`} className="label">Search</label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input id={`q-${caption}`} className="field pl-9" placeholder={searchPlaceholder} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          </div>
        </div>
        {filterKey && (
          <div>
            <label htmlFor={`f-${caption}`} className="label">{filterLabel}</label>
            <select id={`f-${caption}`} className="field" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
              <option value="all">All</option>
              {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        )}
        <button type="button" className="btn btn-ghost" onClick={exportCsv}><Icon name="download" className="h-4 w-4" />Export CSV</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{caption}. {filtered.length} rows. Select a row for details.</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 }))}>
                    {c.header}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.length === 0 && <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-600">No matching records.</td></tr>}
            {slice.map((r, i) => (
              <tr key={String(r.id ?? i)} className="hover:bg-slate-50">
                {columns.map((c) => <td key={c.key} className={`px-4 py-3 text-slate-800 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>{cell(r, c)}</td>)}
                <td className="px-4 py-3 text-right">
                  <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-800 underline-offset-2 hover:underline" onClick={() => setSel(r)} aria-label={`View details for ${String(r[detailTitleKey ?? columns[0].key] ?? "row")}`}>Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
        <span>{filtered.length} record{filtered.length === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost !px-3 !py-1" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</button>
          <span aria-live="polite">Page {cur + 1} of {pages}</span>
          <button type="button" className="btn btn-ghost !px-3 !py-1" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</button>
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Record details">
          <button className="absolute inset-0 bg-black/50" aria-label="Close details" onClick={() => setSel(null)} />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-midnight">{String(sel[detailTitleKey ?? columns[0].key] ?? "Details")}</h2>
              <button className="rounded-lg p-1 hover:bg-slate-100" aria-label="Close" onClick={() => setSel(null)} autoFocus><Icon name="close" /></button>
            </div>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              {columns.map((c) => (
                <div key={c.key} className="grid grid-cols-[130px_1fr] gap-3 py-2.5">
                  <dt className="text-slate-600">{c.header}</dt>
                  <dd className="break-words font-medium text-slate-900">{cell(sel, c)}</dd>
                </div>
              ))}
            </dl>
            {detailNote && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{detailNote}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
