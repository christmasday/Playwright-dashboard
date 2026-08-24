module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        bg: {
          DEFAULT: '#08080a',
          subtle: '#0a0a0e',
        },
        surface: {
          DEFAULT: '#0e0e13',
          2: '#14141b',
        },
        border: {
          DEFAULT: '#20202a',
        },
        fg: {
          DEFAULT: '#f4f4f7',
        },
        muted: {
          DEFAULT: '#9a9aa5',
          2: '#5e5e68',
        },
        accent: {
          DEFAULT: '#3b82f6',
          strong: '#60a5fa',
        },
      },
      animation: {
        drift: 'drift 20s ease-in-out infinite alternate',
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2.5%, -2%, 0) scale(1.06)' },
          '100%': { transform: 'translate3d(-2%, 2%, 0) scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
};
