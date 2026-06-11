/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B3566',
          light: '#2A4A8A',
          dark: '#122348',
        },
        gold: {
          DEFAULT: '#F4A623',
          light: '#F8C265',
          dark: '#D4881A',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
