/**
 * A malformed or null JSON body is handled, not a 500 (2026-11-22).
 *
 * Run: npx tsx --test tests/read-body.test.mts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const { readBody } = await import("../src/lib/read-body.js");
const post = (body: string) => new Request("http://x/api", { method: "POST", body, headers: { "Content-Type": "application/json" } });

test("malformed, empty and null bodies read as {}", async () => {
  assert.deepEqual(await readBody(post("{")), {});
  assert.deepEqual(await readBody(post("")), {});
  assert.deepEqual(await readBody(post("null")), {});
});

test("valid JSON passes through unchanged", async () => {
  assert.deepEqual(await readBody(post('{"a":1}')), { a: 1 });
  assert.deepEqual(await readBody(post("[1,2]")), [1, 2]);
});

test("no API route reads a JSON body unguarded", () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
  for (const file of walk(join(root, "src/app/api"))) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/await (req|request)\.json\(\)/.test(line) && !line.includes(".catch(")) {
        const before = lines.slice(Math.max(0, i - 6), i).join("\n");
        assert.match(before, /try\s*\{/, `${file}:${i + 1} reads req.json() without readBody or a try`);
      }
    });
  }
});
