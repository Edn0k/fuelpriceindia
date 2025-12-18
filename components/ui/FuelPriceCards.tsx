import { ArrowDownRight, ArrowUpRight, Minus, Flame, Droplets, Leaf, Fuel } from "lucide-react";

export type FuelPrice = {
  price: number | null;
  change: number | null;
};

export type FuelPriceCardsProps = {
  petrol: FuelPrice;
  diesel: FuelPrice;
  lpg: FuelPrice;
  cng: FuelPrice;
};

function convertLpgCylinderToKgPrice(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  const LPG_CYLINDER_KG = 14.2;
  return value / LPG_CYLINDER_KG;
}

function formatPrice(value: number | null) {
  if (value == null) return "N/A";
  // Proper rupee symbol with two decimal places
  return `₹${value.toFixed(2)}`;
}

function formatChange(change: number | null) {
  if (change == null) {
    return { label: "No change data yet", tone: "muted" as const, Icon: Minus };
  }
  if (change === 0) {
    return { label: "No change since yesterday", tone: "muted" as const, Icon: Minus };
  }

  const up = change > 0;
  const abs = Math.abs(change).toFixed(2);

  return {
    label: `${up ? "+" : "-"}₹${abs} vs yesterday`,
    tone: up ? ("up" as const) : ("down" as const),
    Icon: up ? ArrowUpRight : ArrowDownRight,
  };
}

const cards = [
  {
    key: "petrol" as const,
    label: "Petrol",
    Icon: Fuel,
    accent: "bg-surface/70 text-white/70 border border-border/15",
    unitLabel: "Per litre",
  },
  {
    key: "diesel" as const,
    label: "Diesel",
    Icon: Droplets,
    accent: "bg-surface/70 text-white/70 border border-border/15",
    unitLabel: "Per litre",
  },
  {
    key: "lpg" as const,
    label: "LPG",
    Icon: Flame,
    accent: "bg-surface/70 text-white/70 border border-border/15",
    unitLabel: "Per 14.2 kg cylinder",
  },
  {
    key: "cng" as const,
    label: "CNG",
    Icon: Leaf,
    accent: "bg-surface/70 text-white/70 border border-border/15",
    unitLabel: "Per kg",
  },
];

export function FuelPriceCards(props: FuelPriceCardsProps) {
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-2">
      {cards.map(({ key, label, Icon, accent, unitLabel }) => {
        const raw = props[key];
        const data = raw;
        const unavailable = raw.price == null;
        const priceClass = unavailable
          ? "text-muted"
          : "text-success";
        const { label: changeLabel, tone, Icon: TrendIcon } = unavailable
          ? { label: "Price not available", tone: "muted" as const, Icon: Minus }
          : formatChange(data.change);

        const lpgPerKg = key === "lpg" ? convertLpgCylinderToKgPrice(raw.price) : null;

        return (
          <article
            key={key}
            className="flex flex-col rounded-2xl border border-border/15 bg-card p-4 shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-border/25"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-text">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span>{label}</span>
              </div>
              <p className="text-xs uppercase tracking-wide text-muted/70">{unitLabel}</p>
            </div>

            <div className="mt-4 flex items-end justify-between gap-2">
              <div>
                <p className={`text-2xl font-semibold tracking-tight ${priceClass}`}>
                  {formatPrice(data.price)}
                </p>
                {key === "lpg" && lpgPerKg != null && (
                  <p className="mt-1 text-xs text-success/70">~{formatPrice(lpgPerKg)}/kg</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <TrendIcon
                  className={`h-3.5 w-3.5 ${
                    tone === "up"
                      ? "text-success/80"
                      : tone === "down"
                      ? "text-success/60"
                      : "text-muted/70"
                  }`}
                />
                <span
                  className={`${
                    tone === "up"
                      ? "text-success/80"
                      : tone === "down"
                      ? "text-success/60"
                      : "text-muted"
                  } text-[11px]`}
                >
                  {changeLabel}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}