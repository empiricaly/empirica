import { customAlphabet } from "nanoid";

// IDs are URL-safe, 21-char nanoids. We keep them as a branded string so
// `Id<"player">` and `Id<"game">` don't accidentally interchange.
//
// The brand is structural-only at compile time; at runtime an Id is just a
// string. `newId` constructs one; `isId` checks the shape.

declare const idBrand: unique symbol;
export type Id<Kind extends string = string> = string & { readonly [idBrand]: Kind };

const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
const ID_LENGTH = 21;
const generate = customAlphabet(ID_ALPHABET, ID_LENGTH);

const ID_RE = new RegExp(`^[${ID_ALPHABET.replace("-", "\\-")}]{${ID_LENGTH}}$`);

export function newId<Kind extends string = string>(): Id<Kind> {
  return generate() as Id<Kind>;
}

export function isId(value: unknown): value is Id {
  return typeof value === "string" && ID_RE.test(value);
}
