import bcrypt from 'bcryptjs';

/**
 * Cost 12: ~250ms per hash on commodity hardware. High enough to be a real
 * obstacle offline, low enough not to stall a serverless request.
 */
const BCRYPT_COST = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Constant-ish-time dummy comparison, run when no user matches, so signup
 * status is not inferable from response timing.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.CkRHKnQ/JLcCe.CkRHKnQ/JLcCeQKmy';

export async function burnTime(): Promise<void> {
  await bcrypt.compare('not-a-real-password', DUMMY_HASH);
}
