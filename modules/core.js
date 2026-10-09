// Funciones compartidas por todos los módulos: datos, ajustes, narración, GPS y fichas.

let datosCache = null;

export async function cargarDatos() {
  if (!datosCache) {
    const r = await fetch('data/pois.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('No se pudo leer data/pois.json');
    datosCache = await r.json();
  }
  return datosCache;
}

export function buscarPoi(datos, id) {
  return datos.pois.find(p => p.id === id);
}

// ---------- Ajustes (localStorage, puede fallar en modo privado) ----------
const PREFIJO = 'rgv.';
export function leerAjuste(clave, porDefecto = null) {
  try {
    const v = localStorage.getItem(PREFIJO + clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch { return porDefecto; }
}
export function guardarAjuste(clave, valor) {
  try {
    if (valor === null || valor === '') localStorage.removeItem(PREFIJO + clave);
    else localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
  } catch { /* sin almacenamiento */ }
}
export const googleKey = () => leerAjuste('googleKey', '');

// ---------- Utilidades ----------
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg, ms = 2600) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

export function vibrar(patron = [80, 60, 80]) {
  try { navigator.vibrate?.(patron); } catch { /* nada */ }
}

// ---------- Geografía ----------
const rad = g => g * Math.PI / 180;
export function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function rumbo(lat1, lon1, lat2, lon2) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
export function textoDistancia(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

// Sigue la posición del usuario. Devuelve una función para dejar de seguir.
export function seguirPosicion(onPos, onError) {
  if (!('geolocation' in navigator)) { onError?.(new Error('Este navegador no tiene GPS')); return () => {}; }
  const id = navigator.geolocation.watchPosition(
    p => onPos({ lat: p.coords.latitude, lon: p.coords.longitude, precision: p.coords.accuracy }),
    e => onError?.(e),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

// ---------- Narración ----------
// Avisa con eventos 'narracion:inicio' / 'narracion:fin' (la música baja sola) y, si se pide,
// informa el avance (0 a 1) para mostrar subtítulos.
let audioActual = null;
let idNarracion = 0;

// Voz del navegador (solo de respaldo): primero argentina, después latinoamericana; la de España, última.
const ORDEN_ACENTOS = ['es-AR', 'es-UY', 'es-419', 'es-US', 'es-MX', 'es-CL', 'es-CO'];
function elegirVoz() {
  const voces = speechSynthesis.getVoices().filter(v => v.lang?.replace('_', '-').startsWith('es'));
  const preferida = leerAjuste('voz', '');
  const lang = v => v.lang.replace('_', '-');
  return voces.find(v => v.name === preferida)
    || ORDEN_ACENTOS.map(l => voces.find(v => lang(v) === l)).find(Boolean)
    || voces.find(v => lang(v) !== 'es-ES')
    || voces[0];
}

// La voz grabada (mp3, Elena de Argentina) se usa salvo que el usuario elija la del navegador.
const usarGrabada = () => leerAjuste('vozGrabada', true);
const avisar = nombre => window.dispatchEvent(new Event(nombre));

function reproducir(src, texto, onProgreso) {
  callar();
  const id = ++idNarracion;
  avisar('narracion:inicio');
  const terminar = resolve => () => { if (id === idNarracion) avisar('narracion:fin'); resolve(); };
  if (!src || !usarGrabada()) return hablarInterno(texto, onProgreso).then(() => { if (id === idNarracion) avisar('narracion:fin'); });
  return new Promise(resolve => {
    const a = new Audio(src);
    audioActual = a;
    a.playbackRate = leerAjuste('velocidad', 1);
    const fin = terminar(resolve);
    const respaldo = () => { if (audioActual === a) hablarInterno(texto, onProgreso).then(fin); else fin(); };
    if (onProgreso) a.ontimeupdate = () => a.duration && onProgreso(a.currentTime / a.duration);
    a.onended = fin;
    a.onerror = respaldo;
    a.play().catch(respaldo);
  });
}

// Frases cortas de la app, grabadas en assets/audio/frase-<clave>.mp3
export function frase(clave, texto) {
  return reproducir(`assets/audio/frase-${clave}.mp3`, texto);
}

// Usa el mp3 del POI si existe; si no, lee el texto con la voz del navegador.
export function narrar(poi, onProgreso) {
  return reproducir(poi.audio, `${poi.nombre}. ${poi.texto}`, onProgreso);
}

export function vocesEspanol() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith('es'));
}

export function callar() {
  idNarracion++;
  try { speechSynthesis.cancel(); } catch { /* nada */ }
  if (audioActual) { audioActual.pause(); audioActual = null; }
  avisar('narracion:fin');
}

function hablarInterno(texto, onProgreso) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-AR';
    const voz = elegirVoz();
    if (voz) { u.voice = voz; u.lang = voz.lang; }
    u.rate = leerAjuste('velocidad', 1);
    if (onProgreso) u.onboundary = e => onProgreso(e.charIndex / texto.length);
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export function hablar(texto) {
  return reproducir(null, texto);
}

// Parte un texto en frases para mostrarlas como subtítulos.
export function frases(texto) {
  return texto.match(/[^.!?]+[.!?]*/g)?.map(f => f.trim()).filter(Boolean) || [texto];
}

// ---------- Fichas ----------
// "lugar" = la foto es de este sitio; "epoca" = misma historia, otro lugar.
export function etiquetaRelacion(f) {
  return f.relacion === 'epoca' ? 'foto de época' : 'foto de este lugar';
}

export function creditoHTML(f) {
  return `<span class="credito">${esc(f.autor)} · ${esc(f.licencia)} · <a href="${esc(f.fuente)}" target="_blank" rel="noopener">fuente</a></span>`;
}

export function fichaHTML(poi, datos, { acciones = '' } = {}) {
  const cat = datos.categorias[poi.categoria] || {};
  const figs = [
    ...poi.fotosHistoricas.map(f => `<figure class="hist"><img loading="lazy" src="${esc(f.archivo)}" alt="${esc(f.titulo)}"><figcaption><b>${esc(f.anio)}</b> · ${esc(f.titulo)} <i>(${esc(etiquetaRelacion(f))})</i><br>${creditoHTML(f)}</figcaption></figure>`),
    ...poi.fotosActuales.map(f => `<figure><img loading="lazy" src="${esc(f.archivo)}" alt="${esc(f.titulo)}"><figcaption>Hoy · ${esc(f.titulo)}<br>${creditoHTML(f)}</figcaption></figure>`)
  ].join('');
  return `<div class="ficha">
    <div class="cat">${esc(cat.icono || '')} ${esc(cat.nombre || poi.categoria)}</div>
    <h2>${esc(poi.nombre)}</h2>
    ${figs ? `<div class="fotos">${figs}</div>` : ''}
    <p class="texto">${esc(poi.texto)}</p>
    ${poi.verificado ? '' : '<div class="aviso">⚠ Texto y ubicación pendientes de verificar con fuentes locales.</div>'}
    <div class="row">
      <button class="btn small" data-accion="narrar">🔊 Escuchar</button>
      ${poi.portal ? `<a class="btn small sepia" href="portal.html?poi=${encodeURIComponent(poi.id)}">🌀 Portal al pasado</a>` : ''}
      ${acciones}
    </div>
  </div>`;
}

// Crea (una vez) el panel inferior y devuelve funciones para abrirlo/cerrarlo.
export function crearHoja() {
  const hoja = document.createElement('section');
  hoja.className = 'sheet';
  hoja.innerHTML = '<div class="grab"></div><button class="close" aria-label="Cerrar">×</button><div class="contenido"></div>';
  document.body.append(hoja);
  const contenido = hoja.querySelector('.contenido');
  let poiActual = null;
  hoja.querySelector('.close').onclick = () => cerrar();
  hoja.addEventListener('click', e => {
    const b = e.target.closest('[data-accion="narrar"]');
    if (b && poiActual) narrar(poiActual);
  });
  function abrir(poi, html) { poiActual = poi; contenido.innerHTML = html; hoja.scrollTop = 0; hoja.classList.add('open'); }
  function cerrar() { hoja.classList.remove('open'); callar(); poiActual = null; }
  return { abrir, cerrar, elemento: hoja, contenido };
}

export function parametro(nombre) {
  return new URLSearchParams(location.search).get(nombre);
}
