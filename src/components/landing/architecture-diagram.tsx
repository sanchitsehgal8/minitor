'use client';

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useRef, useState } from 'react';

import { Reveal } from '@/components/landing/reveal';
import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * The report's three-layer architecture (spec §4), as a scroll-driven scene.
 *
 * On wide screens the section pins while the visitor scrolls: the layers peel
 * apart in 3D and each one is described in turn. The 3D stack is decorative
 * (aria-hidden) — every word of it is also in the ordered list beside it, which
 * is the real content and reads top-to-bottom without any scrolling trick. On
 * narrow screens there is no pinning; the list simply shows every layer.
 */

const LAYERS = [
  {
    id: 'interface',
    name: 'Interface layer',
    role: 'What you touch',
    parts: ['Tab bar', 'Address bar + padlock', 'History & bookmark panels', 'Privacy Center & reports'],
    note: 'React components. Presentational — they hold no privacy rules of their own.',
  },
  {
    id: 'policy',
    name: 'Policy layer',
    role: 'What decides',
    parts: ['URL scheme check', 'Tracker matching', 'Scan engine & scoring', 'Navigation stack'],
    note: 'Pure TypeScript modules, no DOM and no network. Unit-tested, and re-run on the server for any write.',
  },
  {
    id: 'storage',
    name: 'Storage layer',
    role: 'What persists',
    parts: ['User accounts', 'History entries', 'Bookmarks', 'Saved scans'],
    note: 'Prisma over SQLite locally, Postgres when hosted. A private tab never reaches this layer.',
  },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export function ArchitectureDiagram() {
  const ref = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setActive(Math.min(LAYERS.length - 1, Math.max(0, Math.floor(value * LAYERS.length))));
  });

  const spread = useTransform(scrollYProgress, [0, 0.3, 1], [40, 150, 170]);
  const turn = useTransform(scrollYProgress, [0, 1], [-42, -30]);
  const z0 = useTransform(spread, (value) => value * 2);
  const z1 = useTransform(spread, (value) => value);
  const z2 = useTransform(spread, () => 0);
  // Re-centre the stack as it opens, so the peeled layers stay in frame.
  const lift = useTransform(spread, (value) => value * 0.55);
  const depths: readonly MotionValue<number>[] = [z0, z1, z2];

  return (
    <section id="architecture" ref={ref} className="relative scroll-mt-16 lg:h-[280vh]">
      <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-0">
          <div>
            <Reveal>
              <p className="eyebrow">Architecture</p>
              <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">How it’s put together</h2>
              <p className="mt-5 max-w-lg text-lg text-ash-light">
                Three layers. The rules live in the middle one, on their own, which is why the same
                HTTPS and private-mode checks can run in your browser and again on the server.
              </p>
            </Reveal>

            <ol className="mt-10 space-y-2">
              {LAYERS.map((layer, index) => {
                const isActive = !isDesktop || index === active;
                return (
                  <li
                    key={layer.id}
                    className={`relative rounded-xl border px-5 py-4 transition-all duration-500 ease-out ${
                      isActive
                        ? 'border-white/10 bg-white/[0.04]'
                        : 'border-transparent bg-transparent opacity-60'
                    }`}
                  >
                    {isDesktop && isActive ? (
                      <motion.span
                        layoutId="architecture-active"
                        className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-verdigris-bright"
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                      />
                    ) : null}
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="flex items-baseline gap-3 text-lg font-medium text-parchment">
                        <span className="font-mono text-xs text-verdigris-bright">0{index + 1}</span>
                        {layer.name}
                      </h3>
                      <span className="font-mono text-xs text-ash">{layer.role}</span>
                    </div>

                    <AnimatePresence initial={false}>
                      {isActive ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {layer.parts.map((part) => (
                              <li
                                key={part}
                                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-ash-light"
                              >
                                {part}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 text-sm text-ash">{layer.note}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </div>

          <div aria-hidden="true" className="relative hidden h-[34rem] items-center justify-center lg:flex">
            <div className="absolute inset-[15%] rounded-full bg-verdigris/15 blur-[90px]" />
            <div className="relative h-80 w-80 [perspective:1600px]">
              <motion.div
                className="preserve-3d absolute inset-0"
                style={{ rotateX: 58, rotateZ: turn, y: lift }}
              >
                {[...LAYERS].reverse().map((layer) => {
                  const index = LAYERS.findIndex((entry) => entry.id === layer.id);
                  const isActive = index === active;
                  return (
                    <motion.div
                      key={layer.id}
                      style={{ z: depths[index] }}
                      className={`absolute inset-0 rounded-2xl border p-6 transition-[border-color,background-color,box-shadow,opacity] duration-500 ${
                        isActive
                          ? 'border-verdigris-bright/60 bg-ink-raised/90 shadow-glow'
                          : 'border-white/[0.08] bg-ink-raised/80 opacity-50'
                      }`}
                    >
                      <div className="bg-grid absolute inset-0 rounded-2xl opacity-40 [background-size:32px_32px]" />
                      <div className="relative flex h-full flex-col">
                        <p className="font-mono text-xs text-verdigris-bright">0{index + 1}</p>
                        <p className="mt-1 font-display text-3xl text-white">{layer.name}</p>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          {layer.parts.map((part) => (
                            <span
                              key={part}
                              className={`rounded-lg border px-2 py-2 text-xs transition-colors duration-500 ${
                                isActive
                                  ? 'border-verdigris-bright/30 bg-verdigris/10 text-parchment'
                                  : 'border-white/[0.06] bg-white/[0.02] text-ash'
                              }`}
                            >
                              {part}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
