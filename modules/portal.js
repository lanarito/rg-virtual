import {
  cargarDatos, buscarPoi, parametro, seguirPosicion, distancia, textoDistancia, rumbo,
  iniciarBrujula, narrar, frase, callar, vibrar, toast, esc, etiquetaRelacion
} from './core.js';

const AFRAME_URL = 'https://cdn.jsdelivr.net/npm/aframe@1.8.0/dist/aframe-v1.8.0.min.js';
const $ = id => document.getElementById(id);

const datos = await cargarDatos();
const conPortal = datos.pois.filter(p => p.portal && p.fotosHistoricas.length);
const poi = buscarPoi(datos, parametro('poi'));
let indiceFoto = 0;
const fotoActual = () => poi.fotosHistoricas[indiceFoto];

if (!poi || !poi.portal) mostrarLista();
else prepararLlegada(poi);

// ---------- 1. Lista de lugares con portal ----------
function mostrarLista() {
  $('secLista').hidden = false;
  $('lista').innerHTML = conPortal.map(p => {
    const f = p.fotosHistoricas[0];
    const anios = [...new Set(p.fotosHistoricas.map(x => x.anio))].sort().join(', ');
    return `<a class="item" data-id="${esc(p.id)}" href="portal.html?poi=${encodeURIComponent(p.id)}">
      <img src="${esc(f.archivo)}" alt="" loading="lazy">
      <div><b>${esc(p.nombre)}</b><br><small>Viajá a ${esc(anios)} · <span data-dist="${p.id}">calculando distancia…</span></small></div>
    </a>`;
  }).join('');
  let ordenado = false;
  const parar = seguirPosicion(pos => {
    const dist = new Map(conPortal.map(p => [p.id, distancia(pos.lat, pos.lon, p.lat, p.lon)]));
    for (const p of conPortal) {
      const el = document.querySelector(`[data-dist="${p.id}"]`);
      if (el) el.textContent = `a ${textoDistancia(dist.get(p.id))}`;
    }
    // La primera vez, ordena la lista: el lugar más cercano arriba.
    if (!ordenado) {
      ordenado = true;
      [...$('lista').children].sort((a, b) => dist.get(a.dataset.id) - dist.get(b.dataset.id)).forEach(el => $('lista').append(el));
    }
  }, () => document.querySelectorAll('[data-dist]').forEach(el => { el.textContent = 'sin GPS'; }));
  addEventListener('pagehide', parar);
}

// ---------- 2. Llegada: esperar a estar cerca (o simular) ----------
async function prepararLlegada(poi) {
  $('secLlegada').hidden = false;
  document.title = `Portal · ${poi.nombre}`;
  $('nombreLugar').textContent = poi.nombre;
  $('prevFoto').src = fotoActual().archivo;
  $('prevFoto').alt = fotoActual().titulo;

  // Si sabemos desde dónde se sacó la foto, guiamos hasta ese punto exacto.
  const t = fotoActual().tomada || {};
  const destino = t.lat != null ? { lat: t.lat, lon: t.lon } : { lat: poi.lat, lon: poi.lon };
  const radio = poi.radio || 60;

  let yaListo = false;
  const marcarListo = () => {
    if (yaListo) return;
    yaListo = true;
    $('listo').hidden = false;
    $('instruccion').textContent = 'Llegaste.';
    $('distancia').classList.add('cerca');
    vibrar();
  };

  const parar = seguirPosicion(pos => {
    const d = distancia(pos.lat, pos.lon, destino.lat, destino.lon);
    $('distancia').textContent = textoDistancia(d);
    if (d <= radio) marcarListo();
    else if (!yaListo) $('instruccion').textContent = `Caminá hacia el ${puntoCardinal(rumbo(pos.lat, pos.lon, destino.lat, destino.lon))}. El portal se abre a menos de ${radio} m.`;
  }, e => {
    $('instruccion').textContent = `No pude usar el GPS (${e.message}). Podés simular que estás en el lugar.`;
  });
  addEventListener('pagehide', parar);

  $('btnSimular').onclick = () => { $('distancia').textContent = '0 m (simulado)'; marcarListo(); };
  $('btnVentana').onclick = abrirVentana;

  // ¿El celu soporta realidad aumentada WebXR? (Android + Chrome con ARCore)
  const soportaAR = await navigator.xr?.isSessionSupported?.('immersive-ar').catch(() => false);
  if (soportaAR) {
    $('btnAR').hidden = false;
    $('notaAR').textContent = 'Realidad aumentada: vas a poner el portal en el piso y cruzarlo caminando.';
    cargarAFrame().catch(() => { $('btnAR').hidden = true; });
  } else {
    $('notaAR').textContent = 'Este navegador no soporta realidad aumentada WebXR. El modo ventana funciona igual.';
  }
  $('btnAR').onclick = entrarAR;
}

