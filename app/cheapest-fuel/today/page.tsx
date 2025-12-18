import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "../../../components/seo/JsonLd";
import AdUnit from "../../../components/AdUnit";
import { getSiteUrl } from "../../../lib/siteUrl";
import { getCheapestPetrolSummaryLatest } from "../../../lib/seoFuelRepo";
import { buildBreadcrumbLd, formatInr, toCitySlug } from "../../../lib/seoSchemas";

export const revalidate = 60 * 60 * 24;

export async function generateMetadata(): Promise<Metadata> {
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}/cheapest-fuel/today`;

    return {
        title: "Cheapest Petrol Price in India Today",
        description:
            "Find the cheapest petrol price in India today, plus the top 5 cheapest cities, most expensive city, and national average.",
        alternates: { canonical },
        openGraph: {
            title: "Cheapest Petrol Price in India Today",
            description:
                "Find the cheapest petrol price in India today, plus the top 5 cheapest cities, most expensive city, and national average.",
            url: canonical,
            type: "article",
        },
        twitter: {
            card: "summary_large_image",
            title: "Cheapest Petrol Price in India Today",
            description:
                "Find the cheapest petrol price in India today, plus the top 5 cheapest cities, most expensive city, and national average.",
        },
    };
}

export default async function CheapestFuelTodayPage() {
    const summary = await getCheapestPetrolSummaryLatest();
    if (!summary) notFound();

    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}/cheapest-fuel/today`;

    const bread = buildBreadcrumbLd([
        { name: "Home", item: siteUrl },
        { name: "Cheapest petrol", item: canonical },
    ]);

    const avg = summary.nationalAverage;
    const cheapest = summary.cheapest;
    const most = summary.mostExpensive;

    return (
        <div className="space-y-6">
            <JsonLd data={bread} />

            <section className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-text">
                    Cheapest Petrol Price in India Today
                </h1>
                <p className="text-xs text-muted/80">Latest snapshot date: {summary.date}</p>
            </section>

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted">Cheapest city</p>
                        <p className="mt-1 text-lg font-semibold text-text">
                            {cheapest ? `${cheapest.city} (${cheapest.stateCode})` : "-"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-success">
                            {cheapest ? formatInr(cheapest.price) : "-"}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted">National average</p>
                        <p className="mt-1 text-lg font-semibold text-success">
                            {avg != null ? formatInr(avg) : "-"}
                        </p>
                        <p className="mt-1 text-sm text-muted">Across {summary.count} cities</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted">Most expensive city</p>
                        <p className="mt-1 text-lg font-semibold text-text">
                            {most ? `${most.city} (${most.stateCode})` : "-"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-success">{most ? formatInr(most.price) : "-"}</p>
                    </div>
                </div>
            </section>

            <AdUnit slot="7371767054" className="my-8" />

            <section className="rounded-2xl border border-border/10 bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Top 5 cheapest cities</h2>
                <div className="mt-3 overflow-hidden rounded-xl border border-border/10">
                    <table className="min-w-full divide-y divide-border/10 text-sm">
                        <thead className="bg-surface">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                                    City
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                                    Petrol (₹/L)
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                                    Compare
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10 bg-card">
                            {summary.top5.map((r) => {
                                const diff = avg != null ? r.price - avg : null;
                                const stateLower = r.stateCode.toLowerCase();
                                return (
                                    <tr key={`${r.stateCode}-${r.city}`} className="hover:bg-surface">
                                        <td className="px-4 py-2 font-medium text-text">{r.city}</td>
                                        <td className="px-4 py-2 font-semibold text-success">{formatInr(r.price)}</td>
                                        <td className="px-4 py-2 text-muted">
                                            <Link
                                                href={`/fuel-price/${encodeURIComponent(stateLower)}/${encodeURIComponent(
                                                    toCitySlug(r.city),
                                                )}`}
                                                className="text-primary underline-offset-2 hover:underline"
                                            >
                                                View city
                                            </Link>
                                            {diff != null && (
                                                <span className="ml-2 text-xs text-muted/80">
                                                    ({formatInr(Math.abs(diff))} {diff > 0 ? "above" : "below"} avg)
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
