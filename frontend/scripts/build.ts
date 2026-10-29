#!/usr/bin/env bun
import { rm } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import tailwind from "bun-plugin-tailwind";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    outdir: { type: "string", default: "dist" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log("Usage: bun run build [--outdir <directory>]");
  process.exit(0);
}

const outdir = path.resolve(values.outdir);
await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [path.resolve("src/index.html")],
  outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.table(result.outputs.map((output) => ({
  file: path.relative(process.cwd(), output.path),
  type: output.kind,
  bytes: output.size,
})));
