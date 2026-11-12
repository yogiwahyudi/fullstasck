// Membangkitkan audio demo ORIGINAL (sintesis nada sederhana) sebagai MP3.
// Hasil: storage/audio/song-N.mp3 (penuh, 30 dtk) dan storage/previews/preview-N.mp3 (cuplikan, 10 dtk).
// Jalankan: npm run generate:audio  (membutuhkan devDependency lamejs). File hasil sudah ikut di repo.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// lame.all.js adalah bundel browser yang mendefinisikan global `lamejs`; modul CommonJS-nya rusak di Node modern.
const lamejs = new Function(`${fs.readFileSync(require.resolve('lamejs/lame.all.js'), 'utf8')}; return lamejs;`)();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'storage');
fs.mkdirSync(path.join(root, 'audio'), { recursive: true });
fs.mkdirSync(path.join(root, 'previews'), { recursive: true });

const RATE = 44100;
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pent: [0, 2, 4, 7, 9],
};
// root = MIDI note, bpm, skala, bentuk gelombang
const SONGS = [
  { root: 60, bpm: 96, scale: 'major', wave: 'sine' },
  { root: 57, bpm: 78, scale: 'pent', wave: 'triangle' },
  { root: 55, bpm: 124, scale: 'minor', wave: 'square' },
  { root: 52, bpm: 110, scale: 'minor', wave: 'saw' },
  { root: 62, bpm: 88, scale: 'major', wave: 'triangle' },
  { root: 59, bpm: 84, scale: 'pent', wave: 'sine' },
  { root: 50, bpm: 70, scale: 'minor', wave: 'sine' },
  { root: 53, bpm: 132, scale: 'major', wave: 'saw' },
];

function osc(type, phase) {
  const p = phase - Math.floor(phase);
  switch (type) {
    case 'triangle': return 4 * Math.abs(p - 0.5) - 1;
    case 'square': return p < 0.5 ? 0.6 : -0.6;
    case 'saw': return 2 * p - 1;
    default: return Math.sin(2 * Math.PI * p);
  }
}

function synth(cfg, seconds, seed) {
  const total = RATE * seconds;
  const out = new Float32Array(total);
  const scale = SCALES[cfg.scale];
  const beat = 60 / cfg.bpm;
  let rnd = seed * 9301 + 49297;
  const next = () => ((rnd = (rnd * 9301 + 49297) % 233280) / 233280);
  let t = 0;
  let degree = 0;
  while (t < seconds) {
    const len = beat * (next() < 0.35 ? 1 : 0.5);
    degree = Math.max(0, Math.min(scale.length * 2 - 1, degree + Math.round((next() - 0.5) * 4)));
    const midi = cfg.root + scale[degree % scale.length] + 12 * Math.floor(degree / scale.length);
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const start = Math.floor(t * RATE);
    const n = Math.min(Math.floor(len * RATE), total - start);
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / 400) * Math.exp(-3 * (i / n));
      const ph = (i / RATE) * freq;
      out[start + i] += 0.35 * env * osc(cfg.wave, ph);
      out[start + i] += 0.12 * env * osc('sine', ph / 2); // sub-oktaf
    }
    t += len;
  }
  // fade-out singkat
  const fade = RATE * 0.3;
  for (let i = 0; i < fade; i++) out[total - 1 - i] *= i / fade;
  return out;
}

function encode(samples) {
  const enc = new lamejs.Mp3Encoder(1, RATE, 64);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 32000;
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (buf.length) chunks.push(Buffer.from(buf));
  }
  const end = enc.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

SONGS.forEach((cfg, idx) => {
  const n = idx + 1;
  const full = synth(cfg, 30, n);
  fs.writeFileSync(path.join(root, 'audio', `song-${n}.mp3`), encode(full));
  fs.writeFileSync(path.join(root, 'previews', `preview-${n}.mp3`), encode(full.subarray(0, RATE * 10)));
  console.log(`song-${n}.mp3 + preview-${n}.mp3`);
});

