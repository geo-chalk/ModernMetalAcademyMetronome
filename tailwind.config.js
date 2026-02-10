/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Tailwind looks here to find your "bg-blue-600" classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}