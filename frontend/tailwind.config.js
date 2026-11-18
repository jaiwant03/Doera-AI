/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#FFFFFF',
          pure: '#FFFFFF',
          soft: '#FAFBFC',
          secondary: '#FAFBFC',
        },
        peacock: {
          50: '#F0F9FA',
          100: '#EDF8FA',
          200: '#B0E2E7',
          300: '#7BCCDA',
          400: '#3EAEC3',
          500: '#087F8C',
          600: '#066B76',
          700: '#055660',
          800: '#04444C',
          900: '#03353B',
          DEFAULT: '#087F8C',
        },
        ramagreen: {
          50: '#EFF9F4',
          100: '#D5F3E7',
          200: '#ADE6D1',
          300: '#75D2B4',
          400: '#3EB893',
          500: '#15966A',
          600: '#0F7B56',
          700: '#0E6246',
          800: '#0D4E38',
          900: '#0B402F',
          DEFAULT: '#15966A',
        },
        violet: {
          50: '#F5F1FC',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8065D9',
          600: '#6C48CB',
          700: '#5B37B5',
          800: '#4C2F98',
          900: '#3F277B',
          DEFAULT: '#8065D9',
        },
        charcoal: {
          50: '#F6F7F9',
          100: '#ECEDF2',
          200: '#D5D8E2',
          300: '#B2B7C8',
          400: '#77808F',
          500: '#505971',
          600: '#3E465A',
          700: '#32394A',
          800: '#282E3D',
          900: '#202633',
          DEFAULT: '#202633',
        },
        muted: '#77808F',
        bordergrey: '#E8EDF1',
        subtle: {
          border: '#E8EDF1',
          hover: '#F2F6F9',
          muted: '#77808F',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        heading: ['Manrope', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(32, 38, 51, 0.04), 0 1px 2px rgba(32, 38, 51, 0.02)',
        'card': '0 2px 8px -1px rgba(32, 38, 51, 0.05), 0 1px 4px -1px rgba(32, 38, 51, 0.03)',
        'elevated': '0 8px 24px -4px rgba(8, 127, 140, 0.08), 0 2px 8px -2px rgba(32, 38, 51, 0.04)',
        'composer': '0 8px 30px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.1)',
        'float': '0 14px 34px -4px rgba(8, 127, 140, 0.12)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        floatGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.85, transform: 'scale(1.03)' },
        },
        ringSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        }
      },
      animation: {
        'fadeIn': 'fadeIn 0.25s ease-out forwards',
        'float': 'floatGentle 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'ring-spin': 'ringSpin 1.6s linear infinite',
      }
    },
  },
  plugins: [],
}
