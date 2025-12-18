import { Metadata } from "next";
import Link from "next/link";
import { supabaseServiceClient } from "../../../lib/supabase";
import { FuelPriceCards } from "../../../components/ui/FuelPriceCards";
import { FuelTrendChartToggle } from "../../../components/ui/FuelTrendChartToggle";
import AdUnit from "../../../components/AdUnit";
import { buildChartData, getFuelHistory, getTodayFuelPrices } from "../../../lib/fuelStore";

export async function generateMetadata({
  params,
}: {
  params: { state: string; city: string };
}): Promise<Metadata> {
  const stateCode = params.state.toUpperCase();
  const cityName = decodeURIComponent(params.city);

  const { data: stateRow } = await supabaseServiceClient
    .from("states")
    .select("name")
    .eq("code", stateCode)
    .maybeSingle();

  const stateName = stateRow?.name ?? stateCode;

  return {
    title: `Petrol & Diesel Price Today in ${cityName}, ${stateName} – FuelPriceIndia`,
    description: `Check today’s petrol and diesel prices in ${cityName}, ${stateName}, India, along with a 7-day price trend. Data cached from external APIs in Supabase.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: { state: string; city: string };
}) {
  const stateCode = params.state.toUpperCase();
  const cityName = decodeURIComponent(params.city);

  const [{ today, yesterday }, historyResult] = await Promise.all([
    getTodayFuelPrices(stateCode, cityName),
    getFuelHistory(cityName, stateCode, 30),
  ]);

  const history = historyResult ?? [];
  const todayRow = today ?? history[history.length - 1] ?? null;
  const yesterdayRow = yesterday ?? null;

  const noDataYet = !todayRow && history.length === 0;

  const toFuel = (key: string) => {
    const rawPrice = todayRow ? (todayRow as any)[`${key}_price`] ?? null : null;
    const rawYPrice = yesterdayRow ? (yesterdayRow as any)[`${key}_price`] ?? null : null;
    const price = typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;
    const yPrice = typeof rawYPrice === "number" && Number.isFinite(rawYPrice) && rawYPrice > 0 ? rawYPrice : null;
    const change = price != null && yPrice != null ? price - yPrice : null;
    return { price, change };
  };

  const chartDataByFuel = {
    petrol: buildChartData(history, "petrol"),
    diesel: buildChartData(history, "diesel"),
    lpg: buildChartData(history, "lpg"),
    cng: buildChartData(history, "cng"),
  };

  return (
    <div className="space-y-6">
      <Breadcrumb stateCode={stateCode} cityName={cityName} />

      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Fuel prices in {cityName}
        </h1>
        {noDataYet ? (
          <p className="text-xs text-muted/80">No data available for this city yet.</p>
        ) : (
          <p className="text-xs text-muted/80">
            Last updated on {new Date((todayRow as any).date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </section>

      <FuelPriceCards
        petrol={toFuel("petrol")}
        diesel={toFuel("diesel")}
        lpg={toFuel("lpg")}
        cng={toFuel("cng")}
      />

      <FuelTrendChartToggle chartDataByFuel={chartDataByFuel} days={30} />

      <AdUnit slot="4087128161" className="my-8" />

      <section className="mt-4 rounded-2xl border border-border/10 bg-card p-4 text-xs text-muted">
        Prices are approximate and for informational purposes only. They may differ slightly
        from actual rates at your local fuel pump.
      </section>
    </div>
  );
}

function Breadcrumb({
  stateCode,
  cityName,
}: {
  stateCode: string;
  cityName: string;
}) {
  return (
    <nav className="text-xs text-muted/80" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="transition-colors hover:text-text">
            Home
          </Link>
        </li>
        <li>/</li>
        <li>
          <Link href={`/${stateCode.toLowerCase()}`} className="transition-colors hover:text-text">
            {stateCode}
          </Link>
        </li>
        <li>/</li>
        <li className="font-medium text-text">{cityName}</li>
      </ol>
    </nav>
  );
}
