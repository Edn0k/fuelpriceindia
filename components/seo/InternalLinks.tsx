import Link from "next/link";

type Props = {
    stateCode: string;
    cityName: string;
};

function toCitySlug(cityName: string) {
    return (cityName || "")
        .toLowerCase()
        .replace(/[^a-z0-9\p{L}]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export function InternalLinks({ stateCode, cityName }: Props) {
    const st = stateCode.toLowerCase();
    const city = toCitySlug(cityName);

    return (
        <section className="rounded-2xl border border-border/10 bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Explore</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link
                    className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                    href={`/fuel-price/${st}/${encodeURIComponent(city)}`}
                >
                    All fuels in {cityName}
                </Link>
                <Link
                    className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                    href={`/petrol-price/${st}/${encodeURIComponent(city)}`}
                >
                    Petrol price page
                </Link>
                <Link
                    className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                    href={`/diesel-price/${st}/${encodeURIComponent(city)}`}
                >
                    Diesel price page
                </Link>
                <Link
                    className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                    href={`/fuel-history/${st}/${encodeURIComponent(city)}`}
                >
                    Fuel price history
                </Link>
                <Link
                    className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                    href={`/cost-to-travel/${st}/${encodeURIComponent(city)}`}
                >
                    Cost to travel 100 km
                </Link>
                <Link
                    className="rounded-xl border border-border/10 bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-border/20 hover:bg-card hover:text-text"
                    href="/cheapest-fuel/today"
                >
                    Cheapest petrol cities today
                </Link>
            </div>
        </section>
    );
}
