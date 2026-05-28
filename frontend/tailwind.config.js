/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#f9f9f9',
          100: '#f0f0f0',
          200: '#e0e0e0',
          300: '#c0c0c0',
          400: '#909090',
          500: '#606060',
          600: '#404040',
          700: '#2a2a2a',
          800: '#1a1a1a',
          900: '#111111',
          950: '#000000',
        },
        gold: {
          400: '#fde047',
          500: '#facc15',
          600: '#eab308',
        },
      },
      fontSize: {
        base: '17px',
      },
    },
  },
  plugins: [],
}
