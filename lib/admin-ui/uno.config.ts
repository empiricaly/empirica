import { presetForms } from "@julr/unocss-preset-forms";
import {
  defineConfig,
  presetTypography,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  safelist: [
    ...["blue", "green", "yellow", "grey"]
      .map((color) => [
        `border-${color}-600`,
        `text-${color}-600`,
        `bg-${color}-600`,
        `hover:bg-${color}-700`,
        `bg-${color}-100`,
        `text-${color}-800`,
      ])
      .flat(),
  ],
  theme: {
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
  presets: [
    presetUno(),
    presetForms(),
    // presetAttributify(),
    // presetIcons(),
    presetTypography(),
    // presetWebFonts({
    //   fonts: {
    //     // ...
    //   },
    // }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
