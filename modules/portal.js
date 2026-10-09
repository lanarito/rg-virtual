// El portal al pasado, en tres momentos:
//   1. HOY: cómo está el lugar ahora (cámara si estás ahí; si no, foto actual o Google Street View).
//   2. Se abre el anillo dorado con la foto antigua adentro.
//   3. ADENTRO: las fotos antiguas a pantalla completa mientras la voz cuenta la historia.
// Al terminar la narración se cierra solo.
import { narrar, callar, frases, etiquetaRelacion, vibrar, googleKey } from './core.js';
import { t } from './i18n.js';

const anio = a => (a === 's/f' ? t('anio.sf') : a);
import { whoosh } from './sonido.js';

const SEGUNDOS_HOY = 4.5;
const SEGUNDOS_ANILLO = 2.6;
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
    <button class="portal-cerrar" aria-label="${t('portal.salir')}">✕</button>`;
  document.body.append(capa);
}

// Imagen de "hoy": foto actual del lugar; si no hay, Google Street View (si hay clave).
function imagenDeHoy(poi) {
  const f = poi.fotosActuales[0];
  if (f) return { src: f.archivo, credito: `${t('portal.hoyCredito')} · ${f.autor} · ${f.licencia}` };
  const key = googleKey();
  if (poi.streetView && key) {
    const p = new URLSearchParams({
      size: '640x640', scale: '2', location: `${poi.lat},${poi.lon}`, fov: '80', pitch: String(poi.streetView.pitch ?? 5),
      source: 'outdoor', return_error_code: 'true', key
    });
    return { src: `https://maps.googleapis.com/maps/api/streetview?${p}`, credito: `${t('portal.hoyCredito')} · © Google Street View` };
  }
  return null;
}

// Abre el portal de un lugar. Devuelve una promesa que se resuelve cuando se cierra.
// Con { camara: false } no se usa la cámara del celular (por ejemplo, en el vuelo 3D).
export function abrirPortal(poi, { camara = true } = {}) {
  if (abierto) abierto.cerrar(true);
  if (!capa) crearCapa();
  const gen = ++generacion;
  const fotos = poi.fotosHistoricas;
  if (!fotos.length) return Promise.resolve();

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
  const temporizadores = [];
  const despues = (seg, fn) => temporizadores.push(setTimeout(fn, seg * 1000));

  return new Promise(resolve => {
    // ---------- 1. HOY ----------
    video.hidden = true;
    fotoHoy.hidden = true;
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
    subt.textContent = '';
    prepararFoto(0);

    capa.className = 'portal visible hoy';
    vibrar([60, 40, 60]);
    document.body.style.overflow = 'hidden';

    // La voz arranca enseguida y sigue durante todo el portal.
    despues(0.6, () => {
      narrar(poi, avance => {
        ultimoAvance = Date.now();
        // Posición en la narración medida en frases (por ejemplo 2.5 = mitad de la tercera frase)
        const total = poi.texto.length;
        const inicio = poi.nombre.length / (poi.nombre.length + total);
        const ajustado = Math.max(0, (avance - inicio) / (1 - inicio));
        let suma = 0, posicion = 0;
        for (let k = 0; k < lineas.length; k++) {
          const parte = lineas[k].length / total;
          if (ajustado <= suma + parte) {
            if (subt.textContent !== lineas[k]) subt.textContent = lineas[k];
            posicion = k + (ajustado - suma) / parte;
            break;
          }
          suma += parte;
          posicion = k + 1;
        }
        // Foto: la última cuyo momento ya llegó (cada foto dice en qué frase aparece)
        if (adentro) {
          let i = 0;
          inicios.forEach((d, k) => { if (d <= posicion) i = k; });
          if (i !== indice) mostrarFoto(i);
        }
      }).then(() => { if (!cerrado) despues(2.5, () => cerrar()); });
    });

    // ---------- 2. Se abre el anillo ----------
    despues(SEGUNDOS_HOY, abrirAnillo);
    function abrirAnillo() {
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
    }

    function mostrarFoto(i, inmediato = false) {
      indice = i;
      ultimoCambio = Date.now();
      const f = fotos[i];
      const siguiente = inmediato ? visible : (visible === imgA ? imgB : imgA);
      siguiente.src = f.archivo;
      siguiente.alt = f.titulo;
      siguiente.classList.remove('kenburns'); void siguiente.offsetWidth; siguiente.classList.add('kenburns');
      if (!inmediato) { siguiente.classList.add('activa'); visible.classList.remove('activa'); visible = siguiente; }
      $('.portal-anio').textContent = anio(f.anio);
      $('.portal-relacion').textContent = `${f.titulo} · ${etiquetaRelacion(f)}`;
      $('.portal-credito').textContent = `${f.autor} · ${f.licencia}`;
      capa.querySelectorAll('.portal-puntos i').forEach((p, k) => p.classList.toggle('on', k === i));
    }

    // Tocar = avanzar: de HOY al anillo, del anillo adentro, y adentro a la siguiente foto.
    capa.onclick = e => {
      if (e.target.closest('.portal-cerrar')) return cerrar();
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
      document.removeEventListener('keydown', teclas);
      callar();
      if (adentro && !rapido) whoosh(false);
      capa.classList.remove('adentro');
      const terminar = () => {
        stream?.getTracks().forEach(t => t.stop());
        if (gen === generacion) {
          capa.className = 'portal';
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
}
