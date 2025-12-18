import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { CostToTravelCalculator } from "../../../../components/tools/CostToTravelCalculator";
import { getSiteUrl } from "../../../../lib/siteUrl";
import { resolveCityFromParam, getCityHistoryByKey } from "../../../../lib/seoFuelRepo";
import { buildBreadcrumbLd, computeTravelCost, formatInr, toCitySlug } from "../../../../lib/seoSchemas";

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
        const url = `${siteUrl}/cost-to-travel/${encodeURIComponent(params.city)}`;
        return {
            title: `Cost to travel 100 km in ${decodeURIComponent(params.city)}`,
            description: `Use the mileage-based fuel cost calculator to estimate the cost to travel 100 km in ${decodeURIComponent(
                params.city,
            )}.`,
            alternates: { canonical: url },
        };
    }

    const snap = resolved.snapshot;
    const cityName = snap.city_name;
    const canonical = `${siteUrl}/cost-to-travel/${encodeURIComponent(
        snap.state_code.toLowerCase(),
    )}/${encodeURIComponent(toCitySlug(cityName))}`;

    return {
        title: `Cost to Travel 100 km in ${cityName} | Fuel Cost Calculator`,
        description: `Estimate cost per km and 100 km travel cost in ${cityName} using your vehicle mileage and today’s petrol price.`,
        alternates: { canonical },
        openGraph: { title: `Cost to Travel 100 km in ${cityName}`, url: canonical, type: "article" },
        twitter: { card: "summary_large_image", title: `Cost to Travel 100 km in ${cityName}` },
    };
}

export default async function CostToTravelCityPage({
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
                                href={`/cost-to-travel/${encodeURIComponent(
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
        `/cost-to-travel/${encodeURIComponent(
            snap.state_code.toLowerCase(),
        )}/${encodeURIComponent(toCitySlug(snap.city_name))}`,
    );

    const cityName = snap.city_name;
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}/cost-to-travel/${encodeURIComponent(
        snap.state_code.toLowerCase(),
    )}/${encodeURIComponent(toCitySlug(cityName))}`;

    const hist = await getCityHistoryByKey(snap.state_code, snap.city_name, 2);
    const today = hist[hist.length - 1] ?? snap;

    const bike = computeTravelCost(today.petrol_price, 45);
    const car = computeTravelCost(today.petrol_price, 18);
    const suv = computeTravelCost(today.petrol_price, 12);

    const bread = buildBreadcrumbLd([
        { name: "Home", item: siteUrl },
        { name: `Cost to travel 100 km in ${cityName}`, item: canonical },
    ]);

    return (
        <div className="space-y-6">
            <JsonLd data={bread} />

            <section className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-text">
                    Cost to travel 100 km in {cityName}
                </h1>
                <p className="text-sm text-muted">
                    At today’s petrol price in {cityName} ({formatInr(today.petrol_price) ?? "-"}), travelling 100 km costs
                    approximately {formatInr(bike, 0) ?? "-"} on a bike, {formatInr(car, 0) ?? "-"} in a small car, and
                    {formatInr(suv, 0) ?? "-"} in an SUV.
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

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Explore more</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <Link
                        href={`/fuel-price/${encodeURIComponent(toCitySlug(cityName))}?state=${encodeURIComponent(
                            snap.state_code,
                        )}`}
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        All fuels in {cityName}
                    </Link>
                    <Link
                        href={`/fuel-history/${encodeURIComponent(toCitySlug(cityName))}?state=${encodeURIComponent(
                            snap.state_code,
                        )}`}
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        Fuel price history
                    </Link>
                </div>
            </section>
        </div>
    );
}
