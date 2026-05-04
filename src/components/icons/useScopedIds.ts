import { useId } from "react";

export function useScopedIds<T extends string>(keys: readonly T[]): Record<T, string> {
  const prefix = useId().replace(/:/g, "");

  return keys.reduce((acc, key) => {
    acc[key] = `${prefix}-${key}`;
    return acc;
  }, {} as Record<T, string>);
}
