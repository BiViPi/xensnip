import { describe, expect, it } from "vitest";
import { resizeImageRectUniform } from "../CanvasImageOverlay";

describe("resizeImageRectUniform", () => {
  const start = { x: 100, y: 50, width: 400, height: 200 };

  it("keeps aspect ratio when resizing from the south-east corner", () => {
    const next = resizeImageRectUniform(start, "se", 120, 20);

    expect(next.width / next.height).toBeCloseTo(start.width / start.height, 5);
    expect(next.x).toBe(start.x);
    expect(next.y).toBe(start.y);
    expect(next.width).toBeGreaterThan(start.width);
    expect(next.height).toBeGreaterThan(start.height);
  });

  it("anchors the opposite corner when resizing from the north-west corner", () => {
    const next = resizeImageRectUniform(start, "nw", -80, -10);

    expect(next.width / next.height).toBeCloseTo(start.width / start.height, 5);
    expect(next.x + next.width).toBeCloseTo(start.x + start.width, 5);
    expect(next.y + next.height).toBeCloseTo(start.y + start.height, 5);
  });

  it("never shrinks below the minimum image size", () => {
    const next = resizeImageRectUniform(start, "se", -1000, -1000);

    expect(next.width).toBeGreaterThanOrEqual(40);
    expect(next.height).toBeGreaterThanOrEqual(40);
    expect(next.width / next.height).toBeCloseTo(start.width / start.height, 5);
  });
});
