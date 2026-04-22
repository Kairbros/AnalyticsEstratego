/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        estratego: {
          ink: '#08080f',
          surface: '#13131f',
          'surface-2': '#1a1a2a',
          border: '#2a2a3f',
          muted: '#7d7d9a',
          gold: '#e9c158',
          'gold-hover': '#f2d17a',
          'gold-soft': '#c9a23a',
          primary: '#e9c158',
          accent: '#e9c158',
          success: '#34d399',
          warning: '#fbbf24',
          danger: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(233, 193, 88, 0.25), 0 4px 24px -6px rgba(233, 193, 88, 0.25)',
      },
    },
  },
  plugins: [],
};
