/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'app-bg': 'var(--color-app-bg)',
        'app-card': 'var(--color-app-card)',
        'app-border': 'var(--color-app-border)',
        'app-text': 'var(--color-app-text)',
        'app-subtext': 'var(--color-app-subtext)',
        'app-blue': 'var(--color-app-blue)',
        'app-red': '#FF3B30',
        'app-green': '#34C759',
        'app-orange': '#FF9500',
        'app-purple': '#AF52DE',
        'app-yellow': '#FFCC00',
        'app-pink': '#FF2D55',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Helvetica Neue"', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.12)',
        'nav': '0 1px 3px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
}
