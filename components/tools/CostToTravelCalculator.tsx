"use client";

import { useMemo, useState } from "react";

type Props = {
    cityName: string;
    prices: {
        petrol: number | null;
        diesel: number | null;
        lpg: number | null;
        cng: number | null;
    };
};

function formatInr(value: number | null) {
    if (value == null || !Number.isFinite(value)) return "N/A";
    return `₹${value.toFixed(0)}`;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

type FuelKey = "petrol" | "diesel" | "lpg" | "cng";

function convertLpgCylinderToKgPrice(value: number | null) {
    if (value == null || !Number.isFinite(value)) return null;
    const LPG_CYLINDER_KG = 14.2;
    return value / LPG_CYLINDER_KG;
}

function getFuelUnit(fuel: FuelKey) {
    return fuel === "petrol" || fuel === "diesel" ? "L" : "kg";
}

function getMileageUnitLabel(fuel: FuelKey) {
    return fuel === "petrol" || fuel === "diesel" ? "km/l" : "km/kg";
}

function getFuelLabel(fuel: FuelKey) {
    if (fuel === "petrol") return "Petrol";
    if (fuel === "diesel") return "Diesel";
    if (fuel === "lpg") return "LPG";
    return "CNG";
}

function getPriceForFuel(prices: Props["prices"], fuel: FuelKey): number | null {
    const raw = prices[fuel];
    if (fuel === "lpg") return convertLpgCylinderToKgPrice(raw);
    return raw;
}

export function CostToTravelCalculator({ cityName, prices }: Props) {
    const [selectedFuel, setSelectedFuel] = useState<FuelKey>("petrol");
    const [mileage, setMileage] = useState<number>(18);

    const selectedPrice = useMemo(() => getPriceForFuel(prices, selectedFuel), [prices, selectedFuel]);
    const unit = getFuelUnit(selectedFuel);
    const mileageUnit = getMileageUnitLabel(selectedFuel);

    const computed = useMemo(() => {
        const price = selectedPrice;
        const m = clamp(Number(mileage) || 0, 1, 200);
        const fuelRequired = 100 / m;
        const travelCost = price != null ? fuelRequired * price : null;
        const costPerKm = travelCost != null ? travelCost / 100 : null;
        return { fuelRequired, travelCost, costPerKm };
    }, [mileage, selectedPrice]);

    const preset = (v: number) => setMileage(v);

    const scenario = (m: number) => {
        if (selectedPrice == null) return { cost: null, perKm: null };
        const fuelRequired = 100 / m;
        const travelCost = fuelRequired * selectedPrice;
        return { cost: travelCost, perKm: travelCost / 100 };
    };

    const exampleHigh = scenario(45);
    const exampleMid = scenario(18);
    const exampleLow = scenario(12);

    return (
        <section className="mt-6 rounded-2xl border border-border/15 bg-card p-4">
            <div className="flex flex-col gap-1">
                <h2 className="border-l-2 border-border/25 pl-3 text-sm font-semibold uppercase tracking-wide text-white/80">
                    Cost to travel 100 km in {cityName}
                </h2>
                <p className="text-sm text-muted">
                    Pick a fuel and enter your vehicle mileage to estimate travel cost.
                </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {(["petrol", "diesel", "lpg", "cng"] as FuelKey[]).map((fuel) => {
                    const available = getPriceForFuel(prices, fuel) != null;
                    const active = selectedFuel === fuel;
                    return (
                        <button
                            key={fuel}
                            type="button"
                            onClick={() => setSelectedFuel(fuel)}
                            className={`min-h-[44px] rounded-full border px-4 py-2 text-xs font-medium shadow-sm transition ${
                                active
                                    ? "border-primary bg-primary text-white"
                                    : available
                                        ? "border-border/15 bg-card text-white/80 hover:border-primary/60 hover:bg-primary/10 hover:text-white"
                                        : "cursor-not-allowed border-border/10 bg-surface text-muted/50"
                            }`}
                            disabled={!available}
                        >
                            {getFuelLabel(fuel)}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/10 bg-surface p-4">
                    <label className="block text-xs font-medium text-muted">
                        Mileage ({mileageUnit})
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={mileage}
                        onChange={(e) => setMileage(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-border/15 bg-card px-3 py-2 text-sm text-text shadow-sm shadow-black/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        min={1}
                        max={200}
                        step={0.5}
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => preset(45)}
                            className={`min-h-[44px] rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                mileage === 45
                                    ? "border-primary bg-primary text-white"
                                    : "border-border/15 bg-card text-white/80 hover:border-primary/60 hover:bg-primary/10 hover:text-white"
                            }`}
                        >
                            Example (45)
                        </button>
                        <button
                            type="button"
                            onClick={() => preset(18)}
                            className={`min-h-[44px] rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                mileage === 18
                                    ? "border-primary bg-primary text-white"
                                    : "border-border/15 bg-card text-white/80 hover:border-primary/60 hover:bg-primary/10 hover:text-white"
                            }`}
                        >
                            Example (18)
                        </button>
                        <button
                            type="button"
                            onClick={() => preset(12)}
                            className={`min-h-[44px] rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                mileage === 12
                                    ? "border-primary bg-primary text-white"
                                    : "border-border/15 bg-card text-white/80 hover:border-primary/60 hover:bg-primary/10 hover:text-white"
                            }`}
                        >
                            Example (12)
                        </button>
                    </div>
                </div>

                <div className="rounded-xl border border-border/10 bg-surface p-4 shadow-sm shadow-black/20">
                    <p className="text-xs uppercase tracking-wide text-muted">Estimate</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-success drop-shadow-sm">
                        {formatInr(computed.travelCost)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                        Cost per km: {formatInr(computed.costPerKm)}
                    </p>
                    <p className="mt-1 text-xs text-muted/80">
                        Fuel required: {computed.fuelRequired.toFixed(2)} {unit}
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-border/10 bg-surface p-4 text-sm text-muted">
                <p className="font-medium text-text">Example scenarios</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/10 bg-card p-3">
                        <p className="text-xs text-muted/80">
                            Example (45 {mileageUnit})
                        </p>
                        <p className="text-base font-semibold text-success/80">{formatInr(exampleHigh.cost)}</p>
                    </div>
                    <div className="rounded-lg border border-border/10 bg-card p-3">
                        <p className="text-xs text-muted/80">
                            Example (18 {mileageUnit})
                        </p>
                        <p className="text-base font-semibold text-success/80">{formatInr(exampleMid.cost)}</p>
                    </div>
                    <div className="rounded-lg border border-border/10 bg-card p-3">
                        <p className="text-xs text-muted/80">
                            Example (12 {mileageUnit})
                        </p>
                        <p className="text-base font-semibold text-success/80">{formatInr(exampleLow.cost)}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
