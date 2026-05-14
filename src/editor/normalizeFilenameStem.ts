const WINDOWS_RESERVED = /[\\/:*?"<>|]/g;
const CONTROL_CHARS = /[\x00-\x1f]/g;
const TRAILING_DOTS_SPACES = /[. ]+$/;
const RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

export function normalizeFilenameStem(raw: string): string {
  let name = raw
    .trim()
    .replace(WINDOWS_RESERVED, "_")
    .replace(CONTROL_CHARS, "")
    .replace(TRAILING_DOTS_SPACES, "");

  // The UI is stem-first. Strip common typed image extensions to avoid `name.png.jpg`.
  name = name.replace(/\.(png|jpg|jpeg|webp)$/i, "");

  if (RESERVED_NAMES.test(name)) {
    name = `_${name}`;
  }

  return name.slice(0, 120);
}
