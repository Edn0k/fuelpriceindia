import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const svgPath = path.resolve(__dirname, "..", "public", "logo.svg");
    const outPath = path.resolve(__dirname, "..", "public", "logo.png");

    const svg = await fs.readFile(svgPath);

    const resvg = new Resvg(svg, {
        fitTo: {
            mode: "width",
            value: 1024,
        },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    await fs.writeFile(outPath, pngBuffer);

    console.info(`Wrote ${pngData.width}x${pngData.height} -> ${outPath}`);
}

main();
