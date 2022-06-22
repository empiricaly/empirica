export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

export const createNewParticipant = (key = "participantKey") => {
  const url = new URL(document.location.href);
  url.searchParams.set(key, new Date().getTime().toString());
  window.open(url.href, "_blank")?.focus();
};
