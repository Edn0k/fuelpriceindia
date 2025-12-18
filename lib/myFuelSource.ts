import * as cheerio from "cheerio";
import { CITY_SLUGS } from "./citySlugs.generated";

export type FuelSnapshot = {
    state_code: string;
    city_name: string;
    date: string; // YYYY-MM-DD
    petrol_price?: number | null;
    diesel_price?: number | null;
    lpg_price?: number | null;
    cng_price?: number | null;
};

const GOODRETURNS_BASE = "https://www.goodreturns.in";

function petrolUrl(slug: string) {
    return `${GOODRETURNS_BASE}/petrol-price/${slug}.html`;
}
function dieselUrl(slug: string) {
    return `${GOODRETURNS_BASE}/diesel-price/${slug}.html`;
}
function lpgUrl(slug: string) {
    return `${GOODRETURNS_BASE}/lpg-price/${slug}.html`;
}
function cngUrl(slug: string) {
    return `${GOODRETURNS_BASE}/cng-price/${slug}.html`;
}

function getIndiaDateString(d: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            signal: controller.signal,
        });
        clearTimeout(id);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.text();
    } finally {
        clearTimeout(id);
    }
}

function parsePrice(text?: string | null): number | null {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.]/g, "").trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

function parseFuelFromHtml($: cheerio.CheerioAPI, labelRegex: RegExp): number | null {
    const rows = $("table.tbldata01 tbody tr, table.fuel_table tr, table.table tr");
    for (let i = 0; i < rows.length; i++) {
        const tr = rows[i];
        const cells = $(tr)
            .find("td")
            .map((_, el) => $(el).text().trim())
            .get();
        if (!cells || cells.length === 0) continue;
        const joined = cells.join(" ").toLowerCase();
        if (labelRegex.test(joined)) {
            const maybePrice = cells[1] ?? cells.find(Boolean) ?? "";
            const p = parsePrice(maybePrice);
            if (p != null) return p;
        }
    }

    const body = $("body").text();
    const m = body.match(
        new RegExp(
            `${labelRegex.source}\\s*[:\\-]?\\s*₹?\\s*([0-9]{1,3}(?:\\.[0-9]+)?)`,
            "i",
        ),
    );
    if (m) {
        return parsePrice(m[1]);
    }

    return null;
}

async function fetchFuelFromPage(
    url: string,
    labelRegex: RegExp,
): Promise<number | null> {
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        const price = parseFuelFromHtml($, labelRegex);
        return price;
    } catch {
        return null;
    }
}

function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\p{L}]+/gu, "")
        .trim();
}

async function fetchKeralaTableFuel(
    fuel: "lpg" | "cng",
    cityName: string,
): Promise<number | null> {
    const url = `${GOODRETURNS_BASE}/${fuel}-price-in-kerala-s18.html`;
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        const rows = $("table.tbldata01 tbody tr, table.fuel_table tr, table.table tr");
        const target = normalizeName(cityName);
        for (let i = 0; i < rows.length; i++) {
            const tr = rows[i];
            const cells = $(tr)
                .find("td")
                .map((_, el) => $(el).text().trim())
                .get();
            if (cells.length < 2) continue;
            const cityCell = cells[0];
            const priceCell = cells[1];
            const rowNorm = normalizeName(cityCell);
            if (!rowNorm) continue;
            if (rowNorm === target || rowNorm.includes(target) || target.includes(rowNorm)) {
                const price = parsePrice(priceCell);
                if (price != null) return price;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export async function fetchFuelSnapshotForCity(
    stateCode: string,
    cityName: string,
    slug: string,
    dateOverride?: string,
): Promise<FuelSnapshot | null> {
    const date = dateOverride ?? getIndiaDateString(new Date());

    const urls = {
        petrol: petrolUrl(slug),
        diesel: dieselUrl(slug),
        lpg: lpgUrl(slug),
        cng: cngUrl(slug),
    };

    const [petrol, diesel, lpg, cng] = await Promise.all([
        fetchFuelFromPage(urls.petrol, /petrol/i),
        fetchFuelFromPage(urls.diesel, /diesel/i),
        fetchFuelFromPage(urls.lpg, /lpg/i),
        fetchFuelFromPage(urls.cng, /cng/i),
    ]);

    let finalPetrol = petrol;
    let finalDiesel = diesel;
    let finalLpg = lpg;
    let finalCng = cng;

    if (stateCode === "KL") {
        if (finalLpg == null) {
            finalLpg = await fetchKeralaTableFuel("lpg", cityName);
        }
        if (finalCng == null) {
            finalCng = await fetchKeralaTableFuel("cng", cityName);
        }
    }

    if (
        finalPetrol == null &&
        finalDiesel == null &&
        finalLpg == null &&
        finalCng == null
    ) {
        return null;
    }

    return {
        state_code: stateCode,
        city_name: cityName,
        date,
        petrol_price: finalPetrol,
        diesel_price: finalDiesel,
        lpg_price: finalLpg,
        cng_price: finalCng,
    };
}

export async function fetchFuelSnapshotsForAllConfiguredCities(
    date: string,
): Promise<FuelSnapshot[]> {
    const snapshots: FuelSnapshot[] = [];
    const entries = Object.entries(
        CITY_SLUGS as Record<string, { city: string; slug: string }[]>,
    );

    for (const [stateCode, cityEntries] of entries) {
        for (const entry of cityEntries) {
            const snap = await fetchFuelSnapshotForCity(stateCode, entry.city, entry.slug, date);
            if (snap) snapshots.push(snap);
        }
    }

    return snapshots;
}
