# Spike S2 — sealed bundle: `bun build --compile` with embedded assets + bun:sqlite

**Date:** 2026-07-15 · **Bun:** 1.3.11 · **Host:** linux x64 (glibc)

## Verdict: PASS

A single `bun build --compile` executable, copied alone into an empty directory
(no source, no node_modules, no bun install), served:

- embedded `index.html`, `app.js`, `logo.png` — all **byte-identical** to the
  source assets (sha256-verified through curl);
- `/api/state` GET/POST backed by **bun:sqlite**, DB file created in the
  *runtime* CWD (`join(process.cwd(), "s2-state.sqlite")`), rows persisted
  across process restart;
- a **WebSocket** echo endpoint (round-trip verified with a Bun client);
- an entire fake **Vite-style `dist/`** (hashed filenames, `assets/` subdir,
  favicon) with SPA fallback, correct MIME types, byte-identical bytes,
  including 2 MB binary blobs.

Layout:

```
server/            the exit-criterion server (index.ts + assets/)
experiments/       dist-embedding, naming, dynamic-path, cross-compile probes
```

Repro:

```sh
cd server && bun build --compile ./index.ts --outfile s2-server
cp s2-server /some/empty/dir && cd /some/empty/dir && ./s2-server
```

---

## How asset embedding actually works

1. **Only statically analyzable references embed.** An import with the
   attribute `with { type: "file" }` marks the file as an embedded asset
   regardless of extension (this is what stops `.html`/`.js`/`.css` from being
   *bundled* instead). The import evaluates to a **path string**:
   - compiled: a virtual-FS path like `/$bunfs/root/logo-rysd1a1a.png`
     (Windows uses `B:\~BUN\root\...` per Bun docs — not tested here);
   - un-compiled (`bun index.ts`): the real absolute on-disk path.
   Same code works in dev and sealed modes — free dev/prod parity.
2. `Bun.file(importedPath)` reads the embedded bytes; `.type` returns the
   correct MIME (`image/png`, `text/css`, …), so
   `new Response(Bun.file(p), { headers: { "content-type": Bun.file(p).type } })`
   is all a static file server needs. `node:fs` `readFileSync` on the virtual
   path also works.
3. **Runtime enumeration: `Bun.embeddedFiles`** — an array of `File` (Blob)
   objects with `name`, `size`, `type`; each is directly servable as a
   `Response` body. This is the *only* enumeration: `fs.readdirSync("/$bunfs/root")`
   fails with ENOENT (the virtual FS is not a listable directory). In
   un-compiled dev mode `Bun.embeddedFiles` is `[]`.
4. **Embedded names are flattened and re-hashed by default.** Default asset
   naming is `[name]-[hash].[ext]`: `dist/assets/index-BqK9mLp3.js` becomes
   `index-BqK9mLp3-appafg7g.js` — directory gone, second content-hash added.
   `--asset-naming="[dir]/[name].[ext]"` preserves paths
   (`dist/assets/index-BqK9mLp3.js`), which makes `Bun.embeddedFiles`-driven
   routing viable. `[dir]` is relative to the build root: assets *outside* the
   entrypoint's tree get literal `../` in their names
   (`../dist/index.html`, path `/$bunfs/root/../dist/index.html`) — it still
   reads and serves fine, but makes URL-mapping messy. Prefer keeping the
   embedded dist under the entrypoint's directory, or just don't depend on
   names at all (see recommended pattern).

## Embedding a whole Vite-style `dist/` — what was tried

| Approach | Result |
|---|---|
| One `with { type: "file" }` import per file, hand-written | Works, but Vite hashes change every build — not maintainable by hand |
| **Codegen manifest** (`Bun.Glob` over `dist/` at build time → generated module of static imports + `{ "/url/path": embeddedPath }` map) | **Works. Recommended.** Sub-dirs, SPA fallback, MIME, byte-identical — all verified |
| Glob imports in source (`import.meta.glob`-style) | Doesn't exist in Bun's bundler; `bun build --compile app.ts './dist/**/*'` → `ModuleNotFound` (no glob expansion) |
| Directory import `import d from "./dist" with { type: "file" }` | Build error: `Could not resolve` — directories can't be imported |
| Extra **CLI file args** (`bun build --compile app.ts dist/favicon.ico`) | Embeds *opaque binaries* fine (appears in `Bun.embeddedFiles`). But `dist/index.html` as an arg is treated as a **full-stack HTML entrypoint** (build fails resolving its absolute-URL `<script src>`), and passing `.js`/`.css` args **crashed the compiler** (panic → bun.report link). Not viable for a dist tree |
| `Bun.embeddedFiles` + `--asset-naming="[dir]/[name].[ext]"` | Works as the serving side once files are embedded via imports; names then match source paths |
| Full-stack HTML import (`import index from "./index.html"`, **no** type attribute, `routes: { "/*": index }`) | Works with `--compile`: Bun bundles the referenced TS/CSS, rewrites the HTML to hashed chunk URLs, auto-serves them. The "let Bun replace Vite" path — good option if we drop Vite, irrelevant for embedding a *prebuilt* dist |

### Dynamic paths (inside the sealed binary)

