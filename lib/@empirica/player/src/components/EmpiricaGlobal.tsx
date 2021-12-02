import React, { useEffect, useState } from "react";
import { Empirica, DefaultURL } from "../empirica";
import { GlobalContext, Store } from "./Context";

interface EmpiricaGlobalProps {
  url?: string;
}

export const EmpiricaGlobal: React.FC<EmpiricaGlobalProps> = (props) => {
  const [globalAttr, setGlobalAttr] = useState<Store | null>(null);

  const url = props.url || DefaultURL;

  useEffect(() => {
    setGlobalAttr(Empirica.globalAttributes(url));
  }, []);

  return (
    <GlobalContext.Provider value={globalAttr}>
      {props.children}
    </GlobalContext.Provider>
  );
};
