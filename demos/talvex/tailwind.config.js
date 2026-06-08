/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      colors: {
        yellow: { DEFAULT: '#FFD85F' },
        'dark-gray': '#303030',
        'light-gray': '#898989',
      },
      fontFamily: {
        sans: ['Century Gothic', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
