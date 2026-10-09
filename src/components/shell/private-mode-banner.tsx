'use client';

import { motion } from 'framer-motion';

import { MaskIcon } from '@/components/ui/icons';

/**
 * States exactly what private mode does and does not do (spec §6). The tone
 * deliberately matches the report's "Scope and Realistic Usability" section —
 * no overclaiming, because overclaiming about privacy is the actual harm.
 *
 * Animates its height so the chrome below eases down rather than jumping; the
 * shell wraps it in AnimatePresence so it can leave the same way.
 */
export function PrivateModeBanner() {
  return (
    <motion.aside
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="overflow-hidden"
      role="note"
    >
      <div className="px-2 pb-2 sm:px-3">
        <div className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-amber/20 bg-gradient-to-r from-amber/[0.11] via-amber/[0.05] to-transparent px-3 py-2.5 backdrop-blur-md sm:items-center">
          {/* A hairline of light along the top edge, as on the glass surfaces. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-glow/50 to-transparent"
          />
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber ring-1 ring-inset ring-amber/30">
            <MaskIcon className="h-4 w-4" />
          </span>
          <p className="text-xs leading-relaxed text-amber-glow/90">
            <span className="font-medium text-amber-glow">Private mode is on.</span> Nothing you open
            in a private tab is written to your history or bookmarks — the server refuses the write,
            not just this page.{' '}
            <span className="text-parchment">
              It does not hide your browsing from your network, your internet provider, your employer,
              or the sites themselves.
            </span>
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
