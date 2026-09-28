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
      screens: {
        // 320px phones need a slightly tighter BPM row and Start BPM row than
        // 360px-and-up ones; sm (640px) is far too coarse for that.
        xs: '360px',
        // Landscape phones: ~375px tall. The header and footer alone took
        // 280px of it, leaving a 62px window onto the settings column.
        short: {raw: '(max-height: 500px)'},
        // Two-column Trainer layout: desktops, tablets on their side and most
        // phones in landscape (iPhone 12+ are 844-932px wide on their side).
        twocol: {raw: '(min-width: 800px)'},
      },
      fontFamily: {
        sans: ['K2D', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}