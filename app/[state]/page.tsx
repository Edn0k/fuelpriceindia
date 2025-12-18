import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServiceClient } from "../../lib/supabase";
import AdUnit from "../../components/AdUnit";

export async function generateMetadata({
  params,
}: {
  params: { state: string };
}): Promise<Metadata> {
  const stateCode = params.state.toUpperCase();
  const { data } = await supabaseServiceClient
    .from("states")
    .select("name")
    .eq("code", stateCode)
    .maybeSingle();

  const stateName = data?.name ?? stateCode;

  return {
    title: `Fuel prices in ${stateName} today – FuelPriceIndia`,
    description: `View today’s petrol and diesel prices across major cities in ${stateName}, India. Data cached from external APIs in Supabase, updated daily.`,
  };
}

export default async function StatePage({ params }: { params: { state: string } }) {
  const stateCode = params.state.toUpperCase();

  const { data: stateRow } = await supabaseServiceClient
    .from("states")
    .select("name")
    .eq("code", stateCode)
    .maybeSingle();

  if (!stateRow) {
    notFound();
  }

  const { data: rows, error } = await supabaseServiceClient
    .from("fuel_prices")
    .select("city_name, petrol_price, diesel_price, date")
    .eq("state_code", stateCode)
    .order("city_name", { ascending: true });

  const latestByCity = new Map<string, any>();
  (rows ?? []).forEach((row) => {
    const existing = latestByCity.get(row.city_name);
    if (!existing || existing.date < row.date) {
      latestByCity.set(row.city_name, row);
    }
  });

  const data = Array.from(latestByCity.values());

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Fuel prices in {stateRow.name}
        </h1>
        <p className="text-sm text-muted">
          Overview of petrol and diesel prices across major cities in {stateRow.name}. Data
          updated daily from cached API responses.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
          Unable to load fuel prices for this state right now.
        </div>
      )}

      {!error && data.length === 0 && (
        <div className="rounded-2xl border border-border/10 bg-card px-4 py-3 text-sm text-muted">
          No cached prices yet for this state. Please check back later.
        </div>
      )}

      {!error && data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border/10 bg-card">
          <table className="min-w-full divide-y divide-border/10 text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  City
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Petrol (₹/L)
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Diesel (₹/L)
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Last updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 bg-card">
              {data.map((row) => (
                <tr key={row.city_name} className="hover:bg-surface">
                  <td className="px-4 py-2 text-xs font-medium text-text sm:text-sm">
                    {row.city_name}
                  </td>
                  <td className="px-4 py-2 text-xs font-semibold text-success sm:text-sm">
                    {row.petrol_price ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-xs font-semibold text-success sm:text-sm">
                    {row.diesel_price ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted/80">
                    {new Date(row.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdUnit slot="7371767054" className="my-8" />
    </div>
  );
}
