// El portal al pasado: aparece sobre la cámara (el presente), se agranda solo y te "absorbe"
// dentro de las fotos antiguas mientras la voz cuenta la historia. Al terminar, se cierra solo.
import { narrar, callar, frases, etiquetaRelacion, vibrar } from './core.js';
import { whoosh } from './sonido.js';

const SEGUNDOS_ANTES_DE_ENTRAR = 2.4;
const MIN_SEGUNDOS_POR_FOTO = 7;

let capa = null;
let abierto = null; // { cerrar }

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
    <div class="portal-aviso">Se abrió un portal al pasado…</div>
    <div class="portal-abajo">
      <div class="portal-puntos"></div>
      <p class="portal-subtitulo" aria-live="polite"></p>
      <div class="portal-credito"></div>
    </div>
    <button class="portal-cerrar" aria-label="Salir del portal">✕</button>`;
  document.body.append(capa);
}

// Abre el portal de un lugar. Devuelve una promesa que se resuelve cuando se cierra.
// Con { camara: false } el "presente" es lo que haya detrás (por ejemplo, la vista 3D).
export function abrirPortal(poi, { camara = true } = {}) {
  if (abierto) abierto.cerrar(true);
  if (!capa) crearCapa();
  const fotos = poi.fotosHistoricas;
  if (!fotos.length) return Promise.resolve();

  const $ = sel => capa.querySelector(sel);
  const video = $('video');
  const fotoHoy = $('.portal-presente-foto');
  const [imgA, imgB] = [$('.portal-foto.a'), $('.portal-foto.b')];
  let visible = imgA;
  let indice = 0;
  let stream = null;
  let cerrado = false;
  let temporizadorFotos = null;
  let ultimoCambio = Date.now();
  const temporizadores = [];

  return new Promise(resolve => {
    // ---------- Presente: la cámara (o una foto actual si no hay cámara) ----------
    video.hidden = true;
    const hoy = camara && poi.fotosActuales[0];
    fotoHoy.hidden = !hoy;
    if (hoy) fotoHoy.src = hoy.archivo;
    if (camara) navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(s => {
        if (cerrado) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s; video.srcObject = s; video.hidden = false; fotoHoy.hidden = true;
      })
      .catch(() => { /* sin cámara: queda la foto actual */ });

    // ---------- Pasado ----------
    $('.portal-lugar').textContent = poi.nombre;
    $('.portal-puntos').innerHTML = fotos.length > 1 ? fotos.map(() => '<i></i>').join('') : '';
    $('.portal-subtitulo').textContent = '';
    mostrarFoto(0, true);

    capa.className = `portal visible${camara ? '' : ' sin-camara'}`;
    requestAnimationFrame(() => capa.classList.add('abriendo'));
    vibrar([60, 40, 60]);
    document.body.style.overflow = 'hidden';

    // A los pocos segundos, el portal se agranda y te absorbe.
    temporizadores.push(setTimeout(entrar, SEGUNDOS_ANTES_DE_ENTRAR * 1000));

    function entrar() {
      if (cerrado) return;
      whoosh(true);
      capa.classList.add('adentro');
      const lineas = frases(poi.texto);
      const subt = $('.portal-subtitulo');
      subt.textContent = lineas[0];
      // Las fotos van pasando solas mientras dura la narración.
      temporizadores.push(setTimeout(() => {
        narrar(poi, avance => {
          // Subtítulo: la frase que corresponde a cuánto avanzó el audio
          const total = poi.texto.length;
          let acum = poi.nombre.length / (poi.nombre.length + total);
          const ajustado = Math.max(0, (avance - acum) / (1 - acum));
          let suma = 0;
          for (const l of lineas) {
            suma += l.length / total;
            if (ajustado <= suma) { if (subt.textContent !== l) subt.textContent = l; break; }
          }
          // Foto: reparte las fotos a lo largo de la narración
          const i = Math.min(fotos.length - 1, Math.floor(avance * fotos.length));
          if (i > indice) mostrarFoto(i);
        }).then(() => { if (!cerrado) temporizadores.push(setTimeout(() => cerrar(), 2500)); });
      }, 900));
      // Respaldo si no llega el avance de la narración (voz del navegador sin eventos)
      if (fotos.length > 1) {
        temporizadorFotos = setInterval(() => {
          if (Date.now() - ultimoCambio > MIN_SEGUNDOS_POR_FOTO * 1500) mostrarFoto((indice + 1) % fotos.length);
        }, 1000);
      }
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
      else { imgA.classList.toggle('activa', visible === imgA); imgB.classList.toggle('activa', visible === imgB); }
      $('.portal-anio').textContent = f.anio;
      $('.portal-relacion').textContent = `${f.titulo} · ${etiquetaRelacion(f)}`;
      $('.portal-credito').textContent = `${f.autor} · ${f.licencia}`;
      capa.querySelectorAll('.portal-puntos i').forEach((p, k) => p.classList.toggle('on', k === i));
    }

    // Tocar la foto = ver la siguiente
    capa.onclick = e => {
      if (e.target.closest('.portal-cerrar')) return cerrar();
      if (capa.classList.contains('adentro') && fotos.length > 1) mostrarFoto((indice + 1) % fotos.length);
      else if (!capa.classList.contains('adentro')) { temporizadores.forEach(clearTimeout); entrar(); }
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
      if (capa.classList.contains('adentro') && !rapido) whoosh(false);
      capa.classList.remove('adentro');
      setTimeout(() => {
        capa.classList.remove('abriendo');
        setTimeout(() => {
          capa.className = 'portal';
          stream?.getTracks().forEach(t => t.stop());
          video.srcObject = null;
          document.body.style.overflow = '';
          resolve();
        }, rapido ? 0 : 500);
      }, rapido ? 0 : 1100);
    }
    abierto = { cerrar };
  });
}

export const portalAbierto = () => !!abierto;
export function cerrarPortal() { abierto?.cerrar(); }

// Para precargar las fotos de un lugar antes de abrir el portal.
export function precargar(poi) {
  for (const f of poi.fotosHistoricas) { const i = new Image(); i.src = f.archivo; }
}
