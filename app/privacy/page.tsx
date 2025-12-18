export default function PrivacyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Privacy Policy</h1>
      <p className="text-sm text-muted/80">Last updated: 15 Dec 2025</p>

      <p className="text-sm text-muted">
        Welcome to our website FuelPriceIndia. We operate a fuel price information platform that
        shows daily petrol, diesel, LPG, and CNG prices for cities across India.
      </p>

      <p className="text-sm text-muted">
        By using our website, you agree to the practices described in this Privacy Policy.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">1. Information We Collect</h2>
        <p className="text-sm text-muted">We collect the following types of information:</p>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">A. Information You Provide</h3>
          <p className="text-sm text-muted">When you contact us via email or forms.</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">B. Automatically Collected Information</h3>
          <p className="text-sm text-muted">When you use the website, we may automatically collect:</p>
          <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
            <li>IP address</li>
            <li>Browser type</li>
            <li>Device information</li>
            <li>Pages viewed</li>
            <li>Time spent on the website</li>
            <li>Referring websites</li>
          </ul>
          <p className="text-sm text-muted">This helps us improve performance and user experience.</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">C. Cookies &amp; Tracking Technologies</h3>
          <p className="text-sm text-muted">We use:</p>
          <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
            <li>Cookies</li>
            <li>Local storage</li>
            <li>Analytics scripts</li>
            <li>AdSense cookies (if enabled)</li>
          </ul>
          <p className="text-sm text-muted">Cookies are used for:</p>
          <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
            <li>Analytics</li>
            <li>Ads personalization (if you enable AdSense)</li>
            <li>Improving UI experience</li>
          </ul>
          <p className="text-sm text-muted">You may disable cookies in your browser settings.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">2. How We Use Your Information</h2>
        <p className="text-sm text-muted">We use collected information to:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Display fuel prices and related tools</li>
          <li>Improve website functionality</li>
          <li>Analyze traffic and usage</li>
          <li>Personalize ads (if applicable)</li>
          <li>Communicate with users who contact us</li>
        </ul>
        <p className="text-sm text-muted">We do NOT sell user data.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">3. Google Analytics &amp; Google AdSense</h2>
        <p className="text-sm text-muted">We may use:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Google Analytics for traffic insights</li>
          <li>Google AdSense for advertisements</li>
        </ul>
        <p className="text-sm text-muted">Google may use cookies (including the DoubleClick cookie) to:</p>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted marker:text-primary">
          <li>Serve personalized or non-personalized ads</li>
          <li>Limit ad frequency</li>
          <li>Measure ad performance</li>
        </ul>
        <p className="text-sm text-muted">
          Users may opt-out of personalized advertising by visiting:{" "}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            https://www.google.com/settings/ads
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">4. Third-Party Services</h2>
        <p className="text-sm text-muted">
          We may link to external websites (fuel sources, calculators, news portals). We are not responsible
          for the content or privacy practices of external sites.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">5. Data Storage &amp; Security</h2>
        <p className="text-sm text-muted">We take reasonable measures to protect your data.</p>
        <p className="text-sm text-muted">
          However, no method of transmission over the internet is 100% secure.
        </p>
        <p className="text-sm text-muted">
          We store pricing data (not personal data) in secure databases such as Supabase or equivalent.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">6. Children’s Privacy</h2>
        <p className="text-sm text-muted">Our site does not target children under the age of 13.</p>
        <p className="text-sm text-muted">
          We do not knowingly collect personal data from children.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">7. Changes to This Privacy Policy</h2>
        <p className="text-sm text-muted">We may update this policy from time to time.</p>
        <p className="text-sm text-muted">The latest version will always be shown on this page.</p>
      </section>
    </div>
  );
}
