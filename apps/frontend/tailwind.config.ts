/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f6f7f4",
          100: "#e8ebe2",
          200: "#d4dac8",
          300: "#b5c0a4",
          400: "#96a67f",
          500: "#7a8c64",
          600: "#5f6f4e",
          700: "#4c5940",
          800: "#404936",
          900: "#373d31",
        },
        herbal: {
          cream: "#faf8f5",
          mint: "#d4e8dc",
          forest: "#2d5a3d",
          olive: "#6b7c5c",
          sand: "#c4b896",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
