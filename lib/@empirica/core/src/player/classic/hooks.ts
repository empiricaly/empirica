import { useState } from "react";

const defaultConsentKey = "empirica:consent";

export function useConsent(ns: string): [boolean, (() => void) | undefined] {
  const key = `${defaultConsentKey}${ns ? `:${ns}` : ""}`;
  const getConsented = () => Boolean(window.localStorage[key]);
  const [consented, setConsented] = useState(getConsented());

  function onConsent() {
    window.localStorage[key] = true;
    setConsented(true);
  }

  return [consented, consented ? undefined : onConsent];
}

// useGame,
// usePlayer,
// usePlayers,
// useRound,
// useStage,
