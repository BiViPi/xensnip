let historyRecorder: (() => void) | null = null;
let suspendDepth = 0;

export function registerHistoryRecorder(recorder: (() => void) | null) {
  historyRecorder = recorder;
}

export function recordHistorySnapshot() {
  if (suspendDepth > 0) return;
  historyRecorder?.();
}

export function withHistorySuspended<T>(fn: () => T): T {
  suspendDepth += 1;
  try {
    return fn();
  } finally {
    suspendDepth -= 1;
  }
}
