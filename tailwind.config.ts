import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wine: { DEFAULT: '#542536', 700: '#6b2f45', 900: '#3b1a26' },
        forest: { DEFAULT: '#174D38', 600: '#1f6348' },
        terra: { DEFAULT: '#B96848', 700: '#9c5238' },
        cream: { DEFAULT: '#F4E9D8', 50: '#FBF7F0', 200: '#E9DAC2' },
        amber: { DEFAULT: '#D99A42' },
        ink: { DEFAULT: '#252421', 600: '#57534b', 400: '#8a857a' },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
