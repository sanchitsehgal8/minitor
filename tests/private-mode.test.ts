/**
 * Private mode and the write-path contracts.
 *
 * MiniTor's private-mode promise is enforced twice: the client does not call
 * the API, and the API refuses the write if it is called anyway. The client
 * half is covered by the browser tests; this file covers the schema layer the
 * server half is built on, because that is the barrier that has to hold when
 * the client is bypassed entirely (a curl, a replayed request, a UI bug).
 *
 * The routes themselves are exercised against a live server during QA; what is
 * unit-testable here is that the contracts they depend on cannot silently
 * change — particularly that `isPrivate` defaults to the SAFE value.
 */

import { describe, expect, it } from 'vitest';

import {
  bookmarkWriteSchema,
  credentialsSchema,
  historyWriteSchema,
  monitorToggleSchema,
  scanRequestSchema,
  signupSchema,
} from '@/lib/validation/schemas';

describe('history writes', () => {
  it('carries the private flag through so the route can refuse it', () => {
    const parsed = historyWriteSchema.parse({
      url: 'https://example.com/',
      title: 'Example',
      isPrivate: true,
    });
    expect(parsed.isPrivate).toBe(true);
  });

  it('defaults isPrivate to false only when the client omits it', () => {
    // The default is the non-private one, which is correct precisely because a
    // private client always sends the flag explicitly. A default of `true`
    // would silently discard ordinary history instead.
    const parsed = historyWriteSchema.parse({ url: 'https://example.com/', title: 'Example' });
    expect(parsed.isPrivate).toBe(false);
  });

  it('rejects schemes that are not http(s) or an app-relative path', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://example.com', 'file:///etc']) {
      expect(historyWriteSchema.safeParse({ url, title: 'x' }).success).toBe(false);
    }
  });

  it('accepts app-relative demo paths', () => {
    expect(
      historyWriteSchema.safeParse({ url: '/demo/tracker-heavy', title: 'Demo' }).success,
    ).toBe(true);
  });

  it('requires a non-empty title and bounds its length', () => {
    expect(historyWriteSchema.safeParse({ url: 'https://a.com', title: '' }).success).toBe(false);
    expect(
      historyWriteSchema.safeParse({ url: 'https://a.com', title: 'x'.repeat(301) }).success,
    ).toBe(false);
  });

  it('bounds URL length so a row cannot be used as bulk storage', () => {
    const long = `https://example.com/${'a'.repeat(2100)}`;
    expect(historyWriteSchema.safeParse({ url: long, title: 'x' }).success).toBe(false);
  });
});

describe('bookmark writes', () => {
  it('carries the private flag the same way history does', () => {
    const parsed = bookmarkWriteSchema.parse({
      url: 'https://example.com/',
      title: 'Example',
      isPrivate: true,
    });
    expect(parsed.isPrivate).toBe(true);
  });

  it('rejects unsupported schemes', () => {
    expect(
      bookmarkWriteSchema.safeParse({ url: 'javascript:alert(1)', title: 'x' }).success,
    ).toBe(false);
  });
});

describe('scan requests', () => {
  it('defaults to non-private and accepts an explicit private flag', () => {
    expect(scanRequestSchema.parse({ url: 'example.com' }).isPrivate).toBe(false);
    expect(scanRequestSchema.parse({ url: 'example.com', isPrivate: true }).isPrivate).toBe(true);
  });

  it('refuses empty or whitespace-only input with a readable message', () => {
    const result = scanRequestSchema.safeParse({ url: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/enter a website/i);
    }
  });
});

describe('monitor toggle', () => {
  it('accepts only a boolean, never a truthy string', () => {
    expect(monitorToggleSchema.safeParse({ monitored: true }).success).toBe(true);
    expect(monitorToggleSchema.safeParse({ monitored: 'true' }).success).toBe(false);
    expect(monitorToggleSchema.safeParse({}).success).toBe(false);
  });
});

describe('credentials', () => {
  it('normalises email case so one address cannot become two accounts', () => {
    expect(credentialsSchema.parse({ email: 'A@B.COM', password: 'x'.repeat(10) }).email).toBe(
      'a@b.com',
    );
  });

  it('trims surrounding whitespace from the email', () => {
    expect(credentialsSchema.parse({ email: '  a@b.com ', password: 'x'.repeat(10) }).email).toBe(
      'a@b.com',
    );
  });

  it('enforces the documented minimum password length', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(9) }).success).toBe(false);
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(10) }).success).toBe(true);
  });

  it('does not silently truncate an over-long password', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(201) }).success).toBe(
      false,
    );
  });

  it('rejects malformed email addresses', () => {
    for (const email of ['', 'not-an-email', 'a@', '@b.com', 'a b@c.com']) {
      expect(signupSchema.safeParse({ email, password: 'x'.repeat(10) }).success).toBe(false);
    }
  });
});
