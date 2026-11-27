import { Layer, Shape } from 'react-konva';
import { useMeasureStore } from './store';

interface Props {
  width: number;
  height: number;
  scale?: number;
}

/**
 * Dual-tone high-contrast alignment grid rendered inside a single Konva Shape
 * with 1/scale stroke width compensation so lines stay crisp on both light and dark UIs.
 */
export function GridOverlay({ width, height, scale = 1 }: Props) {
  const { gridVisible, gridSpacing, gridOpacity } = useMeasureStore();

  if (!gridVisible || gridSpacing <= 0) return null;

  const safeScale = scale > 0 ? scale : 1;
  const strokeW = 1 / safeScale;
  const darkAlpha = Math.min(0.9, gridOpacity * 0.85);

  return (
    <Layer listening={false}>
      <Shape
        listening={false}
        sceneFunc={(ctx) => {
          const offset = strokeW;

          // Dark shadow pass for visibility over light/white areas
          ctx.save();
          ctx.strokeStyle = `rgba(15, 23, 42, ${darkAlpha})`;
          ctx.lineWidth = strokeW;
          ctx.beginPath();
          for (let x = 0; x <= width; x += gridSpacing) {
            ctx.moveTo(x + offset, 0);
            ctx.lineTo(x + offset, height);
          }
          for (let y = 0; y <= height; y += gridSpacing) {
            ctx.moveTo(0, y + offset);
            ctx.lineTo(width, y + offset);
          }
          ctx.stroke();

          // Light primary pass for visibility over dark areas
          ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`;
          ctx.beginPath();
          for (let x = 0; x <= width; x += gridSpacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }
          for (let y = 0; y <= height; y += gridSpacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.stroke();
          ctx.restore();
        }}
      />
    </Layer>
  );
}
