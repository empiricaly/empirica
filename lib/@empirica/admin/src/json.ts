export type JsonValue =
  | string
  | number
  | boolean
  | Date
  | Json
  | JsonArray
  | null;

export interface Json {
  [x: string]: JsonValue;
}

export interface JsonArray extends Array<JsonValue> {}
