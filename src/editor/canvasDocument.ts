export interface CanvasSourceCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasImageObject {
  id: string;
  assetId?: string;
  image: HTMLImageElement;
  blobUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  sourceCrop: CanvasSourceCrop | null;
}

export interface CanvasDocument {
  images: CanvasImageObject[];
  selectedImageId: string | null;
  maxImages: 2;
}

const DEFAULT_GAP = 24;

export function createCanvasImageObject(input: {
  image: HTMLImageElement;
  blobUrl: string;
  assetId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}): CanvasImageObject {
  return {
    id: crypto.randomUUID(),
    assetId: input.assetId,
    image: input.image,
    blobUrl: input.blobUrl,
    x: input.x ?? 0,
    y: input.y ?? 0,
    width: input.width ?? input.image.width,
    height: input.height ?? input.image.height,
    rotation: 0,
    sourceCrop: null,
  };
}

export function createCanvasDocument(imageObject: CanvasImageObject): CanvasDocument {
  return {
    images: [imageObject],
    selectedImageId: imageObject.id,
    maxImages: 2,
  };
}

export function getSelectedCanvasImage(
  canvas: CanvasDocument | null | undefined
): CanvasImageObject | null {
  if (!canvas || canvas.images.length === 0) return null;
  if (canvas.selectedImageId) {
    const selected = canvas.images.find((img) => img.id === canvas.selectedImageId);
    if (selected) return selected;
  }
  return canvas.images[0] ?? null;
}

export function cloneCanvasDocument(canvas: CanvasDocument): CanvasDocument {
  return {
    ...canvas,
    images: canvas.images.map((image) => ({
      ...image,
      sourceCrop: image.sourceCrop ? { ...image.sourceCrop } : null,
    })),
  };
}

export function replaceCanvasImage(
  canvas: CanvasDocument,
  imageId: string,
  patch: Partial<CanvasImageObject>
): CanvasDocument {
  return {
    ...canvas,
    images: canvas.images.map((image) =>
      image.id === imageId
        ? {
            ...image,
            ...patch,
            sourceCrop: patch.sourceCrop
              ? { ...patch.sourceCrop }
              : patch.sourceCrop === null
                ? null
                : image.sourceCrop,
          }
        : image
    ),
  };
}

export function selectCanvasImage(
  canvas: CanvasDocument,
  imageId: string | null
): CanvasDocument {
  return {
    ...canvas,
    selectedImageId: imageId,
  };
}

export function removeCanvasImage(
  canvas: CanvasDocument,
  imageId: string
): { canvas: CanvasDocument; removed: CanvasImageObject | null } {
  const removed = canvas.images.find((image) => image.id === imageId) ?? null;
  const nextImages = canvas.images.filter((image) => image.id !== imageId);
  const nextSelectedId =
    canvas.selectedImageId === imageId
      ? nextImages[0]?.id ?? null
      : canvas.selectedImageId;
  return {
    canvas: {
      ...canvas,
      images: nextImages,
      selectedImageId: nextSelectedId,
    },
    removed,
  };
}

export function addCanvasImage(
  canvas: CanvasDocument,
  input: {
    image: HTMLImageElement;
    blobUrl: string;
    assetId?: string;
  }
): CanvasDocument {
  const rightMost = canvas.images.reduce(
    (max, image) => Math.max(max, image.x + image.width),
    0
  );
  const anchorY = canvas.images[0]?.y ?? 0;
  const nextImage = createCanvasImageObject({
    image: input.image,
    blobUrl: input.blobUrl,
    assetId: input.assetId,
    x: rightMost + DEFAULT_GAP,
    y: anchorY,
  });
  return {
    ...canvas,
    images: [...canvas.images, nextImage],
    selectedImageId: nextImage.id,
  };
}

export function addCanvasImageObject(
  canvas: CanvasDocument,
  imageObject: CanvasImageObject
): CanvasDocument {
  const rightMost = canvas.images.reduce(
    (max, image) => Math.max(max, image.x + image.width),
    0
  );
  const anchorY = canvas.images[0]?.y ?? 0;
  const nextImage: CanvasImageObject = {
    ...imageObject,
    x: rightMost + DEFAULT_GAP,
    y: anchorY,
    sourceCrop: imageObject.sourceCrop ? { ...imageObject.sourceCrop } : null,
  };
  return {
    ...canvas,
    images: [...canvas.images, nextImage],
    selectedImageId: nextImage.id,
  };
}
