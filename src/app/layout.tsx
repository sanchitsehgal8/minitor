import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Instrument_Serif, Inter } from 'next/font/google';

import { AuthProvider } from '@/components/providers/auth-provider';
import { MotionProvider } from '@/components/providers/motion-provider';

import './globals.css';

const display = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
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

export const viewport: Viewport = {
  themeColor: '#05070A',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <AuthProvider>
          <MotionProvider>{children}</MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
