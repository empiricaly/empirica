import { ChangePayload } from "@empirica/tajriba";
import { Subject } from "rxjs";
import {
  attrChange,
  partChange,
  scopeChange,
  setupProvider,
} from "../test_helpers";
import { EmpiricaClassic } from "./classic";

const defaultProps = { participantID: "participant1" };
export function setupClassic(props: Partial<typeof defaultProps> = {}) {
  const { participantID } = {
    ...defaultProps,
    ...props,
  };
  const { provider, changes } = setupProvider();
  const ctx = EmpiricaClassic(participantID, provider);

  return { ctx, changes };
}

export function setupPlayer(
  changes: Subject<ChangePayload>,
  playerID = "player1",
  participantID = "participant1"
) {
  changes.next(scopeChange({ id: playerID, kind: "player" }));
  changes.next(
    attrChange({
      key: "participantID",
      val: `"${participantID}"`,
      nodeID: playerID,
    })
  );
  changes.next(partChange({ id: participantID }));
}

export function setupGame(
  changes: Subject<ChangePayload>,
  playerID = "player1",
  gameID = "game1"
) {
  changes.next(scopeChange({ id: gameID, kind: "game" }));
  changes.next(
    attrChange({
      key: "gameID",
      val: `"${gameID}"`,
      nodeID: playerID,
    })
  );
}

export function setupStage(
  changes: Subject<ChangePayload>,
  gameID = "game1",
  roundID = "round1",
  stageID = "stage1"
) {
  changes.next(scopeChange({ id: stageID, kind: "stage" }));
  changes.next(scopeChange({ id: roundID, kind: "round" }));
  changes.next(
    attrChange({
      key: "stageID",
      val: `"${stageID}"`,
      nodeID: gameID,
    })
  );
  changes.next(
    attrChange({
      key: "roundID",
      val: `"${roundID}"`,
      nodeID: stageID,
    })
  );
}

export function setupPlayerGameRoundStage(
  changes: Subject<ChangePayload>,
  playerID = "player1",
  gameID = "game1",
  roundID = "round1",
  stageID = "stage1"
) {
  changes.next(
    scopeChange({ id: playerID + "-" + gameID, kind: "playerGame" })
  );
  changes.next(
    scopeChange({ id: playerID + "-" + roundID, kind: "playerRound" })
  );
  changes.next(
    scopeChange({ id: playerID + "-" + stageID, kind: "playerStage" })
  );
  changes.next(
    attrChange({
      key: `playerGameID-${gameID}`,
      val: `"${playerID + "-" + gameID}"`,
      nodeID: playerID,
    })
  );
  changes.next(
    attrChange({
      key: `playerRoundID-${roundID}`,
      val: `"${playerID + "-" + roundID}"`,
      nodeID: playerID,
    })
  );
  changes.next(
    attrChange({
      key: `playerStageID-${stageID}`,
      val: `"${playerID + "-" + stageID}"`,
      nodeID: playerID,
    })
  );
}
