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
    console.info(
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

type Attr = {
  isArray: boolean;
  value: string;
  values: any[];
  createdAt: string;
};

async function processType<T extends Scope>(
  archive: Archiver,
  fileName: string,
  it: () => AsyncGenerator<T, void, unknown>
) {
  console.info("Processing", fileName);
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
  keyArr.unshift("id");

  const colsArr = Array.from(cols.values());
  colsArr.unshift("id");

  file.push(encodeCells(colsArr));

  let counter = 0;
  for await (const record of it()) {
    counter++;

    const attrMap = new Map<string, Attr>();

    for (const attr of record.attributes) {
      const { key, value, createdAt, vector, index } = attr;

      if (vector && index === undefined) {
        console.error(`Vector attribute ${key} has no index on ${record.id}`);

        continue;
      }

      let existing = attrMap.get(key);
      if (!existing) {
        existing = {
          isArray: vector,
          value: "",
          values: [],
          createdAt,
        };

        attrMap.set(key, existing);
      } else if (!vector) {
        console.error(`Duplicate attribute ${key} on ${record.id}`);

        continue;
      }

      if (vector) {
        if (!existing.isArray) {
          console.error(`Mixed vector/scalar attribute ${key} on ${record.id}`);

          continue;
        }

        if (existing.values[index!] !== undefined) {
          console.error(
            `Duplicate vector attribute ${key} index ${index} on ${record.id}`
          );
        }

        existing.values[index!] = value;

        if (existing.createdAt < createdAt) {
          existing.createdAt = createdAt;
        }
      } else {
        existing.value = cast(value);
      }
    }

    const line: (string | undefined)[] = [];
    for (const key of keyArr) {
      if (key === "id") {
        line.push(record.id);
        continue;
      }

      const attr = attrMap.get(key);

      if (attr) {
        if (attr.isArray) {
          line.push(cast(attr.values));
        } else {
          line.push(attr.value);
        }

        line.push(attr.createdAt);
      } else {
        line.push(undefined);
        line.push(undefined);
      }
    }

    file.push(encodeCells(line));
  }
  console.info(` -> ${counter} ${counter === 1 ? "record" : "records"} found.`);

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
