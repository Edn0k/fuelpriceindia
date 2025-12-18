import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { InternalLinks } from "../../../../components/seo/InternalLinks";
import { FuelPriceCards } from "../../../../components/ui/FuelPriceCards";
import { DeferredPriceTrendChart } from "../../../../components/ui/DeferredPriceTrendChart";
import AdUnit from "../../../../components/AdUnit";
import { getSiteUrl } from "../../../../lib/siteUrl";
import {
    formatPriceForTitle,
    getCityHistoryByKey,
    resolveCityInStateFromParam,
} from "../../../../lib/seoFuelRepo";
import {
    buildBreadcrumbLd,
    buildCanonicalCityPage,
    buildCanonicalStatePage,
    buildCityDatasetLd,
    buildCityFaqLd,
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
        const canonical = `${siteUrl}/petrol-price/${encodeURIComponent(params.state)}/${encodeURIComponent(params.city)}`;
        return {
            title: `Petrol price in ${decodeURIComponent(params.city)} today`,
            description: `Check today’s petrol price in ${decodeURIComponent(
                params.city,
            )}, plus diesel, LPG and CNG rates and a 7-day trend.`,
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

    const canonical = buildCanonicalCityPage("petrol-price", snap.state_code, cityName);

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: { title, description, url: canonical, type: "article" },
        twitter: { card: "summary_large_image", title, description },
    };
}

export default async function PetrolPriceCityCanonicalPage({
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
                                href={`/petrol-price/${encodeURIComponent(stateLower)}/${encodeURIComponent(
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

    const canonical = buildCanonicalCityPage("petrol-price", snap.state_code, cityName);
    const siteUrl = getSiteUrl();
    const stateCanonical = buildCanonicalStatePage("petrol-price", snap.state_code);

    const history = await getCityHistoryByKey(snap.state_code, cityName, 7);
    const todayRow = history[history.length - 1] ?? snap;
    const yesterdayRow = history.length >= 2 ? history[history.length - 2] : null;

    const yPetrol = yesterdayRow?.petrol_price ?? null;
    const yDiesel = yesterdayRow?.diesel_price ?? null;
    const petrolPrice = todayRow.petrol_price;
    const dieselPrice = todayRow.diesel_price;

    const trend = history.map((row) => ({
        date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        petrol: row.petrol_price,
        diesel: row.diesel_price,
    }));

    const cards = {
        petrol: {
            price: todayRow.petrol_price,
            change:
                petrolPrice !== null && yPetrol !== null
                    ? petrolPrice! - yPetrol!
                    : null,
        },
        diesel: {
            price: todayRow.diesel_price,
            change:
                dieselPrice !== null && yDiesel !== null
                    ? dieselPrice! - yDiesel!
                    : null,
        },
        lpg: { price: todayRow.lpg_price, change: null },
        cng: { price: todayRow.cng_price, change: null },
    };

    const bread = buildBreadcrumbLd([
        { name: "Home", item: siteUrl },
        { name: "Petrol price", item: `${siteUrl}/petrol-price` },
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
                <h1 className="text-2xl font-semibold tracking-tight text-text">Petrol Price in {cityName} Today</h1>
                <p className="text-xs text-muted/80">Snapshot date: {todayRow.date}</p>
            </section>

            <FuelPriceCards petrol={cards.petrol} diesel={cards.diesel} lpg={cards.lpg} cng={cards.cng} />

            <DeferredPriceTrendChart data={trend} title="7-day petrol & diesel trend" />

            <AdUnit slot="4087128161" className="my-8" />

            <InternalLinks stateCode={snap.state_code} cityName={cityName} />
        </div>
    );
}
