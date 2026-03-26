/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        lime: "#e8ff4a",
        "app-bg": "#0a0a0a",
        "card-bg": "#111111",
      },
    },
  },
  plugins: [],
};
