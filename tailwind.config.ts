import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // CopySight tokens: lavender-cream bg, deep-blue text, yellow accent.
        bg: '#F3F0FF',
        text: '#02020A',
        white: '#FFFFFF',
        accent: '#FFF07C',
        'accent-fg': '#05204A',
        'accent-bold': '#05204A',
        'accent-light': '#E6EBF6',
        muted: '#6E6E80',
        gray: '#B8BCC8',
        elev: '#FFFFFF',
        panel: 'rgba(255,255,255,0.6)',
        border: 'rgba(2,2,10,0.08)',
        'border-strong': 'rgba(2,2,10,0.5)'
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em'
      },
      borderRadius: {
        pill: '100px',
        card: '48px',
        capsule: '32px'
      },
      boxShadow: {
        accent: '0 6px 24px rgba(255,240,124,0.45)',
        bold: '0 6px 24px rgba(5,32,74,0.18)',
        capsule: '0 4px 24px rgba(0,0,0,0.04)'
      }
    }
  },
  plugins: []
};

export default config;
