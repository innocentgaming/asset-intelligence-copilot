/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          950: '#060a12',
          900: '#0b1120',
          850: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          400: '#94a3b8',
          200: '#e2e8f0',
        },
        accent: {
          DEFAULT: '#fbbf24', // amber-400
          hover: '#f59e0b',   // amber-500
          subtle: '#78350f',  // amber-900
        },
        status: {
          producing: '#10b981', // emerald-500
          halted: '#ef4444',    // red-500
          stale: '#f97316',     // orange-500
          conflict: '#dc2626',  // red-600
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
