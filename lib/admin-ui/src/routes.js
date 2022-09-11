import Batches from "./components/batches/Batches.svelte";
import NotFound from "./components/NotFound.svelte";
import TreatmentsPage from "./components/treatments/TreatmentsPage.svelte";
import FactorsPage from "./components/treatments/FactorsPage.svelte";
import Export from "./components/Export.svelte";
import UnderConstruction from "./components/UnderConstruction.svelte";

export const routes = {
  "/": Batches,
  "/games": UnderConstruction,
  "/players": UnderConstruction,
  "/export": Export,
  "/treatments": TreatmentsPage,
  "/factors": FactorsPage,
  "/users": UnderConstruction,

  // // Using named parameters, with last being optional
  // '/author/:first/:last?': Author,

  // // Wildcard parameter
  // '/book/*': Book,

  // Catch-all
  // This is optional, but if present it must be the last
  "*": NotFound,
};
