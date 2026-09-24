export const KUJI = Object.freeze([
  { state: 'KUJI_RIN', ordinal: 1, name: 'RIN', kanji: '臨', mudra: 'Dokko-in', image: './assets/kuji/01-rin.jpg' },
  { state: 'KUJI_PYO', ordinal: 2, name: 'PYŌ', kanji: '兵', mudra: 'Daikongō-in', image: './assets/kuji/02-pyo.jpg' },
  { state: 'KUJI_TO', ordinal: 3, name: 'TŌ', kanji: '闘', mudra: 'Sotojishi-in', image: './assets/kuji/03-to.jpg' },
  { state: 'KUJI_SHA', ordinal: 4, name: 'SHA', kanji: '者', mudra: 'Uchijishi-in', image: './assets/kuji/04-sha.jpg' },
  { state: 'KUJI_KAI', ordinal: 5, name: 'KAI', kanji: '皆', mudra: 'Gebakuken-in', image: './assets/kuji/05-kai.jpg' },
  { state: 'KUJI_JIN', ordinal: 6, name: 'JIN', kanji: '陣', mudra: 'Naibakuken-in', image: './assets/kuji/06-jin.jpg' },
  { state: 'KUJI_RETSU', ordinal: 7, name: 'RETSU', kanji: '列', mudra: 'Chiken-in', image: './assets/kuji/07-retsu.jpg' },
  { state: 'KUJI_ZAI', ordinal: 8, name: 'ZAI', kanji: '在', mudra: 'Nichirin-in', image: './assets/kuji/08-zai.jpg' },
  { state: 'KUJI_ZEN', ordinal: 9, name: 'ZEN', kanji: '前', mudra: 'Ongyō-in / lineage-specific Yin mudra', image: './assets/kuji/09-zen.jpg' }
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
