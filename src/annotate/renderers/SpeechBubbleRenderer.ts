import Konva from 'konva';
import { SpeechBubbleObject } from '../state/types';

export function createSpeechBubbleNode(obj: SpeechBubbleObject): Konva.Group {
  const group = new Konva.Group({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
  });

  const getBubblePath = () => {
    const r = obj.cornerRadius;
    const w = obj.width;
    const h = obj.height;
    const spread = 12;

    const distT = Math.abs(obj.tailY);
    const distB = Math.abs(obj.tailY - h);
    const distL = Math.abs(obj.tailX);
    const distR = Math.abs(obj.tailX - w);
    const minDist = Math.min(distT, distB, distL, distR);

    let path = `M ${r},0 `;

    if (minDist === distT) {
      const bx = Math.max(r + spread, Math.min(w - r - spread, obj.tailX));
      path += `L ${bx - spread},0 L ${obj.tailX},${obj.tailY} L ${bx + spread},0 `;
    }
    path += `L ${w - r},0 A ${r},${r} 0 0 1 ${w},${r} `;

    if (minDist === distR) {
      const by = Math.max(r + spread, Math.min(h - r - spread, obj.tailY));
      path += `L ${w},${by - spread} L ${obj.tailX},${obj.tailY} L ${w},${by + spread} `;
    }
    path += `L ${w},${h - r} A ${r},${r} 0 0 1 ${w - r},${h} `;

    if (minDist === distB) {
      const bx = Math.max(r + spread, Math.min(w - r - spread, obj.tailX));
      path += `L ${bx + spread},${h} L ${obj.tailX},${obj.tailY} L ${bx - spread},${h} `;
    }
    path += `L ${r},${h} A ${r},${r} 0 0 1 0,${h - r} `;

    if (minDist === distL) {
      const by = Math.max(r + spread, Math.min(h - r - spread, obj.tailY));
      path += `L 0,${by + spread} L ${obj.tailX},${obj.tailY} L 0,${by - spread} `;
    }
    path += `L 0,${r} A ${r},${r} 0 0 1 ${r},0 Z`;

    return path;
  };

  const bubble = new Konva.Path({
    data: getBubblePath(),
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: 1,
    lineJoin: 'round',
  });

  const text = new Konva.Text({
    text: obj.text,
    width: obj.width,
    height: obj.height,
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily,
    fill: obj.textColor,
    padding: obj.padding,
    align: 'center',
    verticalAlign: 'middle',
  });

  group.add(bubble);
  group.add(text);

  return group;
}
