export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

export const createNewPlayer = () => {
  const date: Date = new Date();
  window
    .open(document.location.href + `?playerKey=${date.getTime()}`, "_blank")
    ?.focus();
};
