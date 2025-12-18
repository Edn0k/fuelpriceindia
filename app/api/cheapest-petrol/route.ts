import { NextResponse } from "next/server";
import { getCheapestPetrolSummaryLatest } from "../../../lib/seoFuelRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const summary = await getCheapestPetrolSummaryLatest();
        return NextResponse.json({ summary }, { headers: { "Cache-Control": "no-store" } });
    } catch {
        return NextResponse.json(
            { error: "Unable to load cheapest petrol price right now." },
            { status: 500, headers: { "Cache-Control": "no-store" } },
        );
    }
}
