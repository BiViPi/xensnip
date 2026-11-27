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
import { MoveHandleBadge } from './MoveHandleBadge';

interface Props {
  scale: number;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function FloatingToolbarManager({ scale, stageRef }: Props) {
  const { selectedIds, objects, editingTextId } = useAnnotationStore();
  const { activeUtility, currentSample, colorPickerFrozen } = useMeasureStore();
  const anchor = useObjectAnchor(scale, stageRef);

  if (activeUtility === 'color_picker' && currentSample) {
    const cpAnchor = { x: currentSample.x * scale, y: currentSample.y * scale };
    return <ColorPickerToolbar sample={currentSample} anchor={cpAnchor} frozen={colorPickerFrozen} />;
  }

  if (selectedIds.length === 0 || !anchor || (editingTextId && selectedIds.includes(editingTextId))) {
    return null;
  }

  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id) && o.draggable !== false);
  const selectedObject = selectedIds.length === 1 ? objects.find((o) => o.id === selectedIds[0]) : null;

  let toolbar: React.ReactElement | null = null;
  if (selectedObject) {
    if (selectedObject.type === 'arrow') {
      toolbar = <ArrowToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'rectangle') {
      toolbar = <RectangleToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'text') {
      toolbar = <TextToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'blur') {
      toolbar = <BlurToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'numbered') {
      toolbar = <NumberedToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'spotlight') {
      toolbar = <SpotlightToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'magnify') {
      toolbar = <MagnifyToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'simplify_ui') {
      toolbar = <SimplifyUiToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'pixel_ruler') {
      toolbar = <PixelRulerToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'speech_bubble') {
      toolbar = <SpeechBubbleToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'callout') {
      toolbar = <CalloutToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'freehand_arrow') {
      toolbar = <FreehandArrowToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'pixelate') {
      toolbar = <PixelateToolbar anchor={anchor} obj={selectedObject} />;
    } else if (selectedObject.type === 'opaque_redact') {
      toolbar = <OpaqueRedactToolbar anchor={anchor} obj={selectedObject} />;
    }
  }

  return (
    <>
      {toolbar}
      {selectedObjects.length > 0 && (
        <MoveHandleBadge anchor={anchor} scale={scale} objects={selectedObjects} />
      )}
    </>
  );
}
