// Automated avatar generation
// Format: /avatars/[identicon|jdenticon]/:playerID

import crypto from "crypto";
import Identicon from "identicon.js";
import jdenticon from "jdenticon";

WebApp.connectHandlers.use("/avatars", (req, res) => {
  const [type, id] = req.url.slice(1).split("/");

  const hash = crypto
    .createHash("sha1")
    .update(id)
    .digest("hex");

  let svg;
  switch (type) {
    case "identicon":
      svg = new Identicon(hash, { size: 200, format: "svg" }).toString(true);
      break;
    case "jdenticon":
      svg = jdenticon.toSvg(hash, 200);
      break;
    default:
      res.writeHead(404, {});
      res.end();
      return;
  }

  res.writeHead(200, { "Content-Type": "image/svg+xml" });
  res.end(svg);
});
