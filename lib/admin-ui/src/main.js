import "@unocss/reset/tailwind-compat.css";
import "virtual:uno.css";
import App from "./App.svelte";
import "./style.css";

const app = new App({
  target: document.body,
});

export default app;
