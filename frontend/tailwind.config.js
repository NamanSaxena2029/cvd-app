/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          500: '#2f6fed',
          600: '#245bc4',
          700: '#1e3a5f',
        },
      },
    },
  },
  plugins: [],
};
