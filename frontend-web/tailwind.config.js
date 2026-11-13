/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Padauk"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Padauk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian: {
          DEFAULT: '#0C0D0E',
          soft: '#141619',
          muted: '#1E2126',
        },
        champagne: {
          light: '#F5EFE6',
          border: '#E6DFD3',
          gold: '#C5A059',
          deep: '#9E7B36',
        },
        alabaster: '#FAF8F5',
      },
    },
  },
  plugins: [],
}
