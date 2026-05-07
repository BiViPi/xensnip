import React from 'react';
import Konva from 'konva';
import { useAnnotationStore } from '../state/store';
import { useObjectAnchor } from './useObjectAnchor';
import './FloatingToolbar.css';
import { ArrowToolbar } from './ArrowToolbar';
import { RectangleToolbar } from './RectangleToolbar';
import { TextToolbar } from './TextToolbar';
import { BlurToolbar } from './BlurToolbar';
import { NumberedToolbar } from './NumberedToolbar';
import { SpotlightToolbar } from './SpotlightToolbar';
import { MagnifyToolbar } from './MagnifyToolbar';
import { SimplifyUiToolbar } from './SimplifyUiToolbar';
import { useMeasureStore } from '../../measure/store';
import { ColorPickerToolbar } from '../../measure/ColorPickerToolbar';
import { PixelRulerToolbar } from './PixelRulerToolbar';
import { SpeechBubbleToolbar } from './SpeechBubbleToolbar';
import { CalloutToolbar } from './CalloutToolbar';
import { FreehandArrowToolbar } from './FreehandArrowToolbar';
import { PixelateToolbar } from './PixelateToolbar';
import { OpaqueRedactToolbar } from './OpaqueRedactToolbar';

interface Props {
  scale: number;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function FloatingToolbarManager({ scale, stageRef }: Props) {
  const { selectedId, objects, editingTextId } = useAnnotationStore();
  const { activeUtility, currentSample, colorPickerFrozen } = useMeasureStore();
  const anchor = useObjectAnchor(scale, stageRef);
  
  if (activeUtility === 'color_picker' && currentSample) {
    const cpAnchor = { x: currentSample.x * scale, y: currentSample.y * scale };
    return <ColorPickerToolbar sample={currentSample} anchor={cpAnchor} frozen={colorPickerFrozen} />;
  }

  if (!selectedId || !anchor || editingTextId === selectedId) return null;

  const selectedObject = objects.find(o => o.id === selectedId);
  if (!selectedObject) return null;

  if (selectedObject.type === 'arrow') {
    return <ArrowToolbar anchor={anchor} obj={selectedObject} />;
  }
  
  if (selectedObject.type === 'rectangle') {
    return <RectangleToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'text') {
    return <TextToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'blur') {
    return <BlurToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'numbered') {
    return <NumberedToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'spotlight') {
    return <SpotlightToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'magnify') {
    return <MagnifyToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'simplify_ui') {
    return <SimplifyUiToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'pixel_ruler') {
    return <PixelRulerToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'speech_bubble') {
    return <SpeechBubbleToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'callout') {
    return <CalloutToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'freehand_arrow') {
    return <FreehandArrowToolbar anchor={anchor} obj={selectedObject} />;
  }
  
  if (selectedObject.type === 'pixelate') {
    return <PixelateToolbar anchor={anchor} obj={selectedObject} />;
  }

  if (selectedObject.type === 'opaque_redact') {
    return <OpaqueRedactToolbar anchor={anchor} obj={selectedObject} />;
  }

  return null;
}
