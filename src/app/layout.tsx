import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google';

import { AuthProvider } from '@/components/providers/auth-provider';
import { MotionProvider } from '@/components/providers/motion-provider';

import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK'],
});

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'MiniTor — a privacy-focused browser experience',
  description:
    'A web demo of MiniTor: tabbed browsing, per-user history and bookmarks, private mode, HTTPS-only enforcement and a live privacy console.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <AuthProvider>
          <MotionProvider>{children}</MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
