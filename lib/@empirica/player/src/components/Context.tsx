import React from "react";
import { Sub } from "..";
import { Player } from "../player";

export const EmpiricaContext = React.createContext<Player | null>(null);
export const NSContext = React.createContext<string | null>(null);
export const URLContext = React.createContext<string>("");
export const OnPlayerIDContext = React.createContext<
  ((playerID: string) => {}) | null
>(null);

export type Store = {
  subscribe: (subscription: Sub) => () => void;
};

export const GlobalContext = React.createContext<Store | null>(null);
