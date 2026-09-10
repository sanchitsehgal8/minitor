import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * One shaping layer for every API response, so clients can rely on
 * `{ error: string }` on failure and never have to branch on route.
 */

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function failure(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export const unauthorized = () => failure('Sign in to continue.', 401);
export const notFound = () => failure('Not found.', 404);

export function fromZodError(error: ZodError): NextResponse {
  const first = error.issues[0];
  return failure(first?.message ?? 'That request was not valid.', 422);
}

/**
 * Wraps a handler so an unexpected throw becomes a 500 with no internals
 * leaked to the client, while still being logged server-side.
 */
export async function guard(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ZodError) return fromZodError(error);
    console.error('[minitor] unhandled route error', error);
    return failure('Something went wrong on our end.', 500);
  }
}
