export default function AboutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text">About Us — FuelPriceIndia</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">Who We Are</h2>
        <p className="text-sm text-muted">
          FuelPriceIndia is an independent platform that provides daily petrol, diesel, LPG, and CNG prices across
          cities and states in India.
        </p>
        <p className="text-sm text-muted">Our mission is simple:</p>
        <p className="text-sm font-medium text-primary">“Make fuel price information accurate, accessible, and easy for everyone in India.”</p>
        <p className="text-sm text-muted">
          Whether you're a student, commuter, delivery partner, traveler, or vehicle owner, our aim is to give you
          the most useful and reliable fuel information in one place.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">What We Do</h2>
        <p className="text-sm text-muted">Every day, our system automatically collects and updates:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Petrol prices</li>
          <li>Diesel prices</li>
          <li>LPG prices</li>
          <li>CNG prices</li>
          <li>7-day &amp; monthly price trends</li>
          <li>State-wise comparisons</li>
          <li>Cost-to-travel calculators</li>
        </ul>

        <p className="text-sm text-muted">We use a combination of:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Automated data processing</li>
          <li>Verified public sources</li>
          <li>Proprietary scraping systems</li>
          <li>User-friendly interfaces</li>
        </ul>

        <p className="text-sm text-muted">This ensures that the information you see is:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Up-to-date</li>
          <li>Easy to read</li>
          <li>Helpful for planning daily travel</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">Why We Built This</h2>
        <p className="text-sm text-muted">
          Fuel prices change frequently in India, and finding accurate local information can be confusing. We noticed
          that:
        </p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>People search every morning for “petrol price today”</li>
          <li>Delivery drivers want cost-per-km</li>
          <li>Travelers want city comparisons</li>
          <li>Students want eco-friendly insights</li>
          <li>Families want budgeting tools</li>
        </ul>
        <p className="text-sm text-muted">
          So we created a simple, fast platform that answers all these needs.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">Our Values</h2>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">1. Transparency</h3>
          <p className="text-sm text-muted">We clearly show the date and source of each fuel price.</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">2. Reliability</h3>
          <p className="text-sm text-muted">Our system updates daily using automation and data checks.</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">3. Simplicity</h3>
          <p className="text-sm text-muted">A clean, fast interface that focuses on what users actually want.</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">4. Accessibility</h3>
          <p className="text-sm text-muted">Works across all devices — mobile, tablet, desktop.</p>
        </div>
      </section>
    </div>
  );
}
