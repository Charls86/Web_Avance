/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#156082',
          dark: '#0d4a66',
          light: '#1a7ba3',
        }
      }
    },
  },
  plugins: [],
}
