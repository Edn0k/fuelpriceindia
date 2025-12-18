import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getSiteUrl } from "../../../../lib/siteUrl";
import { resolveCityFromParam } from "../../../../lib/seoFuelRepo";
import { toCitySlug } from "../../../../lib/seoSchemas";

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
        const url = `${siteUrl}/fuel-price/${encodeURIComponent(params.city)}`;
        return {
            title: `Fuel price in ${decodeURIComponent(params.city)} today | Petrol, Diesel, LPG & CNG`,
            description: `Check today’s petrol, diesel, LPG and CNG prices in ${decodeURIComponent(
                params.city,
            )}. Updated daily.`,
            alternates: { canonical: url },
        };
    }

    const snap = resolved.snapshot;
    const canonical = `${siteUrl}/fuel-price/${encodeURIComponent(
        snap.state_code.toLowerCase(),
    )}/${encodeURIComponent(toCitySlug(snap.city_name))}`;

    return {
        title: `Fuel price in ${snap.city_name} today | Petrol, Diesel, LPG & CNG`,
        description: `Check today’s petrol, diesel, LPG and CNG prices in ${snap.city_name}. Updated daily.`,
        alternates: { canonical },
    };
}

export default async function FuelPriceLegacyCityPage({
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
                                href={`/fuel-price/${encodeURIComponent(
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
        `/fuel-price/${encodeURIComponent(
            snap.state_code.toLowerCase(),
        )}/${encodeURIComponent(toCitySlug(snap.city_name))}`,
    );
}
