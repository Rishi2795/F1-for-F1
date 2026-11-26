/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // zinc-500 is used for secondary text; the stock value (#71717a) is only ~4:1 on near-black.
        zinc: { 500: "#8b8b96" },
      },
    },
  },
  plugins: [],
};
