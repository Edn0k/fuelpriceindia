export type CitySlugEntry = {
    city: string;
    slug: string;
};

// Map of state code -> list of cities and their Goodreturns petrol-price page slugs.
// Start small (up to ~10 cities per state) and expand as needed.
export const CITY_SLUGS: Record<string, CitySlugEntry[]> = {
    KL: [
        { city: "Ernakulam", slug: "ernakulam" },
        { city: "Thiruvananthapuram", slug: "thiruvananthapuram" },
        { city: "Kozhikode", slug: "kozhikode" },
        { city: "Thrissur", slug: "thrissur" },
        { city: "Kollam", slug: "kollam" },
        { city: "Alappuzha", slug: "alappuzha" },
        { city: "Palakkad", slug: "palakkad" },
        { city: "Kannur", slug: "kannur" },
        { city: "Kottayam", slug: "kottayam" },
        { city: "Malappuram", slug: "malappuram" },
    ],
    MH: [
        { city: "Mumbai", slug: "mumbai" },
        { city: "Pune", slug: "pune" },
        // Add more Maharashtra cities here as needed, following the same pattern.
    ],
    // Add other states similarly.
};
