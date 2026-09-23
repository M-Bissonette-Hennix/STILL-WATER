export async function requestWakeLock(enabled = true) {
  if (!enabled || !navigator?.wakeLock?.request) return null;
  try { return await navigator.wakeLock.request('screen'); }
  catch { return null; }
}

export async function releaseWakeLock(lock) {
  if (!lock) return;
  try { await lock.release(); } catch { /* no-op */ }
}

export function prefersReducedMotion(override = null) {
  if (override === true) return true;
  if (override === false) return false;
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function isStandalone() {
  return globalThis.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function downloadText(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
