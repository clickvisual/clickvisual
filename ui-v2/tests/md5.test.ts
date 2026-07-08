import { describe, expect, it } from "vitest";
import { md5 } from "../src/shared/crypto/md5";

describe("md5", () => {
  it("hashes login passwords consistently with backend", () => {
    expect(md5("clickvisual")).toBe("c37de4f875d7f764d27cd57dccfa0e56");
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });
});
