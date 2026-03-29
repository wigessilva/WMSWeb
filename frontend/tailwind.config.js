/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wms: {
          fundo: '#F8F9FB',    // Seu Cinza R248, G249, B251
          sidebar: '#004477',  // Seu Azul R0, G68, B119
        }
      }
    },
  },
  plugins: [],
}