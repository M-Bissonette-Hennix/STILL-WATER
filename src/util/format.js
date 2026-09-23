export function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatLatency(ms) {
  if (!Number.isFinite(ms)) return '—';
  return `${(ms / 1000).toFixed(1)} sec`;
}

export function formatDateTime(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date);
}

export function formatStage(stage) {
  const map = {
    foundation: 'Foundation',
    association: 'Association',
    compression_1: 'Compression I',
    compression_2: 'Compression II',
    generalization: 'Generalization',
    robustification: 'Robustification',
    maintenance: 'Maintenance'
  };
  return map[stage] ?? stage;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
