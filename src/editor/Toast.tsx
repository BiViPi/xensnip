export interface ToastProps {
  message: string;
  type: "success" | "error";
}

export function Toast({ message, type }: ToastProps) {
  return (
    <div className={`editor-toast ${type}`}>
      {message}
    </div>
  );
}
