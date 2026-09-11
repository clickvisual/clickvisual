import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/components/RightContent/index.tsx", import.meta.url),
  "utf8"
);

assert.match(source, /const OFFICEDEX_URL = "https:\/\/officedex\.ai\/";/);
assert.match(
  source,
  /const SHIMODOCS_URL = "https:\/\/github\.com\/shimodocs\/shimodocs";/
);

const partnerMenu = source.match(/const partnerMenu = \{[\s\S]*?\};/)?.[0];
assert.ok(partnerMenu, "partnerMenu should exist");

const officeDexIndex = partnerMenu.indexOf("officedex");
const shimoDocsIndex = partnerMenu.indexOf("shimodocs");
assert.ok(officeDexIndex >= 0, "OfficeDex menu item should exist");
assert.ok(shimoDocsIndex >= 0, "ShimoDocs menu item should exist");
assert.ok(
  officeDexIndex < shimoDocsIndex,
  "OfficeDex should appear before ShimoDocs in the partner menu"
);

assert.match(partnerMenu, /href=\{OFFICEDEX_URL\}/);
assert.match(partnerMenu, /href=\{SHIMODOCS_URL\}/);
assert.match(partnerMenu, /target="_blank"/);
assert.match(partnerMenu, /rel="noopener noreferrer"/);
assert.match(partnerMenu, /icon-shimo/);
assert.match(partnerMenu, /OfficeDex/);
assert.match(partnerMenu, /ShimoDocs/);

assert.match(
  source,
  /href=\{OFFICEDEX_URL\}[\s\S]*?aria-label="OfficeDex"[\s\S]*?OfficeDex/
);
assert.match(
  source,
  /<Dropdown[\s\S]*?trigger=\{\["hover"\]\}[\s\S]*?aria-label="合作产品"[\s\S]*?<CaretDownOutlined[\s\S]*?<\/Dropdown>/
);
assert.ok(!source.includes("https://shimo.im/welcome"));

console.log("Partner header menu checks passed");
