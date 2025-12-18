const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
const FUELPRICE_API_BASE_URL =
    process.env.FUELPRICE_API_BASE_URL ??
    "https://daily-petrol-diesel-lpg-cng-fuel-prices-in-india.p.rapidapi.com";

if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    throw new Error("RAPIDAPI_KEY or RAPIDAPI_HOST is not set in environment variables.");
}

async function request<T>(path: string, searchParams?: URLSearchParams): Promise<T> {
    const url = new URL(path, FUELPRICE_API_BASE_URL);
    if (searchParams) {
        url.search = searchParams.toString();
    }

    const headers: HeadersInit = {
        "X-RapidAPI-Key": RAPIDAPI_KEY as string,
        "X-RapidAPI-Host": RAPIDAPI_HOST as string,
    };

    const res = await fetch(url.toString(), {
        method: "GET",
        headers,
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`RapidAPI request failed: ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as T;
}

// Shapes adapted from the RapidAPI OpenAPI spec.

export type ApiState = {
    stateId: string; // e.g. "maharashtra"
    stateName: string; // e.g. "Maharashtra"
};

export type ApiCity = {
    cityId: string; // e.g. "mumbai"
    cityName: string; // e.g. "Mumbai"
};

export type ApiFuelPrice = {
    date: string; // ISO date, derived from applicableOn
    state_code: string; // stateId
    city: string; // cityId
    petrol_price: number | null;
    diesel_price: number | null;
    lpg_price: number | null;
    cng_price: number | null;
};

// List all states in India
// GET /v1/list/india/states

export async function getStatesFromAPI(): Promise<ApiState[]> {
    const data = await request<{ states: ApiState[] }>("/v1/list/india/states");
    return data.states ?? [];
}

// List all cities in a state
// GET /v1/list/india/{stateId}/cities

export async function getCitiesFromAPI(stateCode: string): Promise<ApiCity[]> {
    const path = `/v1/list/india/${encodeURIComponent(stateCode)}/cities`;
    const data = await request<{ cities: ApiCity[] }>(path);
    return data.cities ?? [];
}

// Today’s fuel price in a specific city
// GET /v1/fuel-prices/today/india/{stateId}/{cityId}

type FuelItem = {
    retailPrice: number;
    retailPriceChange: number;
    retailUnit: string;
    currency: string;
};

type FuelCollection = {
    petrol?: FuelItem;
    diesel?: FuelItem;
    lpg?: FuelItem;
    cng?: FuelItem;
};

type FuelPriceResponse = {
    applicableOn: string; // ISO date
    fuel: FuelCollection;
};

export async function getTodayFuelPriceFromAPI(
    stateCode: string,
    city: string,
): Promise<ApiFuelPrice | null> {
    const path = `/v1/fuel-prices/today/india/${encodeURIComponent(
        stateCode,
    )}/${encodeURIComponent(city)}`;

    const data = await request<FuelPriceResponse>(path);

    const { applicableOn, fuel } = data;

    const mapItem = (item?: FuelItem | null) => (item ? item.retailPrice : null);

    return {
        date: applicableOn,
        state_code: stateCode,
        city,
        petrol_price: mapItem(fuel.petrol),
        diesel_price: mapItem(fuel.diesel),
        lpg_price: mapItem(fuel.lpg),
        cng_price: mapItem(fuel.cng),
    };
}

// Fuel price history for a city (last N days)
// GET /v1/fuel-prices/history/india/{stateId}/{cityId}?pageSize=N

type FuelPriceHistoryResponse = {
    history: FuelPriceResponse[];
};

export async function getFuelPriceHistoryFromAPI(
    stateCode: string,
    city: string,
    days: number,
): Promise<ApiFuelPrice[]> {
    const path = `/v1/fuel-prices/history/india/${encodeURIComponent(
        stateCode,
    )}/${encodeURIComponent(city)}`;
    const params = new URLSearchParams({ pageSize: String(days) });
    const data = await request<FuelPriceHistoryResponse>(path, params);

    const history = data.history ?? [];

    return history.map((entry) => {
        const { applicableOn, fuel } = entry;
        const mapItem = (item?: FuelItem | null) => (item ? item.retailPrice : null);

        return {
            date: applicableOn,
            state_code: stateCode,
            city,
            petrol_price: mapItem(fuel.petrol),
            diesel_price: mapItem(fuel.diesel),
            lpg_price: mapItem(fuel.lpg),
            cng_price: mapItem(fuel.cng),
        };
    });
}
