// Store-readiness tests for the packaged extension: brand, store limits,
// version agreement, icons, unchanged API surface, and the listing document.
// Run: node --test   (from packages/extension; Node >= 21)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const manifest = JSON.parse(read("manifest.json"));
const pkg = JSON.parse(read("package.json"));
const readme = read("README.md");
const listing = read("LISTING.md");

/** PNG header → { w, h } (IHDR is the first chunk; width/height are big-endian at bytes 16 and 20). */
function pngSize(relPath) {
  const b = readFileSync(join(root, relPath));
  assert.equal(b.toString("ascii", 1, 4), "PNG", `${relPath} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const MECHANISM = /RPCS-1|Ambiguity Check|\bTI\b|\bSG\b|\bFT\b|\bUE\b|\bAR\b|receiver primitive/;

test("brand: the store-facing strings are Explicit Formula, with no mechanism vocabulary", () => {
  assert.equal(manifest.name, "Explicit Formula");
  assert.equal(manifest.short_name, "Explicit Formula");
  for (const s of [manifest.name, manifest.short_name, manifest.description, manifest.action.default_title]) {
    assert.doesNotMatch(s, MECHANISM, s);
  }
  assert.equal(manifest.homepage_url, "https://www.explicitformula.com");
});

test("store limits: name ≤ 45 characters, description ≤ 132 characters", () => {
  assert.ok(manifest.name.length <= 45, `name is ${manifest.name.length} chars`);
  assert.ok(manifest.description.length <= 132, `description is ${manifest.description.length} chars`);
});

test("versions agree across manifest.json, package.json, and the README title", () => {
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.version, manifest.version);
  const titleLine = readme.split("\n")[0];
  assert.ok(titleLine.includes(`v${manifest.version}`), `README title "${titleLine}" lacks v${manifest.version}`);
});

test("icons: every declared icon exists as a PNG of exactly the declared size; the action reuses the same set", () => {
  const sizes = Object.keys(manifest.icons).map(Number).sort((a, b) => a - b);
  assert.deepEqual(sizes, [16, 32, 48, 128]);
  for (const [size, relPath] of Object.entries(manifest.icons)) {
    assert.ok(existsSync(join(root, relPath)), `${relPath} missing`);
    const { w, h } = pngSize(relPath);
    assert.equal(w, Number(size), `${relPath} width`);
    assert.equal(h, Number(size), `${relPath} height`);
  }
  assert.deepEqual(manifest.action.default_icon, manifest.icons);
  // Store assets kept beside the icons (not referenced by the manifest).
  assert.deepEqual(pngSize("icons/promo-440x280.png"), { w: 440, h: 280 });
});

test("API surface unchanged by the rename: rpcs1.dev host permission, permission set, script order", () => {
  assert.deepEqual(manifest.host_permissions, ["https://rpcs1.dev/*"]);
  assert.deepEqual(manifest.permissions, ["storage", "contextMenus", "clipboardWrite"]);
  const cs = manifest.content_scripts[0];
  assert.deepEqual(cs.js, ["logic.js", "content.js"], "logic.js must load before content.js");
  assert.deepEqual(cs.css, ["styles.css"]);
  assert.equal(manifest.background.service_worker, "background.js");
});

test("listing: summary ≤ 132 and identical to the manifest description; privacy URL, support email, and the server disclosure are present", () => {
  const m = listing.match(/\*\*Summary[^*]*\*\*\s*(.+)/);
  assert.ok(m, "LISTING.md needs a **Summary** line");
  assert.equal(m[1].trim(), manifest.description);
  assert.ok(m[1].trim().length <= 132);
  assert.ok(listing.includes("https://www.explicitformula.com/privacy"), "privacy policy URL");
  assert.ok(listing.includes("travisbergen2@gmail.com"), "support email");
  assert.ok(/rpcs1\.dev/.test(listing), "must say plainly that text is sent to rpcs1.dev");
  assert.ok(/single purpose/i.test(listing), "single-purpose statement");
});

test("listing copy is consumer-register: no acronyms or mechanism names in the store-facing sections", () => {
  // Everything above the "For the maintainer" line is what a shopper reads.
  const shopper = listing.split(/^## For the maintainer/m)[0];
  assert.ok(shopper.length > 500, "store-facing section present");
  assert.doesNotMatch(shopper, /RPCS-1|receiver primitive|\bTI\b|\bSG\b|\bFT\b|\bUE\b|\bAR\b|\bMCP\b/);
});

test("the pack script ships exactly the runtime files plus icons — no tests, docs, or listing", () => {
  const src = read("scripts/pack.mjs");
  for (const f of ["manifest.json", "background.js", "content.js", "logic.js", "styles.css", "icons/icon-128.png"]) {
    assert.ok(src.includes(`"${f}"`), `pack list lacks ${f}`);
  }
  for (const f of ["README.md", "LISTING.md", "test/", "promo-440x280"]) {
    assert.ok(!src.includes(`"${f}"`), `pack list must not ship ${f}`);
  }
});
