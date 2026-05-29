/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0e1a',
        surface:    '#0f1629',
        deck:       '#1e2d4a',   // border color
        buy:        '#00d97e',
        sell:       '#f23645',
        accent:     '#3b82f6',
        gold:       '#f59e0b',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'flash-in': 'flash-in 0.9s ease-out',
      },
      keyframes: {
        'flash-in': {
          '0%':   { backgroundColor: 'rgba(0, 217, 126, 0.18)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};
