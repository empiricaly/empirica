import Batches from "./components/batches/Batches.svelte";
import Export from "./components/Export.svelte";
import LobbiesPage from "./components/lobbies/LobbiesPage.svelte";
import NotFound from "./components/NotFound.svelte";
import Players from "./components/players/Players.svelte";
import FactorsPage from "./components/treatments/FactorsPage.svelte";
import TreatmentsPage from "./components/treatments/TreatmentsPage.svelte";
import UnderConstruction from "./components/UnderConstruction.svelte";

export const routes = {
  "/": Batches,
  "/games": UnderConstruction,
  "/players": Players,
  "/export": Export,
  "/treatments": TreatmentsPage,
  "/factors": FactorsPage,
  "/lobbies": LobbiesPage,
  "/users": UnderConstruction,

  // // Using named parameters, with last being optional
  // '/author/:first/:last?': Author,

  // // Wildcard parameter
  // '/book/*': Book,

  // Catch-all
  // This is optional, but if present it must be the last
  "*": NotFound,
};
