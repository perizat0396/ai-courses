import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#FFC21A', dark: '#F2B200', soft: '#FFF6DB' },
        ink: { DEFAULT: '#111111', soft: '#6B6B6B', mute: '#A3A3A3' },
        line: '#EEEEEE',
        canvas: '#F7F7F7',
      },
      fontFamily: { sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: { card: '0 8px 30px rgba(0,0,0,0.06)' },
    },
  },
  plugins: [typography],
} satisfies Config;
