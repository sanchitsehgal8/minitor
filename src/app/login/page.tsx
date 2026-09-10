import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/auth-form';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Log in — MiniTor' };

export default async function LoginPage() {
  // Already signed in: send them straight to the shell.
  if (await getSessionUser()) redirect('/app');
  return <AuthForm mode="login" />;
}
