import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const excelSource = await readFile(
  new URL("../src/utils/excel.ts", import.meta.url),
  "utf8"
);

assert.equal(packageJson.dependencies.xlsx, undefined);
assert.equal(typeof packageJson.dependencies.exceljs, "string");
assert.match(excelSource, /from ['"]exceljs['"]/);
assert.doesNotMatch(excelSource, /from ['"]xlsx['"]|XLSX\./);

console.log("xlsx dependency replacement checks passed");
