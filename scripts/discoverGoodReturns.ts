import fs from "fs/promises";
import path from "path";
import { CITY_SLUGS } from "../lib/citySlugs";

// Simple helper script to dump the current CITY_SLUGS map
// into ./city_slugs.json so it can be consumed by batch
// scrapers or external tooling.
//
// This does NOT crawl Goodreturns; it just serializes
// the slugs you already maintain in lib/citySlugs.ts.

async function main() {
    const outPath = path.resolve(process.cwd(), "city_slugs.json");
    const json = JSON.stringify(CITY_SLUGS, null, 2);
    await fs.writeFile(outPath, json, "utf8");
    console.log(`Wrote ${Object.keys(CITY_SLUGS).length} states to ${outPath}`);
}

main().catch((err) => {
    console.error("discoverGoodReturns failed", err);
    process.exitCode = 1;
});
