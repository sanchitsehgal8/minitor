'use client';

import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import { Logo } from '@/components/ui/logo';

const LINKS = [
  { href: '#replica', label: 'The browser' },
  { href: '#honesty', label: 'What’s real' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#team', label: 'Team' },
] as const;

/**
 * Top navigation. Transparent over the hero, then gains a backdrop and a
 * hairline once the page has scrolled, so it stays legible over the sections
 * below without competing with the headline.
 */
export function SiteNav() {
  const { scrollY } = useScroll();
  const [isCondensed, setIsCondensed] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsCondensed(latest > 24);
  });

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        isCondensed ? 'border-white/[0.07] bg-void/85 backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-ash-light transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-2">
            <span className="hidden sm:inline">Create an account</span>
            <span className="sm:hidden">Sign up</span>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
