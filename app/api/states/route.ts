import { NextRequest, NextResponse } from "next/server";
import { STATE_CITIES, getStateName } from "../../../lib/cityConfig";
import { getStates } from "../../../lib/fuelStore";

export const runtime = "nodejs";

// Always derive states from the STATE_CITIES config so that state codes used by the UI
// (e.g. MH, KL) match the scraper/cron configuration and the cached data.
export async function GET(req: NextRequest) {
    const debug = new URL(req.url).searchParams.get("debug") === "1";

    try {
        const dbStates = await getStates();

        const filteredDbStates = Array.from(
            new Map(
                (dbStates ?? [])
                    .filter((s) => /^[A-Z]{2}$/.test(s.code))
                    .map((s) => [s.code, s] as const),
            ).values(),
        ).sort((a, b) => a.name.localeCompare(b.name));

        if (filteredDbStates.length > 0) {
            return NextResponse.json({
                states: filteredDbStates,
                count: filteredDbStates.length,
                source: "db" as const,
            });
        }

        const configStates = Object.keys(STATE_CITIES).map((code) => ({
            code,
            name: getStateName(code),
        }));
        return NextResponse.json({
            states: configStates,
            count: configStates.length,
            source: "config" as const,
        });
    } catch (error) {
        try {
            const configStates = Object.keys(STATE_CITIES).map((code) => ({
                code,
                name: getStateName(code),
            }));

            const body: Record<string, unknown> = {
                states: configStates,
                count: configStates.length,
                source: "config" as const,
            };

            if (debug) {
                body.dbError = (error as any)?.message ?? String(error);
            }

            return NextResponse.json(body);
        } catch {
            return NextResponse.json(
                { error: "Unable to load states" },
                { status: 500 },
            );
        }
    }
}
