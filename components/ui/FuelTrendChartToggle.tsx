"use client";

import { useMemo, useState } from "react";
import { FuelTrendChart, type FuelTrendChartData } from "./FuelTrendChart";

type FuelKey = "petrol" | "diesel" | "lpg" | "cng";

type Props = {
  chartDataByFuel: Record<FuelKey, FuelTrendChartData>;
  days: number;
  defaultFuel?: FuelKey;
};

export function FuelTrendChartToggle({ chartDataByFuel, days, defaultFuel }: Props) {
  const fuels = useMemo(
    () => [
      { key: "petrol" as const, label: "Petrol" },
      { key: "diesel" as const, label: "Diesel" },
      { key: "lpg" as const, label: "LPG" },
      { key: "cng" as const, label: "CNG" },
    ],
    [],
  );

  const [selected, setSelected] = useState<FuelKey>(defaultFuel ?? "petrol");

  const title = `${fuels.find((f) => f.key === selected)?.label ?? "Fuel"} price trend (last ${days} days)`;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {fuels.map((fuel) => {
          const active = fuel.key === selected;
          return (
            <button
              key={fuel.key}
              type="button"
              onClick={() => setSelected(fuel.key)}
              className={
                active
                  ? "min-h-[44px] rounded-full border border-primary bg-primary px-4 py-2 text-xs font-medium text-white"
                  : "min-h-[44px] rounded-full border border-border/15 bg-card px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:bg-surface hover:text-text"
              }
            >
              {fuel.label}
            </button>
          );
        })}
      </div>

      <FuelTrendChart data={chartDataByFuel[selected]} title={title} />
    </section>
  );
}
