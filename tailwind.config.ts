import type { Config } from 'tailwindcss';

/**
 * Custom design tokens only (spec §4). The default Tailwind palette and the
 * default spacing scale are intentionally NOT extended-through: `colors` and
 * `spacing` are replaced, not merged, so a stray `bg-slate-500` or `p-7`
 * fails loudly at review time instead of quietly drifting off-system.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ink: {
        DEFAULT: '#12151C',
        raised: '#1A1E27',
        sunken: '#0C0E13',
        edge: '#252A35',
      },
      parchment: '#EDEAE7',
      paper: '#F7F5F1',
      verdigris: {
        DEFAULT: '#3E8E7E',
        dim: '#2F6D60',
        wash: '#E4EFEC',
      },
      amber: {
        DEFAULT: '#D8A24A',
        dim: '#A87A33',
        wash: '#F7EDDA',
      },
      ash: {
        DEFAULT: '#8A8F98',
        dim: '#5D636D',
        light: '#C4C7CC',
      },
      white: '#FFFFFF',
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
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
      32: '128px',
      40: '160px',
    },
    borderRadius: {
      none: '0',
      // Deliberately uneven scale: chrome elements read tighter than cards,
      // so radius carries hierarchy rather than being one value everywhere.
      sm: '3px',
      md: '5px',
      lg: '10px',
      xl: '18px',
      full: '9999px',
    },
    fontFamily: {
      display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs: ['11px', { lineHeight: '16px' }],
      sm: ['13px', { lineHeight: '20px' }],
      base: ['15px', { lineHeight: '24px' }],
      lg: ['17px', { lineHeight: '26px' }],
      xl: ['21px', { lineHeight: '28px' }],
      '2xl': ['27px', { lineHeight: '32px' }],
      '3xl': ['36px', { lineHeight: '40px' }],
      '4xl': ['48px', { lineHeight: '50px' }],
      '5xl': ['64px', { lineHeight: '64px' }],
    },
    extend: {
      boxShadow: {
        chrome: '0 1px 0 0 #252A35, 0 12px 32px -12px rgba(0,0,0,0.55)',
        lift: '0 2px 0 0 rgba(18,21,28,0.06)',
      },
      transitionTimingFunction: {
        chrome: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
