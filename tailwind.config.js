/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        brutalist: "4px 4px 0px 0px #000",
        brutalistActive: "2px 2px 0px 0px #000",
      },
    },
  },
  plugins: [],
}
