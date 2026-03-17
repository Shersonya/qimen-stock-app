/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './tests/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#2d241c',
        vermilion: '#8a2f24',
        gold: '#a56a1f',
        sand: '#efe2cb',
        tea: '#d9c19b',
      },
      boxShadow: {
        glow: '0 30px 80px rgba(110, 63, 20, 0.16)',
      },
      backgroundImage: {
        paper: 'linear-gradient(135deg, rgba(255,255,255,0.65), rgba(243,233,211,0.86))',
      },
    },
  },
  plugins: [],
};
