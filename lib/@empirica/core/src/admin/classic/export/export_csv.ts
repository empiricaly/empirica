import { Conn } from "../api/api";
import archiver, { Archiver } from "archiver";
import fs from "fs";
import streams from "stream-buffers";

export const BOM = "\uFEFF";

export async function exportCSV(conn: Conn, output: string) {
  const archive = archiver("zip");
  const stream = fs.createWriteStream(output);

  archive.on("warning", function (err) {
    if (err.code === "ENOENT") {
      console.warn("archive warning", err);
    } else {
      console.error("archive error");
      throw err;
    }
  });

  archive.on("error", function (err) {
    console.error("archive error");
    throw err;
  });

  // pipe archive data to the file
  archive.pipe(stream);

  const file = newFile(archive, "players", "players", "csv");
  file.put(BOM);
  file.put(encodeCells(keys.concat(dataKeys.map((k) => `data.${k}`))));

  for await (const batch of conn.batches()) {
    console.log("batch", batch.id);
    for (const attr of batch.attributes) {
      console.log(`  ${attr.key} ${attr.value}`);
    }
  }
  for await (const player of conn.players()) {
    console.log("player", player.id);
    for (const attr of player.attributes) {
      console.log(`  ${attr.key} ${attr.value}`);
    }
  }
  for await (const game of conn.games()) {
    console.log("game", game.id);
    for (const attr of game.attributes) {
      console.log(`  ${attr.key} ${attr.value}`);
    }
  }
}

function newFile(
  archive: Archiver,
  filename: string,
  name: string,
  extension: string
) {
  const file = new streams.ReadableStreamBuffer();
  archive.append(file, { name: `${filename}/${name}.${extension}` });
  return file;
}
