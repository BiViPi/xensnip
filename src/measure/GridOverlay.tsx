import { Layer, Line } from 'react-konva';
import { useMeasureStore } from './store';

interface Props {
  width: number;
  height: number;
}

export function GridOverlay({ width, height }: Props) {
  const { gridVisible, gridSpacing, gridOpacity } = useMeasureStore();

  if (!gridVisible) return null;

  const lines = [];

  for (let i = 0; i < width; i += gridSpacing) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i, 0, i, height]}
        stroke={`rgba(255, 255, 255, ${gridOpacity})`}
        strokeWidth={1}
        listening={false}
      />
    );
  }

  for (let i = 0; i < height; i += gridSpacing) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i, width, i]}
        stroke={`rgba(255, 255, 255, ${gridOpacity})`}
        strokeWidth={1}
        listening={false}
      />
    );
  }

  return <Layer listening={false}>{lines}</Layer>;
}
