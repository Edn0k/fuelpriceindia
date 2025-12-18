import { supabaseServiceClient } from "./supabase";

export type StateRecord = {
    code: string;
    name: string;
};

function normalizeCityNameForStateLookup(stateCode: string, cityName: string): string {
    const state = String(stateCode || "").toUpperCase();
    const city = String(cityName || "").trim();
    const cityNorm = city.toLowerCase();

    if (state === "AP") {
        if (cityNorm === "kadapa") return "Cuddapah";
    }

    return city;
}

function normalizeCityNameForStateDisplay(stateCode: string, cityName: string): string {
    const state = String(stateCode || "").toUpperCase();
    const city = String(cityName || "").trim();

    if (state === "AP") {
        if (city.toLowerCase() === "cuddapah") return "Kadapa";
    }

    return city;
}

export async function getStates(): Promise<StateRecord[]> {
    const { data, error } = await supabaseServiceClient
        .from("states")
        .select("code,name")
        .order("name", { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function getCitiesWithData(stateCode: string): Promise<string[]> {
    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select("city_name")
        .eq("state_code", stateCode)
        .not("petrol_price", "is", null)
        .order("city_name", { ascending: true });

    if (error) throw error;
    const names = (data ?? [])
        .map((row: any) => row.city_name as string)
        .map((name) => normalizeCityNameForStateDisplay(stateCode, name));
    return Array.from(new Set(names));
}

export async function getCitiesByState(stateCode: string): Promise<string[]> {
    const { data, error } = await supabaseServiceClient
        .from("cities")
        .select("name")
        .eq("state_code", stateCode)
        .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => row.name as string);
}

export async function getCitiesByStateLatestSnapshot(stateCode: string): Promise<string[]> {
    const { data: latestData, error: latestError } = await supabaseServiceClient
        .from("fuel_prices")
        .select("date")
        .eq("state_code", stateCode)
        .order("date", { ascending: false })
        .limit(1);

    if (latestError) throw latestError;

    const latestDate = (latestData ?? [])?.[0]?.date as string | undefined;
    if (!latestDate) return [];

    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select("city_name")
        .eq("state_code", stateCode)
        .eq("date", latestDate)
        .order("city_name", { ascending: true });

    if (error) throw error;
    const names = (data ?? []).map((row: any) => row.city_name as string);
    return Array.from(new Set(names));
}

export async function upsertStates(states: StateRecord[]) {
    if (!states.length) return;
    const { error } = await supabaseServiceClient
        .from("states")
        .upsert(states, { onConflict: "code" });
    if (error) throw error;
}

export async function upsertCities(stateCode: string, cities: string[]) {
    if (!cities.length) return;
    const rows = cities.map((name) => ({ state_code: stateCode, name }));
    const { error } = await supabaseServiceClient
        .from("cities")
        .upsert(rows, { onConflict: "state_code,name" });
    if (error) throw error;
}

export async function replaceCitiesForState(stateCode: string, cities: string[]) {
    const { error: deleteError } = await supabaseServiceClient
        .from("cities")
        .delete()
        .eq("state_code", stateCode);
    if (deleteError) throw deleteError;

    await upsertCities(stateCode, cities);
}

export async function deleteFuelPricesForStateDate(stateCode: string, date: string) {
    const { error } = await supabaseServiceClient
        .from("fuel_prices")
        .delete()
        .eq("state_code", stateCode)
        .eq("date", date);
    if (error) throw error;
}

export type FuelPriceRecord = {
    state_code: string;
    city_name: string;
    date: string; // ISO date (yyyy-mm-dd)
    petrol_price?: number | null;
    diesel_price?: number | null;
    lpg_price?: number | null;
    cng_price?: number | null;
};

export type FuelHistoryRow = {
    date: string;
    petrol_price: number | null;
    diesel_price: number | null;
    lpg_price: number | null;
    cng_price: number | null;
};

export type FuelTrendPoint = {
    date: string;
    petrol: number | null;
    diesel: number | null;
    lpg: number | null;
    cng: number | null;
};

export type FuelKey = "petrol" | "diesel" | "lpg" | "cng";

export type FuelTrendChartData = {
    labels: string[];
    values: number[];
};

function normalizeCityKey(s: string): string {
    return String(s || "")
        .toLowerCase()
        .replace(/[^\p{L}\d]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export async function upsertFuelPrice(record: FuelPriceRecord) {
    const { error } = await supabaseServiceClient
        .from("fuel_prices")
        .upsert(record, { onConflict: "state_code,city_name,date" });
    if (error) throw error;
}

export async function upsertFuelPrices(records: FuelPriceRecord[]) {
    if (!records.length) return;
    const { error } = await supabaseServiceClient
        .from("fuel_prices")
        .upsert(records, { onConflict: "state_code,city_name,date" });
    if (error) throw error;
}

function getIndiaDateString(d: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

function toNumberOrNull(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function normalizeToYmd(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const s = value.trim();
    if (!s) return null;
    const ymd = s.length >= 10 ? s.slice(0, 10) : s;
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

function applyFuelAvailabilityOverrides<T extends { lpg_price?: any; cng_price?: any }>(
    stateCode: string,
    row: T,
): T {
    if ((stateCode || "").toUpperCase() === "LD") {
        return { ...row, lpg_price: null, cng_price: null };
    }
    return row;
}

export async function getFuelHistory(
    cityName: string,
    stateCode: string,
    days = 7,
): Promise<FuelHistoryRow[]> {
    const normalizedCityName = normalizeCityNameForStateLookup(stateCode, cityName);
    const sinceStr = getIndiaDateString(
        new Date(Date.now() - (Math.max(2, days) - 1) * 24 * 60 * 60 * 1000),
    );

    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select("date,petrol_price,diesel_price,lpg_price,cng_price")
        .eq("state_code", stateCode)
        .eq("city_name", normalizedCityName)
        .gte("date", sinceStr)
        .order("date", { ascending: true });

    if (error) throw error;

    const rows: FuelHistoryRow[] = (data ?? [])
        .map((row: any) => {
            const date = normalizeToYmd(String(row.date ?? ""));
            if (!date) return null;
            const mapped: FuelHistoryRow = {
                date,
                petrol_price: toNumberOrNull(row.petrol_price),
                diesel_price: toNumberOrNull(row.diesel_price),
                lpg_price: toNumberOrNull(row.lpg_price),
                cng_price: toNumberOrNull(row.cng_price),
            };
            return applyFuelAvailabilityOverrides(stateCode, mapped);
        })
        .filter(Boolean) as FuelHistoryRow[];

    rows.sort((a, b) => a.date.localeCompare(b.date));

    const byDate = new Map<string, FuelHistoryRow>();
    for (const row of rows) byDate.set(row.date, row);

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildChartData(
    historyRows: FuelHistoryRow[],
    fuel: FuelKey = "petrol",
): FuelTrendChartData {
    const key = `${fuel}_price` as const;
    const rows = [...(historyRows ?? [])].filter((r) => Boolean(r?.date));
    rows.sort((a, b) => a.date.localeCompare(b.date));

    const labels: string[] = [];
    const values: number[] = [];
    const indexByDate = new Map<string, number>();

    for (const row of rows) {
        const date = normalizeToYmd(row.date);
        if (!date) continue;
        const val = toNumberOrNull((row as any)[key]);
        if (val == null) continue;

        const existing = indexByDate.get(date);
        if (existing != null) {
            values[existing] = val;
            continue;
        }

        indexByDate.set(date, labels.length);
        labels.push(date);
        values.push(val);
    }

    return { labels, values };
}

export function buildTrendPoints(historyRows: FuelHistoryRow[]): FuelTrendPoint[] {
    const rows = [...(historyRows ?? [])].filter((r) => Boolean(r?.date));
    rows.sort((a, b) => a.date.localeCompare(b.date));

    const byDate = new Map<string, FuelTrendPoint>();
    for (const r of rows) {
        const date = normalizeToYmd(r.date);
        if (!date) continue;
        byDate.set(date, {
            date,
            petrol: toNumberOrNull(r.petrol_price),
            diesel: toNumberOrNull(r.diesel_price),
            lpg: toNumberOrNull(r.lpg_price),
            cng: toNumberOrNull(r.cng_price),
        });
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTodayFuelPrices(stateCode: string, cityName: string) {
    const todayStr = getIndiaDateString(new Date());
    const yesterdayStr = getIndiaDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const normalizedCityName = normalizeCityNameForStateLookup(stateCode, cityName);

    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select("*")
        .eq("state_code", stateCode)
        .eq("city_name", normalizedCityName)
        .in("date", [yesterdayStr, todayStr])
        .order("date", { ascending: true });

    if (error) throw error;

    const todayRowRaw = data?.find((row) => row.date === todayStr) ?? null;
    const yesterdayRowRaw = data?.find((row) => row.date === yesterdayStr) ?? null;

    const todayRow = todayRowRaw ? applyFuelAvailabilityOverrides(stateCode, todayRowRaw) : null;
    const yesterdayRow = yesterdayRowRaw
        ? applyFuelAvailabilityOverrides(stateCode, yesterdayRowRaw)
        : null;

    return { today: todayRow, yesterday: yesterdayRow };
}

export async function getFuelPriceHistory(
    stateCode: string,
    cityName: string,
    days: number,
) {
    return getFuelHistory(cityName, stateCode, days);
}

export async function getLatestNonNullFuelPriceMapForState(
    stateCode: string,
    fuel: FuelKey,
    lookbackDays = 60,
): Promise<Record<string, number>> {
    const col = `${fuel}_price` as const;
    const sinceStr = getIndiaDateString(
        new Date(Date.now() - (Math.max(2, lookbackDays) - 1) * 24 * 60 * 60 * 1000),
    );

    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select(`city_name,date,${col}`)
        .eq("state_code", stateCode)
        .not(col, "is", null)
        .gte("date", sinceStr)
        .order("date", { ascending: false })
        .limit(2000);

    if (error) throw error;

    const map: Record<string, number> = {};
    for (const row of data ?? []) {
        const cityRaw = String((row as any).city_name ?? "");
        const cityKey = normalizeCityKey(cityRaw);
        if (!cityKey || map[cityKey] != null) continue;
        const price = toNumberOrNull((row as any)[col]);
        if (price == null) continue;
        map[cityKey] = price;
    }

    return map;
}
