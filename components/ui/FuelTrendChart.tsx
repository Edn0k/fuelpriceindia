"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FuelTrendChartData = {
  labels: string[];
  values: number[];
};

type Point = {
  date: string;
  value: number;
};

type Props = {
  data: FuelTrendChartData;
  title?: string;
};

export function FuelTrendChart({ data, title }: Props) {
  const labels = data?.labels ?? [];
  const values = data?.values ?? [];

  if (labels.length < 2 || values.length < 2) {
    return (
      <section className="mt-6 rounded-2xl border border-border/15 bg-card p-4 shadow-sm shadow-black/20">
        <h2 className="mb-3 border-l-2 border-border/25 pl-3 text-sm font-semibold uppercase tracking-wide text-white/80">
          {title ?? "Fuel price trend"}
        </h2>
        <div className="rounded-xl border border-border/10 bg-surface px-4 py-3 text-sm text-muted">
          Not enough data for a trend chart.
        </div>
      </section>
    );
  }

  const n = Math.min(labels.length, values.length);
  const points: Point[] = Array.from({ length: n }, (_, i) => ({
    date: labels[i],
    value: values[i],
  }));

  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const netChange = Number.isFinite(first) && Number.isFinite(last) ? last - first : null;
  const netChangeLabel =
    netChange == null
      ? null
      : `${netChange >= 0 ? "+" : "-"}₹${Math.abs(netChange).toFixed(2)}`;

  return (
    <section
      className="mt-6 rounded-2xl border border-border/15 bg-card p-4 shadow-sm shadow-black/20"
      key={`${labels.join("|")}:${values.join("|")}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="border-l-2 border-border/25 pl-3 text-sm font-semibold uppercase tracking-wide text-white/80">
          {title ?? "Fuel price trend"}
        </h2>
        {netChangeLabel && (
          <p className="text-xs text-white/70">
            Net change: <span className="font-semibold text-success/80">{netChangeLabel}</span>
          </p>
        )}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#FFFFFF" }}
              tickMargin={6}
              stroke="rgba(255,255,255,0.45)"
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#FFFFFF" }}
              tickMargin={6}
              stroke="rgba(255,255,255,0.45)"
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              domain={["auto", "auto"]}
              tickFormatter={(v) => String(v)}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                background: "rgba(10, 10, 10, 0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#fff",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.85)" }}
              formatter={(value) => {
                const num = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(num)) return ["-", "Price"];
                return [`₹${num.toFixed(2)}`, "Price"];
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#00D26A"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, fill: "#00D26A", stroke: "#00D26A" }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
