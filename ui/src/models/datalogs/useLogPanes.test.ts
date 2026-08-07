import { DefaultPane } from "./useLogPanes";

describe("DefaultPane", () => {
  it("disables histogram queries by default", () => {
    expect(DefaultPane.histogramChecked).toBe(false);
  });
});
