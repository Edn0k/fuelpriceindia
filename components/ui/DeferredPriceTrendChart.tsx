"use client";

import dynamic from "next/dynamic";
import type { TrendPoint } from "./PriceTrendChart";

const LazyChart = dynamic(
    () => import("./PriceTrendChart").then((m) => m.PriceTrendChart),
    {
        ssr: false,
        loading: () => (
            <div className="mt-6 rounded-2xl border border-border/10 bg-card p-4 shadow-sm shadow-black/20">
                <div className="h-64 w-full animate-pulse rounded-xl bg-surface" />
            </div>
        ),
    },
);

type Props = {
    data: TrendPoint[];
    title?: string;
};

export function DeferredPriceTrendChart({ data, title }: Props) {
    return <LazyChart data={data} title={title} />;
}
