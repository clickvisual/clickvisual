import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/components/RightContent/index.tsx", import.meta.url),
  "utf8"
);

const shimoDocsSubtree = source.match(
  /<Tooltip\s+placement="bottom"\s+title=\{\s*"我们团队最新推出了石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！"\s*\}\s*>[\s\S]*?<Button\b[\s\S]*?<\/Button>[\s\S]*?<\/Tooltip>/
)?.[0];

assert.ok(shimoDocsSubtree, "ShimoDocs Tooltip/Button subtree should exist");
const shimoDocsButton = shimoDocsSubtree.match(/<Button\b[\s\S]*?>/)?.[0];

assert.ok(shimoDocsButton, "ShimoDocs Button opening tag should exist");
assert.match(
  shimoDocsSubtree,
  /title=\{\s*"我们团队最新推出了石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！"\s*\}/
);
assert.match(
  shimoDocsButton,
  /href="https:\/\/github\.com\/shimodocs\/shimodocs"/
);
assert.match(shimoDocsButton, /target="_blank"/);
assert.match(shimoDocsButton, /rel="noopener noreferrer"/);
assert.match(
  shimoDocsButton,
  /aria-label="我们团队最新推出了石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！"/
);
assert.match(shimoDocsSubtree, /icon-shimo/);
assert.doesNotMatch(shimoDocsSubtree, /<a\b/);
assert.ok(!source.includes("https://shimo.im/welcome"));

console.log("ShimoDocs header link checks passed");
