// Vuelo 3D automático: la cámara va de lugar en lugar y en cada uno se abre el portal al pasado.
import { cargarDatos, googleKey, frase, callar, esc } from './core.js';
import { iniciarSonido, alternarMusica, musicaEncendida } from './sonido.js';
import { abrirPortal, cerrarPortal, precargar } from './portal.js';

const C = window.Cesium;
const $ = id => document.getElementById(id);
const datos = await cargarDatos();
const key = googleKey();
let modo = key ? 'google' : 'satelite';
let viewer = null;

const opcionesBase = {
  animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false,
  sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false,
  infoBox: false, selectionIndicator: false
};

async function crearVisor() {
  viewer?.destroy();
  if (modo === 'google') {
    C.GoogleMaps.defaultApiKey = key;
    viewer = new C.Viewer('cesium', { ...opcionesBase, globe: false, baseLayer: false });
    viewer.scene.skyAtmosphere.show = true;
    try {
      viewer.scene.primitives.add(await C.createGooglePhotorealistic3DTileset());
    } catch (e) {
      console.error(e);
      modo = 'satelite';
      return crearVisor();
    }
  } else {
    viewer = new C.Viewer('cesium', {
      ...opcionesBase,
      terrainProvider: new C.EllipsoidTerrainProvider(),
      baseLayer: C.ImageryLayer.fromProviderAsync(
        C.ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer')
      )
    });
  }
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 30;
  for (const poi of datos.pois) {
    viewer.entities.add({
      id: poi.id,
      position: C.Cartesian3.fromDegrees(poi.lon, poi.lat, alturaMarca()),
      point: { pixelSize: 16, color: C.Color.fromCssColorString('#e8b04b'), outlineColor: C.Color.WHITE, outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY }
    });
  }
  // Tocar un punto dorado abre su portal
  new C.ScreenSpaceEventHandler(viewer.scene.canvas).setInputAction(click => {
    const poi = datos.pois.find(p => p.id === viewer.scene.pick(click.position)?.id?.id);
    if (poi) { pausar(); irA(poi).then(() => abrirPortal(poi, { camara: false })); }
  }, C.ScreenSpaceEventType.LEFT_CLICK);
}

const alturaMarca = () => (modo === 'google' ? 70 : 25);

function irA(poi) {
  return new Promise(resolve => {
    const cam = poi.camara3d || { rango: 400, heading: 0, pitch: -30 };
    viewer.camera.flyToBoundingSphere(new C.BoundingSphere(C.Cartesian3.fromDegrees(poi.lon, poi.lat, alturaMarca() - 40), 20), {
      offset: new C.HeadingPitchRange(C.Math.toRadians(cam.heading), C.Math.toRadians(cam.pitch), cam.rango),
      duration: 5, complete: resolve, cancel: resolve
    });
  });
}

// La cámara gira despacio alrededor del lugar mientras se espera
function orbitar(segundos) {
  return new Promise(resolve => {
    const fin = Date.now() + segundos * 1000;
    const paso = () => {
      if (!volando || Date.now() > fin) return resolve();
      viewer.camera.rotate(C.Cartesian3.UNIT_Z, -0.0012);
      requestAnimationFrame(paso);
    };
    paso();
  });
}

// ---------- Tarjeta ----------
function mostrarTarjeta(poi, arriba, abajo) {
  $('tarjeta').hidden = false;
  $('tarjetaFoto').style.backgroundImage = `url('${esc(poi.fotosHistoricas[0].archivo)}')`;
  $('tarjetaArriba').textContent = arriba;
  $('tarjetaNombre').textContent = poi.nombre;
  $('tarjetaAbajo').textContent = abajo;
}

// ---------- Vuelo automático ----------
let volando = false;
let indice = 0;

async function volar() {
  volando = true;
  $('tarjetaIcono').textContent = '⏸';
  while (volando && indice < datos.pois.length) {
    const poi = datos.pois[indice];
    precargar(poi);
    mostrarTarjeta(poi, 'Volando hacia', 'Tocá para pausar');
    await irA(poi);
    if (!volando) break;
    await orbitar(1.5);
    if (!volando) break;
    await abrirPortal(poi, { camara: false });
    indice++;
  }
  if (indice >= datos.pois.length) {
    indice = 0;
    volando = false;
    frase('vuelo-fin', 'Este fue el recorrido. ¡Gracias por visitar Río Gallegos!');
    vistaGeneral();
    mostrarTarjeta(datos.pois[0], 'Recorrido terminado', 'Tocá para volar de nuevo');
    $('tarjetaIcono').textContent = '▶';
  }
}

function pausar() {
  if (!volando) return;
  volando = false;
  cerrarPortal();
  callar();
  viewer.camera.cancelFlight();
  const poi = datos.pois[indice];
  mostrarTarjeta(poi, 'En pausa', 'Tocá para seguir volando');
  $('tarjetaIcono').textContent = '▶';
}

$('tarjeta').onclick = () => (volando ? pausar() : volar());

function vistaGeneral(duracion = 3) {
  const { centro } = datos.ciudad;
  viewer.camera.flyTo({
    destination: C.Cartesian3.fromDegrees(centro.lon + 0.004, centro.lat - 0.022, 1500),
    orientation: { heading: C.Math.toRadians(-5), pitch: C.Math.toRadians(-32), roll: 0 },
    duration: duracion
  });
}

// ---------- Música ----------
const btnMusica = $('btnMusica');
const pintarMusica = () => {
  btnMusica.textContent = musicaEncendida() ? '🎵' : '🔇';
  btnMusica.setAttribute('aria-label', musicaEncendida() ? 'Apagar música' : 'Prender música');
};
btnMusica.onclick = () => { alternarMusica(); pintarMusica(); };
pintarMusica();

await crearVisor();
vistaGeneral(0);

$('btnVolar').onclick = async () => {
  iniciarSonido();
  $('inicio').classList.add('oculto');
  setTimeout(() => $('inicio').remove(), 900);
  await frase('vuelo-inicio', 'Vamos a volar sobre Río Gallegos. Acomodate y disfrutá del paseo.');
  volar();
};
