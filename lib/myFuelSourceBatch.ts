import pLimit from "p-limit";
import * as cheerio from "cheerio";
import { CITY_SLUGS } from "./citySlugs.generated";
import {
    deleteFuelPricesForStateDate,
    replaceCitiesForState,
    upsertCities,
    upsertFuelPrice,
    upsertFuelPrices,
    upsertStates,
    getLatestNonNullFuelPriceMapForState,
    type FuelPriceRecord,
} from "./fuelStore";
import type { FuelSnapshot } from "./myFuelSource";

const GOODRETURNS_BASE = "https://www.goodreturns.in";
const KERALA_LPG_TABLE = `${GOODRETURNS_BASE}/lpg-price-in-kerala-s18.html`;
const KERALA_CNG_TABLE = `${GOODRETURNS_BASE}/cng-price-in-kerala-s18.html`;
const PETROL_INDEX_URL = `${GOODRETURNS_BASE}/petrol-price.html`;

const GOODRETURNS_STATE_NAME_TO_CODE: Record<string, string> = {
    "andaman nicobar": "AN",
    "andaman nicobar islands": "AN",
    "andaman nicobar island": "AN",
    "andaman and nicobar": "AN",
    "andaman and nicobar islands": "AN",
    "andhra pradesh": "AP",
    "arunachal pradesh": "AR",
    assam: "AS",
    bihar: "BR",
    chandigarh: "CH",
    chhattisgarh: "CG",
    chhatisgarh: "CG",
    "dadra and nagar haveli and daman and diu": "DN",
    delhi: "DL",
    goa: "GA",
    gujarat: "GJ",
    haryana: "HR",
    "himachal pradesh": "HP",
    "jammu kashmir": "JK",
    "jammu and kashmir": "JK",
    jharkhand: "JH",
    karnataka: "KA",
    kerala: "KL",
    ladakh: "LA",
    lakshadweep: "LD",
    "madhya pradesh": "MP",
    maharashtra: "MH",
    manipur: "MN",
    meghalaya: "ML",
    mizoram: "MZ",
    nagaland: "NL",
    odisha: "OD",
    orissa: "OD",
    pondicherry: "PY",
    puducherry: "PY",
    punjab: "PB",
    rajasthan: "RJ",
    sikkim: "SK",
    "tamil nadu": "TN",
    telangana: "TS",
    tripura: "TR",
    "uttar pradesh": "UP",
    uttarakhand: "UK",
    uttaranchal: "UK",
    "west bengal": "WB",
};

function normalizeStateName(s?: string) {
    return (s || "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^\p{L}\d]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getStateCodeFromGoodreturnsName(name: string): string | null {
    const norm = normalizeStateName(name);
    return GOODRETURNS_STATE_NAME_TO_CODE[norm] ?? null;
}

type GoodreturnsState = { code: string; name: string; petrolUrl: string };

async function discoverGoodreturnsStates(): Promise<GoodreturnsState[]> {
    const html = await fetchHtml(PETROL_INDEX_URL);
    const $ = cheerio.load(html);

    const results: GoodreturnsState[] = [];
    $("a[href*='petrol-price-in-']").each((_: any, el: any) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (!href || !text) return;
        if (!/petrol-price-in-.*-s\d+\.html/i.test(href)) return;
        const code = getStateCodeFromGoodreturnsName(text);
        if (!code) return;

        const petrolUrl = href.startsWith("http")
            ? href
            : GOODRETURNS_BASE + (href.startsWith("/") ? href : `/${href}`);
        const name = text.replace(/\s+/g, " ").trim();
        results.push({ code, name, petrolUrl });
    });

    const seen = new Set<string>();
    const unique: GoodreturnsState[] = [];
    for (const r of results) {
        if (seen.has(r.petrolUrl)) continue;
        seen.add(r.petrolUrl);
        unique.push(r);
    }
    return unique;
}

export async function discoverGoodreturnsStateCodes(): Promise<string[]> {
    const states = await discoverGoodreturnsStates();
    return Array.from(
        new Set(states.map((s) => String(s.code || "").toUpperCase()).filter((s) => /^[A-Z]{2}$/.test(s))),
    ).sort();
}

function parsePrice(text: string): number | null {
    if (!text) return null;
    const cleanNumber = (s: string) => s.replace(/,/g, "");

    const rupeeMatch = text.match(/₹\s*(-?\d[\d,]*(?:\.\d+)?)/);
    if (rupeeMatch?.[1]) {
        const n = parseFloat(cleanNumber(rupeeMatch[1]));
        return Number.isFinite(n) ? n : null;
    }

    const m = text.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(cleanNumber(m[0]));
    return Number.isFinite(n) ? n : null;
}

type FuelType = "petrol" | "diesel" | "lpg" | "cng";

function getExpectedFuelRange(fuel: FuelType) {
    if (fuel === "lpg") return { min: 100, max: 2500 };
    if (fuel === "cng") return { min: 10, max: 300 };
    return { min: 30, max: 300 };
}

function isValidFuelPrice(fuel: FuelType, price: number | null | undefined) {
    if (price == null) return false;
    if (!Number.isFinite(price)) return false;
    const { min, max } = getExpectedFuelRange(fuel);
    return price >= min && price <= max;
}

