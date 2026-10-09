import { cargarDatos, crearHoja, fichaHTML, narrar, callar, googleKey, parametro, esc, toast, leerAjuste, guardarAjuste } from './core.js';

const C = window.Cesium;
const datos = await cargarDatos();
const hoja = crearHoja();
const $ = id => document.getElementById(id);
const aviso = msg => { $('aviso').hidden = !msg; $('aviso').innerHTML = msg || ''; };

const key = googleKey();
let modo = key && leerAjuste('vista3d', 'google') === 'google' ? 'google' : 'satelite';
let viewer = null;

const opcionesBase = {
  animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false,
  sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false,
  infoBox: false, selectionIndicator: false, requestRenderMode: true
};

async function crearVisor() {
  viewer?.destroy();
  if (modo === 'google') {
    C.GoogleMaps.defaultApiKey = key;
    viewer = new C.Viewer('cesium', { ...opcionesBase, globe: false, baseLayer: false });
    viewer.scene.skyAtmosphere.show = true;
    try {
      const tileset = await C.createGooglePhotorealistic3DTileset();
      viewer.scene.primitives.add(tileset);
      aviso('');
    } catch (e) {
      console.error(e);
      toast('No cargó el 3D de Google. Paso a vista satelital.');
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
    aviso(key ? '' : 'Vista satelital. Para ver edificios en 3D cargá tu clave de Google en <a href="config.html">Configuración</a>.');
  }
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 30;
  agregarPuntos();
  configurarClicks();
  $('btnCapa').hidden = !key;
  $('btnCapa').textContent = modo === 'google' ? '🛰️ Satélite' : '🏙️ 3D Google';
}

// Altura de los marcadores: con el 3D de Google no hay terreno donde "apoyarlos".
const alturaMarca = () => (modo === 'google' ? 70 : 25);

function agregarPuntos() {
  for (const poi of datos.pois) {
    const cat = datos.categorias[poi.categoria] || { color: '#ffffff' };
    viewer.entities.add({
      id: poi.id,
      position: C.Cartesian3.fromDegrees(poi.lon, poi.lat, alturaMarca()),
      point: { pixelSize: 14, color: C.Color.fromCssColorString(cat.color), outlineColor: C.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: {
        text: poi.nombre, font: '600 14px system-ui, sans-serif', fillColor: C.Color.WHITE,
        outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(0, -20), disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new C.DistanceDisplayCondition(0, 1600)
      }
    });
  }
}

function configurarClicks() {
  const h = new C.ScreenSpaceEventHandler(viewer.scene.canvas);
  h.setInputAction(click => {
    const pick = viewer.scene.pick(click.position);
    const poi = datos.pois.find(p => p.id === pick?.id?.id);
    if (poi) { pararTour(); irA(poi); }
  }, C.ScreenSpaceEventType.LEFT_CLICK);
}

function irA(poi, { narrarAlLlegar = false } = {}) {
  return new Promise(resolve => {
    const cam = poi.camara3d || { rango: 400, heading: 0, pitch: -30 };
    const centro = C.Cartesian3.fromDegrees(poi.lon, poi.lat, alturaMarca() - 40);
    viewer.camera.flyToBoundingSphere(new C.BoundingSphere(centro, 20), {
      offset: new C.HeadingPitchRange(C.Math.toRadians(cam.heading), C.Math.toRadians(cam.pitch), cam.rango),
      duration: 3.5,
      complete: () => {
        hoja.abrir(poi, fichaHTML(poi, datos, { acciones: `<a class="btn small sec" href="mapa.html?poi=${encodeURIComponent(poi.id)}">🗺️ Mapa</a>` }));
        if (narrarAlLlegar) narrar(poi).then(resolve); else resolve();
      },
      cancel: resolve
    });
  });
}

function vistaInicial(duracion = 2.5) {
  const { centro } = datos.ciudad;
  viewer.camera.flyTo({
    destination: C.Cartesian3.fromDegrees(centro.lon + 0.004, centro.lat - 0.022, 1500),
    orientation: { heading: C.Math.toRadians(-5), pitch: C.Math.toRadians(-32), roll: 0 },
    duration: duracion
  });
}

// ---------- Recorrido guiado ----------
let tourActivo = false;
async function iniciarTour() {
  tourActivo = true;
  $('btnTour').textContent = '⏹ Detener';
  for (const poi of datos.pois) {
    if (!tourActivo) break;
    await irA(poi, { narrarAlLlegar: true });
    if (!tourActivo) break;
    await new Promise(r => setTimeout(r, 1200));
  }
  pararTour();
}
function pararTour() {
  if (!tourActivo) return;
  tourActivo = false;
  callar();
  $('btnTour').textContent = '▶ Recorrido guiado';
}
$('btnTour').onclick = () => (tourActivo ? pararTour() : iniciarTour());
$('btnInicio').onclick = () => { pararTour(); hoja.cerrar(); vistaInicial(); };
$('btnCapa').onclick = async () => {
  pararTour();
  modo = modo === 'google' ? 'satelite' : 'google';
  guardarAjuste('vista3d', modo);
  await crearVisor();
  vistaInicial(0);
};

// Chips para saltar a cada lugar
$('chips').innerHTML = datos.pois.map(p => `<button class="chip" data-id="${esc(p.id)}">${esc(p.nombre)}</button>`).join('');
$('chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  pararTour();
  irA(datos.pois.find(p => p.id === b.dataset.id));
});

await crearVisor();
const inicial = datos.pois.find(p => p.id === parametro('poi'));
if (inicial) { vistaInicial(0); irA(inicial); } else vistaInicial(0);
