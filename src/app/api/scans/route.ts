import type { NextRequest } from 'next/server';

import { failure, guard, ok, unauthorized } from '@/lib/api/respond';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { buildScanResult, domainFromInput } from '@/lib/scan/scan-engine';
import { scanRequestSchema } from '@/lib/validation/schemas';
import type { ScanResult } from '@/lib/scan/types';

const HISTORY_LIMIT = 100;

/** Rows carry the report as JSON text; anything unparseable is skipped. */
function parseRow(row: { payload: string }): ScanResult | null {
  try {
    return JSON.parse(row.payload) as ScanResult;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const domain = request.nextUrl.searchParams.get('domain')?.trim();

    const rows = await prisma.scanRecord.findMany({
      where: { userId: user.id, ...(domain ? { domain } : {}) },
      orderBy: { scannedAt: 'desc' },
      take: HISTORY_LIMIT,
    });

    const scans = rows
      .map((row) => {
        const result = parseRow(row);
        return result ? { ...result, id: row.id, monitored: row.monitored } : null;
      })
      .filter((scan): scan is ScanResult & { monitored: boolean } => scan !== null);

    return ok({ scans });
  });
}

export async function POST(request: NextRequest) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const parsed = scanRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message ?? 'That request was not valid.', 422);
    }

    const domain = domainFromInput(parsed.data.url);
    if (!domain) {
      return failure(`"${parsed.data.url}" is not a URL or hostname MiniTor can analyse.`, 422);
    }

    // The report itself is computed either way: a private-mode user still gets
    // to see the analysis, it simply is not written down.
    const result = buildScanResult({ url: parsed.data.url });

    if (parsed.data.isPrivate) {
      return ok(
        { stored: false, reason: 'Private tabs do not save scans to your history.', scan: result },
        202,
      );
    }

    const row = await prisma.scanRecord.create({
      data: {
        userId: user.id,
        domain: result.domain,
        url: result.url,
        privacyScore: result.privacy.total,
        securityScore: result.security.total,
        payload: JSON.stringify(result),
      },
      select: { id: true, monitored: true },
    });

    return ok({ stored: true, scan: { ...result, id: row.id, monitored: row.monitored } }, 201);
  });
}

export async function DELETE() {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { count } = await prisma.scanRecord.deleteMany({ where: { userId: user.id } });
    return ok({ deleted: count });
  });
}
