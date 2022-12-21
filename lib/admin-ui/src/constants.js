export const DEFAULT_TOKEN_KEY = "emp:part:token";
export const DEFAULT_PART_KEY = "emp:part";

export const DEFAULT_TREATMENT = {
  name: "",
  desc: "",
  factors: [{ key: "playerCount", value: 1 }],
};
export const DEFAULT_FACTOR = { name: "", desc: "", values: [{ value: "" }] };
export const DEFAULT_LOBBY = {
  name: "",
  desc: "",
  kind: "shared",
  strategy: "fail",
  duration: "5m",
  extensions: 0,
};

// URL

let origin = window.location.origin;

// When developing the admin-ui (3001), the API is served from 3000.
if (origin === "http://localhost:3001") {
  origin = "http://localhost:3000";
}

export const ORIGIN = origin;
