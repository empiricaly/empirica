import archiver, { Archiver } from "archiver";
import fs from "fs";
import streams from "stream-buffers";
import { promiseHandle } from "../../promises";
import { Conn, Scope } from "../api/api";

export const BOM = "\uFEFF";

export async function exportCSV(conn: Conn, output: string) {
  const archive = archiver("zip");
  const stream = fs.createWriteStream(output);

  const prom = promiseHandle();
  stream.on("close", function () {
    console.log(archive.pointer() + " total bytes");
    console.log(
      "archiver has been finalized and the output file descriptor has closed."
    );
    prom.result();
  });

  archive.on("warning", function (err) {
    console.warn(err);
  });

  archive.on("error", function (err) {
    console.error(err);
    throw err;
  });

  // pipe archive data to the file
  archive.pipe(stream);

  // file.put(encodeCells(keys.concat(dataKeys.map((k) => `data.${k}`))));

  console.log("here");

  const a = archive;
  await processType(a, output, "batches", conn.batches.bind(conn));
  await processType(a, output, "games", conn.games.bind(conn));
  await processType(a, output, "playerGames", conn.playerGames.bind(conn));
  await processType(a, output, "rounds", conn.rounds.bind(conn));
  await processType(a, output, "playerRounds", conn.playerRounds.bind(conn));
  await processType(a, output, "stages", conn.stages.bind(conn));
  await processType(a, output, "playerStages", conn.playerStages.bind(conn));
  await processType(a, output, "players", conn.players.bind(conn));

  archive.finalize();
  // await sleep(1000);
  await prom.promise;
}

async function processType<T extends Scope>(
  archive: Archiver,
  output: string,
  fileName: string,
  it: () => AsyncGenerator<T, void, unknown>
) {
  console.log("processing", fileName);
  const file = newFile(archive, output, fileName, "csv");

  const keys = new Set<string>();
  for await (const record of it()) {
    for (const attr of record.attributes) {
      keys.add(attr.key);
    }
  }

  const keyArr = Array.from(keys.values());
  file.put(encodeCells(keyArr));
  console.log(fileName, "keys:", keyArr);

  for await (const record of it()) {
    const attrs = record.attributes;

    const line: (string | undefined)[] = [];
    LOOP: for (const key of keyArr) {
      for (const attr of attrs) {
        if (attr.key === key) {
          line.push(cast(attr.value));

          continue LOOP;
        }
      }

      line.push(undefined);
    }

    console.log(fileName, "line:", line);
    file.put(encodeCells(line));
  }

  file.stop();
}

function newFile(
  archive: Archiver,
  filename: string,
  name: string,
  extension: string
) {
  const file = new streams.ReadableStreamBuffer();
  archive.append(file, { name: `${name}.${extension}` });
  console.log({ name: `${name}.${extension}` });
  file.put(BOM);
  return file;
}

export const quoteMark = '"';
export const doubleQuoteMark = '""';
export const quoteRegex = /"/g;

export const encodeCells = (line: any[]) => {
  const row = line.slice(0);

  for (var i = 0, len = row.length; i < len; i++) {
    if (row[i] === undefined) {
      row[i] = "";
      continue;
    }

    row[i] = JSON.stringify(row[i]); // was cast(row[i]);

    if (row[i].indexOf(quoteMark) !== -1) {
      row[i] = row[i].replace(quoteRegex, doubleQuoteMark);
    }

    if (row[i].indexOf(",") !== -1 || row[i].indexOf("\\n") !== -1) {
      row[i] = quoteMark + row[i] + quoteMark;
    }
  }

  return row.join(",") + "\n";
};

const cast = (out: any): string => {
  if (Array.isArray(out)) {
    // The cast here will flatten arrays but will still catch dates correctly
    return out.map((a) => cast(a)).join(",");
  } else if (out instanceof Date) {
    return out.toISOString();
  } else if (typeof out === "object" && out !== null) {
    return JSON.stringify(out);
  } else if (typeof out === "string") {
    return out.replace(/\n/g, "\\n");
  } else if (out === false || out === 0) {
    return out.toString();
  } else {
    return (out || "").toString();
  }
};
