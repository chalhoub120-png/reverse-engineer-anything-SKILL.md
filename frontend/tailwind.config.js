/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        toters: {
          50: '#fdf2f8',
          100: '#fce7f3',
          500: '#f472b6',
          600: '#ec4899',
          700: '#be185d',
        },
      },
    },
  },
  plugins: [],
};
