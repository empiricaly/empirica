import { Conn, connect } from "../api/api";
import { exportCSV } from "./export_csv";

async function exportJSON(_: Conn, __: string) {
  throw new Error("JSON export not implemented");
}

export enum ExportFormat {
  CSV = "csv",
  JSON = "json",
}

export async function runExport(
  url: string,
  token: string | null,
  srtoken: string,
  format: ExportFormat,
  output: string
) {
  const taj = await connect(url, token, srtoken);

  console.info("\nExporting", format.toUpperCase(), "to", output, "\n");

  switch (format) {
    case ExportFormat.CSV:
      await exportCSV(taj, output);
      break;
    case ExportFormat.JSON:
      await exportJSON(taj, output);
      break;
    default:
      throw new Error(`Unknown format ${format}`);
  }

  taj.stop();
}
