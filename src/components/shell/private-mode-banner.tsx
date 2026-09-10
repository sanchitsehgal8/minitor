'use client';

import { motion } from 'framer-motion';

import { MaskIcon } from '@/components/ui/icons';

/**
 * States exactly what private mode does and does not do (spec §6). The tone
 * deliberately matches the report's "Scope and Realistic Usability" section —
 * no overclaiming, because overclaiming about privacy is the actual harm.
 */
export function PrivateModeBanner() {
  return (
    <motion.aside
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
      className="border-b border-amber-dim bg-amber-dim/15 px-4 py-2.5"
      role="note"
    >
      <div className="flex items-start gap-2.5">
        <MaskIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
        <p className="text-xs leading-relaxed text-amber">
          <span className="font-medium">Private mode is on.</span> Nothing you open in a private tab
          is written to your history or bookmarks — the server refuses the write, not just this
          page.{' '}
          <span className="text-parchment">
            It does not hide your browsing from your network, your internet provider, your employer,
            or the sites themselves.
          </span>
        </p>
      </div>
    </motion.aside>
  );
}
