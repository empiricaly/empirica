import Batches from "./components/batches/Batches.svelte";
import NotFound from "./components/NotFound.svelte";
import TreatmentsFactors from "./components/treatments/TreatmentsFactors.svelte";
import UnderConstruction from "./components/UnderConstruction.svelte";

export const routes = {
  "/": Batches,
  "/games": UnderConstruction,
  "/players": UnderConstruction,
  "/treatments": TreatmentsFactors,
  "/users": UnderConstruction,

  // // Using named parameters, with last being optional
  // '/author/:first/:last?': Author,

  // // Wildcard parameter
  // '/book/*': Book,

  // Catch-all
  // This is optional, but if present it must be the last
  "*": NotFound,
};
