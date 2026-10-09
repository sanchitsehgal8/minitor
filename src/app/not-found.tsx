import Link from 'next/link';

import { ArrowLeftIcon } from '@/components/ui/icons';
import { Logo } from '@/components/ui/logo';

export const metadata = { title: 'Not found — MiniTor' };

export default function NotFound() {
  return (
    <main className="grain relative isolate flex min-h-screen flex-col overflow-hidden bg-void px-5 py-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="absolute h-[30rem] w-[30rem] rounded-full bg-verdigris/15 blur-[120px]" />
        {[0, 1, 2].map((ring) => (
          <div
            key={ring}
            className="absolute rounded-full border border-white/[0.05]"
            style={{ width: `${24 + ring * 14}rem`, height: `${24 + ring * 14}rem` }}
          />
        ))}
      </div>

      <header className="mx-auto w-full max-w-6xl">
        <Logo />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="technical text-sm text-amber-glow">404 · nothing at this address</p>
        <h1 className="mt-5 font-display text-6xl text-white sm:text-7xl">Lost in the layers</h1>
        <p className="mt-5 max-w-md text-lg text-ash-light">
          This page does not exist — no redirect, no tracker, just nothing here.
        </p>
        <Link href="/" className="btn-secondary mt-10">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to MiniTor
        </Link>
      </div>
    </main>
  );
}
