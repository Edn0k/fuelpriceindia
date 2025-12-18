"use client";

import { useEffect, useMemo, useState } from "react";
import { StateCitySelector } from "../components/ui/StateCitySelector";
import { FuelPriceCards, FuelPrice } from "../components/ui/FuelPriceCards";
import { type FuelTrendChartData } from "../components/ui/FuelTrendChart";
import { FuelTrendChartToggle } from "../components/ui/FuelTrendChartToggle";
import { CostToTravelCalculator } from "../components/tools/CostToTravelCalculator";
import AdUnit from "../components/AdUnit";

type CheapestPetrolSummary = {
  date: string;
  count: number;
  nationalAverage: number | null;
  cheapest: { city: string; stateCode: string; price: number } | null;
  mostExpensive: { city: string; stateCode: string; price: number } | null;
  top5: { city: string; stateCode: string; price: number }[];
};

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatInr(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `₹${value.toFixed(2)}`;
}

export default function HomePage() {
  const [error, setError] = useState<string | null>(null);
  const [noDataYet, setNoDataYet] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [todayPrices, setTodayPrices] = useState<{
    petrol: FuelPrice;
    diesel: FuelPrice;
    lpg: FuelPrice;
    cng: FuelPrice;
  } | null>(null);
  const [chartDataByFuel, setChartDataByFuel] = useState<{
    petrol: FuelTrendChartData;
    diesel: FuelTrendChartData;
    lpg: FuelTrendChartData;
    cng: FuelTrendChartData;
  }>({
    petrol: { labels: [], values: [] },
    diesel: { labels: [], values: [] },
    lpg: { labels: [], values: [] },
    cng: { labels: [], values: [] },
  });

  const [cheapest, setCheapest] = useState<CheapestPetrolSummary | null>(null);
  const [cheapestError, setCheapestError] = useState<string | null>(null);
  const [cheapestLoading, setCheapestLoading] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function loadCheapest() {
      try {
        setCheapestLoading(true);
        setCheapestError(null);
        const res = await fetch("/api/cheapest-petrol", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Unable to load cheapest petrol price");
        if (!canceled) setCheapest((json.summary ?? null) as CheapestPetrolSummary | null);
      } catch (e: any) {
        if (!canceled) setCheapestError(e?.message ?? "Unable to load cheapest petrol price");
      } finally {
        if (!canceled) setCheapestLoading(false);
      }
    }
    loadCheapest();
    return () => {
      canceled = true;
    };
  }, []);

  const cheapestCard = useMemo(() => {
    if (!cheapest) return null;
    const cheapestCity = cheapest.cheapest;
    const avg = cheapest.nationalAverage;
    return { cheapestCity, avg, date: cheapest.date, count: cheapest.count };
  }, [cheapest]);

  const handleLocationChange = async (stateCode: string, city: string) => {
    setError(null);
    setNoDataYet(null);
    setLocationLabel(`${city}, ${stateCode}`);
    setSelectedCity(city);
    try {
      const res = await fetch(
        `/api/fuel-prices?stateCode=${encodeURIComponent(
          stateCode,
        )}&city=${encodeURIComponent(city)}&days=30&fuel=petrol`,
      );
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setTodayPrices({
            petrol: { price: null, change: null },
            diesel: { price: null, change: null },
            lpg: { price: null, change: null },
            cng: { price: null, change: null },
          });
          setChartDataByFuel({
            petrol: { labels: [], values: [] },
            diesel: { labels: [], values: [] },
            lpg: { labels: [], values: [] },
            cng: { labels: [], values: [] },
          });
          setNoDataYet(json.error ?? "No data available for this city yet.");
          return;
        }

        setError(json.error ?? "Unable to load fuel prices right now.");
        setTodayPrices(null);
        setChartDataByFuel({
          petrol: { labels: [], values: [] },
          diesel: { labels: [], values: [] },
          lpg: { labels: [], values: [] },
          cng: { labels: [], values: [] },
        });
        return;
      }

      const history = Array.isArray(json.history) ? json.history : [];
      const today = json.today ?? history?.[history.length - 1] ?? null;
      const yesterday = json.yesterday ?? null;

      const lastNonNullFromHistory = (key: string): number | null => {
        const col = `${key}_price`;
        for (let i = history.length - 1; i >= 0; i -= 1) {
          const v = toNum(history[i]?.[col]);
          if (v != null && v > 0) return v;
        }
        return null;
      };

      const toFuel = (key: string): FuelPrice => {
        const priceRaw = today ? toNum(today[`${key}_price`]) : null;
        const yPriceRaw = yesterday ? toNum(yesterday[`${key}_price`]) : null;
        let price = priceRaw != null && priceRaw > 0 ? priceRaw : null;
        let usedFallback = false;
        if (price == null) {
          const fb = lastNonNullFromHistory(key);
          if (fb != null) {
            price = fb;
            usedFallback = true;
          }
        }
        const yPrice = yPriceRaw != null && yPriceRaw > 0 ? yPriceRaw : null;
        const change = !usedFallback && price != null && yPrice != null ? price - yPrice : null;
        return { price, change };
      };

      setTodayPrices({
        petrol: toFuel("petrol"),
        diesel: toFuel("diesel"),
        lpg: toFuel("lpg"),
        cng: toFuel("cng"),
      });

      const raw = (json.chartDataByFuel ?? null) as any;
      const normalize = (v: any): FuelTrendChartData => {
        const labels = Array.isArray(v?.labels) ? v.labels : [];
        const values = Array.isArray(v?.values) ? v.values : [];
        return { labels, values };
      };

      if (raw) {
        setChartDataByFuel({
          petrol: normalize(raw.petrol),
          diesel: normalize(raw.diesel),
          lpg: normalize(raw.lpg),
          cng: normalize(raw.cng),
        });
      } else {
        setChartDataByFuel({
          petrol: { labels: [], values: [] },
          diesel: { labels: [], values: [] },
          lpg: { labels: [], values: [] },
          cng: { labels: [], values: [] },
        });
      }
    } catch (e) {
      setError("Unable to load fuel prices right now.");
      setNoDataYet(null);
      setTodayPrices(null);
      setChartDataByFuel({
        petrol: { labels: [], values: [] },
        diesel: { labels: [], values: [] },
        lpg: { labels: [], values: [] },
        cng: { labels: [], values: [] },
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
          Daily fuel prices
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Fuel prices across India, updated daily.
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          Check today’s fuel prices in your city, including petrol, diesel, LPG and CNG.
          Updated daily for reliable and fast access.
        </p>
      </section>

      <section className="rounded-2xl border border-border/15 bg-card p-4">
        <h2 className="border-l-2 border-border/25 pl-3 text-sm font-semibold uppercase tracking-wide text-white/80">
          Cheapest petrol price today
        </h2>
        {cheapestLoading && (
          <p className="mt-2 text-sm text-muted">Loading…</p>
        )}
        {!cheapestLoading && cheapestError && (
          <p className="mt-2 text-sm text-primary">{cheapestError}</p>
        )}
        {!cheapestLoading && !cheapestError && !cheapestCard && (
          <p className="mt-2 text-sm text-muted">No data available yet.</p>
        )}
        {cheapestCard && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/15 bg-surface p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Cheapest city</p>
              <p className="mt-1 text-lg font-semibold text-text">
                {cheapestCard.cheapestCity
                  ? `${cheapestCard.cheapestCity.city} (${cheapestCard.cheapestCity.stateCode})`
                  : "-"}
              </p>
              <p className="mt-1 text-sm font-semibold text-success">
                {cheapestCard.cheapestCity ? formatInr(cheapestCard.cheapestCity.price) : "-"}
              </p>
            </div>
            <div className="rounded-xl border border-border/15 bg-surface p-3">
              <p className="text-xs uppercase tracking-wide text-muted">National average</p>
              <p className="mt-1 text-lg font-semibold text-success/80">{formatInr(cheapestCard.avg)}</p>
              <p className="mt-1 text-xs text-muted/80">Across {cheapestCard.count} cities</p>
            </div>
            <div className="rounded-xl border border-border/15 bg-surface p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Snapshot date</p>
              <p className="mt-1 text-lg font-semibold text-text">{cheapestCard.date}</p>
            </div>
          </div>
        )}
      </section>

      <StateCitySelector onLocationChange={handleLocationChange} />

      {noDataYet && (
        <div className="mt-4 rounded-2xl border border-border/15 bg-surface px-4 py-3 text-sm text-muted">
          {noDataYet}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-border/15 bg-surface px-4 py-3 text-sm text-muted">
          <p className="font-medium text-text">Unable to load fuel prices right now.</p>
          <p className="mt-1 text-xs text-white/70">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNoDataYet(null);
              setTodayPrices(null);
              setChartDataByFuel({
                petrol: { labels: [], values: [] },
                diesel: { labels: [], values: [] },
                lpg: { labels: [], values: [] },
                cng: { labels: [], values: [] },
              });
            }}
            className="mt-2 inline-flex items-center rounded-full border border-primary/60 bg-transparent px-3 py-1 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-black"
          >
            Clear message
          </button>
        </div>
      )}

      {todayPrices && (
        <FuelPriceCards
          petrol={todayPrices.petrol}
          diesel={todayPrices.diesel}
          lpg={todayPrices.lpg}
          cng={todayPrices.cng}
        />
      )}

      <FuelTrendChartToggle chartDataByFuel={chartDataByFuel} days={30} />

      {(selectedCity || cheapestCard?.cheapestCity) && (
        <CostToTravelCalculator
          cityName={selectedCity ?? cheapestCard!.cheapestCity!.city}
          prices={
            selectedCity
              ? {
                  petrol: todayPrices?.petrol.price ?? null,
                  diesel: todayPrices?.diesel.price ?? null,
                  lpg: todayPrices?.lpg.price ?? null,
                  cng: todayPrices?.cng.price ?? null,
                }
              : {
                  petrol: cheapestCard!.cheapestCity!.price,
                  diesel: null,
                  lpg: null,
                  cng: null,
                }
          }
        />
      )}

      <AdUnit slot="7371767054" className="my-8" />

      <section className="mt-6 rounded-2xl border border-border/15 bg-card p-4 text-xs text-muted sm:p-5">
        <p>
          Prices shown here are for informational purposes only and may differ slightly from
          actual pump prices in your city. Always check the official fuel pump display before
          refuelling.
        </p>
      </section>
    </div>
  );
}
