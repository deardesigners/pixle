import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ui-ux-pro-max → "Drawing & Sketching Canvas": canvas purple + tool teal на тёмном.
        bg: '#1C1917',
        panel: '#262321',
        border: 'rgba(255,255,255,0.08)',
        muted: '#94A3B8',
        accent: '#7C3AED',
        accent2: '#0891B2',
        secondary: '#8B5CF6'
      },
      fontFamily: {
        // ui-ux-pro-max → "Minimalist Portfolio": Space Grotesk for headings, Archivo for body.
        sans: ['Archivo', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Archivo', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 24px rgba(124, 58, 237, 0.35), 0 0 64px rgba(124, 58, 237, 0.15)',
        'glow-soft': '0 0 32px rgba(124, 58, 237, 0.2)'
      },
      backgroundImage: {
        aurora:
          'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 0%, rgba(8,145,178,0.16) 0%, transparent 60%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)'
      }
    }
  },
  plugins: []
};

export default config;
