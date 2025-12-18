import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { InternalLinks } from "../../../../components/seo/InternalLinks";
import { CostToTravelCalculator } from "../../../../components/tools/CostToTravelCalculator";
import AdUnit from "../../../../components/AdUnit";
import { getSiteUrl } from "../../../../lib/siteUrl";
import { getCityHistoryByKey, resolveCityInStateFromParam } from "../../../../lib/seoFuelRepo";
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
        const canonical = `${siteUrl}/cost-to-travel/${encodeURIComponent(params.state)}/${encodeURIComponent(params.city)}`;
        return {
            title: `Cost to travel 100 km in ${decodeURIComponent(params.city)}`,
            description: `Use the mileage-based fuel cost calculator to estimate the cost to travel 100 km in ${decodeURIComponent(
                params.city,
            )}.`,
            alternates: { canonical },
        };
    }

    const snap = resolved.snapshot;
    const cityName = snap.city_name;
    const canonical = buildCanonicalCityPage("cost-to-travel", snap.state_code, cityName);

    return {
        title: `Cost to Travel 100 km in ${cityName} | Fuel Cost Calculator`,
        description: `Estimate cost per km and 100 km travel cost in ${cityName} using your vehicle mileage and today’s petrol price.`,
        alternates: { canonical },
        openGraph: { title: `Cost to Travel 100 km in ${cityName}`, url: canonical, type: "article" },
        twitter: { card: "summary_large_image", title: `Cost to Travel 100 km in ${cityName}` },
    };
}

export default async function CostToTravelCityCanonicalPage({
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
                <h1 className="text-2xl font-semibold tracking-tight text-text">Choose the correct city</h1>
                <div className="rounded-2xl border border-border/10 bg-card p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {resolved.candidates.map((c) => (
                            <Link
                                key={`${c.state_code}-${c.city_name}`}
                                href={`/cost-to-travel/${encodeURIComponent(stateLower)}/${encodeURIComponent(
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

    const siteUrl = getSiteUrl();
    const canonical = buildCanonicalCityPage("cost-to-travel", snap.state_code, cityName);
    const stateCanonical = buildCanonicalStatePage("cost-to-travel", snap.state_code);

    const hist = await getCityHistoryByKey(snap.state_code, cityName, 2);
    const today = hist[hist.length - 1] ?? snap;

    const bike = computeTravelCost(today.petrol_price, 45);
    const car = computeTravelCost(today.petrol_price, 18);
    const suv = computeTravelCost(today.petrol_price, 12);

    const bread = buildBreadcrumbLd([
        { name: "Home", item: siteUrl },
        { name: "Cost to travel", item: `${siteUrl}/cost-to-travel` },
        { name: snap.state_code, item: stateCanonical },
        { name: cityName, item: canonical },
    ]);

    return (
        <div className="space-y-6">
            <JsonLd data={bread} />
            <JsonLd data={buildCityDatasetLd(canonical, today)} />
            <JsonLd
                data={
                    buildCityFaqLd({
                        cityName,
                        petrolPrice: today.petrol_price,
                        dieselPrice: today.diesel_price,
                        sampleMileageKmPerL: 18,
                    })
                }
            />

            <section className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-text">Cost to travel 100 km in {cityName}</h1>
                <p className="text-sm text-muted">
                    At today’s petrol price in {cityName} ({formatInr(today.petrol_price) ?? "-"}), travelling 100 km costs
                    approximately {formatInr(bike, 0) ?? "-"} on a bike, {formatInr(car, 0) ?? "-"} in a small car, and {formatInr(
                        suv,
                        0,
                    ) ?? "-"} in an SUV.
                </p>
            </section>

            <CostToTravelCalculator
                cityName={cityName}
                prices={{
                    petrol: today.petrol_price,
                    diesel: today.diesel_price,
                    lpg: today.lpg_price,
                    cng: today.cng_price,
                }}
            />

            <AdUnit slot="4087128161" className="my-8" />

            <InternalLinks stateCode={snap.state_code} cityName={cityName} />
        </div>
    );
}