function median(nums: number[]): number | null {
    const xs = (nums || []).filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
    if (!xs.length) return null;
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 === 1 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

function isSuspectByMedian(fuel: FuelType, price: number, med: number | null) {
    if (med == null) return false;
    if (!Number.isFinite(price) || !Number.isFinite(med) || med <= 0) return false;
    const rel = Math.abs(price - med) / med;
    if (fuel === "lpg") return rel > 0.35;
    if (fuel === "cng") return rel > 0.5;
    return rel > 0.25;
}

function getIndiaDateString(d: Date): string {
    // YYYY-MM-DD in Asia/Kolkata
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

function parseGoodreturnsUpdatedDate(text: string): string | null {
    // Examples: "13th Dec, 2025", "12th December, 2025"
    const t = (text || "").replace(/\s+/g, " ").trim();
    if (!t) return null;

    const m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\,?\s+(\d{4})/);
    if (!m) return null;

    const day = parseInt(m[1] || "", 10);
    const monthName = (m[2] || "").toLowerCase();
    const year = parseInt(m[3] || "", 10);
    if (!Number.isFinite(day) || !Number.isFinite(year)) return null;

    const monthMap: Record<string, number> = {
        jan: 1,
        january: 1,
        feb: 2,
        february: 2,
        mar: 3,
        march: 3,
        apr: 4,
        april: 4,
        may: 5,
        jun: 6,
        june: 6,
        jul: 7,
        july: 7,
        aug: 8,
        august: 8,
        sep: 9,
        sept: 9,
        september: 9,
        oct: 10,
        october: 10,
        nov: 11,
        november: 11,
        dec: 12,
        december: 12,
    };

    const month = monthMap[monthName];
    if (!month) return null;

    const yyyy = String(year).padStart(4, "0");
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

type FuelPageResult = { price: number | null; updatedDate: string | null };

async function fetchSingleFuelFromPage(url: string, fuel: "petrol" | "diesel" | "lpg" | "cng"): Promise<FuelPageResult> {
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        let pageUpdatedDate: string | null = null;

        // 1) Prefer the main city fuel price block.
        // Some pages contain multiple .gd-fuel-price elements; pick the one that matches the expected unit.
        const unitMatch = (txt: string) => {
            const t = (txt || "").toLowerCase();
            if (fuel === "petrol" || fuel === "diesel") return /\bltr\b/.test(t);
            if (fuel === "cng") return /\bkg\b/.test(t) && !t.includes("14.2");
            // LPG is typically shown per 14.2 kg cylinder on Goodreturns.
            if (fuel === "lpg") return t.includes("14.2") && t.includes("kg");
            return false;
        };

        const containerEls = $(".gd-fuel-priceblock-container .gd-fuel-price").toArray();
        const fallbackEls = $(".gd-fuel-priceblock .gd-fuel-price").toArray();
        const priceEls = containerEls.length > 0 ? containerEls : fallbackEls;

        const chosenEl =
            priceEls.find((el: any) => unitMatch($(el).text())) ??
            // If unit matching fails (layout variations), take the first block as a last resort.
            priceEls[0] ??
            null;

        if (chosenEl) {
            const block = $(chosenEl).closest(".gd-fuel-priceblock");
            const updatedDateText = block.find(".gd-fuel-updated-date").first().text().trim();
            const updatedDate = parseGoodreturnsUpdatedDate(updatedDateText);
            pageUpdatedDate = updatedDate ?? pageUpdatedDate;

            const mainBlockText = $(chosenEl).text().trim();
            if (mainBlockText) {
                const mainPrice = parsePrice(mainBlockText);
                if (mainPrice != null) {
                    if (fuel === "lpg" && mainPrice < 100) {
                        const t = mainBlockText.toLowerCase();
                        if (/\bkg\b/.test(t) && !t.includes("14.2")) {
                            const converted = mainPrice * 14.2;
                            if (isValidFuelPrice("lpg", converted)) {
                                return { price: converted, updatedDate: pageUpdatedDate };
                            }
                        }
                    }

                    return { price: mainPrice, updatedDate: pageUpdatedDate };
                }
            }

            // Keep the updatedDate even if price parse fails.
            if (updatedDate) {
                // Continue to intro fallback below.
            }
        }

        if (!pageUpdatedDate) {
            const updatedDateText = $(".gd-fuel-updated-date").first().text().trim();
            const updatedDate = parseGoodreturnsUpdatedDate(updatedDateText);
            pageUpdatedDate = updatedDate ?? pageUpdatedDate;
        }

        // 2) Fallback: some bot responses omit the above block but include a top intro paragraph like:
        // "Today's petrol price in Gadchiroli is at ₹<b>105.06</b> per litre ..."
        const introBoldText = $("#gr_top_intro_content b").first().text().trim();
        if (introBoldText) {
            const introPrice = parsePrice(introBoldText);
            if (introPrice != null) {
                if (fuel === "lpg" && introPrice < 100) {
                    const introCtx = $("#gr_top_intro_content").text().toLowerCase();
                    if (/\bkg\b/.test(introCtx) && !introCtx.includes("14.2")) {
                        const converted = introPrice * 14.2;
                        if (isValidFuelPrice("lpg", converted)) {
                            return { price: converted, updatedDate: pageUpdatedDate };
                        }
                    }
                }

                return { price: introPrice, updatedDate: pageUpdatedDate };
            }
        }

        const minExpected = fuel === "lpg" ? 100 : fuel === "cng" ? 10 : 20;
        const maxExpected = fuel === "lpg" ? 2500 : 300;
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();

        const patterns: RegExp[] =
            fuel === "lpg"
                ? [
                    /lpg\s+price[^₹]{0,220}₹\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\.\d+)?)/i,
                    /₹\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\.\d+)?)[^0-9]{0,60}14\.2/i,
                    /14\.2[^₹]{0,60}₹\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\.\d+)?)/i,
                ]
                : fuel === "cng"
                    ? [
                        /cng\s+price[^₹]{0,220}₹\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d+)?)/i,
                        /₹\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d+)?)[^0-9]{0,60}kg/i,
                    ]
                    : [
                        new RegExp(
                            `${fuel}\\s+price[^₹]{0,220}₹\\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\\.\\d+)?)`,
                            "i",
                        ),
                        /₹\\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\\.\\d+)?)[^0-9]{0,60}ltr/i,
                    ];

        for (const re of patterns) {
            const m = bodyText.match(re);
            const candidate = m?.[1] ?? null;
            const n = candidate ? parseFloat(candidate.replace(/,/g, "")) : NaN;
            if (!Number.isFinite(n)) continue;
            if (n < minExpected || n > maxExpected) {
                if (fuel === "lpg" && n < minExpected) {
                    const converted = n * 14.2;
                    if (converted >= minExpected && converted <= maxExpected) {
                        return { price: converted, updatedDate: pageUpdatedDate };
                    }
                }
                continue;
            }
            return { price: n, updatedDate: pageUpdatedDate };
        }

        // If we couldn't find either the main block or the intro price, the response HTML is likely incomplete
        // (or heavily modified for bots). Prefer returning null over storing a wrong number
        // from unrelated parts of the page (ticker, markets, etc.).
        return { price: null, updatedDate: pageUpdatedDate };
    } catch (err) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("fetchSingleFuelFromPage failed", { url, error: err });
        }
        return { price: null, updatedDate: null };
    }
}

