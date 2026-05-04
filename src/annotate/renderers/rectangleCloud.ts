export function drawCloudRect(context: any, width: number, height: number) {
  const insetX = Math.max(8, Math.min(width * 0.12, 20));
  const bulgeX = Math.max(6, Math.min(width * 0.12, 18));
  const bulgeY = Math.max(6, Math.min(height * 0.18, 18));

  context.beginPath();
  context.moveTo(insetX, 0);

  context.quadraticCurveTo(width * 0.18, -bulgeY, width * 0.34, 0);
  context.quadraticCurveTo(width * 0.5, -bulgeY, width * 0.66, 0);
  context.quadraticCurveTo(width * 0.82, -bulgeY, width - insetX, 0);

  context.quadraticCurveTo(width + bulgeX, height * 0.12, width, height * 0.32);
  context.quadraticCurveTo(width + bulgeX, height * 0.5, width, height * 0.68);
  context.quadraticCurveTo(width + bulgeX, height * 0.88, width - insetX, height);

  context.quadraticCurveTo(width * 0.82, height + bulgeY, width * 0.66, height);
  context.quadraticCurveTo(width * 0.5, height + bulgeY, width * 0.34, height);
  context.quadraticCurveTo(width * 0.18, height + bulgeY, insetX, height);

  context.quadraticCurveTo(-bulgeX, height * 0.88, 0, height * 0.68);
  context.quadraticCurveTo(-bulgeX, height * 0.5, 0, height * 0.32);
  context.quadraticCurveTo(-bulgeX, height * 0.12, insetX, 0);

  context.closePath();
}
