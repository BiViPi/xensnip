import type { CropBounds } from "../editor/useCropTool";
import type { ScreenshotDocument } from "../editor/useScreenshotDocuments";

interface ActiveUnsavedState {
  objectsLength: number;
  cropBounds: CropBounds | null;
  undoLength: number;
  redoLength: number;
}

/**
 * Returns true if either the active editor shell state or any open session document
 * holds uncommitted annotations, crop selection, or undo/redo history.
 */
export function hasAnyUnsavedSessionChanges(
  active: ActiveUnsavedState,
  documents: Pick<ScreenshotDocument, "annotation" | "cropBounds" | "undoStack" | "redoStack">[],
): boolean {
  if (
    active.objectsLength > 0 ||
    active.cropBounds !== null ||
    active.undoLength > 0 ||
    active.redoLength > 0
  ) {
    return true;
  }

  return documents.some(
    (doc) =>
      doc.annotation.objects.length > 0 ||
      doc.cropBounds !== null ||
      doc.undoStack.length > 0 ||
      doc.redoStack.length > 0,
  );
}
