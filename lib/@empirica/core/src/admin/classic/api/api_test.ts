import test from "ava";
import { connect } from "./api";
import { withTajriba } from "./connection_test_helper";

const t = test;
// const t = test.serial;
// const to = test.only;

t("query with api", async (t) => {
  await withTajriba(
    async ({ url, srtoken }) => {
      const taj = await connect(url, null, srtoken);

      t.truthy(taj);
      for await (const player of taj.players()) {
        console.log("player", player.id);
        for (const attr of player.attributes) {
          console.log(`  ${attr.key} ${attr.value}`);
        }
      }
      for await (const batch of taj.batches()) {
        console.log("batch", batch.id);
        for (const attr of batch.attributes) {
          console.log(`  ${attr.key} ${attr.value}`);
        }
      }
      for await (const game of taj.games()) {
        console.log("game", game.id);
        for (const attr of game.attributes) {
          console.log(`  ${attr.key} ${attr.value}`);
        }
      }
    },
    { tajFile: "src/admin/classic/api/tajriba.json", printLogs: false }
  );
});