function normalizeCityName(s?: string) {
    return (s || "")
        .toLowerCase()
        .replace(/[^\p{L}\d]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function slugifyCityNameForGoodreturns(s?: string): string | null {
    const slug = (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\p{L}]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .trim();
    return slug ? slug : null;
}

async function fetchPriceTableMap(url: string): Promise<Record<string, number>> {
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        const map: Record<string, number> = {};

        $("table.tbldata01 tbody tr, table.table tr, table.fuel_table tr").each((_: any, tr: any) => {
            const tds = $(tr)
                .find("td")
                .map((i: any, el: any) => $(el).text().trim())
                .get();
            if (!tds || tds.length < 2) return;

            const joined = tds.join(" ").toLowerCase();
            if (/city|district|town/.test(joined) && /price/.test(joined)) return;

            const cityNorm = normalizeCityName(tds[0]);
            const cleaned = (tds[1] || "").replace(/[^\d.]/g, "").trim();
            const n = parseFloat(cleaned);
            if (cityNorm && Number.isFinite(n)) map[cityNorm] = n;
        });

        if (Object.keys(map).length === 0) {
            const body = $("body").text();
            const globalMatches = Array.from(
                body.matchAll(
                    /([A-Za-z\u00A0-\uFFFF.\- ]{2,}?)\s*(?:₹)?\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\.\d+)?)/g,
                ),
            ) as RegExpMatchArray[];
            for (const m of globalMatches) {
                const city = normalizeCityName(m[1] || "");
                const price = parseFloat((m[2] || "").replace(/,/g, "").replace(/[^\d.]/g, ""));
                if (city && Number.isFinite(price)) map[city] = price;
            }
        }

        return map;
    } catch (err) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("fetchPriceTableMap failed for", url, (err as any)?.message ?? err);
        }
        return {};
    }
}

