import { ArchitectureDiagram } from '@/components/landing/architecture-diagram';
import { BrowserShowcase } from '@/components/landing/browser-showcase';
import { Closing } from '@/components/landing/closing';
import { Hero } from '@/components/landing/hero';
import { ObjectivesBento, type AnalysisShowcase } from '@/components/landing/objectives-bento';
import { Reveal } from '@/components/landing/reveal';
import { SiteNav } from '@/components/landing/site-nav';
import { TrackerMarquee } from '@/components/landing/tracker-marquee';
import { EMBEDDABLE_SITES } from '@/lib/privacy/embeddable-sites';
import { TRACKER_BLOCKLIST, blocklistSize } from '@/lib/privacy/tracker-blocklist';
import { scoreBand } from '@/lib/scan/privacy-score';
import { buildScanResult } from '@/lib/scan/scan-engine';

const TEAM = [
  'Krishiv Grag',
  'Sanchit Kumar Sharma',
  'Sanchit Shegal',
] as const;

/**
 * The analysis card's numbers are not mock-ups: they are the scan engine's
 * real output for a news-site domain, computed here on the server with the
 * same code the app runs. The scan itself is modelled from a site profile,
 * and the card says so.
 */
function analysisShowcase(): AnalysisShowcase {
  const scan = buildScanResult({ url: 'nytimes.com', scannedAt: '2026-01-01T00:00:00.000Z' });
  return {
    domain: scan.domain,
    profileLabel: scan.profileLabel,
    total: scan.privacy.total,
    band: scoreBand(scan.privacy.total),
    categories: scan.privacy.categories.map((category) => ({
      label: category.label,
      score: category.score,
    })),
  };
}

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-void">
      <SiteNav />
      <Hero />

      <TrackerMarquee
        rules={TRACKER_BLOCKLIST}
        stats={[
          { label: 'Tracker domains on the blocklist', value: blocklistSize() },
          { label: 'Sites in the curated start page', value: EMBEDDABLE_SITES.length },
          { label: 'Site profiles in the scanner', value: 5 },
        ]}
      />

      <BrowserShowcase />

      <section id="honesty" className="relative scroll-mt-16 border-t border-white/[0.06] bg-ink-sunken/40 py-24 lg:py-32">
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-4xl text-white sm:text-5xl">What works, and what doesn’t</h2>
            <p className="mt-5 text-lg text-ash-light">
              A hosted page cannot inspect the network traffic of a site it embeds — browsers
              prevent it deliberately. Rather than fake the parts that need that access, MiniTor
              labels them.
            </p>
          </Reveal>

          <ObjectivesBento analysis={analysisShowcase()} />
        </div>
      </section>

      <div className="border-t border-white/[0.06]">
        <ArchitectureDiagram />
      </div>

      <div className="border-t border-white/[0.06]">
        <Closing team={TEAM} />
      </div>
    </main>
  );
}
