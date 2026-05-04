/**
 * Generates a 128px-wide thumbnail from an HTMLImageElement.
 * Preserves aspect ratio using an off-screen canvas.
 */
export async function generateThumbnail(img: HTMLImageElement): Promise<string> {
  const targetWidth = 128;
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
