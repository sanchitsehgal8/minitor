'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

export function AuthForm({ mode }: { readonly mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Validate with the same schema the API uses, so the message the user sees
    // for a weak password is identical on both sides.
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
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
        setError('That email and password combination did not match an account.');
        return;
      }

      router.push('/app');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-parchment">
      <header className="mx-auto w-full max-w-6xl px-5 py-5">
        <Link href="/" className="font-display text-xl text-ink">
          MiniTor
        </Link>
      </header>

      <div className="flex flex-1 items-start justify-center px-5 pb-20 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl text-ink">{copy.title}</h1>
          <p className="mt-2 text-base text-ash-dim">{copy.blurb}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
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
                className="field mt-1.5"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field mt-1.5"
                placeholder={mode === 'signup' ? 'At least 10 characters' : ''}
              />
              {mode === 'signup' ? (
                <p className="mt-1.5 text-sm text-ash-dim">
                  At least 10 characters. Stored as a bcrypt hash, never in plain text.
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-amber-dim bg-amber-wash px-3 py-2.5 text-sm text-ink"
              >
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Working…' : copy.action}
            </button>
          </form>

          <p className="mt-6 text-sm text-ash-dim">
            {copy.swapPrompt}{' '}
            <Link href={copy.swapHref} className="font-medium text-verdigris-dim underline">
              {copy.swapLink}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
