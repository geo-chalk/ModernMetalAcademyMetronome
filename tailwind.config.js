/** @type {import('tailwindcss').Config} */
export default {
  // Wrap every hover: variant in @media (hover: hover). Without it a tap on a
  // phone leaves the element in its hover colour until the next touch.
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Tailwind looks here to find your "bg-blue-600" classes
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['K2D', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}