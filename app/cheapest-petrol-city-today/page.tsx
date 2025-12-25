import type { Metadata } from "next";

import { supabaseServiceClient } from "../../lib/supabase";

export const metadata: Metadata = {
  title: "Cheapest Petrol City in India Today | FuelPriceIndia",
  description:
    "Find the city with the lowest petrol price in India today. Updated daily using verified fuel price data.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getIndiaDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatInr(value: number) {
  return `₹${value.toFixed(2)}`;
}

type CheapestRow = {
  state_code: string;
  city_name: string;
  date: string;
  petrol_price: number | null;
};

export default async function CheapestPetrolCityTodayPage() {
  const { data: latestDateData, error: latestDateError } = await supabaseServiceClient
    .from("fuel_prices")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (latestDateError) throw latestDateError;

  const latestDate = (latestDateData ?? [])?.[0]?.date ?? null;
  const todayStr = getIndiaDateString(new Date());
  const snapshotDate = latestDate || todayStr;

  const { data, error } = await supabaseServiceClient
    .from("fuel_prices")
    .select("state_code,city_name,date,petrol_price")
    .eq("date", snapshotDate)
    .not("petrol_price", "is", null)
    .gte("petrol_price", 40)
    .lte("petrol_price", 250)
    .order("petrol_price", { ascending: true })
    .limit(1);

  if (error) throw error;

  const cheapest = (data?.[0] as CheapestRow | undefined) ?? null;

  let stateName: string | null = null;
  if (cheapest?.state_code) {
    const { data: stateData, error: stateError } = await supabaseServiceClient
      .from("states")
      .select("name")
      .eq("code", String(cheapest.state_code).toUpperCase())
      .maybeSingle();

    if (stateError) throw stateError;
    stateName = (stateData?.name as string | undefined) ?? null;
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Cheapest Petrol City in India Today
        </h1>
        <p className="text-sm text-muted">
          We calculate this by comparing today’s verified petrol prices across
          Indian cities and selecting the lowest available price.
        </p>
        <p className="text-xs text-muted/80">Latest snapshot date: {snapshotDate}</p>
      </header>

      <section className="rounded-2xl border border-border/10 bg-card p-4">
        {!latestDate ? (
          <p className="text-sm text-muted">
            We don’t have petrol price data yet. Please check back later.
          </p>
        ) : !cheapest ? (
          <p className="text-sm text-muted">
            We don’t have petrol price data for the latest date yet. Please check back later.
          </p>
        ) : (
          <div className="space-y-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                City
              </h2>
              <p className="mt-1 text-lg font-semibold text-text">
                {cheapest.city_name}
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                State
              </h2>
              <p className="mt-1 text-sm text-text">
                {stateName ?? cheapest.state_code}
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Petrol price
              </h2>
              <p className="mt-1 text-lg font-semibold text-success">
                {cheapest.petrol_price != null
                  ? `${formatInr(Number(cheapest.petrol_price))} / L`
                  : "-"}
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Last updated
              </h2>
              <p className="mt-1 text-sm text-muted">{cheapest.date}</p>
            </div>
          </div>
        )}
      </section>

      <p className="text-xs text-muted/80">
        Fuel prices may vary slightly between fuel stations.
      </p>
    </main>
  );
}
