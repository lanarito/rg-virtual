// El portal al pasado, en tres momentos:
//   1. HOY: cómo está el lugar ahora (cámara si estás ahí; si no, foto actual o Google Street View).
//   2. Se abre el anillo dorado con la foto antigua adentro.
//   3. ADENTRO: las fotos antiguas a pantalla completa mientras la voz cuenta la historia.
// Al terminar la narración se cierra solo (salvo que la persona use la realidad aumentada o saque una postal).
// Realidad aumentada: el anillo sigue el movimiento del celular, y con el botón ◐ se puede ver el pasado
// en una ventana sobre la calle actual o superpuesto como un fantasma. Con 📸 se arma una postal para compartir.
import { narrar, callar, frases, seguirVoz, etiquetaRelacion, vibrar, googleKey, conVersion, toast } from './core.js';
import { t } from './i18n.js';

const anio = a => (a === 's/f' ? t('anio.sf') : a === 'Hoy' ? t('portal.hoy') : a);
import { whoosh, sonidoFoto } from './sonido.js';

const MODOS_AR = ['normal', 'ventana', 'fantasma'];

const SEGUNDOS_HOY = 3.2;
const SEGUNDOS_ANILLO = 2.0;
const MIN_SEGUNDOS_POR_FOTO = 7;

let capa = null;
let abierto = null; // { cerrar }
let generacion = 0; // cada apertura tiene su número; un cierre viejo no toca un portal nuevo

function crearCapa() {
  capa = document.createElement('section');
  capa.className = 'portal';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.innerHTML = `
    <video class="portal-presente" playsinline muted autoplay></video>
    <img class="portal-presente portal-presente-foto" alt="">
    <div class="portal-pasado">
      <img class="portal-foto a" alt="">
      <img class="portal-foto b" alt="">
      <div class="portal-vineta"></div>
    </div>
    <div class="portal-anillo" aria-hidden="true"></div>
    <div class="portal-arriba">
      <div class="portal-anio"></div>
      <div class="portal-lugar"></div>
      <div class="portal-relacion"></div>
    </div>
    <div class="portal-aviso">${t('portal.seAbre')}</div>
    <div class="portal-abajo">
      <div class="portal-puntos"></div>
      <p class="portal-subtitulo" aria-live="polite"></p>
      <div class="portal-credito"></div>
    </div>
    <input class="portal-slider-fantasma" type="range" min="0" max="100" value="55" aria-label="${t('portal.mezcla')}">
    <div class="portal-botones">
      <button class="portal-btn portal-btn-foto" aria-label="${t('portal.foto')}" title="${t('portal.foto')}">📸</button>
      <button class="portal-btn portal-btn-ar" aria-label="${t('portal.ar')}" title="${t('portal.ar')}">◐</button>
    </div>
    <div class="portal-flash"></div>
    <button class="portal-cerrar" aria-label="${t('portal.salir')}">✕</button>`;
  document.body.append(capa);
  escudo.src = 'assets/marca/escudo-rio-gallegos.png';
}

// Escudo para la postal (se carga una sola vez)
const escudo = new Image();

// ---------- Giroscopio: el anillo queda "anclado" en el aire al mover el celular ----------
// Devuelve una función para apagarlo.
function seguirMovimiento() {
  let base = null, objetivo = { x: 0, y: 0 }, actual = { x: 0, y: 0 }, cuadro = 0;
  const limitar = v => Math.max(-1, Math.min(1, v));
  const orientacion = e => {
    if (e.gamma == null || e.beta == null) return;
    if (!base) base = { g: e.gamma, b: e.beta };
    // Si el celular gira a la derecha, el anillo se corre a la izquierda (como un objeto quieto en el aire)
    objetivo = { x: -limitar((e.gamma - base.g) / 25), y: -limitar((e.beta - base.b) / 25) };
  };
  const puntero = e => {
    if (e.pointerType !== 'mouse') return;
    objetivo = { x: limitar((e.clientX / innerWidth - 0.5) * 0.8), y: limitar((e.clientY / innerHeight - 0.5) * 0.8) };
  };
  const paso = () => {
    actual.x += (objetivo.x - actual.x) * 0.12;
    actual.y += (objetivo.y - actual.y) * 0.12;
    capa.style.setProperty('--px', `${50 + actual.x * 8}%`);
    capa.style.setProperty('--py', `${46 + actual.y * 8}%`);
    capa.style.setProperty('--dx', `${actual.x * 18}px`);
    capa.style.setProperty('--dy', `${actual.y * 18}px`);
    cuadro = requestAnimationFrame(paso);
  };
  addEventListener('deviceorientation', orientacion);
  addEventListener('pointermove', puntero);
  cuadro = requestAnimationFrame(paso);
  return () => {
    removeEventListener('deviceorientation', orientacion);
    removeEventListener('pointermove', puntero);
    cancelAnimationFrame(cuadro);
    ['--px', '--py', '--dx', '--dy'].forEach(v => capa.style.removeProperty(v));
  };
}

