const buttonSafe =
  "border-empirica-600 text-empirica-600 bg-empirica-600 hover:bg-empirica-700 " +
  "border-green-600 text-green-600 bg-green-600 hover:bg-green-700 " +
  "border-red-600 text-red-600 bg-red-600 hover:bg-red-700 " +
  "border-yellow-600 text-yellow-600 bg-yellow-600 hover:bg-yellow-700 " +
  "border-gray-600 text-gray-600 bg-gray-600 hover:bg-gray-700 ";

const badgeSafe =
  "bg-gray-100 text-gray-800 bg-red-100 text-red-800 bg-yellow-100 text-yellow-800 bg-green-100 text-green-800 bg-blue-100 text-blue-800";

const alertSafe =
  "bg-yellow-50 text-yellow-400 text-yellow-800 text-yellow-700 bg-red-50 text-red-400 text-red-800 text-red-700 bg-green-50 text-green-400 text-green-800 text-green-700 bg-empirica-50 text-empirica-400 text-empirica-800 text-empirica-700";

module.exports = {
  extract: {
    include: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx,css}",
      "./node_modules/@empirica/player/dist-src/**/*.{js,ts,jsx,tsx}",
      "./node_modules/@empirica/player/assets/**/*.css",
    ],
  },
  theme: {
    extend: {
      colors: {
        empirica: {
          50: "#fbfcfe",
          100: "#f2f7fd",
          200: "#bcd8f6",
          300: "#8abbef",
          400: "#549ce8",
          500: "#237fe1",
          600: "#1966b8",
          700: "#124b87",
          800: "#0c325a",
          900: "#06192d",
        },
      },
    },
  },
  safelist: `${buttonSafe} ${badgeSafe} ${alertSafe}`,
  plugins: [
    require("windicss/plugin/typography"),
    require("windicss/plugin/forms"),
  ],
};
