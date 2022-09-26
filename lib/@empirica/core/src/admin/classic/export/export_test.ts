import test from "ava";
import { withTajriba } from "../api/connection_test_helper";
import { ExportFormat, runExport } from "./export";

const t = test;
// const t = test.serial;
// const to = test.only;

t("export csv", async (t) => {
  await withTajriba(
    async ({ url, srtoken }) => {
      await runExport(url, null, srtoken, ExportFormat.CSV, "./out");

      t.truthy(true);
    },
    { tajFile: "src/admin/classic/api/tajriba.json", printLogs: false }
  );
});
