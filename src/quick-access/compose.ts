/**
 * compose.ts — Default preset image composition (Sprint 03 minimum).
 *
 * Takes raw capture bytes (PNG from xensnip-asset://) and renders them
 * with the default visual preset using the Canvas API:
 *   - Dark background (#1a1a2e)
 *   - 48px balanced padding
 *   - 12px border-radius on the inner image
 *   - Subtle drop shadow
 *
 * Returns a PNG Blob suitable for clipboard write or file export.
 * This function is the shared composition path for Quick Access preview,
 * Copy, and Export (per overall-plan.md A2 / TDR-001).
 *
 * Sprint 04 will extend this with full preset controls and live preview.
 * Do not fork this function — extend it in place.
 */

const PADDING = 48;
const BACKGROUND = "#1a1a2e";
const RADIUS = 12;

export async function composeDefaultPreset(imageUri: string): Promise<Blob> {
  const img = await loadImage(imageUri);
  const { width: imgW, height: imgH } = img;

  const canvasW = imgW + PADDING * 2;
  const canvasH = imgH + PADDING * 2;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Drop shadow on the image
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;

  // Clipped rounded image
  ctx.save();
  roundedRect(ctx, PADDING, PADDING, imgW, imgH, RADIUS);
  ctx.clip();
  ctx.shadowColor = "transparent"; // reset shadow inside clip
  ctx.drawImage(img, PADDING, PADDING, imgW, imgH);
  ctx.restore();

  return canvasToBlob(canvas);
}

/** Return the composed image as a data URL (for <img> preview). */
export async function composeDefaultPresetDataUrl(imageUri: string): Promise<string> {
  const blob = await composeDefaultPreset(imageUri);
  return blobToDataUrl(blob);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src} — ${e}`));
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/png"
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
