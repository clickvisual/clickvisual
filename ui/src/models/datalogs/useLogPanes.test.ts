import { DefaultPane } from "./useLogPanes";

describe("DefaultPane", () => {
  it("enables histogram queries by default", () => {
    expect(DefaultPane.histogramChecked).toBe(true);
  });
});
