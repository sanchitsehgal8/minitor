/**
 * Security headers.
 *
 * The demo page's CSP is what makes objective 4 genuinely enforced there rather
 * than simulated: `script-src 'self'` means the browser refuses every
 * blocklisted tracker origin the page requests, before any connection opens.
 * `'unsafe-inline'` is present only because Next's hydration bootstrap needs
 * it — it does not widen which *hosts* may be contacted, which is the property
 * the demo depends on.
 */
const DEMO_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const BASE_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Same-origin framing only: the shell embeds its own demo pages, but
        // nobody else's site can embed MiniTor.
        source: '/:path*',
        headers: BASE_HEADERS,
      },
      {
        source: '/demo/:path*',
        headers: [...BASE_HEADERS, { key: 'Content-Security-Policy', value: DEMO_CSP }],
      },
    ];
  },
};

export default nextConfig;
