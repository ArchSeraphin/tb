/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/views/**/*.ejs',
    './public/js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d0ff',
          300: '#a0b0ff',
          400: '#7b8dff',
          500: '#5b6af5',
          600: '#4449ea',
          700: '#3836cf',
          800: '#2f2fa7',
          900: '#2c2e84',
        },
      },
    },
  },
  plugins: [],
};
