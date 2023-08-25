import archiver, { Archiver } from "archiver";
import fs from "fs";
import { Readable } from "stream";
import { promiseHandle } from "../../promises";
import { Conn, Scope } from "../api/api";
import { humanBytes } from "./bytes";

export const BOM = "\uFEFF";

export async function exportCSV(conn: Conn, output: string) {
  const archive = archiver("zip");
  const stream = fs.createWriteStream(output);

  const prom = promiseHandle();
  stream.on("close", function () {
    console.log(
      "Finalizing archive (" + humanBytes(archive.pointer(), true, 2) + ")"
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

  const a = archive;
  await processType(a, "batches", conn.batches.bind(conn));
  await processType(a, "games", conn.games.bind(conn));
  await processType(a, "playerGames", conn.playerGames.bind(conn));
  await processType(a, "rounds", conn.rounds.bind(conn));
  await processType(a, "playerRounds", conn.playerRounds.bind(conn));
  await processType(a, "stages", conn.stages.bind(conn));
  await processType(a, "playerStages", conn.playerStages.bind(conn));
  await processType(a, "players", conn.players.bind(conn));

  archive.finalize();

  await prom.promise;
}

const changedAtSuffix = "LastChangedAt";

async function processType<T extends Scope>(
  archive: Archiver,
  fileName: string,
  it: () => AsyncGenerator<T, void, unknown>
) {
  console.log("Processing", fileName);
  const file = newFile(archive, fileName, "csv");

  const keys = new Set<string>();
  const cols = new Set<string>();
  for await (const record of it()) {
    for (const attr of record.attributes) {
      keys.add(attr.key);
      cols.add(attr.key);
      cols.add(attr.key + changedAtSuffix);
    }
  }

  const keyArr = Array.from(keys.values());
  file.push(encodeCells(Array.from(cols.values())));

  let counter = 0;
  for await (const record of it()) {
    counter++;
    const attrs = record.attributes;

    const line: (string | undefined)[] = [];
    LOOP: for (const key of keyArr) {
      for (const attr of attrs) {
        if (attr.key === key) {
          line.push(cast(attr.value));
          line.push(cast(attr.createdAt));

          continue LOOP;
        }
      }

      line.push(undefined);
      line.push(undefined);
    }

    file.push(encodeCells(line));
  }
  console.log(` -> ${counter} ${counter === 1 ? "record" : "records"} found.`);

  file.push(null);
}

class FileReadable extends Readable {
  _read() {}
}

function newFile(archive: Archiver, name: string, extension: string) {
  const file = new FileReadable({});
  archive.append(file, { name: `${name}.${extension}` });
  file.push(BOM);
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

    const shouldQuote =
      row[i].indexOf(",") !== -1 || // Contains a comma
      row[i].indexOf("\r\n") !== -1 || // Contains a CRLF
      row[i].indexOf(quoteMark) !== -1; // Contains a quote mark

    row[i] = row[i].replace(quoteRegex, doubleQuoteMark);

    if (shouldQuote) {
      row[i] = quoteMark + row[i] + quoteMark;
    }
  }

  return row.join(",") + "\r\n";
};

const cast = (out: any): string => {
  if (Array.isArray(out)) {
    return JSON.stringify(out);
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
