import { z } from 'zod';

/**
 * Shared request/response contracts. Client forms and API routes both import
 * from here, so validation rules cannot drift between the two — and the server
 * always revalidates rather than trusting the client's check.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(254, 'That email address is too long.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'Use 200 characters or fewer.');

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = credentialsSchema;

/** Any http(s) URL, or an app-relative demo path. */
const urlSchema = z
  .string()
  .trim()
  .min(1, 'A URL is required.')
  .max(2048, 'That URL is too long.')
  .refine(
    (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
    'Only http and https URLs can be saved.',
  );

export const historyWriteSchema = z.object({
  url: urlSchema,
  title: z.string().trim().min(1).max(300),
  /**
   * The client states whether the originating tab was private. The server
   * refuses the write outright when true — belt and braces alongside the
   * client simply not calling it (spec §5).
   */
  isPrivate: z.boolean().optional().default(false),
});

export const bookmarkWriteSchema = z.object({
  url: urlSchema,
  title: z.string().trim().min(1).max(300),
  isPrivate: z.boolean().optional().default(false),
});

export const idParamSchema = z.object({ id: z.string().cuid('Unknown record.') });

export type Credentials = z.infer<typeof credentialsSchema>;
export type HistoryWrite = z.infer<typeof historyWriteSchema>;
export type BookmarkWrite = z.infer<typeof bookmarkWriteSchema>;

/**
 * Scan requests. The URL is validated the same way a bookmark's is, and the
 * private flag exists for the same reason: a private tab must not leave a
 * stored scan behind, and the server is what enforces that.
 */
export const scanRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Enter a website to analyse.')
    .max(2048, 'That URL is too long.'),
  isPrivate: z.boolean().optional().default(false),
});

export const monitorToggleSchema = z.object({ monitored: z.boolean() });

export type ScanRequest = z.infer<typeof scanRequestSchema>;