function puntoCardinal(g) {
  return ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(g / 45) % 8];
}

// ---------- 3A. Modo ventana: cámara de fondo + foto antigua ----------
let modoCortina = false;
let streamCamara = null;

async function abrirVentana() {
  $('ventana').classList.add('on');
  mostrarFotoVentana();
  $('btnOtraFoto').hidden = poi.fotosHistoricas.length < 2;

  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    $('video').srcObject = streamCamara;
    $('video').hidden = false; $('fondoActual').hidden = true;
  } catch {
    // Sin cámara (por ejemplo en la compu): usamos una foto actual del lugar como "hoy".
    $('video').hidden = true;
    const hoy = poi.fotosActuales[0];
    if (hoy) { $('fondoActual').src = hoy.archivo; $('fondoActual').hidden = false; }
    toast('Sin cámara: muestro una foto actual como "hoy"');
  }

  const ok = await iniciarBrujula(actualizarBrujula);
  $('brujula').hidden = !ok;
  narrar(poi);
}

function mostrarFotoVentana() {
  const f = fotoActual();
  $('fotoPasado').src = f.archivo;
  $('fotoPasado').alt = f.titulo;
  $('tituloFoto').textContent = `${f.anio} · ${f.titulo}`;
  $('anioSlider').textContent = f.anio;
  $('creditoFoto').innerHTML = `<b>${esc(etiquetaRelacion(f))}</b> · ${esc(f.autor)} · ${esc(f.licencia)}${f.nota ? ` · ${esc(f.nota)}` : ''}`;
  aplicarSlider();
}

function aplicarSlider() {
  const v = +$('sliderTiempo').value;
  const img = $('fotoPasado');
  const linea = $('lineaCortina');
  if (modoCortina) {
    img.classList.add('cortina');
    img.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    linea.style.display = 'block';
    linea.style.left = `calc(${v}% - 1px)`;
  } else {
    img.classList.remove('cortina');
    img.style.clipPath = '';
    img.style.opacity = v / 100;
    linea.style.display = 'none';
  }
}

function actualizarBrujula(h) {
  const objetivo = fotoActual().tomada?.rumbo;
  let txt = `🧭 ${Math.round(h)}° ${puntoCardinal(h)}`;
  if (objetivo != null) {
    const dif = ((objetivo - h + 540) % 360) - 180;
    txt += Math.abs(dif) < 12 ? ' · ✓ Alineado con la foto' : ` · girá ${Math.abs(Math.round(dif))}° a la ${dif > 0 ? 'derecha' : 'izquierda'}`;
  }
  $('brujula').textContent = txt;
}

$('sliderTiempo').oninput = aplicarSlider;
$('btnModo').onclick = () => {
  modoCortina = !modoCortina;
  $('btnModo').textContent = modoCortina ? '◐ Fundido' : '↔ Cortina';
  $('sliderTiempo').value = modoCortina ? 50 : 65;
  aplicarSlider();
};
$('btnOtraFoto').onclick = () => {
  indiceFoto = (indiceFoto + 1) % poi.fotosHistoricas.length;
  mostrarFotoVentana();
  actualizarTexturaAR();
};
$('btnAjuste').onclick = () => $('fotoPasado').classList.toggle('llenar');
$('btnNarrarVentana').onclick = () => narrar(poi);
$('btnSalirVentana').onclick = () => {
  $('ventana').classList.remove('on');
  streamCamara?.getTracks().forEach(t => t.stop());
  streamCamara = null;
  callar();
};

// ---------- 3B. Modo AR con A-Frame + WebXR ----------
let escena = null;

function cargarAFrame() {
  if (window.AFRAME) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = AFRAME_URL;
    s.onload = () => { registrarComponentes(); crearEscena(); resolve(); };
    s.onerror = reject;
    document.head.append(s);
  });
}

