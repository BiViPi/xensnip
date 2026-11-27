import type Konva from 'konva';

export function isTransformerNode(node: Konva.Node | null): boolean {
  let cur: Konva.Node | null = node;
  while (cur) {
    if (cur.className === 'Transformer') return true;
    cur = typeof cur.getParent === 'function' ? cur.getParent() : null;
  }
  return false;
}

export function findDraggableAnnotationTarget(
  node: Konva.Node | null,
  knownIds?: ReadonlySet<string>
): { isDraggable: boolean; objectId: string | null } {
  let cur: Konva.Node | null = node;
  let isDraggable = false;
  let objectId: string | null = null;

  while (cur && cur.className !== 'Layer' && cur.className !== 'Stage') {
    if (typeof cur.draggable === 'function' && cur.draggable()) {
      isDraggable = true;
    }
    if (!objectId && typeof cur.id === 'function') {
      const id = cur.id();
      if (id && (!knownIds || knownIds.has(id))) {
        objectId = id;
      }
    }
    cur = typeof cur.getParent === 'function' ? cur.getParent() : null;
  }

  return { isDraggable, objectId };
}
