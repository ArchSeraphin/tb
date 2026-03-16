/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/views/**/*.ejs',
    './public/js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eeeeff',
          100: '#d5d5ff',
          200: '#adadff',
          300: '#7070ff',
          400: '#3d3dff',
          500: '#0000ff',
          600: '#0000dd',
          700: '#0000bb',
          800: '#000099',
          900: '#000077',
        },
      },
      boxShadow: {
        'blue-sm': '0 2px 8px rgba(0,0,255,0.12)',
        'blue-md': '0 4px 20px rgba(0,0,255,0.18)',
        'blue-lg': '0 8px 40px rgba(0,0,255,0.24)',
      },
    },
  },
  plugins: [],
};
