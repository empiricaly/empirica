import { Empirica, setLogLevel } from "@empirica/admin";

setLogLevel("trace");

const config = {
  kind: "simple",
  treatments: [
    {
      count: 1,
      treatment: {
        playerCount: 1,
      },
    },
  ],
};

const url = "http://localhost:3000/query";
const token = "0123456789123456";

(async () => {
  const [admin, _] = await Empirica.registerService(url, "createBatch", token);
  await admin.createBatch({ config });
  process.exit(0);
})();
