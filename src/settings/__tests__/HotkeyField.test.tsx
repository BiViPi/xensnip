import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HotkeyField } from "../HotkeyField";

afterEach(() => {
  cleanup();
});

describe("HotkeyField", () => {
  it("ignores unmodified regular keys while listening", () => {
    const onChange = vi.fn();
    render(<HotkeyField value="Ctrl+Shift+S" onChange={onChange} />);

    fireEvent.click(screen.getByText("Ctrl+Shift+S"));
    expect(screen.getByText("Recording...")).toBeTruthy();

    for (const key of ["a", "1", " ", "ArrowUp"]) {
      fireEvent.keyDown(window, { key });
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText("Recording...")).toBeTruthy();
    }
  });

  it("records modifier-backed shortcuts", () => {
    const onChange = vi.fn();
    render(<HotkeyField value="Ctrl+Shift+S" onChange={onChange} />);

    fireEvent.click(screen.getByText("Ctrl+Shift+S"));
    fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith("Ctrl+Shift+A");
    expect(screen.queryByText("Recording...")).toBeNull();
  });

  it("allows standalone F1-F24 and PrintScreen keys without modifiers", () => {
    const onChange = vi.fn();
    const { rerender } = render(<HotkeyField value="Ctrl+Shift+S" onChange={onChange} />);

    for (const [inputKey, expected] of [
      ["F1", "F1"],
      ["F12", "F12"],
      ["F24", "F24"],
      ["PrintScreen", "PrintScreen"],
    ] as const) {
      rerender(<HotkeyField value="Ctrl+Shift+S" onChange={onChange} />);
      fireEvent.click(screen.getByText("Ctrl+Shift+S"));
      fireEvent.keyDown(window, { key: inputKey });
      expect(onChange).toHaveBeenLastCalledWith(expected);
    }
  });

  it("cancels listening on Escape without changing the shortcut", () => {
    const onChange = vi.fn();
    render(<HotkeyField value="Ctrl+Alt+W" onChange={onChange} />);

    fireEvent.click(screen.getByText("Ctrl+Alt+W"));
    expect(screen.getByText("Recording...")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Ctrl+Alt+W")).toBeTruthy();
  });
});
