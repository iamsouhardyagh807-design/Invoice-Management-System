/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finly: {
          bg: {
            light: '#F5F4FA',
            dark: '#18191E'
          },
          card: {
            light: '#FFFFFF',
            dark: '#24262E'
          },
          border: {
            light: '#EDEAF5',
            dark: '#323540'
          },
          sidebar: {
            light: '#FFFFFF',
            dark: '#1E1F25'
          },
          purple: '#8B5CF6',
          amber: '#F59E0B',
          lime: '#84CC16',
          cyan: '#06B6D4'
        },
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Courier New', 'monospace'],
        editorial: ['Playfair Display', 'Georgia', 'serif'],
        signature: ['Birthstone', 'Caveat', 'cursive']
      }
    },
  },
  plugins: [],
}
