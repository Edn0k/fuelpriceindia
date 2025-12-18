import { unstable_cache } from "next/cache";
import { supabaseServiceClient } from "./supabase";

export type CityFuelSnapshot = {
    state_code: string;
    city_name: string;
    date: string;
    petrol_price: number | null;
    diesel_price: number | null;
    lpg_price: number | null;
    cng_price: number | null;
};

export type StateRow = {
    code: string;
    name: string;
};

function formatInr(value: number | null) {
    if (value == null || !Number.isFinite(value)) return null;
    return `₹${value.toFixed(2)}`;
}

function getIndiaDateString(d: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

function addDays(dateStr: string, deltaDays: number): string {
    const m = (dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return getIndiaDateString(new Date());

    const yyyy = parseInt(m[1] || "", 10);
    const mm = parseInt(m[2] || "", 10);
    const dd = parseInt(m[3] || "", 10);

    const baseUtc = Date.UTC(yyyy, mm - 1, dd);
    const d = new Date(baseUtc + deltaDays * 24 * 60 * 60 * 1000);
    const outY = d.getUTCFullYear();
    const outM = String(d.getUTCMonth() + 1).padStart(2, "0");
    const outD = String(d.getUTCDate()).padStart(2, "0");
    return `${outY}-${outM}-${outD}`;
}

function applyFuelAvailabilityOverrides(row: CityFuelSnapshot): CityFuelSnapshot {
    const code = String(row?.state_code || "").toUpperCase();
    if (code === "LD") {
        return { ...row, lpg_price: null, cng_price: null };
    }
    return row;
}

export const getLatestFuelPricesDate = unstable_cache(
    async (): Promise<string | null> => {
        const { data, error } = await supabaseServiceClient
            .from("fuel_prices")
            .select("date")
            .order("date", { ascending: false })
            .limit(1);

        if (error) throw error;
        return (data ?? [])?.[0]?.date ?? null;
    },
    ["fuel_prices_latest_date"],
    { revalidate: 60 * 60 * 24, tags: ["fuel_prices_latest_date"] },
);

export const getStatesList = unstable_cache(
    async (): Promise<StateRow[]> => {
        const { data, error } = await supabaseServiceClient
            .from("states")
            .select("code,name")
            .order("name", { ascending: true });

        if (error) throw error;
        return (data ?? []) as StateRow[];
    },
    ["seo_states_list"],
    { revalidate: 60 * 60 * 24 },
);

export const getStateNameByCode = (stateCode: string) =>
    unstable_cache(
        async (): Promise<string | null> => {
            const code = String(stateCode || "").toUpperCase();
            if (!code) return null;

            const { data, error } = await supabaseServiceClient
                .from("states")
                .select("name")
                .eq("code", code)
                .maybeSingle();

            if (error) throw error;
            return (data?.name as string | undefined) ?? null;
        },
        ["seo_state_name", String(stateCode || "").toUpperCase()],
        { revalidate: 60 * 60 * 24 },
    )();

export const getCitiesInStateLatest = (stateCode: string) =>
    unstable_cache(
        async (): Promise<string[]> => {
            const code = String(stateCode || "").toUpperCase();
            if (!code) return [];

            const latestDate = await getLatestFuelPricesDate();
            if (!latestDate) return [];

            const { data, error } = await supabaseServiceClient
                .from("fuel_prices")
                .select("city_name")
                .eq("state_code", code)
                .eq("date", latestDate)
                .order("city_name", { ascending: true });

            if (error) throw error;
            const names = (data ?? []).map((r: any) => r.city_name as string);
            return Array.from(new Set(names));
        },
        ["seo_state_cities_latest", String(stateCode || "").toUpperCase()],
        { revalidate: 60 * 60 * 24, tags: ["fuel_prices_latest_date"] },
    )();

export function normalizeCityParam(cityParam: string) {
    return decodeURIComponent(cityParam || "")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildCityIlikePattern(cityQuery: string) {
    const tokens = (cityQuery || "")
        .toLowerCase()
        .replace(/[^\p{L}\d]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 8)
        .map((t) => t.replace(/[%_]/g, ""));

    if (!tokens.length) return null;
    return `%${tokens.join("%")}%`;
}

export type ResolvedCityResult =
    | {
        kind: "resolved";
        snapshot: CityFuelSnapshot;
        candidates: CityFuelSnapshot[];
    }
    | {
        kind: "ambiguous";
        candidates: CityFuelSnapshot[];
    }
    | {
        kind: "not_found";
    };

export const resolveCityFromParam = (cityParam: string, stateCode?: string | null) =>
    unstable_cache(
        async (): Promise<ResolvedCityResult> => {
            const cityQuery = normalizeCityParam(cityParam);
            if (!cityQuery) return { kind: "not_found" };

            const pattern = buildCityIlikePattern(cityQuery);
            if (!pattern) return { kind: "not_found" };

            const latestDate = await getLatestFuelPricesDate();
            if (!latestDate) return { kind: "not_found" };

            const base = supabaseServiceClient
                .from("fuel_prices")
                .select("state_code,city_name,date,petrol_price,diesel_price,lpg_price,cng_price")
                .eq("date", latestDate)
                .ilike("city_name", pattern)
                .order("state_code", { ascending: true })
                .limit(50);

            const { data, error } = await base;
            if (error) throw error;

            const candidates = ((data ?? []) as CityFuelSnapshot[]).map(applyFuelAvailabilityOverrides);
            if (!candidates.length) return { kind: "not_found" };

            const desiredState = stateCode ? String(stateCode).toUpperCase() : null;
            if (desiredState) {
                const match = candidates.find((c) => c.state_code === desiredState) ?? null;
                if (match) return { kind: "resolved", snapshot: match, candidates };
                return { kind: "ambiguous", candidates };
            }

            if (candidates.length === 1) {
                return { kind: "resolved", snapshot: candidates[0] as CityFuelSnapshot, candidates };
            }

            const distinctStateCodes = Array.from(new Set(candidates.map((c) => c.state_code)));
            if (distinctStateCodes.length === 1) {
                return { kind: "resolved", snapshot: candidates[0] as CityFuelSnapshot, candidates };
            }

            return { kind: "ambiguous", candidates };
        },
        ["resolve_city", normalizeCityParam(cityParam), String(stateCode || "").toUpperCase()],
        { revalidate: 60 * 60 * 24, tags: ["fuel_prices_latest_date"] },
    )();

function normalizeCityForCompare(value: string) {
    return (value || "")
        .toLowerCase()
        .replace(/[^\p{L}\d]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export const resolveCityInStateFromParam = (stateCode: string, cityParam: string) =>
    unstable_cache(
        async (): Promise<ResolvedCityResult> => {
            const state = String(stateCode || "").toUpperCase();
            if (!state) return { kind: "not_found" };

            let cityQuery = normalizeCityParam(cityParam);
            if (!cityQuery) return { kind: "not_found" };

            if (state === "AP") {
                const norm = normalizeCityForCompare(cityQuery);
                if (norm === "kadapa") cityQuery = "Cuddapah";
            }

            const pattern = buildCityIlikePattern(cityQuery);
            if (!pattern) return { kind: "not_found" };

            const latestDate = await getLatestFuelPricesDate();
            if (!latestDate) return { kind: "not_found" };

            const { data, error } = await supabaseServiceClient
                .from("fuel_prices")
                .select("state_code,city_name,date,petrol_price,diesel_price,lpg_price,cng_price")
                .eq("date", latestDate)
                .eq("state_code", state)
                .ilike("city_name", pattern)
                .order("city_name", { ascending: true })
                .limit(50);

            if (error) throw error;

            const candidates = ((data ?? []) as CityFuelSnapshot[]).map(applyFuelAvailabilityOverrides);
            if (!candidates.length) return { kind: "not_found" };

            const queryNorm = normalizeCityForCompare(cityQuery);
            const exact = candidates.find((c) => normalizeCityForCompare(c.city_name) === queryNorm) ?? null;
            if (exact) return { kind: "resolved", snapshot: exact, candidates };

            if (candidates.length === 1) {
                return { kind: "resolved", snapshot: candidates[0] as CityFuelSnapshot, candidates };
            }

            return { kind: "ambiguous", candidates };
        },
        [
            "resolve_city_in_state",
            String(stateCode || "").toUpperCase(),
            normalizeCityParam(cityParam),
        ],
        { revalidate: 60 * 60 * 24, tags: ["fuel_prices_latest_date"] },
    )();

export const getLatestCitySnapshotByKey = (stateCode: string, cityName: string) =>
    unstable_cache(
        async (): Promise<CityFuelSnapshot | null> => {
            const { data, error } = await supabaseServiceClient
                .from("fuel_prices")
                .select("state_code,city_name,date,petrol_price,diesel_price,lpg_price,cng_price")
                .eq("state_code", stateCode)
                .eq("city_name", cityName)
                .order("date", { ascending: false })
                .limit(1);

            if (error) throw error;
            const row = (data ?? [])?.[0] ?? null;
            return row ? applyFuelAvailabilityOverrides(row as CityFuelSnapshot) : null;
        },
        ["fuel_prices_city_latest", stateCode, cityName],
        { revalidate: 60 * 60 * 24, tags: ["fuel_prices_latest_date"] },
    )();

export async function getCityHistoryByKey(
    stateCode: string,
    cityName: string,
    days: number,
): Promise<CityFuelSnapshot[]> {
    const latest = await getLatestCitySnapshotByKey(stateCode, cityName);
    if (!latest?.date) return [];

    const since = addDays(latest.date, -(Math.max(days, 1) - 1));

    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select("state_code,city_name,date,petrol_price,diesel_price,lpg_price,cng_price")
        .eq("state_code", stateCode)
        .eq("city_name", cityName)
        .gte("date", since)
        .order("date", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as CityFuelSnapshot[]).map(applyFuelAvailabilityOverrides);
}

export type CheapestPetrolSummary = {
    date: string;
    count: number;
    nationalAverage: number | null;
    cheapest: { city: string; stateCode: string; price: number } | null;
    mostExpensive: { city: string; stateCode: string; price: number } | null;
    top5: { city: string; stateCode: string; price: number }[];
};

export const getCheapestPetrolSummaryLatest = unstable_cache(
    async (): Promise<CheapestPetrolSummary | null> => {
        const latestDate = await getLatestFuelPricesDate();
        if (!latestDate) return null;

        const { data, error } = await supabaseServiceClient
            .from("fuel_prices")
            .select("city_name,state_code,petrol_price")
            .eq("date", latestDate)
            .not("petrol_price", "is", null)
            .gt("petrol_price", 40)
            .lt("petrol_price", 250);

        if (error) throw error;

        const rows = (data ?? [])
            .map((r: any) => ({
                city: r.city_name as string,
                stateCode: r.state_code as string,
                price: r.petrol_price as number,
            }))
            .filter((r) => Number.isFinite(r.price) && r.price > 40 && r.price < 250);

        if (!rows.length) {
            return {
                date: latestDate,
                count: 0,
                nationalAverage: null,
                cheapest: null,
                mostExpensive: null,
                top5: [],
            };
        }

        rows.sort((a, b) => a.price - b.price);

        const sum = rows.reduce((acc, r) => acc + r.price, 0);
        const avg = sum / rows.length;

        const cheapest = rows[0] ?? null;
        const mostExpensive = rows[rows.length - 1] ?? null;

        return {
            date: latestDate,
            count: rows.length,
            nationalAverage: Number.isFinite(avg) ? avg : null,
            cheapest,
            mostExpensive,
            top5: rows.slice(0, 5),
        };
    },
    ["fuel_prices_cheapest_petrol_latest"],
    { revalidate: 60 * 60 * 24, tags: ["fuel_prices_cheapest_petrol_latest"] },
);

export function formatPriceForTitle(price: number | null) {
    const p = formatInr(price);
    return p ?? "";
}
