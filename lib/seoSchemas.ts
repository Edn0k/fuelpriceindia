import { getSiteUrl } from "./siteUrl";
import type { CityFuelSnapshot } from "./seoFuelRepo";

export function toCitySlug(cityName: string) {
    return (cityName || "")
        .toLowerCase()
        .replace(/[^a-z0-9\p{L}]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export function formatInr(value: number | null, digits = 2) {
    if (value == null || !Number.isFinite(value)) return null;
    return `₹${value.toFixed(digits)}`;
}

export function computeTravelCost(price: number | null, mileage: number) {
    if (price == null || !Number.isFinite(price) || !Number.isFinite(mileage) || mileage <= 0) return null;
    return (100 / mileage) * price;
}

export function buildBreadcrumbLd(items: { name: string; item: string }[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: it.name,
            item: it.item,
        })),
    };
}

export function buildItemListLd(
    name: string,
    items: { name: string; url: string }[],
) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        itemListElement: items.map((it, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: it.name,
            url: it.url,
        })),
    };
}

export function buildCityDatasetLd(url: string, snap: CityFuelSnapshot) {
    return {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: `Fuel prices in ${snap.city_name} (${snap.state_code}) on ${snap.date}`,
        description: `Daily petrol, diesel, LPG and CNG prices in ${snap.city_name}, India. Updated daily.`,
        url,
        dateModified: snap.date,
        spatialCoverage: {
            "@type": "Place",
            name: `${snap.city_name}, India`,
        },
        variableMeasured: [
            { "@type": "PropertyValue", name: "petrol_price", value: snap.petrol_price },
            { "@type": "PropertyValue", name: "diesel_price", value: snap.diesel_price },
            { "@type": "PropertyValue", name: "lpg_price", value: snap.lpg_price },
            { "@type": "PropertyValue", name: "cng_price", value: snap.cng_price },
        ],
    };
}

export function buildCityFaqLd(args: {
    cityName: string;
    petrolPrice: number | null;
    dieselPrice?: number | null;
    sampleMileageKmPerL?: number;
}) {
    const { cityName, petrolPrice, dieselPrice, sampleMileageKmPerL = 18 } = args;

    const petrolLabel = formatInr(petrolPrice);
    const dieselLabel = formatInr(dieselPrice ?? null);

    const petrolAnswer = petrolLabel
        ? `Today’s petrol price in ${cityName} is ${petrolLabel} per litre. Prices are updated daily.`
        : `Today’s petrol price in ${cityName} is updated daily. If it’s unavailable, please check back later.`;

    const dieselAnswer = dieselLabel
        ? `Today’s diesel price in ${cityName} is ${dieselLabel} per litre. Prices are updated daily.`
        : `Today’s diesel price in ${cityName} is updated daily. If it’s unavailable, please check back later.`;

    const sampleCost = computeTravelCost(petrolPrice, sampleMileageKmPerL);
    const sampleCostLabel = formatInr(sampleCost, 0);
    const travelAnswer = sampleCostLabel
        ? `At ${sampleMileageKmPerL} km/l, travelling 100 km in ${cityName} costs about ${sampleCostLabel} in petrol.`
        : "We divide 100 by your mileage (km/l) to get litres required, then multiply by the petrol price.";

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: `What is today’s petrol price in ${cityName}?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: petrolAnswer,
                },
            },
            {
                "@type": "Question",
                name: `What is today’s diesel price in ${cityName}?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: dieselAnswer,
                },
            },
            {
                "@type": "Question",
                name: `How often are fuel prices updated for ${cityName}?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Fuel prices are refreshed daily via an automated data pipeline.",
                },
            },
            {
                "@type": "Question",
                name: `How do you calculate cost to travel 100 km in ${cityName}?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: travelAnswer,
                },
            },
            {
                "@type": "Question",
                name: `Why can fuel prices differ slightly from pump rates in ${cityName}?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Local pump prices can vary slightly due to station-level pricing and rounding.",
                },
            },
        ],
    };
}

export function buildCityCanonical(path: string, stateCode?: string | null) {
    const site = getSiteUrl();
    const q = stateCode ? `?state=${encodeURIComponent(stateCode)}` : "";
    return `${site}${path}${q}`;
}

export function buildCanonicalStatePage(section: string, stateCode: string) {
    const site = getSiteUrl();
    return `${site}/${section}/${encodeURIComponent(String(stateCode).toLowerCase())}`;
}

export function buildCanonicalCityPage(section: string, stateCode: string, cityName: string) {
    const site = getSiteUrl();
    return `${site}/${section}/${encodeURIComponent(String(stateCode).toLowerCase())}/${encodeURIComponent(
        toCitySlug(cityName),
    )}`;
}
