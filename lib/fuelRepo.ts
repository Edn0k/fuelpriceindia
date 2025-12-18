import { supabaseServiceClient } from "./supabase";

export type StateRecord = {
    code: string;
    name: string;
};

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

export type FuelPriceRecord = {
    state_code: string;
    city_name: string;
    date: string; // ISO date (yyyy-mm-dd)
    petrol_price: number | null;
    diesel_price: number | null;
    lpg_price: number | null;
    cng_price: number | null;
};

export async function upsertFuelPrice(record: FuelPriceRecord) {
    const { error } = await supabaseServiceClient
        .from("fuel_prices")
        .upsert(record, { onConflict: "state_code,city_name,date" });
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

export async function getTodayFuelPrices(stateCode: string, cityName: string) {
    const todayStr = getIndiaDateString(new Date());
    const yesterdayStr = getIndiaDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select("*")
        .eq("state_code", stateCode)
        .eq("city_name", cityName)
        .in("date", [yesterdayStr, todayStr])
        .order("date", { ascending: true });

    if (error) throw error;

    const todayRow = data?.find((row) => row.date === todayStr) ?? null;
    const yesterdayRow = data?.find((row) => row.date === yesterdayStr) ?? null;

    return { today: todayRow, yesterday: yesterdayRow };
}

export async function getFuelPriceHistory(
    stateCode: string,
    cityName: string,
    days: number,
) {
    const sinceStr = getIndiaDateString(new Date(Date.now() - (Math.max(2, days) - 1) * 24 * 60 * 60 * 1000));

    const { data, error } = await supabaseServiceClient
        .from("fuel_prices")
        .select("*")
        .eq("state_code", stateCode)
        .eq("city_name", cityName)
        .gte("date", sinceStr)
        .order("date", { ascending: true });

    if (error) throw error;
    return data ?? [];
}
