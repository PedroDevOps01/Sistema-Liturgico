/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wine: {
          50:  'rgb(var(--w-50)  / <alpha-value>)',
          100: 'rgb(var(--w-100) / <alpha-value>)',
          200: 'rgb(var(--w-200) / <alpha-value>)',
          300: 'rgb(var(--w-300) / <alpha-value>)',
          400: 'rgb(var(--w-400) / <alpha-value>)',
          500: 'rgb(var(--w-500) / <alpha-value>)',
          600: 'rgb(var(--w-600) / <alpha-value>)',
          700: 'rgb(var(--w-700) / <alpha-value>)',
          800: 'rgb(var(--w-800) / <alpha-value>)',
          900: 'rgb(var(--w-900) / <alpha-value>)',
          950: 'rgb(var(--w-950) / <alpha-value>)',
        },
        gold: {
          400: '#fcd34d',
          500: '#fbbf24',
          600: '#f59e0b',
        },
      },
      fontSize: {
        base: '17px',
      },
    },
  },
  plugins: [],
}
