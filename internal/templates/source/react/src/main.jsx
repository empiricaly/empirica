import { EmpiricaGlobal } from "@empirica/player";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

ReactDOM.render(
  <React.StrictMode>
    <EmpiricaGlobal>
      <App />
    </EmpiricaGlobal>
  </React.StrictMode>,
  document.getElementById("root")
);
