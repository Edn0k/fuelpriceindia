import { NextRequest, NextResponse } from "next/server";
import {
    buildChartData,
    getFuelHistory,
    getTodayFuelPrices,
    type FuelKey,
} from "../../../lib/fuelStore";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const stateCode = searchParams.get("stateCode");
    const city = searchParams.get("city");
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) || 7 : 7;
    const fuelParam = searchParams.get("fuel");
    const fuelCandidate = (fuelParam ?? "petrol").toLowerCase();
    const fuel: FuelKey =
        fuelCandidate === "petrol" ||
            fuelCandidate === "diesel" ||
            fuelCandidate === "lpg" ||
            fuelCandidate === "cng"
            ? (fuelCandidate as FuelKey)
            : "petrol";

    if (!stateCode || !city) {
        return NextResponse.json(
            { error: "Missing stateCode or city" },
            { status: 400 },
        );
    }

    try {
        const { today, yesterday } = await getTodayFuelPrices(stateCode, city);
        const history = await getFuelHistory(city, stateCode, days);
        const chartDataByFuel = {
            petrol: buildChartData(history, "petrol"),
            diesel: buildChartData(history, "diesel"),
            lpg: buildChartData(history, "lpg"),
            cng: buildChartData(history, "cng"),
        };
        const chartData = chartDataByFuel[fuel];

        if (!today && !history.length) {
            return NextResponse.json(
                {
                    error: "No cached data yet for this location. Please try again later.",
                },
                { status: 404 },
            );
        }

        return NextResponse.json({ today, yesterday, history, chartData, chartDataByFuel });
    } catch (err) {
        return NextResponse.json(
            { error: "Unable to load fuel prices right now." },
            { status: 500 },
        );
    }
}
