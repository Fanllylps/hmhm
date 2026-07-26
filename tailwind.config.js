/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Palette lives in CSS variables (src/index.css) so the warm dark theme
      // can swap every color at once. Light values: washi #FAF6ED, surface
      // #FFFDF6, sumi #26231D, muted #8F887A, hairline #EAE2D3, vermilion
      // #D0491F, matcha #7C8C5D.
      colors: {
        washi: 'rgb(var(--c-washi) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        sumi: 'rgb(var(--c-sumi) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        hairline: 'rgb(var(--c-hairline) / <alpha-value>)',
        vermilion: 'rgb(var(--c-vermilion) / <alpha-value>)',
        matcha: 'rgb(var(--c-matcha) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        kana: ['"Zen Maru Gothic"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(38, 35, 29, 0.05)',
        lift: '0 8px 30px rgba(38, 35, 29, 0.09)',
      },
    },
  },
  plugins: [],
}