// iPhone pide permiso para usar el giroscopio, y solo se puede pedir al tocar un botón.
function pedirGiroscopio() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
}

// ---------- Postal: el presente, el portal al pasado y el sello de la ciudad ----------
const ANCHO = 1080, ALTO = 1440;

function dibujarCubriendo(c, img, x, y, w, h, fx = 0.5, fy = 0.5) {
  const iw = img.videoWidth || img.naturalWidth, ih = img.videoHeight || img.naturalHeight;
  if (!iw || !ih) return false;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  c.drawImage(img, (iw - sw) * fx, (ih - sh) * fy, sw, sh, x, y, w, h);
  return true;
}

const mismoOrigen = img => { try { return new URL(img.currentSrc || img.src, location.href).origin === location.origin; } catch { return false; } };

function lineasQueEntran(c, texto, ancho) {
  const palabras = String(texto).split(/\s+/); const lineas = []; let linea = '';
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (c.measureText(prueba).width > ancho && linea) { lineas.push(linea); linea = p; } else linea = prueba;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

// Arma la postal en un canvas y devuelve el JPEG.
function armarPostal({ poi, video, fotoHoy, pasado, foto, modo, opacidad }) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO; lienzo.height = ALTO;
  const c = lienzo.getContext('2d');
  const letra = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

  // 1. Fondo: la cámara, la foto de hoy (si es nuestra) o un degradé oscuro
  let hayFondo = false;
  if (!video.hidden && video.readyState >= 2) hayFondo = dibujarCubriendo(c, video, 0, 0, ANCHO, ALTO);
  else if (!fotoHoy.hidden && fotoHoy.complete && mismoOrigen(fotoHoy)) hayFondo = dibujarCubriendo(c, fotoHoy, 0, 0, ANCHO, ALTO);
  if (!hayFondo) {
    const g = c.createLinearGradient(0, 0, 0, ALTO);
    g.addColorStop(0, '#2d2318'); g.addColorStop(1, '#0d0a07');
    c.fillStyle = g; c.fillRect(0, 0, ANCHO, ALTO);
  }

  // 2. El pasado
  const cx = 540, cy = 640, r = 380;
  const hayPasado = pasado && pasado.complete && pasado.naturalWidth;
  if (hayPasado && modo === 'fantasma') {
    c.save(); c.globalAlpha = opacidad; c.filter = 'sepia(.35)';
    dibujarCubriendo(c, pasado, 0, 0, ANCHO, ALTO);
    c.restore();
  } else if (hayPasado) {
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#20170e'; c.fillRect(cx - r, cy - r, r * 2, r * 2);
    c.filter = 'sepia(.35)';
    dibujarCubriendo(c, pasado, cx - r, cy - r, r * 2, r * 2, 0.5, 0.6);
    c.restore();
  }
  if (hayPasado && modo !== 'fantasma' || !hayPasado) {
    // Anillo dorado doble con resplandor (o marco dorado si el lugar no tiene fotos antiguas)
    c.save();
    c.shadowColor = '#e8b04b'; c.shadowBlur = 40;
    c.strokeStyle = '#ffd98a'; c.lineWidth = 14;
    if (hayPasado) { c.beginPath(); c.arc(cx, cy, r + 8, 0, Math.PI * 2); c.stroke(); }
    else c.strokeRect(30, 30, ANCHO - 60, ALTO - 60);
    c.shadowBlur = 0; c.strokeStyle = '#e8b04b'; c.lineWidth = 4;
    if (hayPasado) { c.beginPath(); c.arc(cx, cy, r + 26, 0, Math.PI * 2); c.stroke(); }
    else c.strokeRect(50, 50, ANCHO - 100, ALTO - 100);
    c.restore();
  }

  // 3. Encabezado: año y lugar
  const arriba = c.createLinearGradient(0, 0, 0, 260);
  arriba.addColorStop(0, 'rgba(10,6,2,.85)'); arriba.addColorStop(1, 'rgba(10,6,2,0)');
  c.fillStyle = arriba; c.fillRect(0, 0, ANCHO, 260);
  c.textBaseline = 'top'; c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 16;
  c.fillStyle = '#ffd98a'; c.font = `800 110px ${letra}`;
  c.fillText(foto ? anio(foto.anio) : t('portal.hoy'), 60, 60);
  c.fillStyle = '#fff'; c.font = `700 46px ${letra}`;
  lineasQueEntran(c, poi.nombre, ANCHO - 120).slice(0, 2).forEach((l, i) => c.fillText(l, 60, 185 + i * 54));
  c.shadowBlur = 0;

  // 4. Zócalo: escudo, título, crédito y firma
  const y0 = 1150;
  c.fillStyle = 'rgba(14,10,6,.86)'; c.fillRect(0, y0, ANCHO, ALTO - y0);
  c.fillStyle = '#e8b04b'; c.fillRect(0, y0, ANCHO, 6);
  if (escudo.complete && escudo.naturalWidth) dibujarContenido(c, escudo, 50, y0 + 40, 170, 170);
  const xt = 250, wt = ANCHO - xt - 50;
  c.fillStyle = '#fff'; c.font = `700 38px ${letra}`;
  let y = y0 + 42;
  lineasQueEntran(c, foto ? foto.titulo : poi.nombre, wt).slice(0, 2).forEach(l => { c.fillText(l, xt, y); y += 46; });
  c.fillStyle = '#c9bca5'; c.font = `400 26px ${letra}`;
  if (foto) lineasQueEntran(c, `${foto.autor} · ${foto.licencia}`, wt).slice(0, 2).forEach(l => { c.fillText(l, xt, y + 4); y += 32; });
  c.fillStyle = '#ffd98a'; c.font = `700 30px ${letra}`;
  c.fillText(t('portal.firma'), xt, ALTO - 70);

  return new Promise(res => lienzo.toBlob(res, 'image/jpeg', 0.92));
}

