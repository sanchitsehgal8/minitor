/**
 * Data models for Website Privacy Intelligence.
 *
 * Deliberately free of React and of any generation logic: the scan engine
 * produces these, the scoring services consume them, and components only read
 * them. That separation is what lets the mock engine be swapped for a real
 * backend scanner without touching a single component (spec §18, §21).
 */

import type { TrackerCategory } from '@/lib/privacy/tracker-blocklist';

/**
 * Where a scan's numbers came from.
 *
 * The existing app carries the same distinction on privacy-console events, for
 * the same reason: a web page cannot observe another origin's network traffic,
 * so a scan of a third-party site is a profile-driven simulation. Making this a
 * required field means no report can render without declaring its provenance
 * (spec §24).
 */
export type ScanDataSource =
  /** Generated from a site profile. Realistic, deterministic, not measured. */
  | 'simulated-profile'
  /** Measured for real. Only reachable for MiniTor's own first-party pages. */
  | 'measured-first-party';

export type ResourceType =
  | 'document'
  | 'script'
  | 'stylesheet'
  | 'image'
  | 'font'
  | 'xhr'
  | 'pixel'
  | 'media';

/** What a request is for, beyond its resource type. */
export type RequestCategory =
  | 'content'
  | 'analytics'
  | 'advertising'
  | 'social'
  | 'fingerprinting'
  | 'cdn'
  | 'functional';

export type RequestAction = 'allow' | 'block';

export type RequestRecord = {
  readonly id: string;
  readonly domain: string;
  readonly url: string;
  readonly resourceType: ResourceType;
  readonly firstParty: boolean;
  readonly category: RequestCategory;
  readonly action: RequestAction;
  readonly secure: boolean;
  /** Why MiniTor blocked it, when it did. Empty for allowed requests. */
  readonly reason?: string;
};

export type TrackerFinding = {
  readonly domain: string;
  readonly operator: string;
  readonly category: TrackerCategory;
  readonly requests: number;
  readonly action: RequestAction;
};

export type CookieType = 'analytics' | 'advertising' | 'functional' | 'session';

export type CookieFinding = {
  readonly name: string;
  readonly domain: string;
  readonly type: CookieType;
  readonly firstParty: boolean;
  readonly secure: boolean;
  readonly httpOnly: boolean;
  /** Plain-language concerns, e.g. a third-party cookie with no Secure flag. */
  readonly warnings: readonly string[];
};

export type Severity = 'low' | 'medium' | 'high';

/** A security observation. `status` says whether the check passed. */
export type SecurityFinding = {
  readonly id: string;
  readonly title: string;
  readonly status: 'pass' | 'warn';
  readonly severity: Severity;
  readonly description: string;
};

/** One weighted component of the privacy score, with its own explanation. */
export type ScoreCategory = {
  readonly id: 'trackerExposure' | 'thirdPartyActivity' | 'advertising' | 'cookiePrivacy';
  readonly label: string;
  readonly score: number;
  /** Relative weight in the overall score. All weights sum to 1. */
  readonly weight: number;
  /** Why this number — shown when the user expands the category (spec §4). */
  readonly explanation: string;
};

export type PrivacyScore = {
  readonly total: number;
  readonly categories: readonly ScoreCategory[];
};

export type SecurityScore = {
  readonly total: number;
  readonly findings: readonly SecurityFinding[];
};

export type ScanTotals = {
  readonly totalRequests: number;
  readonly blockedRequests: number;
  readonly allowedRequests: number;
  readonly trackersDetected: number;
  readonly trackersBlocked: number;
  readonly advertisingDomains: number;
  readonly thirdPartyDomains: number;
  readonly cookieCount: number;
  /** 0–100, share of requests over https. */
  readonly httpsShare: number;
};

export type ScanResult = {
  readonly id: string;
  readonly url: string;
  readonly domain: string;
  /** ISO-8601. */
  readonly scannedAt: string;
  readonly dataSource: ScanDataSource;
  /** Which site profile produced this, for the report's provenance note. */
  readonly profileLabel: string;
  readonly privacy: PrivacyScore;
  readonly security: SecurityScore;
  readonly totals: ScanTotals;
  readonly requests: readonly RequestRecord[];
  readonly trackers: readonly TrackerFinding[];
  readonly cookies: readonly CookieFinding[];
};

/** A node in the connections graph (spec §7). */
export type GraphNode = {
  readonly domain: string;
  readonly category: RequestCategory;
  readonly requests: number;
  readonly firstParty: boolean;
  readonly action: RequestAction;
};

export type ConnectionGraph = {
  readonly root: string;
  readonly nodes: readonly GraphNode[];
};
