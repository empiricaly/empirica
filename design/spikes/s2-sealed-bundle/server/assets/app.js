// Client app served as an embedded static asset.
(async () => {
  const out = document.getElementById("out");
  const state = await fetch("/api/state").then((r) => r.json());
  out.textContent = "state: " + JSON.stringify(state);

  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onopen = () => ws.send("hello from app.js");
  ws.onmessage = (ev) => {
    out.textContent += "\nws echo: " + ev.data;
  };
})();
