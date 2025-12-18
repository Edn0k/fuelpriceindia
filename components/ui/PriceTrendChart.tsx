"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export type TrendPoint = {
  date: string;
  petrol: number | null;
  diesel: number | null;
  lpg?: number | null;
  cng?: number | null;
};

type Props = {
  data: TrendPoint[];
  title?: string;
};

export function PriceTrendChart({ data, title }: Props) {
  return (
    <section className="mt-6 rounded-2xl border border-border/10 bg-card p-4 shadow-sm shadow-black/20">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title ?? "Last 7 Days Trend"}
      </h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.9)" }} tickMargin={6} stroke="rgba(255,255,255,0.45)" />
            <YAxis
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.9)" }}
              tickMargin={6}
              stroke="rgba(255,255,255,0.45)"
              tickFormatter={(v) => "" + v}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                background: "rgba(10,10,10,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#fff",
              }}
              formatter={(value, name) => {
                const num =
                  typeof value === "number"
                    ? value
                    : typeof value === "string"
                      ? Number(value)
                      : null;

                const key = String(name);
                const label =
                  key === "petrol"
                    ? "Petrol"
                    : key === "diesel"
                      ? "Diesel"
                      : key === "lpg"
                        ? "LPG"
                        : key === "cng"
                          ? "CNG"
                          : key;

                if (num == null || !Number.isFinite(num)) return ["-", label];
                return ["" + num.toFixed(2), label];
              }}
            />
            <Legend
              wrapperStyle={{ color: "rgba(255,255,255,0.85)" }}
              formatter={(v) =>
                v === "petrol"
                  ? "Petrol"
                  : v === "diesel"
                    ? "Diesel"
                    : v === "lpg"
                      ? "LPG"
                      : v === "cng"
                        ? "CNG"
                        : v
              }
            />
            <Line
              type="monotone"
              dataKey="petrol"
              stroke="#FF7A00"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="diesel"
              stroke="#00D26A"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="lpg"
              stroke="#FF7A00"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="cng"
              stroke="#00D26A"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
