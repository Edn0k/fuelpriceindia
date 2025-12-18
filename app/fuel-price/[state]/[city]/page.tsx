import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { InternalLinks } from "../../../../components/seo/InternalLinks";
import { FuelPriceCards } from "../../../../components/ui/FuelPriceCards";
import { DeferredPriceTrendChart } from "../../../../components/ui/DeferredPriceTrendChart";
import { CostToTravelCalculator } from "../../../../components/tools/CostToTravelCalculator";
import AdUnit from "../../../../components/AdUnit";
import { getSiteUrl } from "../../../../lib/siteUrl";
import {
    formatPriceForTitle,
    getCheapestPetrolSummaryLatest,
    getCityHistoryByKey,
    resolveCityInStateFromParam,
} from "../../../../lib/seoFuelRepo";
import {
    buildBreadcrumbLd,
    buildCanonicalCityPage,
    buildCanonicalStatePage,
    buildCityDatasetLd,
    buildCityFaqLd,
    computeTravelCost,
    formatInr,
    toCitySlug,
} from "../../../../lib/seoSchemas";

export const revalidate = 60 * 60 * 24;

export async function generateMetadata({
    params,
}: {
    params: { state: string; city: string };
}): Promise<Metadata> {
    const resolved = await resolveCityInStateFromParam(params.state, params.city);
    const siteUrl = getSiteUrl();

    if (resolved.kind !== "resolved") {
        const canonical = `${siteUrl}/fuel-price/${encodeURIComponent(params.state)}/${encodeURIComponent(params.city)}`;
        return {
            title: `Fuel price in ${decodeURIComponent(params.city)} today | Petrol, Diesel, LPG & CNG`,
            description: `Check today’s petrol, diesel, LPG and CNG prices in ${decodeURIComponent(
                params.city,
            )}. Updated daily with price trends and a fuel cost calculator.`,
            alternates: { canonical },
        };
    }

    const snap = resolved.snapshot;
    const cityName = snap.city_name;
    const petrolTitlePrice = formatPriceForTitle(snap.petrol_price);

    const title = petrolTitlePrice
        ? `Petrol Price in ${cityName} Today (${petrolTitlePrice}) | Diesel, LPG & CNG Rates`
        : `Petrol Price in ${cityName} Today | Diesel, LPG & CNG Rates`;

    const description = `Check today’s petrol, diesel, LPG and CNG prices in ${cityName}. Updated daily with 7-day trends and a fuel cost calculator.`;

    const canonical = buildCanonicalCityPage("fuel-price", snap.state_code, cityName);

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: { title, description, url: canonical, type: "article" },
        twitter: { card: "summary_large_image", title, description },
    };
}

