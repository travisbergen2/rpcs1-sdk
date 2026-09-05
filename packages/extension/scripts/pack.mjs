// Builds dist/explicit-formula-extension-<version>.zip — exactly the file the
// Chrome Web Store (and Edge Add-ons) upload takes. Ships the runtime files and
// the manifest icons only: no tests, README, listing, or promo assets.
//
// Usage: npm run pack   (from packages/extension; needs the `zip` CLI, present
// on macOS and Linux; on Windows use `Compress-Archive` on the same file list)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));

export const PACK_FILES = [
  "manifest.json",
  "background.js",
  "content.js",
  "logic.js",
  "styles.css",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];

const out = join("dist", `explicit-formula-extension-${manifest.version}.zip`);
mkdirSync(join(root, "dist"), { recursive: true });
if (existsSync(join(root, out))) rmSync(join(root, out));
for (const f of PACK_FILES) {
  if (!existsSync(join(root, f))) throw new Error(`missing ${f}`);
}
// -X: no extra file attributes; -q: quiet. Paths inside the zip stay relative
// to the extension root, which is what the store expects (manifest.json at top).
execFileSync("zip", ["-X", "-q", out, ...PACK_FILES], { cwd: root, stdio: "inherit" });
console.log(join(root, out));