function registrarComponentes() {
  const THREE = AFRAME.THREE;
  const vCam = new THREE.Vector3();
  const vLocal = new THREE.Vector3();

  // Detecta cuando el celular atraviesa el plano del portal.
  AFRAME.registerComponent('cruce-portal', {
    init() { this.ladoAnterior = null; this.adentro = false; },
    tick() {
      const portal = this.el;
      if (!portal.getAttribute('visible')) return;
      this.el.sceneEl.camera.getWorldPosition(vCam);
      vLocal.copy(vCam);
      portal.object3D.worldToLocal(vLocal);
      const lado = vLocal.z >= 0 ? 'frente' : 'atras';
      const dentroDelAro = Math.abs(vLocal.x) < 0.9 && vLocal.y > -0.2 && vLocal.y < 2.4;
      if (this.ladoAnterior && lado !== this.ladoAnterior && dentroDelAro) {
        this.adentro = lado === 'atras';
        this.el.sceneEl.emit('cruce', { adentro: this.adentro });
      }
      this.ladoAnterior = lado;
    }
  });
}

function crearEscena() {
  const f = fotoActual();
  $('arContenedor').innerHTML = `
  <a-scene id="escena" embedded
    webxr="requiredFeatures: local-floor; optionalFeatures: hit-test, dom-overlay; overlayElement: #arOverlay"
    ar-hit-test="target: #portal"
    vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false"
    renderer="colorManagement: true; alpha: true" style="width:100%;height:100%">
    <a-assets>
      <img id="texPasado" src="${esc(f.archivo)}">
    </a-assets>
    <a-entity light="type: ambient; intensity: 1.2"></a-entity>
    <a-entity camera look-controls="enabled: false" position="0 1.6 0"></a-entity>

    <a-entity id="portal" visible="false" cruce-portal>
      <a-entity position="0 1.15 0">
        <a-torus radius="0.7" radius-tubular="0.04" segments-tubular="64"
          material="color: #d4a25f; emissive: #d4a25f; emissiveIntensity: 0.9"
          animation="property: material.emissiveIntensity; from: 0.5; to: 1.2; dir: alternate; loop: true; dur: 1200"></a-torus>
        <a-circle id="ventanaPortal" radius="0.67" segments="64"
          material="src: #texPasado; shader: flat; side: front; opacity: 0.95; transparent: true"></a-circle>
      </a-entity>
    </a-entity>

    <!-- El "pasado": una esfera sepia que tapa la cámara + la foto grande adelante -->
    <a-entity id="mundoPasado" visible="false">
      <a-sphere radius="25" segments-width="32" segments-height="16"
        material="color: #3b2c1b; shader: flat; side: back"></a-sphere>
      <a-plane id="fotoGrande" width="6" height="4" material="src: #texPasado; shader: flat; side: double"></a-plane>
      <a-plane rotation="-90 0 0" width="50" height="50" material="color: #5a4329; shader: flat"></a-plane>
    </a-entity>
  </a-scene>`;

  escena = $('escena');
  escena.addEventListener('ar-hit-test-select', () => colocadoPortal());
  escena.addEventListener('cruce', e => (e.detail.adentro ? entrarAlPasado() : volverAlPresente()));
  escena.addEventListener('exit-vr', salirAR);

  // Que los toques en los botones no cuenten como "tocar el piso".
  $('arOverlay').addEventListener('beforexrselect', e => e.preventDefault());
  $('arColocarAdelante').onclick = colocarAdelante;
  $('arNarrar').onclick = () => narrar(poi);
  $('arOtraFoto').hidden = poi.fotosHistoricas.length < 2;
  $('arOtraFoto').onclick = () => {
    indiceFoto = (indiceFoto + 1) % poi.fotosHistoricas.length;
    actualizarTexturaAR();
    mostrarFotoVentana();
    toast(`${fotoActual().anio} · ${fotoActual().titulo}`);
  };
  $('arSalir').onclick = () => escena.exitVR();

  const tex = $('texPasado');
  // Foto apaisada: 6 m de ancho. Retrato vertical: 4 m de alto.
  const ajustarProporcion = () => {
    const prop = tex.naturalWidth / tex.naturalHeight || 1.5;
    const ancho = prop >= 1 ? 6 : 4 * prop;
    $('fotoGrande').setAttribute('width', ancho);
    $('fotoGrande').setAttribute('height', ancho / prop);
  };
  tex.addEventListener('load', ajustarProporcion);
  if (tex.complete) ajustarProporcion();
}

