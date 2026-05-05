/**
 * Generates a higher-density thumbnail sized for the left-panel card.
 * Preserves aspect ratio and keeps enough source pixels for HiDPI displays.
 */
export async function generateThumbnail(img: HTMLImageElement): Promise<string> {
  const displayWidth = 192;
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const renderScale = Math.min(Math.max(devicePixelRatio, 1), 2);
  const targetWidth = Math.min(img.width, Math.max(displayWidth, Math.round(displayWidth * renderScale)));
  const aspectRatio = img.height / img.width;
  const targetHeight = Math.round(targetWidth * aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context for thumbnail generation');
  }

  // Use better scaling quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL('image/png');
}
