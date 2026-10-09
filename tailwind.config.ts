import type { Config } from 'tailwindcss';

/**
 * Custom design tokens only (spec §4). The default Tailwind palette and the
 * default spacing scale are intentionally NOT extended-through: `colors` and
 * `spacing` are replaced, not merged, so a stray `bg-slate-500` fails loudly
 * at review time instead of quietly drifting off-system.
 *
 * The system is dark-first. `void` is the page, `ink` the surfaces laid on it;
 * verdigris means "protected / real", amber means "blocked / simulated /
 * caution", ember is reserved for the poorest scores and high severity.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      void: '#05070A',
      ink: {
        DEFAULT: '#0B0E13',
        raised: '#12161D',
        sunken: '#08090D',
        edge: '#1D232D',
        line: '#2A313D',
      },
      parchment: '#ECE8E1',
      paper: '#F7F5F1',
      verdigris: {
        DEFAULT: '#3E8E7E',
        dim: '#2F6D60',
        bright: '#5BC2AA',
        glow: '#8AF0D6',
        wash: '#E4EFEC',
      },
      amber: {
        DEFAULT: '#D8A24A',
        dim: '#A87A33',
        glow: '#F5C46B',
        wash: '#F7EDDA',
      },
      ember: {
        DEFAULT: '#E0775A',
        dim: '#A9523C',
      },
      ash: {
        DEFAULT: '#8A8F98',
        dim: '#5D636D',
        light: '#C4C7CC',
      },
      white: '#FFFFFF',
      black: '#000000',
    },
    spacing: {
      0: '0px',
      px: '1px',
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '10px',
      3: '12px',
      3.5: '14px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
      9: '36px',
      10: '40px',
      11: '44px',
      12: '48px',
      14: '56px',
      16: '64px',
      18: '72px',
      20: '80px',
      24: '96px',
      28: '112px',
      32: '128px',
      40: '160px',
      48: '192px',
      56: '224px',
      64: '256px',
      72: '288px',
      80: '320px',
      96: '384px',
    },
    borderRadius: {
      none: '0',
      // Deliberately uneven scale: chrome elements read tighter than cards,
      // so radius carries hierarchy rather than being one value everywhere.
      sm: '4px',
      md: '7px',
      lg: '12px',
      xl: '18px',
      '2xl': '26px',
      '3xl': '36px',
      full: '9999px',
    },
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs: ['11px', { lineHeight: '16px' }],
      sm: ['13px', { lineHeight: '20px' }],
      base: ['15px', { lineHeight: '24px' }],
      lg: ['17px', { lineHeight: '27px' }],
      xl: ['21px', { lineHeight: '29px' }],
      '2xl': ['27px', { lineHeight: '32px' }],
      '3xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.01em' }],
      '4xl': ['48px', { lineHeight: '50px', letterSpacing: '-0.015em' }],
      '5xl': ['64px', { lineHeight: '64px', letterSpacing: '-0.02em' }],
      '6xl': ['84px', { lineHeight: '80px', letterSpacing: '-0.025em' }],
      '7xl': ['112px', { lineHeight: '102px', letterSpacing: '-0.03em' }],
    },
    extend: {
      boxShadow: {
        chrome: '0 1px 0 0 #1D232D, 0 24px 60px -20px rgba(0,0,0,0.75)',
        lift: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(91,194,170,0.35), 0 8px 32px -6px rgba(62,142,126,0.55)',
        'glow-amber': '0 0 0 1px rgba(216,162,74,0.35), 0 8px 28px -8px rgba(216,162,74,0.45)',
        window:
          '0 0 0 1px rgba(255,255,255,0.06), 0 40px 120px -30px rgba(0,0,0,0.9), 0 0 90px -20px rgba(62,142,126,0.35)',
      },
      transitionTimingFunction: {
        chrome: 'cubic-bezier(0.32, 0.72, 0, 1)',
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'border-spin': {
          to: { '--border-angle': '360deg' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.4s cubic-bezier(0.32, 0.72, 0, 1) infinite',
        marquee: 'marquee 48s linear infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        pulse: 'pulse 1.6s ease-in-out infinite',
        ping: 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
        'border-spin': 'border-spin 6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
