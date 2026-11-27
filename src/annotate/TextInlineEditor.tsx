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

let activeTextFlushHandler: (() => void) | null = null;

/**
 * Synchronously commits any active inline text input to the annotation store
 * before export, copy, pin, or Flat/Studio mode switching reads objects.
 */
export function flushEditingText(): void {
  activeTextFlushHandler?.();
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
  const committedIdRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const contract = getTextEditableContract(objects.find((obj) => obj.id === editingTextId) || null);

  useEffect(() => {
    committedIdRef.current = null;
    if (!contract || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.select();
  }, [contract?.id]);

  const commitOnce = (value: string) => {
    if (!contract || committedIdRef.current === contract.id) return;
    committedIdRef.current = contract.id;
    onCloseRef.current(value);
  };

  useEffect(() => {
    if (!contract) return;
    const handler = () => {
      if (textareaRef.current && committedIdRef.current !== contract.id) {
        commitOnce(textareaRef.current.value);
      }
    };
    activeTextFlushHandler = handler;
    return () => {
      if (activeTextFlushHandler === handler) {
        activeTextFlushHandler = null;
      }
    };
  }, [contract?.id]);

  if (!contract || !overlay) {
    return null;
  }

  const isDefaultPlaceholder =
    contract.currentText === "Type here..." || contract.currentText === contract.placeholderText;

  return createPortal(
    <textarea
      key={contract.id}
      ref={textareaRef}
      defaultValue={isDefaultPlaceholder ? "" : contract.currentText}
      onBlur={(e) => commitOnce(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          committedIdRef.current = contract.id;
          onCancel();
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commitOnce(e.currentTarget.value);
        }
      }}
      placeholder={contract.placeholderText}
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
        textAlign: contract.textAlign,
        background: "transparent",
        border: "1px dashed rgba(99, 102, 241, 0.65)",
        padding: 0,
        margin: 0,
        outline: "none",
        resize: "none",
        overflow: "hidden",
        pointerEvents: "auto",
        zIndex: 1001,
        lineHeight: 1.15,
        display: "block",
      }}
    />,
    overlay
  );
}
