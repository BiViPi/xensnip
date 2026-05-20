import { describe, expect, it } from "vitest";
import { readPinBootstrapParams } from "../bootstrap";

describe("readPinBootstrapParams", () => {
  it("reads pin_id and asset_id from the query string", () => {
    expect(readPinBootstrapParams("?pin_id=pin-123&asset_id=asset-456")).toEqual({
      pinId: "pin-123",
      assetId: "asset-456",
    });
  });

  it("returns nulls when params are missing", () => {
    expect(readPinBootstrapParams("")).toEqual({
      pinId: null,
      assetId: null,
    });
  });
});
