export type DrawingStart = { 
  type: 'arrow' | 'rectangle' | 'blur' | 'pixelate' | 'opaque_redact' | 'spotlight' | 'magnify' | 'simplify_ui' | 'pixel_ruler' | 'callout'; 
  start: { x: number; y: number }; 
  end: { x: number; y: number };
};

export type DrawingFreehand = { 
  type: 'freehand_arrow'; 
  start: { x: number; y: number }; 
  points: number[]; 
};

export type DrawingOcr = { 
  type: 'ocr_selection'; 
  start: { x: number; y: number }; 
  end: { x: number; y: number }; 
};

export type DrawingRedact = { 
  type: 'smart_redact_selection'; 
  start: { x: number; y: number }; 
  end: { x: number; y: number }; 
};

export type DrawingObject = DrawingStart | DrawingFreehand | DrawingOcr | DrawingRedact;
