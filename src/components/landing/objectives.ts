/**
 * The five objectives, with their honest status (spec §1). This array is the
 * single source for the landing page's feature list and the status badges shown
 * inside the app, so the two can never disagree about what is real.
 */

export type ObjectiveStatus = 'real' | 'partial' | 'simulated';

export type Objective = {
  readonly title: string;
  readonly status: ObjectiveStatus;
  readonly what: string;
  /** The honest limitation. Shown, not hidden. */
  readonly caveat?: string;
};

export const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  real: 'Working',
  partial: 'Partly working',
  simulated: 'Simulated',
};

export const OBJECTIVES: readonly Objective[] = [
  {
    title: 'Tabbed browsing with back, forward and reload',
    status: 'real',
    what:
      'Open and close tabs, switch between them, and move through each tab’s own history. The shell keeps its own navigation stack per tab.',
    caveat:
      'Pages load in an iframe, so browsing is limited to a curated list of sites that allow being embedded.',
  },
  {
    title: 'History and bookmarks stored per account',
    status: 'real',
    what:
      'Every visit and saved page is written to a database against your account. Search, rename and delete them; they survive a refresh, a logout and a login on another device.',
  },
  {
    title: 'Private mode',
    status: 'real',
    what:
      'A private tab writes nothing — no history row, no bookmark. The API refuses the write on the server, not just in the browser.',
    caveat:
      'It hides your browsing from this app’s database. It does not hide it from your network, your employer or the sites you visit.',
  },
  {
    title: 'Cookie visibility',
    status: 'partial',
    what: 'You can see and clear the cookies MiniTor itself sets for your session.',
    caveat:
      'Third-party cookies set inside an embedded page are invisible to this one. Browsers isolate them from the parent by design, and no amount of JavaScript changes that.',
  },
  {
    title: 'Tracker and ad-domain blocking',
    status: 'simulated',
    what:
      'A live console logs requests to known tracker domains as you browse, matched against a blocklist of 32 domains.',
    caveat:
      'On embedded third-party pages the log is a simulation — the parent page cannot see their network traffic. On MiniTor’s own demo page the blocking is genuinely enforced.',
  },
  {
    title: 'HTTPS-only enforcement',
    status: 'real',
    what:
      'Type any URL at all. A bare hostname becomes https. An explicit http URL stops at a warning page and will not load until you confirm.',
  },
];