function actualizarTexturaAR() {
  if (!escena) return;
  $('texPasado').src = fotoActual().archivo;
  ['ventanaPortal', 'fotoGrande'].forEach(id => $(id).setAttribute('material', 'src', `url(${fotoActual().archivo})`));
}

async function entrarAR() {
  if (!escena) { toast('Cargando realidad aumentada…'); await cargarAFrame(); }
  $('arContenedor').classList.add('on');
  $('arOverlay').hidden = false;
  $('arAviso').textContent = 'Apuntá al piso, mové el celu despacio y tocá la pantalla para colocar el portal.';
  try {
    await escena.enterAR();
  } catch (e) {
    toast('No se pudo iniciar la realidad aumentada. Probá el modo ventana.');
    salirAR();
  }
}

function orientarHaciaCamara(obj) {
  const THREE = AFRAME.THREE;
  const cam = new THREE.Vector3();
  escena.camera.getWorldPosition(cam);
  const p = obj.object3D.position;
  obj.object3D.rotation.set(0, Math.atan2(cam.x - p.x, cam.z - p.z), 0);
}

function colocadoPortal() {
  const portal = $('portal');
  portal.setAttribute('visible', true);
  orientarHaciaCamara(portal);
  escena.setAttribute('ar-hit-test', 'enabled', false);
  $('arColocarAdelante').hidden = true;
  $('arAviso').textContent = '¡Portal abierto! Caminá a través del anillo para entrar al pasado.';
  frase('portal-abierto', '¡Portal abierto! Caminá a través del anillo para viajar al pasado.');
  vibrar(60);
}

// Por si el celu no detecta el piso: pone el portal 1,8 m adelante.
function colocarAdelante() {
  const THREE = AFRAME.THREE;
  const cam = escena.camera;
  const pos = new THREE.Vector3(); cam.getWorldPosition(pos);
  const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
  dir.y = 0; dir.normalize();
  $('portal').object3D.position.set(pos.x + dir.x * 1.8, 0, pos.z + dir.z * 1.8);
  colocadoPortal();
}

function entrarAlPasado() {
  const THREE = AFRAME.THREE;
  const portal = $('portal').object3D;
  const mundo = $('mundoPasado');
  const foto = $('fotoGrande').object3D;
  // La foto aparece del otro lado del portal, siguiendo la dirección en la que caminaste.
  const atras = new THREE.Vector3(0, 0, -1).applyQuaternion(portal.quaternion);
  foto.position.set(portal.position.x + atras.x * 4.5, 1.8, portal.position.z + atras.z * 4.5);
  foto.lookAt(portal.position.x, 1.8, portal.position.z);
  mundo.setAttribute('visible', true);
  modoAgujero(true);
  $('arAviso').textContent = `Estás en ${fotoActual().anio} (${etiquetaRelacion(fotoActual())}). Volvé a cruzar el portal para regresar.`;
  vibrar([40, 40, 120]);
  narrar(poi);
}

// Estando adentro, el círculo del portal se vuelve un "agujero": no pinta color pero sí
// profundidad, así la esfera del pasado no se dibuja ahí y se ve la cámara (el presente).
function modoAgujero(activo) {
  const malla = $('ventanaPortal').getObject3D('mesh');
  if (!malla) return;
  const m = malla.material;
  m.colorWrite = !activo;
  m.transparent = !activo;
  malla.renderOrder = activo ? -1 : 0;
  m.needsUpdate = true;
}

function volverAlPresente() {
  $('mundoPasado').setAttribute('visible', false);
  modoAgujero(false);
  $('arAviso').textContent = 'Volviste al presente. Cruzá de nuevo cuando quieras.';
  frase('presente', 'De vuelta al presente.');
}

function salirAR() {
  $('arContenedor').classList.remove('on');
  $('arOverlay').hidden = true;
  callar();
  if (!escena) return;
  $('portal').setAttribute('visible', false);
  $('mundoPasado').setAttribute('visible', false);
  modoAgujero(false);
  $('arColocarAdelante').hidden = false;
  escena.setAttribute('ar-hit-test', 'enabled', true);
}
