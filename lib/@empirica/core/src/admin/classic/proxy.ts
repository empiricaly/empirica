import { EventContext, ListenersCollector, TajribaEvent } from "../events";
import { ClassicKinds, Context, Game, Round, Stage, Player } from "./models";

/** Collects event listeners. */
export class ClassicListenersCollector extends ListenersCollector<
  Context,
  ClassicKinds
> {
  /**
   * onGameStart is triggered just before the game start. It is a great place to
   * create rounds and stages and initialize values on the game, the players,
   * the rounds, and the stages.
   *
   * Players are accessible on the game, `game.players`.
   * You can add Rounds to a Game with `game.addRound({ some: "attribute" })`.
   * `game.AddRound` returns a Round object. On the Round object, you can create
   * Stages: `round.addStage({ some: "value" })`.
   *
   * @example
   * ```js
   * const round = game.addRound({
   *   name: "Round 1 - Jelly Beans",
   *   task: "jellybeans",
   * });
   * round.addStage({ name: "Answer", duration: 300 });
   * round.addStage({ name: "Result", duration: 120 });
   *
   * game.players.forEach((player) => player.set("score", 0));
   * ```
   * */
  onGameStart(cb: (props: { game: Game }) => void) {
    this.unique.on(
      "game",
      "start",
      (
        _: EventContext<Context, ClassicKinds>,
        { game, start }: { game: Game; start: boolean }
      ) => {
        if (!start) return;
        cb({ game });
      }
    );
  }

  onRoundStart(cb: (props: { round: Round }) => void) {
    this.unique.on(
      "round",
      "start",
      (
        _: EventContext<Context, ClassicKinds>,
        { round, start }: { round: Round; start: boolean }
      ) => {
        if (!start) return;
        cb({ round });
      }
    );
  }

  onStageStart(cb: (props: { stage: Stage }) => void) {
    this.unique.on(
      "stage",
      "start",
      (
        _: EventContext<Context, ClassicKinds>,
        { stage, start }: { stage: Stage; start: boolean }
      ) => {
        if (!start) return;
        cb({ stage });
      }
    );
  }

  onStageEnded(cb: (props: { stage: Stage }) => void) {
    this.unique.on(
      "stage",
      "ended",
      (
        _: EventContext<Context, ClassicKinds>,
        { stage, ended }: { stage: Stage; ended: boolean }
      ) => {
        if (!ended) return;
        cb({ stage });
      }
    );
  }

  onRoundEnded(cb: (props: { round: Round }) => void) {
    this.unique.on(
      "round",
      "ended",
      (
        _: EventContext<Context, ClassicKinds>,
        { round, ended }: { round: Round; ended: boolean }
      ) => {
        if (!ended) return;
        cb({ round });
      }
    );
  }

  onGameEnded(cb: (props: { game: Game }) => void) {
    this.unique.on(
      "game",
      "ended",
      (
        _: EventContext<Context, ClassicKinds>,
        { game, ended }: { game: Game; ended: boolean }
      ) => {
        if (!ended) return;
        cb({ game });
      }
    );
  }

  onPlayerConnected(cb: (props: { player: Player }) => void) {

    console.log('onPlayerConnected/call', cb);
    
    this.on(
      TajribaEvent.ParticipantConnect,
    (
        _: EventContext<Context, ClassicKinds>,
        // { player }: { player: Player }
        context
      ) => {
          console.log('_', _);
          
          cb(context);
        }
      );
  }
        
  onPlayerDisconnected(cb: (props: { player: Player }) => void) {
    // console.log('onPlayerDisconnected/call', cb);
    this.on(
      TajribaEvent.ParticipantDisconnect,
      (
        _: EventContext<Context, ClassicKinds>,
        // { player }: { player: Player }
        context
      ) => {

        // cb({ player });
        // const playerWithConnectivityInfo = _.
        console.log('context', context);
        
        cb(context);
      }
    );
  }
}