export default async function FuelPriceCityCanonicalPage({
    params,
}: {
    params: { state: string; city: string };
}) {
    const resolved = await resolveCityInStateFromParam(params.state, params.city);

    if (resolved.kind === "not_found") notFound();

    const stateLower = params.state.toLowerCase();

    if (resolved.kind === "ambiguous") {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight text-text">
                    Choose the correct city
                </h1>
                <div className="rounded-2xl border border-border/10 bg-card p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {resolved.candidates.map((c) => (
                            <Link
                                key={`${c.state_code}-${c.city_name}`}
                                href={`/fuel-price/${encodeURIComponent(stateLower)}/${encodeURIComponent(
                                    toCitySlug(c.city_name),
                                )}`}
                                className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                            >
                                {c.city_name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const snap = resolved.snapshot;
    const cityName = snap.city_name;

    const canonical = buildCanonicalCityPage("fuel-price", snap.state_code, cityName);
    const siteUrl = getSiteUrl();
    const stateCanonical = buildCanonicalStatePage("fuel-price", snap.state_code);

    const history30 = await getCityHistoryByKey(snap.state_code, cityName, 30);
    const history7 = history30.slice(Math.max(0, history30.length - 7));

    const todayRow = history30[history30.length - 1] ?? snap;
    const yesterdayRow = history30.length >= 2 ? history30[history30.length - 2] : null;

    const latestNonNull = (key: "petrol" | "diesel" | "lpg" | "cng") => {
        const col = `${key}_price` as const;
        for (let i = history30.length - 1; i >= 0; i -= 1) {
            const v = (history30[i] as any)?.[col] ?? null;
            if (typeof v === "number" && Number.isFinite(v)) return v;
        }
        const snapV = (snap as any)?.[col] ?? null;
        return typeof snapV === "number" && Number.isFinite(snapV) ? snapV : null;
    };

    const latestNonNullBeforeToday = (key: "petrol" | "diesel" | "lpg" | "cng") => {
        const col = `${key}_price` as const;
        for (let i = history30.length - 2; i >= 0; i -= 1) {
            const v = (history30[i] as any)?.[col] ?? null;
            if (typeof v === "number" && Number.isFinite(v)) return v;
        }
        return null;
    };

    const toFuel = (key: "petrol" | "diesel" | "lpg" | "cng") => {
        const todayPriceRaw = (todayRow as any)[`${key}_price`] ?? null;
        const usedFallback = todayPriceRaw == null;
        const price = usedFallback ? latestNonNull(key) : todayPriceRaw;
        const yPrice = yesterdayRow ? (yesterdayRow as any)[`${key}_price`] ?? null : latestNonNullBeforeToday(key);
        const change = !usedFallback && price != null && yPrice != null ? price - yPrice : null;
        return { price, change };
    };

    const trend7 = history7.map((row) => ({
        date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        petrol: row.petrol_price,
        diesel: row.diesel_price,
    }));

    const trend30 = history30.map((row) => ({
        date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        petrol: row.petrol_price,
        diesel: row.diesel_price,
    }));

    const change7 = (() => {
        if (history7.length < 2) return null;
        const first = history7[0]?.petrol_price ?? null;
        const last = history7[history7.length - 1]?.petrol_price ?? null;
        if (typeof first !== "number" || typeof last !== "number") return null;
        return last! - first!;
    })();

    const cheapestSummary = await getCheapestPetrolSummaryLatest();
    const avg = cheapestSummary?.nationalAverage ?? null;
    const diffVsAvg = avg != null && todayRow.petrol_price != null ? todayRow.petrol_price - avg : null;

    const bikeCost = computeTravelCost(todayRow.petrol_price, 45);
    const carCost = computeTravelCost(todayRow.petrol_price, 18);
    const suvCost = computeTravelCost(todayRow.petrol_price, 12);

    const bread = buildBreadcrumbLd([
        { name: "Home", item: siteUrl },
        { name: "Fuel price", item: `${siteUrl}/fuel-price` },
        { name: snap.state_code, item: stateCanonical },
        { name: cityName, item: canonical },
    ]);

    return (
        <div className="space-y-6">
            <JsonLd data={bread} />
            <JsonLd data={buildCityDatasetLd(canonical, todayRow)} />
            <JsonLd
                data={
                    buildCityFaqLd({
                        cityName,
                        petrolPrice: todayRow.petrol_price,
                        dieselPrice: todayRow.diesel_price,
                    })
                }
            />

            <section className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-text">Fuel price in {cityName} today</h1>
                <p className="text-xs text-muted/80">Last updated on {todayRow.date}</p>
            </section>

            <FuelPriceCards petrol={toFuel("petrol")} diesel={toFuel("diesel")} lpg={toFuel("lpg")} cng={toFuel("cng")} />

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Fuel price trend in {cityName}</h2>
                <p className="mt-2 text-sm text-muted">
                    {change7 == null
                        ? `Petrol prices in ${cityName} have been updated daily over the last 7 days.`
                        : change7 === 0
                            ? `Petrol prices in ${cityName} stayed flat over the last 7 days.`
                            : `Petrol prices in ${cityName} ${change7 > 0 ? "increased" : "decreased"} by ${formatInr(
                                  Math.abs(change7),
                              )} over the last 7 days.`}
                </p>
            </section>

            <DeferredPriceTrendChart data={trend7} title="7-day petrol & diesel trend" />
            <DeferredPriceTrendChart data={trend30} title="30-day petrol & diesel trend" />

            <CostToTravelCalculator
                cityName={cityName}
                prices={{
                    petrol: todayRow.petrol_price,
                    diesel: todayRow.diesel_price,
                    lpg: todayRow.lpg_price,
                    cng: todayRow.cng_price,
                }}
            />

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Cost to travel 100 km in {cityName}</h2>
                <p className="mt-2 text-sm text-muted">
                    At today’s petrol price ({formatInr(todayRow.petrol_price) ?? "-"}), travelling 100 km costs about {formatInr(
                        bikeCost,
                        0,
                    ) ?? "-"} on a bike, {formatInr(carCost, 0) ?? "-"} in a small car, and {formatInr(suvCost, 0) ?? "-"} in an SUV.
                </p>
            </section>

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Cheapest fuel cities comparison</h2>
                <p className="mt-2 text-sm text-muted">
                    {avg == null || diffVsAvg == null
                        ? `Compare ${cityName} with the cheapest petrol cities in India.`
                        : `In ${cityName}, petrol is ${formatInr(Math.abs(diffVsAvg))} ${diffVsAvg > 0 ? "above" : "below"} the national average today.`}
                </p>
                <div className="mt-3">
                    <Link href="/cheapest-fuel/today" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                        View cheapest petrol cities in India today
                    </Link>
                </div>
            </section>

            <AdUnit slot="4087128161" className="my-8" />

            <InternalLinks stateCode={snap.state_code} cityName={cityName} />
        </div>
    );
}
