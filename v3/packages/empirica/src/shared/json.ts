// JSON value types used everywhere we persist or transmit user data.
//
// We model these explicitly (rather than `any`) so misuse is caught at the
// boundary: when reading from the DB, when handing values to callbacks, and
// when validating the wire format.

export type Json = string | number | boolean | null | JsonArray | JsonObject;
export type JsonArray = Json[];
export type JsonObject = { [key: string]: Json };

// Alias kept for symmetry with v1/v2 docs and user familiarity.
export type JsonValue = Json;
