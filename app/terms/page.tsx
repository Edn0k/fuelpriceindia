export default function TermsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Terms &amp; Conditions</h1>
      <p className="text-sm text-muted/80">Last updated: 15 Dec 2025</p>

      <p className="text-sm text-muted">
        Welcome to FuelPriceIndia. By accessing or using this website, you agree to the following Terms &amp; Conditions.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">1. Acceptance of Terms</h2>
        <p className="text-sm text-muted">By using the site, you agree to be bound by:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>These Terms</li>
          <li>Our Privacy Policy</li>
        </ul>
        <p className="text-sm text-muted">If you do not agree, please stop using the site.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">2. Service Description</h2>
        <p className="text-sm text-muted">The website provides:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Daily petrol, diesel, LPG, and CNG prices</li>
          <li>Fuel cost calculators</li>
          <li>Historical charts</li>
          <li>Analytical tools</li>
          <li>Advertisements</li>
        </ul>
        <p className="text-sm text-muted">
          We do not guarantee accuracy, because fuel prices may vary by station, city, or provider.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">3. Data Sources</h2>
        <p className="text-sm text-muted">Fuel prices are collected using:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Publicly available data</li>
          <li>Third-party sources</li>
          <li>Automated scripts</li>
        </ul>
        <p className="text-sm text-muted">Prices may not always reflect official government updates.</p>
        <p className="text-sm text-muted">FuelPriceIndia is not liable for:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Price inaccuracies</li>
          <li>Delay in updates</li>
          <li>Third-party data errors</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">4. User Responsibilities</h2>
        <p className="text-sm text-muted">Users agree:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Not to misuse the website</li>
          <li>Not to attempt hacking, scraping, or DDoS</li>
          <li>Not to copy content without permission</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">5. Intellectual Property</h2>
        <p className="text-sm text-muted">
          All content on this site — design, layout, charts, text, and tools — is the property of FuelPriceIndia unless otherwise stated.
        </p>
        <p className="text-sm text-muted">Users may not:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Reproduce</li>
          <li>Distribute</li>
          <li>Resell</li>
        </ul>
        <p className="text-sm text-muted">…any part of the site without written permission.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">6. Limitation of Liability</h2>
        <p className="text-sm text-muted">FuelPriceIndia is not liable for:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Financial loss</li>
          <li>Fuel cost miscalculations</li>
          <li>Incorrect prices</li>
          <li>Error due to outdated data</li>
          <li>Loss of data or service downtime</li>
        </ul>
        <p className="text-sm text-muted">Use this service at your own risk.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">7. Third-Party Links</h2>
        <p className="text-sm text-muted">We may link to external websites. We are not responsible for:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Their content</li>
          <li>Their terms</li>
          <li>Their privacy practices</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">8. Ads and Monetization</h2>
        <p className="text-sm text-muted">FuelPriceIndia may show advertisements using:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Google AdSense</li>
          <li>Affiliate links</li>
          <li>Sponsored content (optional)</li>
        </ul>
        <p className="text-sm text-muted">Ads do not imply endorsement.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">9. Modifications</h2>
        <p className="text-sm text-muted">FuelPriceIndia may modify these Terms at any time.</p>
        <p className="text-sm text-muted">Changes become effective immediately after posting.</p>
      </section>
    </div>
  );
}
