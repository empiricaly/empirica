// @ts-check
/// <reference path="./index.d.ts" />

const { test } = require("@playwright/test");
import { Context } from "./context";
import { adminNewBatch } from "./admin";
import { playerStart } from "./player";

test("has title", async ({ browser }) => {
  const ctx = new Context(browser);
  // ctx.logMatching(/GAME/);
  ctx.logMatching(/INTRODONE/);
  await ctx.start();
  await ctx.addPlayers(10);

  ctx.players[0].listenWS({
    received: playerReceivedPrinter(),
  });

  await ctx.applyAdmin(adminNewBatch());
  await ctx.applyPlayers(playerStart);
  await ctx.close();
});

function playerReceivedPrinter() {
  const scopes = new Map();

  return (payload) => {
    try {
      const msg = JSON.parse(payload);
      if (msg["type"] === "ping" || msg["type"] === "connection_ack") {
        return;
      }

      const data = msg["payload"]["data"];

      if (data["globalAttributes"]) {
        return;
      }

      const change = data["changes"]["change"];

      if (!change) {
        return;
      }

      switch (change["__typename"]) {
        case "AttributeChange":
          console.log(
            scopes.get(change["nodeID"]),
            change["nodeID"].slice(-5),
            change["id"].slice(-5),
            change["key"],
            change["val"]
          );
          break;
        case "ScopeChange":
          scopes.set(change["id"], change["kind"]);
          break;
        case "ParticipantChange":
          return;
        case "StepChange":
          return;
        default:
          console.log("UNKNOWN", change["__typename"], change);
      }
    } catch (e) {
      console.log("FAIL", payload);
    }
  };
}
