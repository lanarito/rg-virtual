// Música de fondo generada en el momento (no usa archivos): viento patagónico + acordes suaves
// + destellos. Baja sola cuando habla la narración. También hace el "whoosh" del portal.
import { leerAjuste, guardarAjuste } from './core.js';

let ctx = null;
let master = null;     // volumen general de la música
let fx = null;         // efectos (whoosh, campanita), no se silencian con la música
let temporizador = null;
let encendida = leerAjuste('musica', true);

const VOLUMEN = 0.16;
const VOLUMEN_NARRANDO = 0.045;

// Progresión tranquila (La menor – Fa – Do – Sol), en Hz.
const ACORDES = [
  [110.0, 220.0, 261.63, 329.63],
  [87.31, 174.61, 220.0, 261.63],
  [130.81, 196.0, 261.63, 329.63],
  [98.0, 196.0, 246.94, 293.66]
];
const PENTATONICA = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export function iniciarSonido() {
  if (ctx) { ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  fx = ctx.createGain();
  fx.gain.value = 0.5;
  fx.connect(ctx.destination);

  // Eco suave para que suene "mágico"
  const eco = ctx.createDelay(1.0);
  eco.delayTime.value = 0.42;
  const realim = ctx.createGain();
  realim.gain.value = 0.35;
  eco.connect(realim).connect(eco);
  eco.connect(master);
  master._eco = eco;

  crearViento();
  programar();
  temporizador = setInterval(programar, 1000);

  window.addEventListener('narracion:inicio', () => rampa(encendida ? VOLUMEN_NARRANDO : 0));
  window.addEventListener('narracion:fin', () => rampa(encendida ? VOLUMEN : 0));
  document.addEventListener('visibilitychange', () => (document.hidden ? ctx.suspend() : ctx.resume()));

  rampa(encendida ? VOLUMEN : 0, 3);
}

function rampa(valor, segundos = 0.8) {
  if (!ctx) return;
  const g = master.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(valor, ctx.currentTime + segundos);
}

export function musicaEncendida() { return encendida; }
export function alternarMusica() {
  encendida = !encendida;
  guardarAjuste('musica', encendida);
  rampa(encendida ? VOLUMEN : 0);
  return encendida;
}

function ruidoBlanco(segundos = 2) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function crearViento() {
  const src = ctx.createBufferSource();
  src.buffer = ruidoBlanco(4);
  src.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 500;
  filtro.Q.value = 0.8;
  const vol = ctx.createGain();
  vol.gain.value = 0.18;
  // Ráfagas: el filtro y el volumen suben y bajan lento
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 300;
  lfo.connect(lfoAmp).connect(filtro.frequency);
  const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
  const lfo2Amp = ctx.createGain(); lfo2Amp.gain.value = 0.1;
  lfo2.connect(lfo2Amp).connect(vol.gain);
  src.connect(filtro).connect(vol).connect(master);
  src.start(); lfo.start(); lfo2.start();
}

let proximoAcorde = 0;
let indiceAcorde = 0;
const DURACION_ACORDE = 8;

function programar() {
  const t = ctx.currentTime;
  if (proximoAcorde < t + 2) {
    const inicio = Math.max(proximoAcorde, t + 0.05);
    tocarAcorde(ACORDES[indiceAcorde % ACORDES.length], inicio);
    indiceAcorde++;
    proximoAcorde = inicio + DURACION_ACORDE;
  }
  if (Math.random() < 0.28) destello(t + Math.random());
}

function tocarAcorde(notas, t0) {
  const fin = t0 + DURACION_ACORDE + 3;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass'; filtro.frequency.value = 900;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.09, t0 + 3);
  env.gain.setValueAtTime(0.09, t0 + DURACION_ACORDE - 1);
  env.gain.linearRampToValueAtTime(0, fin);
  filtro.connect(env).connect(master);
  for (const f of notas) {
    for (const desafinado of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = desafinado;
      o.connect(filtro);
      o.start(t0); o.stop(fin);
    }
  }
}

function destello(t0) {
  const f = PENTATONICA[Math.floor(Math.random() * PENTATONICA.length)];
  const o = ctx.createOscillator();
  o.type = 'sine'; o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.035, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
  o.connect(g);
  g.connect(master); g.connect(master._eco);
  o.start(t0); o.stop(t0 + 2.3);
}

// Sonido de "absorción" al entrar al portal
export function whoosh(entrando = true) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = ruidoBlanco(2);
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass'; filtro.Q.value = 2;
  filtro.frequency.setValueAtTime(entrando ? 300 : 2500, t);
  filtro.frequency.exponentialRampToValueAtTime(entrando ? 2500 : 300, t + 1.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.9, t + 0.5);
  g.gain.linearRampToValueAtTime(0, t + 1.6);
  src.connect(filtro).connect(g).connect(fx);
  src.start(t); src.stop(t + 1.7);
  // Brillo ascendente
  [0, 0.12, 0.24, 0.36].forEach((d, i) => campana(PENTATONICA[(entrando ? i + 2 : 5 - i)], t + 0.3 + d, 0.12));
}

// Campanita de "llegaste a un lugar"
export function campanita() {
  if (!ctx) return;
  const t = ctx.currentTime;
  campana(659.25, t, 0.2);
  campana(987.77, t + 0.15, 0.18);
}

function campana(f, t0, vol) {
  const o = ctx.createOscillator();
  o.type = 'sine'; o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
  o.connect(g).connect(fx);
  o.start(t0); o.stop(t0 + 1.6);
}
