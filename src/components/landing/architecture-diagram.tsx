/**
 * Simplified recreation of the report's three-layer architecture (spec §4).
 *
 * Drawn with layout and type rather than an SVG canvas so it reflows on a
 * phone instead of scaling to illegibility, and so the annotations stay real
 * selectable text.
 */

const LAYERS = [
  {
    id: 'interface',
    name: 'Interface layer',
    role: 'What you touch',
    parts: ['Tab bar', 'Address bar + padlock', 'History & bookmark panels', 'Privacy Center & reports'],
    note: 'React components. Presentational — they hold no privacy rules of their own.',
  },
  {
    id: 'policy',
    name: 'Policy layer',
    role: 'What decides',
    parts: ['URL scheme check', 'Tracker matching', 'Scan engine & scoring', 'Navigation stack'],
    note: 'Pure TypeScript modules, no DOM and no network. Unit-tested, and re-run on the server for any write.',
  },
  {
    id: 'storage',
    name: 'Storage layer',
    role: 'What persists',
    parts: ['User accounts', 'History entries', 'Bookmarks', 'Saved scans'],
    note: 'Prisma over SQLite locally, Postgres when hosted. A private tab never reaches this layer.',
  },
] as const;

export function ArchitectureDiagram() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {LAYERS.map((layer, index) => (
        <div key={layer.id} className="relative flex flex-col rounded-lg border border-ash-light bg-paper p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg text-ink">{layer.name}</h3>
            <span className="font-mono text-xs text-ash">{layer.role}</span>
          </div>

          <ul className="mt-4 flex-1 space-y-1.5">
            {layer.parts.map((part) => (
              <li key={part} className="flex items-start gap-2 text-sm text-ink">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-verdigris" aria-hidden="true" />
                {part}
              </li>
            ))}
          </ul>

          <p className="mt-4 border-t border-ash-light pt-3 text-sm text-ash-dim">{layer.note}</p>

          {index < LAYERS.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute -bottom-2.5 left-1/2 z-10 -translate-x-1/2 text-ash md:-right-2.5 md:bottom-auto md:left-auto md:top-1/2 md:-translate-x-0 md:-translate-y-1/2"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5 rotate-90 md:rotate-0" fill="none">
                <circle cx="10" cy="10" r="9.25" fill="#EDEAE7" stroke="#C4C7CC" strokeWidth="1" />
                <path d="M7.5 5.5 12 10l-4.5 4.5" stroke="#8A8F98" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