async function fetchCityPriceMapFromStatePage(
    url: string,
    stateName?: string,
): Promise<Record<string, { city: string; price: number; slug?: string }>> {
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        const map: Record<string, { city: string; price: number; slug?: string }> = {};

        const stateNameNorm = stateName ? normalizeStateName(stateName) : "";

        const fuelFromUrl: "petrol" | "diesel" | "lpg" | "cng" = url.includes("/lpg-price-in-")
            ? "lpg"
            : url.includes("/cng-price-in-")
                ? "cng"
                : url.includes("/diesel-price-in-")
                    ? "diesel"
                    : "petrol";
        const { min: minPrice, max: maxPrice } = getExpectedFuelRange(fuelFromUrl);

        const addRow = (cells: string[]) => {
            const parts = (cells || []).map((s) => (s || "").replace(/\s+/g, " ").trim()).filter(Boolean);
            if (parts.length < 2) return;

            const joined = parts.join(" ").toLowerCase();
            if (/city|district|town/.test(joined) && /price/.test(joined)) return;

            const cityCandidate =
                parts.find((p) => /\p{L}/u.test(p) && !/\b(city|district|town|price)\b/i.test(p)) ?? null;
            if (!cityCandidate) return;

            const city = cityCandidate.trim();
            const cityAsStateNorm = normalizeStateName(city);
            if (stateNameNorm && GOODRETURNS_STATE_NAME_TO_CODE[cityAsStateNorm] && cityAsStateNorm !== stateNameNorm) {
                return;
            }
            const cityNorm = normalizeCityName(city);
            if (!cityNorm || map[cityNorm]) return;

            const candidates = parts
                .map((p) => ({
                    p,
                    n: parsePrice(p),
                    hasRupee: p.includes("₹"),
                }))
                .filter((c) => Number.isFinite(c.n as any))
                .map((c) => ({ ...c, n: c.n as number }))
                .map((c) => {
                    if (fuelFromUrl === "lpg" && c.n < minPrice) {
                        const converted = c.n * 14.2;
                        if (converted >= minPrice && converted <= maxPrice) {
                            return { ...c, n: converted };
                        }
                    }
                    return c;
                })
                .filter((c) => c.n >= minPrice && c.n <= maxPrice);

            if (!candidates.length) return;

            const rupeeCandidates = candidates.filter((c) => c.hasRupee);
            const chosen = (rupeeCandidates.length ? rupeeCandidates : candidates).reduce((best, cur) =>
                cur.n > best.n ? cur : best,
            );

            map[cityNorm] = { city, price: chosen.n };
        };

        const findHeadingText = (tableEl: any) => {
            const direct = tableEl.prevAll("h1,h2,h3,h4").first().text().trim();
            if (direct) return direct;
            const parent = tableEl.parent().prevAll("h1,h2,h3,h4").first().text().trim();
            if (parent) return parent;
            return tableEl.closest("section,div").prevAll("h1,h2,h3,h4").first().text().trim();
        };

        const getHeaderJoined = (tableEl: cheerio.Cheerio<any>): string => {
            let headerCells = tableEl
                .find("thead tr")
                .first()
                .find("th,td")
                .map((i: any, el: any) => $(el).text().trim())
                .get() as string[];

            if (!headerCells || headerCells.length === 0) {
                headerCells = tableEl
                    .find("tr")
                    .first()
                    .find("th,td")
                    .map((i: any, el: any) => $(el).text().trim())
                    .get() as string[];
            }

            return (headerCells || []).join(" ").toLowerCase();
        };

        const priceLinkRe = /(petrol|diesel|lpg|cng)-price-in-([^./]+)\.html/i;
        const stateLinkRe = /-price-in-.*-s\d+\.html/i;

        const ctxMentionsOtherState = (ctxNorm: string) => {
            if (!stateNameNorm) return false;
            if (!ctxNorm) return false;
            for (const k of Object.keys(GOODRETURNS_STATE_NAME_TO_CODE)) {
                if (k === stateNameNorm) continue;
                if (ctxNorm.includes(k)) return true;
            }
            return false;
        };

        const getCityFromLinkEl = (linkEl: any): string | null => {
            const href = $(linkEl).attr("href") || "";
            if (!href) return null;
            if (stateLinkRe.test(href)) return null;
            if (!priceLinkRe.test(href)) return null;
            const city = $(linkEl).text().trim();
            if (!city) return null;

            const normMaybeState = normalizeStateName(city);
            if (GOODRETURNS_STATE_NAME_TO_CODE[normMaybeState] && normMaybeState !== stateNameNorm) {
                return null;
            }

            return city;
        };

        const getSlugFromLinkEl = (linkEl: any): string | null => {
            const href = $(linkEl).attr("href") || "";
            if (!href) return null;
            if (stateLinkRe.test(href)) return null;
            const m = href.match(priceLinkRe);
            const slug = m?.[2] ?? "";
            return slug || null;
        };

        const linkTableCandidates: { el: any; score: number }[] = [];
        $("table").each((_: any, table: any) => {
            const tableEl = $(table);

            const links = tableEl.find("a[href*='-price-in-']").toArray();
            let linkCount = 0;
            for (const a of links) {
                if (getCityFromLinkEl(a)) linkCount++;
            }
            if (linkCount === 0) return;

            const caption = tableEl.find("caption").first().text().trim();
            const heading = findHeadingText(tableEl);
            const ctx = `${caption} ${heading}`;
            const ctxNorm = normalizeStateName(ctx);

            let score = linkCount;
            if (stateNameNorm && ctxNorm.includes(stateNameNorm)) score += 50;
            if (ctxMentionsOtherState(ctxNorm)) score -= 200;
            if (/major cities|metro cities|top cities|india/.test(ctx.toLowerCase())) score -= 1000;

            linkTableCandidates.push({ el: tableEl, score });
        });

        const bestLinkTable = linkTableCandidates.sort((a, b) => b.score - a.score)[0];
        if (bestLinkTable && bestLinkTable.score > 0) {
            bestLinkTable.el.find("tr").each((_: any, tr: any) => {
                const row = $(tr);
                const linkEl = row
                    .find("a[href*='-price-in-']")
                    .toArray()
                    .find((a: any) => getCityFromLinkEl(a));
                if (!linkEl) return;

                const city = getCityFromLinkEl(linkEl);
                if (!city) return;

                const slug = getSlugFromLinkEl(linkEl);

                const cityNorm = normalizeCityName(city);
                if (!cityNorm || map[cityNorm]) return;

                const parts = row
                    .find("td,th")
                    .map((i: any, el: any) => $(el).text().trim())
                    .get() as string[];

                const candidates = (parts || [])
                    .map((p) => ({
                        p,
                        n: parsePrice(p),
                        hasRupee: (p || "").includes("₹"),
                    }))
                    .filter((c) => c.n != null && Number.isFinite(c.n) && (c.n as number) >= minPrice) as {
                        p: string;
                        n: number;
                        hasRupee: boolean;
                    }[];

                if (!candidates.length) return;
                const rupeeCandidates = candidates.filter((c) => c.hasRupee);
                const chosen = (rupeeCandidates.length ? rupeeCandidates : candidates).reduce((best, cur) =>
                    cur.n > best.n ? cur : best,
                );

                map[cityNorm] = { city, price: chosen.n, ...(slug ? { slug } : {}) };
            });
        }

        if (Object.keys(map).length > 0) {
            return map;
        }

        const candidates: { el: cheerio.Cheerio<any>; score: number }[] = [];
        $("table").each((_: any, table: any) => {
            const tableEl = $(table);

            const headerJoined = getHeaderJoined(tableEl);
            if (!(headerJoined.includes("price") && (headerJoined.includes("city") || headerJoined.includes("district") || headerJoined.includes("town")))) {
                return;
            }

            const caption = tableEl.find("caption").first().text().trim();
            const heading = findHeadingText(tableEl);
            const ctx = `${caption} ${heading}`;
            const ctxNorm = normalizeStateName(ctx);

            let score = 0;
            if (stateNameNorm && ctxNorm.includes(stateNameNorm)) score += 50;
            if (ctxMentionsOtherState(ctxNorm)) score -= 200;
            if (/major cities|metro cities|top cities|india/.test(ctx.toLowerCase())) score -= 1000;

            const rowCount =
                tableEl.find("tbody tr").length > 0
                    ? tableEl.find("tbody tr").length
                    : tableEl.find("tr").length;
            score += Math.min(30, rowCount);

            candidates.push({ el: tableEl, score });
        });

        const best = candidates.sort((a, b) => b.score - a.score)[0];
        if (best && best.score > 0) {
            best.el.find("tbody tr, tr").each((__: any, tr: any) => {
                const cells = $(tr)
                    .find("td,th")
                    .map((i: any, el: any) => $(el).text().trim())
                    .get() as string[];
                addRow(cells);
            });
        }

        if (Object.keys(map).length === 0) {
            $("table").each((_: any, table: any) => {
                const tableEl = $(table);

                const headerJoined = getHeaderJoined(tableEl);
                if (!(headerJoined.includes("price") && (headerJoined.includes("city") || headerJoined.includes("district") || headerJoined.includes("town")))) {
                    return;
                }

                const caption = tableEl.find("caption").first().text().trim();
                const heading = findHeadingText(tableEl);
                const ctx = `${caption} ${heading}`;
                const ctxNorm = normalizeStateName(ctx);

                if (/major cities|metro cities|top cities|india/.test(ctx.toLowerCase())) return;
                if (ctxMentionsOtherState(ctxNorm)) return;

                tableEl.find("tbody tr, tr").each((__: any, tr: any) => {
                    const cells = $(tr)
                        .find("td,th")
                        .map((i: any, el: any) => $(el).text().trim())
                        .get() as string[];
                    addRow(cells);
                });
            });
        }

        return map;
    } catch {
        return {};
    }
}

