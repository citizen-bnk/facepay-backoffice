"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint, Split } from "@/lib/types";

const GOLD = "#D4A53A";
const BLUE = "#3B6FD0";

function yFmt(unit: "K" | "M" | "ms" | "%") {
  return (v: number) => {
    if (unit === "K") return v === 0 ? "R 0" : `R ${v / 1000}K`;
    if (unit === "M") return v === 0 ? "0" : `R ${v / 1_000_000}M`;
    return unit === "%" ? `${v}%` : `${v}${unit}`;
  };
}

function SrData({ label, data }: { label: string; data: SeriesPoint[] }) {
  return (
    <ul className="sr-only">
      {data.map((d) => <li key={d.label}>{label} {d.label}: {d.value}</li>)}
    </ul>
  );
}

const AXIS = { fontSize: 11, fill: "#4B5563" };

export function TrendChart({ data, tone = "gold", unit = "K", ticks, domainMax, yTicks, height = 240, label }: {
  data: SeriesPoint[]; tone?: "gold" | "blue"; unit?: "K" | "M" | "ms" | "%"; ticks?: string[]; domainMax?: number; yTicks?: number[]; height?: number; label: string;
}) {
  const c = tone === "gold" ? GOLD : BLUE;
  const id = `g-${tone}-${label.replace(/\W/g, "")}`;
  return (
    <div style={{ height }} role="img" aria-label={`${label} chart`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 640, height }}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={tone === "gold" ? 0.45 : 0.28} />
              <stop offset="100%" stopColor={c} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" ticks={ticks} tick={AXIS} axisLine={false} tickLine={false} interval={ticks ? 0 : "preserveStartEnd"} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={yFmt(unit)} width={52} domain={[0, domainMax ?? "auto"]} ticks={yTicks} />
          <Tooltip formatter={(v) => [typeof v === "number" ? yFmt(unit)(v) : String(v), label]} contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
          <Area type="linear" dataKey="value" stroke={c} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <SrData label={label} data={data} />
    </div>
  );
}

export function LineSpark({ data, height = 160, unit = "ms", label }: { data: SeriesPoint[]; height?: number; unit?: "ms" | "%"; label: string }) {
  return (
    <div style={{ height }} role="img" aria-label={`${label} chart`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 480, height }}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={5} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} tickFormatter={yFmt(unit)} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <SrData label={label} data={data} />
    </div>
  );
}

export function Columns({ data, height = 200, label }: { data: SeriesPoint[]; height?: number; label: string }) {
  return (
    <div style={{ height }} role="img" aria-label={`${label} chart`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 480, height }}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
          <Bar dataKey="value" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <SrData label={label} data={data} />
    </div>
  );
}

const DONUT = ["#D4A53A", "#2F5D9E", "#A68A3C", "#6E9BE0", "#1B3A6B"];

export function ChannelDonut({ data }: { data: Split[] }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[190px] w-[190px] shrink-0" role="img" aria-label="Transactions by channel donut chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 190, height: 190 }}>
          <PieChart>
            <Pie data={data} dataKey="pct" nameKey="label" innerRadius={58} outerRadius={92} startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={1} isAnimationActive={false}>
              {data.map((d, i) => <Cell key={d.label} fill={DONUT[i % DONUT.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-[160px] flex-1 space-y-3 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT[i % DONUT.length] }} aria-hidden />
            <span className="flex-1 text-slate-800">{d.label}</span>
            <span className="font-medium text-slate-600">{d.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
