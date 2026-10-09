'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { NetworkGlobe } from '@/components/landing/network-globe';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MaskIcon,
  WarnIcon,
} from '@/components/ui/icons';
import { Logo } from '@/components/ui/logo';
import { api, ApiError } from '@/lib/client/api-client';
import { credentialsSchema } from '@/lib/validation/schemas';

type Mode = 'login' | 'signup';

const COPY: Record<Mode, { title: string; blurb: string; action: string; swapHref: string; swapPrompt: string; swapLink: string }> = {
  login: {
    title: 'Log in',
    blurb: 'Your history and bookmarks are waiting.',
    action: 'Log in',
    swapHref: '/signup',
    swapPrompt: 'No account yet?',
    swapLink: 'Create one',
  },
  signup: {
    title: 'Create an account',
    blurb: 'You need an account so history and bookmarks have somewhere to live.',
    action: 'Create account',
    swapHref: '/login',
    swapPrompt: 'Already have an account?',
    swapLink: 'Log in',
  },
};

/** Mirrors passwordSchema's minimum, so the meter and the validator agree. */
const MIN_PASSWORD = 10;

const PROMISES = [
  { icon: ClockIcon, text: 'History and bookmarks stored against your account' },
  { icon: MaskIcon, text: 'Private tabs are never written down — the server refuses' },
  { icon: LockIcon, text: 'HTTPS-only: plain http stops at a warning' },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export function AuthForm({ mode }: { readonly mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on every failed submit so the alert re-shakes even when the
  // message is the same as last time.
  const [errorKey, setErrorKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function fail(message: string) {
    setError(message);
    setErrorKey((value) => value + 1);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Validate with the same schema the API uses, so the message the user sees
    // for a weak password is identical on both sides.
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      fail(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await api.signup(parsed.data.email, parsed.data.password);
      }

      const result = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        fail('That email and password combination did not match an account.');
        return;
      }

      router.push('/app');
      router.refresh();
    } catch (cause) {
      fail(cause instanceof ApiError ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const strength = Math.min(1, password.length / MIN_PASSWORD);
  const isLongEnough = password.length >= MIN_PASSWORD;

  return (
    <main className="relative isolate grid min-h-screen overflow-hidden bg-void lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">

      {/* Form column */}
      <div className="flex min-h-screen flex-col px-5 py-5 sm:px-10">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="btn-ghost">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="w-full max-w-sm"
          >
            <h1 className="font-display text-5xl text-white">{copy.title}</h1>
            <p className="mt-3 text-base text-ash-light">{copy.blurb}</p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-parchment">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field mt-2"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-parchment">
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="field pr-12"
                    placeholder={mode === 'signup' ? 'At least 10 characters' : ''}
                    aria-describedby={mode === 'signup' ? 'password-help' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ash transition-colors duration-150 hover:bg-white/[0.06] hover:text-parchment"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {mode === 'signup' ? (
                  <div id="password-help" className="mt-2.5">
                    <div aria-hidden="true" className="flex gap-1">
                      {Array.from({ length: 5 }, (_, index) => (
                        <span key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.span
                            className={`block h-full rounded-full ${isLongEnough ? 'bg-verdigris-bright' : 'bg-amber'}`}
                            initial={false}
                            animate={{ width: `${Math.max(0, Math.min(1, strength * 5 - index)) * 100}%` }}
                            transition={{ duration: 0.25, ease: EASE }}
                          />
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-ash">
                      {isLongEnough ? <CheckIcon className="h-3.5 w-3.5 text-verdigris-bright" /> : null}
                      At least 10 characters. Stored as a bcrypt hash, never in plain text.
                    </p>
                  </div>
                ) : null}
              </div>

              <AnimatePresence mode="wait">
                {error ? (
                  <motion.p
                    key={errorKey}
                    role="alert"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-start gap-2.5 rounded-lg border border-amber/30 bg-amber/[0.08] px-3.5 py-3 text-sm text-amber-glow"
                  >
                    <WarnIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
                {isSubmitting ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void"
                    />
                    Working…
                  </>
                ) : (
                  <>
                    {copy.action}
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-sm text-ash">
              {copy.swapPrompt}{' '}
              <Link
                href={copy.swapHref}
                className="font-medium text-verdigris-glow underline decoration-verdigris-bright/40 underline-offset-4 transition-colors hover:decoration-verdigris-glow"
              >
                {copy.swapLink}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Visual column: the same network as the landing page, plus what an account gets you. */}
      <aside className="relative hidden overflow-hidden border-l border-white/[0.06] bg-ink-sunken/60 lg:flex lg:flex-col lg:justify-end">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-[30%] rounded-full bg-verdigris/15 blur-[90px]" />
          <div className="absolute inset-x-0 top-[6%] mx-auto aspect-square w-[min(90%,40rem)]">
            <NetworkGlobe />
          </div>
        </div>
        <div className="relative bg-gradient-to-t from-void via-void/80 to-transparent px-12 pb-12 pt-32">
          <ul className="border-t border-white/[0.08]">
            {PROMISES.map((promise) => (
              <li
                key={promise.text}
                className="flex items-center gap-3 border-b border-white/[0.08] py-3.5 text-sm text-parchment"
              >
                <promise.icon className="h-4 w-4 shrink-0 text-verdigris-bright" />
                {promise.text}
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[10px] text-ash-dim">
            Illustration: onion routing, the idea MiniTor is named after. The web demo does not route
            your traffic.
          </p>
        </div>
      </aside>
    </main>
  );
}
