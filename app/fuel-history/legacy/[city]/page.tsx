import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { DeferredPriceTrendChart } from "../../../../components/ui/DeferredPriceTrendChart";
import { getSiteUrl } from "../../../../lib/siteUrl";
import { getCityHistoryByKey, resolveCityFromParam } from "../../../../lib/seoFuelRepo";
import { buildBreadcrumbLd, formatInr, toCitySlug } from "../../../../lib/seoSchemas";

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
        const url = `${siteUrl}/fuel-history/${encodeURIComponent(params.city)}`;
        return {
            title: `Fuel price history in ${decodeURIComponent(params.city)}`,
            description: `See 7-day and 30-day petrol and diesel price trends for ${decodeURIComponent(params.city)}.`,
            alternates: { canonical: url },
        };
    }

    const snap = resolved.snapshot;
    const cityName = snap.city_name;

    const canonical = `${siteUrl}/fuel-history/${encodeURIComponent(
        snap.state_code.toLowerCase(),
    )}/${encodeURIComponent(toCitySlug(cityName))}`;

    return {
        title: `Fuel Price History in ${cityName} | 7-Day & 30-Day Trends`,
        description: `Track petrol and diesel price trends in ${cityName} with 7-day and 30-day charts, plus daily change summaries.`,
        alternates: { canonical },
        openGraph: { title: `Fuel Price History in ${cityName}`, url: canonical, type: "article" },
        twitter: { card: "summary_large_image", title: `Fuel Price History in ${cityName}` },
    };
}

export default async function FuelHistoryCityPage({
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
                                href={`/fuel-history/${encodeURIComponent(
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
        `/fuel-history/${encodeURIComponent(
            snap.state_code.toLowerCase(),
        )}/${encodeURIComponent(toCitySlug(snap.city_name))}`,
    );

    const cityName = snap.city_name;
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}/fuel-history/${encodeURIComponent(
        snap.state_code.toLowerCase(),
    )}/${encodeURIComponent(toCitySlug(cityName))}`;

    const history30 = await getCityHistoryByKey(snap.state_code, snap.city_name, 30);
    if (!history30.length) notFound();

    const history7 = history30.slice(Math.max(0, history30.length - 7));

    const today = history30[history30.length - 1];
    const prev7 = history7[0];

    const todayPetrol = today?.petrol_price ?? null;
    const prevPetrol = prev7?.petrol_price ?? null;

    let delta7: number | null = null;
    if (typeof todayPetrol === "number" && typeof prevPetrol === "number") {
        delta7 = todayPetrol! - prevPetrol!;
    }

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

    let delta7Text = `Petrol prices in ${cityName} are updated daily.`;
    if (delta7 != null) {
        delta7Text = `Petrol prices in ${cityName} ${delta7! > 0 ? "increased" : "decreased"} by ${formatInr(
            Math.abs(delta7!),
        )} over the last 7 days.`;
    }

    const bread = buildBreadcrumbLd([
        { name: "Home", item: siteUrl },
        { name: `Fuel history in ${cityName}`, item: canonical },
    ]);

    return (
        <div className="space-y-6">
            <JsonLd data={bread} />

            <section className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-text">Fuel price history in {cityName}</h1>
                <p className="text-sm text-muted">
                    {delta7Text}
                </p>
            </section>

            <DeferredPriceTrendChart data={trend7} title="7-day petrol & diesel trend" />
            <DeferredPriceTrendChart data={trend30} title="30-day petrol & diesel trend" />

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Explore more tools</h2>
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
                        href={`/cost-to-travel/${encodeURIComponent(toCitySlug(cityName))}?state=${encodeURIComponent(
                            snap.state_code,
                        )}`}
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        Cost to travel 100 km
                    </Link>
                </div>
            </section>
        </div>
    );
}