function dibujarContenido(c, img, x, y, w, h) {
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
  c.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

async function compartirPostal(blob, poi) {
  const nombre = `portal-${poi.id}.jpg`;
  const archivo = new File([blob], nombre, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: poi.nombre }); return; }
    catch (e) { if (e.name === 'AbortError') return; /* si no se pudo compartir, se descarga */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// Imagen de "hoy": foto actual del lugar; si no hay, Google Street View (si hay clave).
function imagenDeHoy(poi) {
  const f = poi.fotosActuales[0];
  if (f) return { src: f.archivo, credito: `${t('portal.hoyCredito')} · ${f.autor} · ${f.licencia}` };
  const key = googleKey();
  if (poi.streetView && key) {
    const sv = poi.streetView;
    const p = new URLSearchParams({ size: '640x640', scale: '2', fov: String(sv.fov ?? 80), pitch: String(sv.pitch ?? 5), return_error_code: 'true', key });
    if (sv.pano) { p.set('pano', sv.pano); p.set('heading', String(sv.heading ?? 0)); }
    else { p.set('location', `${poi.lat},${poi.lon}`); p.set('source', 'outdoor'); }
    return { src: `https://maps.googleapis.com/maps/api/streetview?${p}`, credito: `${t('portal.hoyCredito')} · © Google Street View` };
  }
  return null;
}

// Saca las fotos del portal anterior, para que nunca se vea una foto vieja mientras carga la nueva.
function limpiarImagenes() {
  capa.querySelectorAll('.portal-presente-foto, .portal-foto').forEach(img => {
    img.removeAttribute('src');
    img.classList.remove('activa', 'actual', 'kenburns');
  });
  capa.querySelector('.portal-presente-foto').hidden = true;
}

// Abre el portal de un lugar. Devuelve una promesa que se resuelve cuando se cierra.
// Con { camara: false } no se usa la cámara del celular (por ejemplo, en el vuelo 3D).
export function abrirPortal(poi, { camara = true } = {}) {
  if (abierto) abierto.cerrar(true);
  if (!capa) crearCapa();
  const gen = ++generacion;
  const fotos = poi.fotosHistoricas;
  // Sin fotos antiguas: el portal muestra solo el HOY mientras narra (no se abre el anillo).

  const $ = sel => capa.querySelector(sel);
  const video = $('video');
  const fotoHoy = $('.portal-presente-foto');
  const [imgA, imgB] = [$('.portal-foto.a'), $('.portal-foto.b')];
  const subt = $('.portal-subtitulo');
  let visible = imgA;
  let indice = 0;
  let stream = null;
  let cerrado = false;
  let adentro = false;
  let temporizadorFotos = null;
  let ultimoCambio = Date.now();
  let modoAR = 'normal';
  let noCerrarSolo = false; // si la persona usa la AR o saca una postal, el portal espera a que lo cierre ella
  const slider = $('.portal-slider-fantasma');
  const apagarMovimiento = seguirMovimiento();
  const temporizadores = [];
  const despues = (seg, fn) => temporizadores.push(setTimeout(fn, seg * 1000));

  return new Promise(resolve => {
    // ---------- 1. HOY ----------
    video.hidden = true;
    limpiarImagenes();
    const hoy = imagenDeHoy(poi);
    let creditoHoy = hoy?.credito || '';
    if (hoy) {
      fotoHoy.onerror = () => { fotoHoy.hidden = true; };
      fotoHoy.src = hoy.src;
      fotoHoy.hidden = false;
      fotoHoy.classList.remove('kenburns'); void fotoHoy.offsetWidth; fotoHoy.classList.add('kenburns');
    }
    if (camara) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        .then(s => {
          if (cerrado) { s.getTracks().forEach(t => t.stop()); return; }
          stream = s; video.srcObject = s; video.hidden = false; fotoHoy.hidden = true;
          creditoHoy = `${t('portal.hoyCredito')} · ${t('portal.tuCamara')}`;
          if (!adentro) $('.portal-credito').textContent = creditoHoy;
        })
        .catch(() => { /* sin cámara: queda la foto de hoy */ });
    }

    $('.portal-lugar').textContent = poi.nombre;
    $('.portal-anio').textContent = t('portal.hoy');
    $('.portal-relacion').textContent = t('portal.asiEstaHoy');
    $('.portal-credito').textContent = creditoHoy;
    $('.portal-puntos').innerHTML = fotos.length > 1 ? fotos.map(() => '<i></i>').join('') : '';
    const lineas = frases(poi.texto);
    // En qué frase aparece cada foto: la marcada en los datos, o repartidas parejo.
    const inicios = fotos.map((f, k) => f.desdeFrase ?? (k * lineas.length) / fotos.length);
    let ultimoAvance = 0;
    const seguir = seguirVoz(poi.texto, poi.id, poi.nombre);
    subt.textContent = poi.nombre; // lo primero que dice la voz es el nombre del lugar
    if (fotos.length) prepararFoto(0);

    capa.className = 'portal visible hoy';
    capa.classList.toggle('sin-pasado', !fotos.length);
    slider.value = 55;
    capa.style.setProperty('--fantasma', '0.55');
    vibrar([60, 40, 60]);
    document.body.style.overflow = 'hidden';

    // La voz arranca en el segundo 0 y sigue durante todo el portal.
    {
      narrar(poi, (avance, segundos) => {
        ultimoAvance = Date.now();
        // Subtítulo que va con la voz, y posición medida en frases (por ejemplo 2.5 = mitad de la tercera)
        const { texto, posicion } = seguir(avance, segundos);
        if (texto && subt.textContent !== texto) subt.textContent = texto;
        // Foto: la última cuyo momento ya llegó (cada foto dice en qué frase aparece)
        if (adentro) {
          let i = 0;
          inicios.forEach((d, k) => { if (d <= posicion) i = k; });
          if (i !== indice) mostrarFoto(i);
        }
      }).then(() => { if (!cerrado) despues(2.5, () => { if (!noCerrarSolo) cerrar(); }); });
    }

    // ---------- 2. Se abre el anillo ----------
    if (fotos.length) despues(SEGUNDOS_HOY, abrirAnillo);
    function abrirAnillo() {
      if (!fotos.length) return;
      if (cerrado || capa.classList.contains('abriendo')) return;
      capa.classList.add('abriendo');
      $('.portal-anio').textContent = anio(fotos[0].anio);
      despues(SEGUNDOS_ANILLO, entrar);
    }

    // ---------- 3. Adentro ----------
    function entrar() {
      if (cerrado || adentro) return;
      adentro = true;
      whoosh(true);
      capa.classList.add('adentro');
      mostrarFoto(0, true);
      if (fotos.length > 1) {
        // Respaldo: si la voz no informa su avance, las fotos pasan solas.
        temporizadorFotos = setInterval(() => {
          if (Date.now() - ultimoAvance > 4000 && Date.now() - ultimoCambio > MIN_SEGUNDOS_POR_FOTO * 1000) mostrarFoto((indice + 1) % fotos.length);
        }, 1000);
      }
    }

    function prepararFoto(i) {
      visible = imgA;
      imgA.src = fotos[i].archivo; imgA.alt = fotos[i].titulo;
      imgA.classList.add('activa'); imgB.classList.remove('activa');
      imgA.classList.toggle('actual', fotos[i].anio === 'Hoy');
    }

    function mostrarFoto(i, inmediato = false) {
      indice = i;
      ultimoCambio = Date.now();
      const f = fotos[i];
      const siguiente = inmediato ? visible : (visible === imgA ? imgB : imgA);
      siguiente.src = f.archivo;
      siguiente.alt = f.titulo;
      siguiente.classList.toggle('actual', f.anio === 'Hoy');
      siguiente.classList.remove('kenburns'); void siguiente.offsetWidth; siguiente.classList.add('kenburns');
      if (!inmediato) { siguiente.classList.add('activa'); visible.classList.remove('activa'); visible = siguiente; }
      $('.portal-anio').textContent = anio(f.anio);
      $('.portal-relacion').textContent = `${f.titulo} · ${etiquetaRelacion(f)}`;
      $('.portal-credito').textContent = `${f.autor} · ${f.licencia}`;
      capa.querySelectorAll('.portal-puntos i').forEach((p, k) => p.classList.toggle('on', k === i));
    }

    // ---------- Realidad aumentada: normal → ventana → fantasma ----------
    function cambiarModoAR() {
      noCerrarSolo = true;
      pedirGiroscopio();
      if (!adentro) entrar();
      modoAR = MODOS_AR[(MODOS_AR.indexOf(modoAR) + 1) % MODOS_AR.length];
      capa.classList.toggle('ar-ventana', modoAR === 'ventana');
      capa.classList.toggle('ar-fantasma', modoAR === 'fantasma');
      toast(t(`portal.ar.${modoAR}`), 2200);
    }
    slider.oninput = () => { noCerrarSolo = true; capa.style.setProperty('--fantasma', String(slider.value / 100)); };

    // ---------- Postal ----------
    let sacando = false;
    async function sacarPostal() {
      if (sacando) return;
      sacando = true; noCerrarSolo = true;
      sonidoFoto();
      const flash = $('.portal-flash');
      flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
      try {
        const conPasado = fotos.length && (adentro || capa.classList.contains('abriendo'));
        const blob = await armarPostal({
          poi, video, fotoHoy, pasado: conPasado ? visible : null, foto: conPasado ? fotos[indice] : null,
          modo: modoAR, opacidad: slider.value / 100
        });
        await compartirPostal(blob, poi);
        toast(t('portal.postalLista'));
      } catch (e) { console.warn('No se pudo armar la postal', e); }
      sacando = false;
    }

    // Tocar = avanzar: de HOY al anillo, del anillo adentro, y adentro a la siguiente foto.
    capa.onclick = e => {
      if (e.target.closest('.portal-cerrar')) return cerrar();
      if (e.target.closest('.portal-btn-ar')) return cambiarModoAR();
      if (e.target.closest('.portal-btn-foto')) return sacarPostal();
      if (e.target.closest('.portal-slider-fantasma')) return;
      if (adentro) { if (fotos.length > 1) mostrarFoto((indice + 1) % fotos.length); }
      else if (capa.classList.contains('abriendo')) entrar();
      else abrirAnillo();
    };
    const teclas = e => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', teclas);

    function cerrar(rapido = false) {
      if (cerrado) return;
      cerrado = true;
      abierto = null;
      temporizadores.forEach(clearTimeout);
      clearInterval(temporizadorFotos);
      apagarMovimiento();
      document.removeEventListener('keydown', teclas);
      callar();
      if (adentro && !rapido) whoosh(false);
      capa.classList.remove('adentro', 'ar-ventana', 'ar-fantasma');
      const terminar = () => {
        stream?.getTracks().forEach(t => t.stop());
        if (gen === generacion) {
          capa.className = 'portal';
          limpiarImagenes();
          video.srcObject = null;
          document.body.style.overflow = '';
        }
        resolve();
      };
      if (rapido) return terminar();
      setTimeout(() => {
        if (gen === generacion) capa.classList.remove('abriendo');
        setTimeout(terminar, 500);
      }, 1100);
    }
    abierto = { cerrar };
  });
}

export const portalAbierto = () => !!abierto;
export function cerrarPortal() { abierto?.cerrar(); }

// Para precargar las fotos de un lugar antes de abrir el portal.
export function precargar(poi) {
  for (const f of [...poi.fotosActuales.slice(0, 1), ...poi.fotosHistoricas]) { const i = new Image(); i.src = f.archivo; }
  if (poi.audio) { const a = new Audio(); a.preload = 'auto'; a.src = conVersion(poi.audio); }
}
