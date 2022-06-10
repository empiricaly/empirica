export const defaultTokenKey = "emp:part:token";
export const defaultPartKey = "emp:part";

export const strkeys = new Set<string>();

export const clear = () => {
  for (const k of strkeys) {
    window.localStorage.removeItem(k);
  }

  window.location.href = window.location.href;
};
