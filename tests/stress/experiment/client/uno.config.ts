import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
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
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
    presetWebFonts({
      fonts: {
        // ...
      },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