async function fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    return await res.text();
}

async function fetchFuelSnapshotForCityWithSlug(
    stateCode: string,
    cityName: string,
    slug: string,
    date: string,
): Promise<FuelSnapshot | null> {
    try {
        const [petrolRes, dieselRes, lpgRes, cngRes] = await Promise.all([
            fetchSingleFuelFromPage(`${GOODRETURNS_BASE}/petrol-price-in-${slug}.html`, "petrol"),
            fetchSingleFuelFromPage(`${GOODRETURNS_BASE}/diesel-price-in-${slug}.html`, "diesel"),
            fetchSingleFuelFromPage(`${GOODRETURNS_BASE}/lpg-price-in-${slug}.html`, "lpg"),
            fetchSingleFuelFromPage(`${GOODRETURNS_BASE}/cng-price-in-${slug}.html`, "cng"),
        ]);

        const petrol = petrolRes.price;
        const diesel = dieselRes.price;
        const lpg = lpgRes.price;
        const cng = cngRes.price;

        if (petrol == null && diesel == null && lpg == null && cng == null) {
            return null;
        }

        const pageDate =
            petrolRes.updatedDate ??
            dieselRes.updatedDate ??
            lpgRes.updatedDate ??
            cngRes.updatedDate ??
            null;

        const effectiveDate = pageDate && pageDate > date ? pageDate : date;

        return {
            state_code: stateCode,
            city_name: cityName,
            date: effectiveDate,
            petrol_price: petrol,
            diesel_price: diesel,
            lpg_price: lpg,
            cng_price: cng,
        };
    } catch (err) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("fetchFuelSnapshotForCityWithSlug failed", {
                stateCode,
                cityName,
                slug,
                error: (err as any)?.message ?? err,
            });
        }
        return null;
    }
}

export async function scrapeAndUpsertAll(concurrency = 5, delayMs = 250) {
    const tasks: { stateKey: string; city: string; slug: string }[] = [];
    const entries = Object.entries(
        CITY_SLUGS as Record<string, { city: string; slug: string }[]>,
    );
    for (const [stateKey, cities] of entries) {
        for (const c of cities) tasks.push({ stateKey, city: c.city, slug: c.slug });
    }

    let keralaLpgMap: Record<string, number> = {};
    let keralaCngMap: Record<string, number> = {};
    if (CITY_SLUGS["KL"] && CITY_SLUGS["KL"].length > 0) {
        if (process.env.NODE_ENV !== "production") {
            console.log("Pre-fetching Kerala LPG & CNG tables as fallback...");
        }
        keralaLpgMap = await fetchPriceTableMap(KERALA_LPG_TABLE);
        keralaCngMap = await fetchPriceTableMap(KERALA_CNG_TABLE);
        if (process.env.NODE_ENV !== "production") {
            console.log(
                "Kerala LPG entries:",
                Object.keys(keralaLpgMap).length,
                "CNG entries:",
                Object.keys(keralaCngMap).length,
            );
        }
    }

    const limit = pLimit(concurrency);
    const results = { fetched: 0, upserts: 0, errors: [] as any[] };

    const today = getIndiaDateString(new Date());

    await Promise.all(
        tasks.map((t) =>
            limit(async () => {
                try {
                    const snap = await fetchFuelSnapshotForCityWithSlug(t.stateKey, t.city, t.slug, today);
                    if (!snap) {
                        results.errors.push({ task: t, reason: "no data" });
                        return;
                    }

                    if (t.stateKey === "KL") {
                        const cityNorm = normalizeCityName(t.city);
                        const lpgOverride = keralaLpgMap[cityNorm];
                        if (lpgOverride != null && isValidFuelPrice("lpg", lpgOverride)) {
                            snap.lpg_price = lpgOverride;
                        }

                        const cngOverride = keralaCngMap[cityNorm];
                        if (cngOverride != null && isValidFuelPrice("cng", cngOverride)) {
                            snap.cng_price = cngOverride;
                        }
                    }

                    // Enforce availability overrides at ingestion-time (keeps DB clean)
                    if (String(snap.state_code || "").toUpperCase() === "LD") {
                        snap.lpg_price = null;
                        snap.cng_price = null;
                    }

                    // Final sanity validation before writing
                    snap.petrol_price = isValidFuelPrice("petrol", snap.petrol_price)
                        ? (snap.petrol_price as number)
                        : null;
                    snap.diesel_price = isValidFuelPrice("diesel", snap.diesel_price)
                        ? (snap.diesel_price as number)
                        : null;
                    snap.lpg_price = isValidFuelPrice("lpg", snap.lpg_price)
                        ? (snap.lpg_price as number)
                        : null;
                    snap.cng_price = isValidFuelPrice("cng", snap.cng_price)
                        ? (snap.cng_price as number)
                        : null;

                    results.fetched++;
                    await upsertFuelPrice({
                        state_code: snap.state_code,
                        city_name: snap.city_name,
                        date: snap.date,
                        petrol_price: snap.petrol_price ?? null,
                        diesel_price: snap.diesel_price ?? null,
                        lpg_price: snap.lpg_price ?? null,
                        cng_price: snap.cng_price ?? null,
                    });
                    results.upserts++;
                } catch (err: any) {
                    results.errors.push({ task: t, reason: err?.message ?? String(err) });
                }
                if (delayMs > 0) {
                    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
                }
            }),
        ),
    );

    return results;
}

