export const DEFAULT_TOKEN_KEY = "emp:part:token";
export const DEFAULT_PART_KEY = "emp:part";

export const DEFAULT_TREATMENT = {
  name: "",
  desc: "",
  factors: [{ key: "playerCount", value: 1 }],
};
export const DEFAULT_FACTOR = { name: "", desc: "", values: [{ value: "" }] };

// URL

let url = window.location.hostname;

if (url === "localhost") {
  url = "http://localhost:3000/query";
} else {
  url = "https://" + url + "/query";
}

export const URL = url;
