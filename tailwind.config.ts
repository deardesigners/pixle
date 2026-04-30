import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Кинематический контраст: глубокий чёрный + единственный жёлтый акцент
        // (CopySight #fff07c). Никаких градиентов и неона — sophisticated tool.
        bg: '#0A0A0A',
        panel: '#111110',
        elev: '#1a1a18',
        border: 'rgba(255,255,255,0.06)',
        'border-strong': 'rgba(255,255,255,0.12)',
        muted: '#6B6968',
        text: '#F5F5F2',
        accent: '#FFF07C',
        'accent-fg': '#0A0A0A'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace']
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em'
      },
      borderRadius: {
        pill: '9999px'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,240,124,0.25), 0 8px 32px rgba(255,240,124,0.12)'
      }
    }
  },
  plugins: []
};

export default config;
