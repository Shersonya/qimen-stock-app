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
        pine: '#5d5347',
        obsidian: '#15110f',
        bronze: '#6f5127',
      },
      boxShadow: {
        glow: '0 28px 72px rgba(88, 52, 21, 0.16)',
        plate:
          '0 36px 96px rgba(83, 50, 20, 0.18), inset 0 1px 0 rgba(255,255,255,0.42)',
        altar:
          '0 42px 110px rgba(8, 5, 4, 0.52), inset 0 1px 0 rgba(255,243,223,0.12)',
      },
      backgroundImage: {
        paper:
          'linear-gradient(135deg, rgba(252,247,238,0.96), rgba(239,226,203,0.88))',
        'paper-panel':
          'linear-gradient(180deg, rgba(252,247,238,0.95) 0%, rgba(244,233,211,0.86) 100%)',
      },
    },
  },
  plugins: [],
};