- `Bun.file("./dist/index.html")` → **ENOENT** — relative runtime paths hit the
  *real* filesystem/CWD, never the embedded FS. Nothing is embedded by a
  runtime-computed reference; embedding decisions are bundle-time only.
- `Bun.file("/$bunfs/root/" + computedName)` → **works**, if the file was
  already embedded and you know its embedded name.
- `await import(runtimeString)` of an embedded `.js` asset → **works**
  (verified with an argv-derived name); the runtime module loader resolves
  inside the virtual FS. Neat, but don't build on it.

## Recommended pattern for a real client `dist/`

`experiments/gen-manifest.ts` + `experiments/dist-server.ts`, i.e.:

1. `vite build` as usual.
2. A ~20-line codegen script globs `dist/**/*` and writes `manifest.generated.ts`:
   ```ts
   import a0 from "./dist/index.html" with { type: "file" };
   ...
   export const manifest: Record<string, string> = { "/index.html": a0, ... };
   ```
3. Server: look up `pathname` in the manifest (fall back to `/index.html` for
   SPA routes), respond with `Bun.file(embeddedPath)` + its `.type`.
4. `bun gen-manifest.ts && bun build --compile server.ts --outfile app`.

Why this over the alternatives: no reliance on embedded-name conventions
(default naming can stay), URL→asset mapping is explicit and includes
subdirectories, and the same binary-less code path works in dev because the
imports resolve to real files there. `--asset-naming` becomes purely optional.

## Numbers (linux x64, Bun 1.3.11)

| Build | Size | Compile time (warm) |
|---|---|---|
| Baseline server, zero assets | 99,295,633 B (~94.7 MiB) | 0.19–0.6 s |
| + 3 tiny assets | 99,299,211 B (+3.6 KB) | 0.33 s |
| + 5-file fake dist | 99,297,715 B | 0.34 s |
| + 8 MB of assets (incl. 2 MB of zeros) | 107,687,373 B (**+8.00 MB — exactly 1:1, no compression**) | 0.74 s |
| + 40 MB of assets (25 files) | 141,246,006 B (+40.01 MB) | 1.34 s |

The ~95 MiB floor is the Bun runtime itself; assets add their raw size, byte
for byte (even all-zero files — nothing is compressed). Compile time scales
gently: +1 s per ~40 MB of assets.

### Cross-compile (`--target`, all verified from this linux-x64 host)

| Target | Output | Size | Time (first run incl. runtime download) |
|---|---|---|---|
| `bun-windows-x64` | PE32+ `.exe` (auto-suffixed) | 115.4 MB | 4.5 s |
| `bun-darwin-arm64` | Mach-O arm64 | 61.1 MB | 2.0 s |
| `bun-linux-arm64` | ELF aarch64 (glibc) | 98.7 MB | 2.1 s |
| `bun-linux-x64-musl` | ELF x64 (musl) | 94.2 MB | 1.7 s |

Target runtimes are downloaded on first use (worked through the outbound
proxy) and cached. Docs also list `bun-darwin-x64`, `-musl` arm64, and
`-baseline`/`-modern` CPU variants. `--minify` and `--bytecode` both work
alongside `--compile` (bytecode = faster startup for the server code; assets
unaffected). bun:sqlite needs no external library on any target — it's inside
the runtime.

## Gotchas (the ones that will bite)

1. **No glob imports** — a directory of hashed files *requires* a codegen step
   (or CLI args, but see #3). Re-run codegen after every Vite build, before
   every compile; stale manifests mean stale/missing assets.
2. **Embedded names ≠ source paths** by default (flattened + extra hash).
   Never reconstruct embedded names by string-munging; use the import's return
   value, or set `--asset-naming="[dir]/[name].[ext]"` if you must key off
   `Bun.embeddedFiles.name`. With plain `[name].[ext]`, two same-named files
   from different dirs would collide — keep `[dir]` or `[hash]` in the pattern.
3. **Don't pass `.html`/`.js`/`.css` as extra CLI args to embed** — HTML gets
   bundled as an app entrypoint, JS/CSS panicked the 1.3.11 compiler. CLI-arg
   embedding is safe only for opaque binary files.
4. **`Bun.embeddedFiles` is empty in un-compiled dev**, so a server driven
   purely by it needs a dev fallback. The manifest pattern sidesteps this.
5. **Runtime-relative paths escape the seal** — `Bun.file("./anything")` reads
   the real CWD. That's exactly right for the sqlite DB (keep it that way) and
   exactly wrong for assets (never do it).
6. `[dir]` naming is build-root-relative; a dist outside the entrypoint tree
   yields `../`-prefixed embedded names (readable but ugly). Co-locate or map.
7. Assets are stored **uncompressed**; a 200 MB media folder means a +200 MB
   binary. Fine for an SPA dist (a few MB); wrong tool for bulk media.
8. Windows virtual-FS prefix differs (`B:\~BUN\root\`, per docs) — another
   reason to only ever use import-returned paths, never hardcoded `/$bunfs/...`.
9. Not covered by this spike: gzip/etag behavior of `Bun.serve` static
   responses, `bun-windows-arm64` (not offered), executing the cross-compiled
   binaries (no target hardware here — format verified via `file` only).
