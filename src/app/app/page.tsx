import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BrowserShell } from '@/components/shell/browser-shell';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'MiniTor' };

export default async function AppPage() {
  const user = await getSessionUser();
  // Protected route (spec §3): unauthenticated visitors never see the shell.
  // The middleware also guards this path; this check is what makes the page
  // correct on its own rather than relying on the matcher staying in sync.
  if (!user) redirect('/login');

  return <BrowserShell userEmail={user.email} />;
}
