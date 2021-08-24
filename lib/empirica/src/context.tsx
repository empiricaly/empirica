import React from "react";
import { Participant } from "./actors/participant";

export const EmpiricaContext = React.createContext<Participant | null>(null);
