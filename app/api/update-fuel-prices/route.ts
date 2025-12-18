import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { STATE_CITIES, getStateName } from "../../../lib/cityConfig";
import { fetchFuelSnapshotsForAllConfiguredCities } from "../../../lib/myFuelSource";
import {
    discoverGoodreturnsStateCodes,
    scrapeAndUpsertAll,
    scrapeAndUpsertAllStatesFromStateTables,
} from "../../../lib/myFuelSourceBatch";
import { upsertFuelPrice, upsertStates, upsertCities } from "../../../lib/fuelStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function getIndiaDateString(d: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

function getIndiaHour(d: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "";
    const n = parseInt(hour, 10);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
    if (!CRON_SECRET) {
        return NextResponse.json(
            { error: "CRON_SECRET not configured" },
            { status: 500, headers: NO_STORE_HEADERS },
        );
    }

    const url = new URL(req.url);
    const headerSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    const providedSecret = headerSecret ?? bearer;

    if (!providedSecret) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: NO_STORE_HEADERS },
        );
    }

    if (providedSecret !== CRON_SECRET) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: NO_STORE_HEADERS },
        );
    }

    const today = new Date();
    const date = getIndiaDateString(today);

    const modeParam = url.searchParams.get("mode");
    const defaultMode = process.env.CRON_DEFAULT_MODE;
    const mode = modeParam ?? defaultMode ?? null;
    if (mode && mode !== "all" && mode !== "batch") {
        return NextResponse.json(
            { error: "Invalid mode" },
            { status: 400, headers: NO_STORE_HEADERS },
        );
    }
    const stateCodesRaw = url.searchParams
        .getAll("stateCode")
        .flatMap((s) => String(s || "").split(","))
        .map((s) => String(s || "").toUpperCase().trim())
        .filter((s) => /^[A-Z]{2}$/.test(s));
    const stateCodes = stateCodesRaw.length ? Array.from(new Set(stateCodesRaw)) : undefined;

    const summary = {
        status: "ok" as "ok" | "error",
        date,
        totalStatesDiscovered: 0,
        totalCitiesDiscovered: 0,
        totalCitiesConfigured: 0,
        totalSnapshotsFetched: 0,
        totalUpserts: 0,
        errors: [] as string[],
    };

    try {
        // Ensure states and cities exist in Supabase based on STATE_CITIES config
        const stateEntries = Object.keys(STATE_CITIES).map((code) => ({
            code,
            name: getStateName(code),
        }));
        await upsertStates(stateEntries);
        summary.totalCitiesConfigured = Object.values(STATE_CITIES).reduce(
            (sum, cities) => sum + cities.length,
            0,
        );

        for (const [code, cities] of Object.entries(STATE_CITIES)) {
            await upsertCities(code, cities);
        }

        if (mode === "all") {
            const shouldAutoBatch = !stateCodes;

            const batchSizeParam = url.searchParams.get("batchSize");
            const batchSize = (() => {
                const fromQuery = batchSizeParam ? parseInt(batchSizeParam, 10) : NaN;
                if (Number.isFinite(fromQuery) && fromQuery > 0 && fromQuery <= 10) return fromQuery;

                const fromEnv = process.env.FULL_COVERAGE_BATCH_SIZE
                    ? parseInt(process.env.FULL_COVERAGE_BATCH_SIZE, 10)
                    : NaN;
                if (Number.isFinite(fromEnv) && fromEnv > 0 && fromEnv <= 10) return fromEnv;

                return 2;
            })();

            const selectedStateCodes = await (async () => {
                if (!shouldAutoBatch) return stateCodes;

                const allCodes = await discoverGoodreturnsStateCodes();
                if (!allCodes.length) return undefined;

                const batchCount = Math.max(1, Math.ceil(allCodes.length / batchSize));
                const hour = getIndiaHour(today);
                const effectiveBatchIndex = hour % batchCount;
                const start = effectiveBatchIndex * batchSize;
                return allCodes.slice(start, start + batchSize);
            })();

            const result = await scrapeAndUpsertAllStatesFromStateTables(3, 300, selectedStateCodes);
            summary.totalStatesDiscovered = result.fetchedStates;
            summary.totalCitiesDiscovered = result.cities;
            summary.totalSnapshotsFetched = result.fetched;
            summary.totalUpserts = result.upserts;
            for (const err of result.errors ?? []) {
                const msg = typeof err === "string" ? err : JSON.stringify(err);
                summary.errors.push(msg);
            }
        } else if (mode === "batch") {
            // Use batch scraper which already performs upserts
            const result = await scrapeAndUpsertAll(5, 250);
            summary.totalSnapshotsFetched = result.fetched;
            summary.totalUpserts = result.upserts;
            for (const err of result.errors ?? []) {
                const msg = typeof err === "string" ? err : JSON.stringify(err);
                summary.errors.push(msg);
            }
        } else {
            // Default path: use in-process snapshot fetcher
            const snapshots = await fetchFuelSnapshotsForAllConfiguredCities(date);
            summary.totalSnapshotsFetched = snapshots.length;

            for (const snap of snapshots) {
                try {
                    await upsertFuelPrice(snap);
                    summary.totalUpserts += 1;
                } catch (err: any) {
                    summary.errors.push(
                        `Failed upsert for ${snap.state_code}-${snap.city_name}: ${err?.message ?? String(
                            err,
                        )}`,
                    );
                }
            }
        }
    } catch (err: any) {
        summary.status = "error";
        summary.errors.push(err?.message ?? String(err));
    }

    try {
        revalidateTag("fuel_prices_latest_date");
        revalidateTag("fuel_prices_cheapest_petrol_latest");
    } catch {
        // Ignore cache invalidation failures
    }

    const httpStatus = summary.status === "error" && summary.totalUpserts === 0 ? 500 : 200;
    return NextResponse.json(summary, { status: httpStatus, headers: NO_STORE_HEADERS });
}
