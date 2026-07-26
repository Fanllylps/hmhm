/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        washi: '#FAF6ED',
        surface: '#FFFDF6',
        sumi: '#26231D',
        muted: '#8F887A',
        hairline: '#EAE2D3',
        vermilion: '#D0491F',
        matcha: '#7C8C5D',
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
