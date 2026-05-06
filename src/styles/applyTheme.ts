import { ThemeMode } from "../ipc/types";

/**
 * Applies the given theme to the document root.
 * This sets the 'data-theme' attribute on the <html> element,
 * which triggers the scoped CSS variables in visual-tokens.css.
 */
export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('xensnip-theme', theme);
}
