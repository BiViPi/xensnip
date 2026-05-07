import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnnotateObject } from "./state/types";
import { getTextEditableContract } from "./state/textEditable";

interface TextInlineEditorProps {
  editingTextId: string | null;
  objects: AnnotateObject[];
  overlay: Element | null;
  scale: number;
  onClose: (value: string) => void;
  onCancel: () => void;
}

export function TextInlineEditor({
  editingTextId,
  objects,
  overlay,
  scale,
  onClose,
  onCancel,
}: TextInlineEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contract = getTextEditableContract(objects.find((obj) => obj.id === editingTextId) || null);

  useEffect(() => {
    if (!contract || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.select();
  }, [contract?.id]);

  if (!contract || !overlay) {
    return null;
  }

  return createPortal(
    <textarea
      ref={textareaRef}
      defaultValue={contract.currentText === "Type here..." ? "" : contract.currentText}
      onBlur={(e) => onClose(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          onCancel();
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onClose(e.currentTarget.value);
        }
      }}
      placeholder="Type here..."
      style={{
        position: "absolute",
        left: `${contract.overlayX * scale}px`,
        top: `${contract.overlayY * scale}px`,
        width: contract.fixedSize ? `${contract.overlayWidth * scale}px` : undefined,
        height: contract.fixedSize ? `${contract.overlayHeight * scale}px` : undefined,
        minWidth: !contract.fixedSize ? `${contract.overlayWidth * scale}px` : undefined,
        minHeight: !contract.fixedSize ? `${contract.overlayHeight * scale}px` : undefined,
        fontSize: `${contract.fontSize * scale}px`,
        fontFamily: contract.fontFamily,
        color: contract.textColor,
        background: "transparent",
        border: "1px dashed rgba(99, 102, 241, 0.65)",
        padding: 0,
        margin: 0,
        outline: "none",
        resize: "none",
        overflow: "hidden",
        pointerEvents: "auto",
        zIndex: 1001,
        lineHeight: 1.1,
        display: "block",
      }}
    />,
    overlay
  );
}
