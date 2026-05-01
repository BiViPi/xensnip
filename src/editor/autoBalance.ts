import { RatioOption } from "../compose/preset";

/**
 * Auto-balance logic for first open.
 * Computes padding such that the screenshot card fits comfortably within the chosen ratio.
 */
export function autoBalance(
  imageW: number,
  imageH: number,
  ratio: RatioOption
): number {
  const minPadding = ratio === "Auto" ? 48 : 32;

  if (ratio === "Auto") {
    return minPadding;
  }

  const [targetRatioW, targetRatioH] = parseRatio(ratio);
  const targetRatio = targetRatioW / targetRatioH;
  const currentRatio = imageW / imageH;

  if (currentRatio > targetRatio) {
    // Image is wider than target ratio (e.g. wide image in 1:1)
    // We need vertical padding to reach the ratio
    // (imageW) / (imageH + padding*2) = targetRatio
    // imageW / targetRatio = imageH + padding*2
    // (imageW / targetRatio - imageH) / 2 = padding
    return Math.max(minPadding, Math.round((imageW / targetRatio - imageH) / 2));
  } else {
    // Image is taller than target ratio (e.g. tall image in 16:9)
    // We need horizontal padding to reach the ratio
    // (imageW + padding*2) / (imageH) = targetRatio
    // imageH * targetRatio = imageW + padding*2
    // (imageH * targetRatio - imageW) / 2 = padding
    return Math.max(minPadding, Math.round((imageH * targetRatio - imageW) / 2));
  }
}

function parseRatio(ratio: RatioOption): [number, number] {
  switch (ratio) {
    case "16:9": return [16, 9];
    case "4:3": return [4, 3];
    case "1:1": return [1, 1];
    case "3:4": return [3, 4];
    case "9:16": return [9, 16];
    default: return [1, 1];
  }
}
