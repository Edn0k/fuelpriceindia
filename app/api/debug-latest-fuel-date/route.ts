import { NextRequest, NextResponse } from "next/server";
import { supabaseServiceClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
    if (!CRON_SECRET) {
        return NextResponse.json(
            { error: "CRON_SECRET not configured" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
        );
    }

    const headerSecret = req.headers.get("x-cron-secret");
    if (headerSecret !== CRON_SECRET) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: { "Cache-Control": "no-store" } },
        );
    }

    try {
        const latestRes = await supabaseServiceClient
            .from("fuel_prices")
            .select("date,state_code,city_name,petrol_price,diesel_price,lpg_price,cng_price")
            .order("date", { ascending: false })
            .limit(1);

        if (latestRes.error) throw latestRes.error;

        const latestRow = (latestRes.data ?? [])?.[0] ?? null;
        const latestDate = (latestRow as any)?.date ?? null;

        let rowsForLatestDateCount: number | null = null;
        if (latestDate) {
            const countRes = await supabaseServiceClient
                .from("fuel_prices")
                .select("date", { count: "exact", head: true })
                .eq("date", latestDate);

            if (countRes.error) throw countRes.error;
            rowsForLatestDateCount = typeof countRes.count === "number" ? countRes.count : null;
        }

        return NextResponse.json(
            {
                latestDate,
                rowsForLatestDateCount,
                latestRow,
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message ?? "Unable to query fuel_prices" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
        );
    }
}