export async function scrapeAndUpsertAllStatesFromStateTables(
    concurrency = 3,
    delayMs = 300,
    onlyStateCodes?: string[],
) {
    const today = getIndiaDateString(new Date());
    const statesAll = await discoverGoodreturnsStates();

    const filterSet = new Set(
        (onlyStateCodes ?? [])
            .map((s) => String(s || "").toUpperCase().trim())
            .filter((s) => /^[A-Z]{2}$/.test(s)),
    );

    const states = filterSet.size
        ? statesAll.filter((s) => filterSet.has(String(s.code || "").toUpperCase()))
        : statesAll;
    const results = {
        fetchedStates: states.length,
        fetched: 0,
        upserts: 0,
        cities: 0,
        errors: [] as any[],
    };

    if (!states.length) return results;

    await upsertStates(states.map((s) => ({ code: s.code, name: s.name })));

    const limit = pLimit(concurrency);

    await Promise.all(
        states.map((state) =>
            limit(async () => {
                try {
                    const dieselUrl = state.petrolUrl.replace("/petrol-price-in-", "/diesel-price-in-");
                    const lpgUrl = state.petrolUrl.replace("/petrol-price-in-", "/lpg-price-in-");
                    const cngUrl = state.petrolUrl.replace("/petrol-price-in-", "/cng-price-in-");

                    const [petrolMap, dieselMap, lpgMap, cngMap] = await Promise.all([
                        fetchCityPriceMapFromStatePage(state.petrolUrl, state.name),
                        fetchCityPriceMapFromStatePage(dieselUrl, state.name),
                        fetchCityPriceMapFromStatePage(lpgUrl, state.name),
                        fetchCityPriceMapFromStatePage(cngUrl, state.name),
                    ]);

                    const petrolKeys = Object.keys(petrolMap);
                    const allCityKeys = new Set<string>(
                        petrolKeys.length
                            ? petrolKeys
                            : [
                                ...Object.keys(petrolMap),
                                ...Object.keys(dieselMap),
                                ...Object.keys(lpgMap),
                                ...Object.keys(cngMap),
                            ],
                    );

                    const slugCityNameByKey: Record<string, string> = {};
                    const slugByCityKeyFromGenerated: Record<string, string> = {};
                    const configuredCityKeys = new Set<string>();
                    const slugEntries = (CITY_SLUGS as Record<string, { city: string; slug: string }[]>)[
                        state.code
                    ];
                    if (Array.isArray(slugEntries)) {
                        for (const entry of slugEntries) {
                            const key = normalizeCityName(entry.city);
                            if (!key) continue;
                            if (!slugCityNameByKey[key]) slugCityNameByKey[key] = entry.city;
                            if (!slugByCityKeyFromGenerated[key]) slugByCityKeyFromGenerated[key] = entry.slug;
                            configuredCityKeys.add(key);
                            allCityKeys.add(key);
                        }
                    }

                    const cityCount = allCityKeys.size;
                    const lpgValidPrices = Object.values(lpgMap)
                        .map((v) => v?.price ?? null)
                        .filter((n): n is number => isValidFuelPrice("lpg", n));
                    const cngValidPrices = Object.values(cngMap)
                        .map((v) => v?.price ?? null)
                        .filter((n): n is number => isValidFuelPrice("cng", n));

                    const lpgMedian = median(lpgValidPrices);
                    const cngMedian = median(cngValidPrices);

                    const lpgCoverage = cityCount ? lpgValidPrices.length / cityCount : 0;
                    const cngCoverage = cityCount ? cngValidPrices.length / cityCount : 0;

                    const shouldFilterSuspectsLpg = lpgValidPrices.length >= 10 && lpgCoverage >= 0.25;
                    const shouldFilterSuspectsCng = cngValidPrices.length >= 10 && cngCoverage >= 0.25;

                    const maxFullFallbackCities = 80;
                    const maxTargetedFallbackCities = 25;

                    const getCityNameForKey = (cityKey: string) =>
                        petrolMap[cityKey]?.city ??
                        dieselMap[cityKey]?.city ??
                        lpgMap[cityKey]?.city ??
                        cngMap[cityKey]?.city ??
                        slugCityNameByKey[cityKey] ??
                        cityKey;

                    const getSlugForKey = (cityKey: string, cityName: string, slugByCityKeyFromPetrolLinks: Record<string, string>) =>
                        petrolMap[cityKey]?.slug ??
                        slugByCityKeyFromPetrolLinks[cityKey] ??
                        slugByCityKeyFromGenerated[cityKey] ??
                        slugifyCityNameForGoodreturns(cityName) ??
                        null;

                    if (String(state.code || "").toUpperCase() === "KL") {
                        try {
                            const [keralaLpgMap, keralaCngMap] = await Promise.all([
                                fetchPriceTableMap(KERALA_LPG_TABLE),
                                fetchPriceTableMap(KERALA_CNG_TABLE),
                            ]);

                            for (const cityKey of allCityKeys) {
                                const cityName = getCityNameForKey(cityKey);

                                const lpgOverride = keralaLpgMap[cityKey];
                                if (lpgOverride != null && isValidFuelPrice("lpg", lpgOverride)) {
                                    lpgMap[cityKey] = { city: cityName, price: lpgOverride };
                                }

                                const cngOverride = keralaCngMap[cityKey];
                                if (cngOverride != null && isValidFuelPrice("cng", cngOverride)) {
                                    cngMap[cityKey] = { city: cityName, price: cngOverride };
                                }
                            }
                        } catch {
                        }
                    }

                    const hasBackfillNeed =
                        Array.from(allCityKeys).some((k) => {
                            const lpgP = lpgMap[k]?.price ?? null;
                            const cngP = cngMap[k]?.price ?? null;
                            const lpgBad =
                                lpgP == null ||
                                !isValidFuelPrice("lpg", lpgP) ||
                                (isValidFuelPrice("lpg", lpgP) && isSuspectByMedian("lpg", lpgP as number, lpgMedian));
                            const cngBad =
                                cngP == null ||
                                !isValidFuelPrice("cng", cngP) ||
                                (isValidFuelPrice("cng", cngP) && isSuspectByMedian("cng", cngP as number, cngMedian));
                            return lpgBad || cngBad;
                        }) || lpgCoverage < 0.25 || cngCoverage < 0.25;

                    if (hasBackfillNeed) {
                        const slugByCityKeyFromPetrolLinks: Record<string, string> = {};
                        try {
                            const petrolHtml = await fetchHtml(state.petrolUrl);
                            const $$ = cheerio.load(petrolHtml);
                            $$("a[href*='petrol-price-in-']").each((_: any, a: any) => {
                                const href = $$(a).attr("href") || "";
                                if (!href) return;
                                if (/-s\d+\.html/i.test(href)) return;
                                const m = href.match(/petrol-price-in-([^./]+)\.html/i);
                                const slug = m?.[1] ?? "";
                                if (!slug) return;
                                const name = $$(a).text().trim();
                                const key = normalizeCityName(name);
                                if (!key || !allCityKeys.has(key)) return;
                                if (!slugByCityKeyFromPetrolLinks[key]) slugByCityKeyFromPetrolLinks[key] = slug;
                            });
                        } catch {
                        }

                        const sampleKeysForFuel = (fuel: FuelType, fuelMap: Record<string, { city: string; price: number; slug?: string }>) =>
                            Array.from(allCityKeys)
                                .filter((k) => {
                                    const p = fuelMap[k]?.price ?? null;
                                    if (!isValidFuelPrice(fuel, p)) return false;
                                    const cityName = getCityNameForKey(k);
                                    const slug = getSlugForKey(k, cityName, slugByCityKeyFromPetrolLinks);
                                    return Boolean(slug);
                                })
                                .slice(0, 2);

                        const sampleLpgKeys = sampleKeysForFuel("lpg", lpgMap);
                        const sampleCngKeys = sampleKeysForFuel("cng", cngMap);

                        let lpgMismatch = false;
                        for (const k of sampleLpgKeys) {
                            const cityName = getCityNameForKey(k);
                            const slug = getSlugForKey(k, cityName, slugByCityKeyFromPetrolLinks);
                            if (!slug) continue;
                            const res = await fetchSingleFuelFromPage(`${GOODRETURNS_BASE}/lpg-price-in-${slug}.html`, "lpg");
                            const statePrice = lpgMap[k]?.price ?? null;
                            if (isValidFuelPrice("lpg", res.price) && isValidFuelPrice("lpg", statePrice)) {
                                const rel = Math.abs((res.price as number) - (statePrice as number)) / Math.max(res.price as number, statePrice as number);
                                if (rel > 0.25) lpgMismatch = true;
                            }
                        }

                        let cngMismatch = false;
                        for (const k of sampleCngKeys) {
                            const cityName = getCityNameForKey(k);
                            const slug = getSlugForKey(k, cityName, slugByCityKeyFromPetrolLinks);
                            if (!slug) continue;
                            const res = await fetchSingleFuelFromPage(`${GOODRETURNS_BASE}/cng-price-in-${slug}.html`, "cng");
                            const statePrice = cngMap[k]?.price ?? null;
                            if (isValidFuelPrice("cng", res.price) && isValidFuelPrice("cng", statePrice)) {
                                const rel = Math.abs((res.price as number) - (statePrice as number)) / Math.max(res.price as number, statePrice as number);
                                if (rel > 0.35) cngMismatch = true;
                            }
                        }

                        const lpgSuspectKeys = Array.from(allCityKeys).filter((k) => {
                            const p = lpgMap[k]?.price ?? null;
                            if (!isValidFuelPrice("lpg", p)) return true;
                            return isSuspectByMedian("lpg", p as number, lpgMedian);
                        });
                        const cngSuspectKeys = Array.from(allCityKeys).filter((k) => {
                            const p = cngMap[k]?.price ?? null;
                            if (!isValidFuelPrice("cng", p)) return true;
                            return isSuspectByMedian("cng", p as number, cngMedian);
                        });

                        const lpgMissingOrInvalidKeys = lpgSuspectKeys.filter((k) => !isValidFuelPrice("lpg", lpgMap[k]?.price ?? null));
                        const lpgOutlierKeys = lpgSuspectKeys.filter((k) => isValidFuelPrice("lpg", lpgMap[k]?.price ?? null));
                        lpgMissingOrInvalidKeys.sort((a, b) => {
                            const aC = configuredCityKeys.has(a) ? 0 : 1;
                            const bC = configuredCityKeys.has(b) ? 0 : 1;
                            return aC - bC;
                        });
                        const lpgMissingSet = new Set<string>(lpgMissingOrInvalidKeys);
                        const lpgPrioritizedSuspects = [...lpgMissingOrInvalidKeys, ...lpgOutlierKeys.filter((k) => !lpgMissingSet.has(k))];

                        const cngMissingOrInvalidKeys = cngSuspectKeys.filter((k) => !isValidFuelPrice("cng", cngMap[k]?.price ?? null));
                        const cngOutlierKeys = cngSuspectKeys.filter((k) => isValidFuelPrice("cng", cngMap[k]?.price ?? null));
                        cngMissingOrInvalidKeys.sort((a, b) => {
                            const aC = configuredCityKeys.has(a) ? 0 : 1;
                            const bC = configuredCityKeys.has(b) ? 0 : 1;
                            return aC - bC;
                        });
                        const cngMissingSet = new Set<string>(cngMissingOrInvalidKeys);
                        const cngPrioritizedSuspects = [...cngMissingOrInvalidKeys, ...cngOutlierKeys.filter((k) => !cngMissingSet.has(k))];

                        const prioritizedAllCityKeys = Array.from(
                            new Set<string>([...Array.from(configuredCityKeys), ...Array.from(allCityKeys)]),
                        );

                        const lpgKeysToFetch = (lpgCoverage < 0.25 || lpgMismatch
                            ? prioritizedAllCityKeys.slice(0, maxFullFallbackCities)
                            : lpgPrioritizedSuspects.slice(0, maxTargetedFallbackCities));
                        const cngKeysToFetch = (cngCoverage < 0.25 || cngMismatch
                            ? prioritizedAllCityKeys.slice(0, maxFullFallbackCities)
                            : cngPrioritizedSuspects.slice(0, maxTargetedFallbackCities));

                        const lpgKeysToFetchSet = new Set<string>(lpgKeysToFetch);
                        const cngKeysToFetchSet = new Set<string>(cngKeysToFetch);
                        const keysToFetchSet = new Set<string>([...lpgKeysToFetchSet, ...cngKeysToFetchSet]);
                        const keysToFetch = Array.from(keysToFetchSet);

                        if (keysToFetch.length > 0) {
                            const fallbackLimit = pLimit(2);
                            await Promise.all(
                                keysToFetch.map((cityKey) =>
                                    fallbackLimit(async () => {
                                        const cityName = getCityNameForKey(cityKey);
                                        const slug = getSlugForKey(cityKey, cityName, slugByCityKeyFromPetrolLinks);
                                        if (!slug) return;

                                        if (lpgKeysToFetchSet.has(cityKey)) {
                                            const res = await fetchSingleFuelFromPage(
                                                `${GOODRETURNS_BASE}/lpg-price-in-${slug}.html`,
                                                "lpg",
                                            );
                                            if (isValidFuelPrice("lpg", res.price)) {
                                                lpgMap[cityKey] = { city: cityName, price: res.price as number, slug };
                                            }
                                        }

                                        if (cngKeysToFetchSet.has(cityKey)) {
                                            const res = await fetchSingleFuelFromPage(
                                                `${GOODRETURNS_BASE}/cng-price-in-${slug}.html`,
                                                "cng",
                                            );
                                            if (isValidFuelPrice("cng", res.price)) {
                                                cngMap[cityKey] = { city: cityName, price: res.price as number, slug };
                                            }
                                        }
                                    }),
                                ),
                            );
                        }
                    }

                    if (allCityKeys.size === 0) {
                        results.errors.push({ state: state.code, reason: "no cities" });
                        return;
                    }

                    const stateUpper = String(state.code || "").toUpperCase();
                    let lastKnownLpg: Record<string, number> = {};
                    let lastKnownCng: Record<string, number> = {};
                    if (configuredCityKeys.size > 0 && stateUpper !== "LD") {
                        try {
                            [lastKnownLpg, lastKnownCng] = await Promise.all([
                                getLatestNonNullFuelPriceMapForState(state.code, "lpg", 120),
                                getLatestNonNullFuelPriceMapForState(state.code, "cng", 120),
                            ]);
                        } catch {
                        }
                    }

                    const cityNames: string[] = [];
                    const records: FuelPriceRecord[] = [];

                    for (const cityKey of allCityKeys) {
                        const cityName =
                            petrolMap[cityKey]?.city ??
                            dieselMap[cityKey]?.city ??
                            lpgMap[cityKey]?.city ??
                            cngMap[cityKey]?.city ??
                            slugCityNameByKey[cityKey] ??
                            cityKey;

                        const petrolPrice = petrolMap[cityKey]?.price ?? null;
                        const dieselPrice = dieselMap[cityKey]?.price ?? null;
                        let lpgPrice = lpgMap[cityKey]?.price ?? null;
                        let cngPrice = cngMap[cityKey]?.price ?? null;

                        if (stateUpper !== "LD") {
                            if (!isValidFuelPrice("lpg", lpgPrice)) {
                                const fallback = lastKnownLpg[cityKey];
                                if (fallback != null && isValidFuelPrice("lpg", fallback)) {
                                    lpgPrice = fallback;
                                }
                            }
                            if (!isValidFuelPrice("cng", cngPrice)) {
                                const fallback = lastKnownCng[cityKey];
                                if (fallback != null && isValidFuelPrice("cng", fallback)) {
                                    cngPrice = fallback;
                                }
                            }
                        }

                        const lpgValidated = isValidFuelPrice("lpg", lpgPrice) ? (lpgPrice as number) : null;
                        const cngValidated = isValidFuelPrice("cng", cngPrice) ? (cngPrice as number) : null;
                        const lpgFinal =
                            lpgValidated != null && shouldFilterSuspectsLpg && isSuspectByMedian("lpg", lpgValidated, lpgMedian)
                                ? null
                                : lpgValidated;
                        const cngFinal =
                            cngValidated != null && shouldFilterSuspectsCng && isSuspectByMedian("cng", cngValidated, cngMedian)
                                ? null
                                : cngValidated;

                        const cngFinalWithOverrides = stateUpper === "LD" ? null : cngFinal;
                        const lpgFinalWithOverrides = stateUpper === "LD" ? null : lpgFinal;

                        cityNames.push(cityName);
                        records.push({
                            state_code: state.code,
                            city_name: cityName,
                            date: today,
                            petrol_price: isValidFuelPrice("petrol", petrolPrice) ? petrolPrice : null,
                            diesel_price: isValidFuelPrice("diesel", dieselPrice) ? dieselPrice : null,
                            lpg_price: lpgFinalWithOverrides,
                            cng_price: cngFinalWithOverrides,
                        });
                    }

                    await replaceCitiesForState(state.code, cityNames);
                    results.cities += records.length;

                    await deleteFuelPricesForStateDate(state.code, today);

                    const chunkSize = 500;
                    for (let i = 0; i < records.length; i += chunkSize) {
                        const chunk = records.slice(i, i + chunkSize);
                        await upsertFuelPrices(chunk);
                        results.upserts += chunk.length;
                    }
                    results.fetched += records.length;
                } catch (err: any) {
                    results.errors.push({ state: state.code, reason: err?.message ?? String(err) });
                }

                if (delayMs > 0) {
                    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
                }
            }),
        ),
    );

    return results;
}
