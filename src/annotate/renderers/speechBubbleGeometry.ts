export function getEffectiveSpeechBubbleRadius(
  width: number,
  height: number,
  cornerRadius: number
): number {
  return Math.max(0, Math.min(cornerRadius, width / 2, height / 2));
}

function pointToSegmentDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const cx = Math.max(ax, Math.min(bx, px));
  const cy = Math.max(ay, Math.min(by, py));
  return Math.hypot(px - cx, py - cy);
}

/**
 * Generates an SVG path string for a SpeechBubbleObject with safely clamped corner radius
 * and tail notch spread so small bubbles never distort or invert arcs.
 */
export function buildSpeechBubblePath(
  width: number,
  height: number,
  cornerRadius: number,
  tailX: number,
  tailY: number
): string {
  const w = Math.max(4, width);
  const h = Math.max(4, height);
  const r = getEffectiveSpeechBubbleRadius(w, h, cornerRadius);

  const distT = pointToSegmentDist(tailX, tailY, 0, 0, w, 0);
  const distB = pointToSegmentDist(tailX, tailY, 0, h, w, h);
  const distL = pointToSegmentDist(tailX, tailY, 0, 0, 0, h);
  const distR = pointToSegmentDist(tailX, tailY, w, 0, w, h);

  const minDist = Math.min(distT, distB, distL, distR);
  const attachedSide =
    minDist === distT ? 'T' : minDist === distB ? 'B' : minDist === distL ? 'L' : 'R';

  const sideLen = attachedSide === 'T' || attachedSide === 'B' ? w : h;
  const tailR = Math.max(0, Math.min(r, (sideLen - 4) / 2));
  const spread = Math.min(12, Math.max(2, (sideLen - 2 * tailR) / 2));

  let path = `M ${r},0 `;

  if (attachedSide === 'T') {
    const bx = Math.max(tailR + spread, Math.min(w - tailR - spread, tailX));
    path += `L ${bx - spread},0 L ${tailX},${tailY} L ${bx + spread},0 `;
  }
  path += `L ${w - r},0 A ${r},${r} 0 0 1 ${w},${r} `;

  if (attachedSide === 'R') {
    const by = Math.max(tailR + spread, Math.min(h - tailR - spread, tailY));
    path += `L ${w},${by - spread} L ${tailX},${tailY} L ${w},${by + spread} `;
  }
  path += `L ${w},${h - r} A ${r},${r} 0 0 1 ${w - r},${h} `;

  if (attachedSide === 'B') {
    const bx = Math.max(tailR + spread, Math.min(w - tailR - spread, tailX));
    path += `L ${bx + spread},${h} L ${tailX},${tailY} L ${bx - spread},${h} `;
  }
  path += `L ${r},${h} A ${r},${r} 0 0 1 0,${h - r} `;

  if (attachedSide === 'L') {
    const by = Math.max(tailR + spread, Math.min(h - tailR - spread, tailY));
    path += `L 0,${by + spread} L ${tailX},${tailY} L 0,${by - spread} `;
  }
  path += `L 0,${r} A ${r},${r} 0 0 1 ${r},0 Z`;

  return path;
}
