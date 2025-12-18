import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { FuelPriceCards } from "../../../../components/ui/FuelPriceCards";
import { DeferredPriceTrendChart } from "../../../../components/ui/DeferredPriceTrendChart";
import { getSiteUrl } from "../../../../lib/siteUrl";
import {
    getCityHistoryByKey,
    resolveCityFromParam,
} from "../../../../lib/seoFuelRepo";
import { buildBreadcrumbLd, buildCityDatasetLd, buildCityFaqLd, formatInr, toCitySlug } from "../../../../lib/seoSchemas";

export const revalidate = 60 * 60 * 24;

export async function generateMetadata({
    params,
    searchParams,
}: {
    params: { city: string };
    searchParams?: { state?: string };
}): Promise<Metadata> {
    const state = searchParams?.state ?? null;
    const resolved = await resolveCityFromParam(params.city, state);

    const siteUrl = getSiteUrl();

    if (resolved.kind !== "resolved") {
        const url = `${siteUrl}/diesel-price/${encodeURIComponent(params.city)}`;
        return {
            title: `Diesel price in ${decodeURIComponent(params.city)} today`,
            description: `Check today’s diesel price in ${decodeURIComponent(
                params.city,
            )}, plus petrol, LPG and CNG rates and a 7-day trend.`,
            alternates: { canonical: url },
        };
    }

    const snap = resolved.snapshot;
    const cityName = snap.city_name;
    const dieselTitlePrice = snap.diesel_price != null ? `₹${snap.diesel_price.toFixed(2)}` : "";

    const title = dieselTitlePrice
        ? `Diesel Price in ${cityName} Today (${dieselTitlePrice}) | Petrol, LPG & CNG Rates`
        : `Diesel Price in ${cityName} Today | Petrol, LPG & CNG Rates`;

    const description = `Check today’s petrol, diesel, LPG and CNG prices in ${cityName}. Updated daily with 7-day trends and fuel cost calculator.`;

    const canonical = `${siteUrl}/diesel-price/${encodeURIComponent(
        snap.state_code.toLowerCase(),
    )}/${encodeURIComponent(toCitySlug(cityName))}`;

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: { title, description, url: canonical, type: "article" },
        twitter: { card: "summary_large_image", title, description },
    };
}

export default async function DieselPriceCityPage({
    params,
    searchParams,
}: {
    params: { city: string };
    searchParams?: { state?: string };
}) {
    const state = searchParams?.state ?? null;
    const resolved = await resolveCityFromParam(params.city, state);

    if (resolved.kind === "not_found") notFound();

    if (resolved.kind === "ambiguous") {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight text-text">
                    Choose a state for {decodeURIComponent(params.city)}
                </h1>
                <div className="rounded-2xl border border-border/10 bg-card p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {resolved.candidates.map((c) => (
                            <Link
                                key={`${c.state_code}-${c.city_name}`}
                                href={`/diesel-price/${encodeURIComponent(
                                    c.state_code.toLowerCase(),
                                )}/${encodeURIComponent(toCitySlug(c.city_name))}`}
                                className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                            >
                                {c.city_name} ({c.state_code})
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const snap = resolved.snapshot;
    permanentRedirect(
        `/diesel-price/${encodeURIComponent(
            snap.state_code.toLowerCase(),
        )}/${encodeURIComponent(toCitySlug(snap.city_name))}`,
    );

    const cityName = snap.city_name;
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}/diesel-price/${encodeURIComponent(
        snap.state_code.toLowerCase(),
    )}/${encodeURIComponent(toCitySlug(cityName))}`;

    const history = await getCityHistoryByKey(snap.state_code, snap.city_name, 7);
    const todayRow = history[history.length - 1] ?? snap;
    const yesterdayRow = history.length >= 2 ? history[history.length - 2] : null;

    const yPetrol = yesterdayRow?.petrol_price ?? null;
    const yDiesel = yesterdayRow?.diesel_price ?? null;
    const petrolPrice = todayRow.petrol_price;
    const dieselPrice = todayRow.diesel_price;

    let petrolChange: number | null = null;
    if (typeof petrolPrice === "number" && typeof yPetrol === "number") {
        petrolChange = petrolPrice! - yPetrol!;
    }

    let dieselChange: number | null = null;
    if (typeof dieselPrice === "number" && typeof yDiesel === "number") {
        dieselChange = dieselPrice! - yDiesel!;
    }

    const trend = history.map((row) => ({
        date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        petrol: row.petrol_price,
        diesel: row.diesel_price,
    }));

    const cards = {
        petrol: {
            price: petrolPrice,
            change: petrolChange,
        },
        diesel: {
            price: dieselPrice,
            change: dieselChange,
        },
        lpg: { price: todayRow.lpg_price, change: null },
        cng: { price: todayRow.cng_price, change: null },
    };

    const bread = buildBreadcrumbLd([
        { name: "Home", item: siteUrl },
        { name: `Diesel price in ${cityName}`, item: canonical },
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
                <h1 className="text-2xl font-semibold tracking-tight text-text">Diesel Price in {cityName} Today</h1>
                <p className="text-xs text-muted/80">Snapshot date: {todayRow.date}</p>
            </section>

            <FuelPriceCards petrol={cards.petrol} diesel={cards.diesel} lpg={cards.lpg} cng={cards.cng} />

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Petrol price in {cityName} today</h2>
                <p className="mt-2 text-sm text-muted">
                    Petrol in {cityName} is {formatInr(todayRow.petrol_price) ?? "-"} per litre today.
                </p>
            </section>

            <DeferredPriceTrendChart data={trend} title="7-day petrol & diesel trend" />

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Fuel history</h2>
                <p className="mt-2 text-sm text-muted">
                    See full trends on the fuel history page.
                </p>
                <div className="mt-3">
                    <Link
                        href={`/fuel-history/${encodeURIComponent(toCitySlug(cityName))}?state=${encodeURIComponent(
                            snap.state_code,
                        )}`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                        View 30-day fuel history
                    </Link>
                </div>
            </section>
        </div>
    );
}
