let historyRecorder: (() => void) | null = null;
let suspendDepth = 0;
let gestureDepth = 0;
let gestureSnapshotRecorded = false;

export function registerHistoryRecorder(recorder: (() => void) | null) {
  historyRecorder = recorder;
}

export function recordHistorySnapshot() {
  if (suspendDepth > 0) return;
  if (gestureDepth > 0) {
    if (gestureSnapshotRecorded) return;
    gestureSnapshotRecorded = true;
  }
  historyRecorder?.();
}

export function beginHistoryGesture() {
  if (gestureDepth === 0) {
    gestureSnapshotRecorded = false;
  }
  gestureDepth += 1;
}

export function endHistoryGesture() {
  if (gestureDepth <= 0) return;
  gestureDepth -= 1;
  if (gestureDepth === 0) {
    gestureSnapshotRecorded = false;
  }
}

export function resetHistoryGestures() {
  gestureDepth = 0;
  gestureSnapshotRecorded = false;
}

export function withHistorySuspended<T>(fn: () => T): T {
  suspendDepth += 1;
  try {
    return fn();
  } finally {
    suspendDepth -= 1;
  }
}
