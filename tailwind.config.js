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
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#0000ff',
          50:  'rgba(0,0,255,0.05)',
          100: 'rgba(0,0,255,0.1)',
          200: 'rgba(0,0,255,0.2)',
          300: '#6666ff',
          400: '#3333ff',
          500: '#1a1aff',
          600: '#0000ff',
          700: '#0000cc',
          800: '#000099',
          900: '#000066',
        },
        surface: {
          0: '#050505',
          1: '#0f0f0f',
          2: '#141414',
          3: '#1a1a1a',
          4: '#222222',
        },
      },
      animation: {
        'slide-up':   'slideUp 0.18s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':    'fadeIn 0.15s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,0,255,0.2)' },
          '50%':       { boxShadow: '0 0 0 4px rgba(0,0,255,0.05)' },
        },
      },
    },
  },
  plugins: [],
};
