import {
  ExportFormat,
  runExport,
  withTajriba,
} from "@empirica/core/admin/classic";
import { setLogLevel } from "@empirica/core/console";
import minimist from "minimist";

const argv = minimist(process.argv.slice(2), {
  string: ["token", "srtoken", "filename", "tajfile", "url"],
});

setLogLevel(argv["loglevel"] || "info");

(async () => {
  try {
    const run = async (url, srtoken = argv["srtoken"]) => {
      await runExport(
        url,
        argv["token"],
        srtoken,
        ExportFormat.CSV,
        argv["filename"]
      );
    };

    if (argv["url"]) {
      await run(argv["url"]);

      return;
    }

    if (!argv["tajfile"]) {
      throw new Error("Missing tajfile");
    }

    await withTajriba(
      async ({ url, srtoken }) => {
        await run(url, srtoken);
      },
      {
        tajFile: argv["tajfile"],
        printLogs: false,
      }
    );

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
