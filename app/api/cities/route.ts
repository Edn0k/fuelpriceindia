import { NextRequest, NextResponse } from "next/server";
import {
    getCitiesByState,
    getCitiesByStateLatestSnapshot,
    getCitiesWithData,
} from "../../../lib/fuelStore";
import { STATE_CITIES } from "../../../lib/cityConfig";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const stateCode = searchParams.get("stateCode");

    if (!stateCode) {
        return NextResponse.json(
            { error: "Missing stateCode" },
            { status: 400 },
        );
    }

    const code = String(stateCode || "").toUpperCase();

    const normalizeCityForDisplay = (name: string) => {
        if (code === "AP" && String(name || "").trim().toLowerCase() === "cuddapah") {
            return "Kadapa";
        }
        return name;
    };

    try {
        const latestSnapshotCities = await getCitiesByStateLatestSnapshot(code);
        if (latestSnapshotCities && latestSnapshotCities.length > 0) {
            return NextResponse.json({
                cities: Array.from(new Set(latestSnapshotCities.map(normalizeCityForDisplay))),
            });
        }

        const dbCities = await getCitiesByState(code);
        if (dbCities && dbCities.length > 0) {
            return NextResponse.json({
                cities: Array.from(new Set(dbCities.map(normalizeCityForDisplay))),
            });
        }

        const citiesWithData = await getCitiesWithData(code);
        if (citiesWithData && citiesWithData.length > 0) {
            return NextResponse.json({
                cities: Array.from(new Set(citiesWithData.map(normalizeCityForDisplay))),
            });
        }

        const configCities = STATE_CITIES[code] ?? [];
        return NextResponse.json({
            cities: Array.from(new Set(configCities.map(normalizeCityForDisplay))),
        });
    } catch (error) {
        const configCities = STATE_CITIES[code] ?? [];
        return NextResponse.json({
            cities: Array.from(new Set(configCities.map(normalizeCityForDisplay))),
        });
    }
}
