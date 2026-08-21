const assert = require("node:assert/strict");
const test = require("node:test");
const {
  resolveInitialTableId,
  resolveSharedTableId,
} = require("./shareTable.ts");

test("resolves a unique table name to its numeric id", () => {
  assert.equal(
    resolveSharedTableId("app-log", [
      { key: "table-5", name: "app-log" },
      { key: "table-8", name: "audit-log" },
    ]),
    5
  );
});

test("does not guess when table names are ambiguous", () => {
  assert.equal(
    resolveSharedTableId("app-log", [
      { key: "table-5", name: "app-log" },
      { key: "table-8", name: "app-log" },
    ]),
    undefined
  );
});

test("does not let saved state override a name-based share link", () => {
  assert.equal(resolveInitialTableId(true, undefined, 9), undefined);
  assert.equal(resolveInitialTableId(false, undefined, 9), 9);
});
