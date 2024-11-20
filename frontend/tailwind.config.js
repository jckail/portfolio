/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'quantico': ['Quantico', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
