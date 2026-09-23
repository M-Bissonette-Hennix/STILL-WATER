export const KUJI = Object.freeze([
  { state: 'KUJI_RIN', ordinal: 1, name: 'RIN', kanji: '臨', mudra: 'Dokko-in' },
  { state: 'KUJI_PYO', ordinal: 2, name: 'PYŌ', kanji: '兵', mudra: 'Daikongō-in' },
  { state: 'KUJI_TO', ordinal: 3, name: 'TŌ', kanji: '闘', mudra: 'Sotojishi-in' },
  { state: 'KUJI_SHA', ordinal: 4, name: 'SHA', kanji: '者', mudra: 'Uchijishi-in' },
  { state: 'KUJI_KAI', ordinal: 5, name: 'KAI', kanji: '皆', mudra: 'Gebakuken-in' },
  { state: 'KUJI_JIN', ordinal: 6, name: 'JIN', kanji: '陣', mudra: 'Naibakuken-in' },
  { state: 'KUJI_RETSU', ordinal: 7, name: 'RETSU', kanji: '列', mudra: 'Chiken-in' },
  { state: 'KUJI_ZAI', ordinal: 8, name: 'ZAI', kanji: '在', mudra: 'Nichirin-in' },
  { state: 'KUJI_ZEN', ordinal: 9, name: 'ZEN', kanji: '前', mudra: 'Ongyō-in / lineage-specific Yin mudra' }
]);

export const TRAIN_TIMED_STATES = Object.freeze({
  REGULATE: 'regulate',
  STABILIZE: 'stabilize',
  RELEASE_COUNT: 'releaseCount',
  RELEASE_ANCHOR: 'releaseAnchor',
  OPEN: 'open',
  ENCODE: 'encode'
});

export const TRAIN_PHASE_CUES = Object.freeze({
  REGULATE: 'Quiet breath. Low and easy.',
  STABILIZE: 'Let the breath go. Feel. Count.',
  RELEASE_COUNT: 'Release the count.',
  RELEASE_ANCHOR: 'Release the anchor. Let the field open.',
  OPEN: 'Nothing excluded. Nothing followed.',
  ENCODE: 'Release. Widen. Still.',
  TRANSFER: 'Carry it into movement.'
});
