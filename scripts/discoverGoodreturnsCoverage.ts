import * as cheerio from "cheerio";
import fs from "fs/promises";

const GOODRETURNS_BASE = "https://www.goodreturns.in";
const INDEX_URL = `${GOODRETURNS_BASE}/petrol-price.html`;

// Local copy of state code -> name used only for discovery mapping.
// Extend this if you later support more states in the app.
const STATE_NAMES: Record<string, string> = {
    KL: "Kerala",
    MH: "Maharashtra",
    KA: "Karnataka",
    TN: "Tamil Nadu",
    GJ: "Gujarat",
    DL: "Delhi",
    UP: "Uttar Pradesh",
    WB: "West Bengal",
};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStateName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, " ").trim();
}

function normalizeCityName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, " ").trim();
}

async function fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "FuelPriceIndiaBot/1.0 (+your-email@example.com)",
        },
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
}

function buildStateNameToCodeMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const [code, name] of Object.entries(STATE_NAMES)) {
        map[normalizeStateName(name)] = code;
    }
    return map;
}

async function discoverStatePages(): Promise<{ stateName: string; url: string }[]> {
    const html = await fetchHtml(INDEX_URL);
    const $ = cheerio.load(html);

    const results: { stateName: string; url: string }[] = [];

    $("a[href*='petrol-price-in-']").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (!href || !text) return;
        if (!/petrol-price-in-.*-s\d+\.html/.test(href)) return;

        const url = href.startsWith("http") ? href : GOODRETURNS_BASE + (href.startsWith("/") ? href : `/${href}`);
        results.push({ stateName: text, url });
    });

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique: { stateName: string; url: string }[] = [];
    for (const r of results) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        unique.push(r);
    }

    return unique;
}

async function discoverCitiesForState(stateUrl: string): Promise<{ city: string; slug: string }[]> {
    const html = await fetchHtml(stateUrl);
    const $ = cheerio.load(html);

    const cities: { city: string; slug: string }[] = [];

    $(
        "table.gd-fuel-table-list tbody tr td:first-child a[href*='petrol-price-in-']," +
        "table.tbldata01 a[href*='petrol-price-in-']," +
        "table.table a[href*='petrol-price-in-']," +
        "table.fuel_table a[href*='petrol-price-in-']",
    ).each((_, el) => {
        const href = $(el).attr("href") || "";
        const city = $(el).text().trim();
        if (!href || !city) return;

        // Expect patterns like /petrol-price-in-agra.html
        const m = href.match(/petrol-price-in-([^./]+)\.html/i);
        if (!m) return;
        const slug = m[1];

        cities.push({ city, slug });
    });

    // Fallback: some pages might list city names in first column without links
    if (cities.length === 0) {
        $("table.tbldata01 tbody tr, table.table tr, table.fuel_table tr").each((_, tr) => {
            const tds = $(tr)
                .find("td")
                .map((i, el) => $(el).text().trim())
                .get();
            if (!tds || tds.length === 0) return;
            const city = tds[0];
            if (!city) return;
            const slug = city
                .toLowerCase()
                .replace(/[^a-z0-9\p{L}]+/gu, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
            if (slug) cities.push({ city, slug });
        });
    }

    // Deduplicate by normalized city name
    const seen = new Set<string>();
    const deduped: { city: string; slug: string }[] = [];
    for (const c of cities) {
        const key = normalizeCityName(c.city);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(c);
    }

    return deduped;
}

async function main() {
    const stateNameToCode = buildStateNameToCodeMap();

    console.log("Discovering state pages from", INDEX_URL);
    const statePages = await discoverStatePages();
    console.log(`Found ${statePages.length} state pages on Goodreturns`);

    const citySlugs: Record<string, { city: string; slug: string }[]> = {};

    for (const { stateName, url } of statePages) {
        const norm = normalizeStateName(stateName);
        const code = stateNameToCode[norm];
        if (!code) {
            console.log("Skipping unknown state from Goodreturns:", stateName, url);
            continue;
        }

        console.log(`Fetching cities for ${stateName} (${code}) -> ${url}`);
        try {
            const cities = await discoverCitiesForState(url);
            console.log(`  Found ${cities.length} cities`);
            citySlugs[code] = cities;
        } catch (err: any) {
            console.error(`  Failed to fetch cities for ${stateName} ${url}:`, err?.message ?? err);
        }

        await sleep(300); // polite delay between state pages
    }

    const outPath = "./lib/citySlugs.generated.ts";
    const header =
        "// AUTO-GENERATED by scripts/discoverGoodreturnsCoverage.ts\n" +
        "// Do not edit manually.\n\n" +
        "export const CITY_SLUGS: Record<string, { city: string; slug: string }[]> = ";

    const body = JSON.stringify(citySlugs, null, 2);
    const ts = `${header}${body} as Record<string, { city: string; slug: string }[]>;\n`;

    await fs.writeFile(outPath, ts, "utf8");
    console.log("Wrote", outPath);
}

main().catch((err) => {
    console.error("Discovery failed", err);
    process.exit(1);
});
