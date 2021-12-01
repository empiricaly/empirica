import React from "react";
import { JsonValue } from "../json";
import { Player } from "../player";

export const EmpiricaContext = React.createContext<Player | null>(null);

export type Store = {
  subscribe: (subscription: (value: any) => void) => () => void;
  set?: (value: any) => void;
};

export const GlobalContext = React.createContext<Store | null>(null);
