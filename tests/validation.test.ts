import { describe, expect, it } from 'vitest';

import { bookmarkWriteSchema, credentialsSchema, historyWriteSchema } from '@/lib/validation/schemas';

describe('credentials schema', () => {
  it('normalises the email to lowercase and trims it', () => {
    const parsed = credentialsSchema.parse({ email: '  Person@Example.COM ', password: 'a'.repeat(12) });
    expect(parsed.email).toBe('person@example.com');
  });

  it('rejects a password shorter than 10 characters', () => {
    expect(credentialsSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(credentialsSchema.safeParse({ email: 'nope', password: 'a'.repeat(12) }).success).toBe(false);
  });
});

describe('write schemas', () => {
  it('defaults isPrivate to false when absent', () => {
    const parsed = historyWriteSchema.parse({ url: 'https://example.com', title: 'Example' });
    expect(parsed.isPrivate).toBe(false);
  });

  it('accepts app-relative demo paths as well as http(s) urls', () => {
    expect(historyWriteSchema.safeParse({ url: '/demo/tracker-heavy', title: 'Demo' }).success).toBe(true);
  });

  it('refuses a javascript: url', () => {
    expect(bookmarkWriteSchema.safeParse({ url: 'javascript:alert(1)', title: 'x' }).success).toBe(false);
  });

  it('requires a non-empty title', () => {
    expect(bookmarkWriteSchema.safeParse({ url: 'https://example.com', title: '  ' }).success).toBe(false);
  });
});
