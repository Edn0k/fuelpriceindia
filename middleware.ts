import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isTwoLetterState(value: string) {
    return /^[a-z]{2}$/i.test(value);
}

const sections = new Set([
    "fuel-price",
    "petrol-price",
    "diesel-price",
    "fuel-history",
    "cost-to-travel",
]);

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 2) return NextResponse.next();

    const section = parts[0];
    if (!sections.has(section)) return NextResponse.next();

    const seg1 = parts[1];

    // State index: /section/:state
    if (parts.length === 2 && isTwoLetterState(seg1)) return NextResponse.next();

    // Canonical already: /section/:state/:city
    if (parts.length >= 3 && isTwoLetterState(seg1)) return NextResponse.next();

    // Legacy city-only: /section/:city  -> /section/legacy/:city
    if (parts.length === 2) {
        const url = req.nextUrl.clone();
        url.pathname = `/${section}/legacy/${seg1}`;
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/fuel-price/:path*",
        "/petrol-price/:path*",
        "/diesel-price/:path*",
        "/fuel-history/:path*",
        "/cost-to-travel/:path*",
    ],
};
