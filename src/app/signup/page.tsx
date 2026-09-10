import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/auth-form';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Create an account — MiniTor' };

export default async function SignupPage() {
  if (await getSessionUser()) redirect('/app');
  return <AuthForm mode="signup" />;
}
