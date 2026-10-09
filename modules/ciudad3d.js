// Vuelo 3D automático: la cámara va de lugar en lugar y en cada uno se abre el portal al pasado.
import { cargarDatos, googleKey, frase, callar, esc, distancia, rumbo } from './core.js';
import { iniciarSonido, alternarMusica, musicaEncendida } from './sonido.js';
import { t, traducirPagina } from './i18n.js';

traducirPagina();
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
    if (!poi) return;
    pausar();
    volando = true;
    volarDron(posicion, poi).then(llego => {
      volando = false;
      if (!llego) return;
      posicion = { lat: poi.lat, lon: poi.lon, rumbo: rumbo(posicion.lat, posicion.lon, poi.lat, poi.lon) };
      indice = recorrido.indexOf(poi);
      abrirPortal(poi, { camara: false });
    });
  }, C.ScreenSpaceEventType.LEFT_CLICK);
}

// Los puntos van a ras del suelo (con 3D de Google, apenas arriba de la calle).
const alturaMarca = () => (modo === 'google' ? 38 : 25);

// ---------- Vuelo tipo drone ----------
// Un punto "objetivo" viaja en línea recta de A a B a ras del suelo; la cámara lo sigue desde atrás
// y arriba, mirando hacia adelante. Así se ve de dónde salís y a dónde llegás.
const ALTURA_SUELO = 30;           // altura aproximada del terreno sobre el elipsoide en la zona
const INCLINACION = C.Math.toRadians(-28);
const ALTURA_CIUDAD = 140;          // altura del drone al salir y al llegar
const suave = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
let animacion = null;

function mirar(lat, lon, rumboGrados, alturaDron) {
  const rango = alturaDron / Math.sin(-INCLINACION);
  viewer.camera.lookAt(
    C.Cartesian3.fromDegrees(lon, lat, ALTURA_SUELO),
    new C.HeadingPitchRange(C.Math.toRadians(rumboGrados), INCLINACION, rango)
  );
}

function volarDron(desde, hasta) {
  return new Promise(resolve => {
    const d = distancia(desde.lat, desde.lon, hasta.lat, hasta.lon);
    const duracion = Math.min(26, Math.max(7, 4 + d / 140)) * 1000;          // segundos según la distancia
    const alturaMax = Math.min(3500, Math.max(ALTURA_CIUDAD, 90 + d * 0.06));  // más alto en tramos largos
    const rumbo1 = rumbo(desde.lat, desde.lon, hasta.lat, hasta.lon);
    let rumbo0 = desde.rumbo ?? rumbo1;
    const giro = ((rumbo1 - rumbo0 + 540) % 360) - 180;
    const t0 = performance.now();
    const paso = ahora => {
      if (!volando) { animacion = null; return resolve(false); }
      const t = Math.min(1, (ahora - t0) / duracion);
      const avance = suave(t);
      const lat = desde.lat + (hasta.lat - desde.lat) * avance;
      const lon = desde.lon + (hasta.lon - desde.lon) * avance;
      const altura = ALTURA_CIUDAD + (alturaMax - ALTURA_CIUDAD) * Math.sin(Math.PI * avance);
      const rumboAhora = rumbo0 + giro * suave(Math.min(1, t / 0.22));    // gira al principio del tramo
      mirar(lat, lon, rumboAhora, altura);
      if (t < 1) animacion = requestAnimationFrame(paso);
      else { animacion = null; resolve(true); }
    };
    animacion = requestAnimationFrame(paso);
  });
}

// Orden del recorrido: el más cercano cada vez, empezando por la fundación; los lejanos al final.
function ordenarRecorrido(pois) {
  const { centro } = datos.ciudad;
  const cerca = pois.filter(p => distancia(p.lat, p.lon, centro.lat, centro.lon) < 8000);
  const lejos = pois.filter(p => !cerca.includes(p));
  const orden = [cerca.find(p => p.id === 'fundacion') || cerca[0]];
  const resto = cerca.filter(p => p !== orden[0]);
  while (resto.length) {
    const ult = orden.at(-1);
    resto.sort((a, b) => distancia(ult.lat, ult.lon, a.lat, a.lon) - distancia(ult.lat, ult.lon, b.lat, b.lon));
    orden.push(resto.shift());
  }
  lejos.sort((a, b) => distancia(centro.lat, centro.lon, a.lat, a.lon) - distancia(centro.lat, centro.lon, b.lat, b.lon));
  return [...orden, ...lejos];
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
const recorrido = ordenarRecorrido(datos.pois);
let posicion = { lat: datos.ciudad.centro.lat - 0.012, lon: datos.ciudad.centro.lon + 0.004, rumbo: 0 };

async function volar() {
  volando = true;
  $('tarjetaIcono').textContent = '⏸';
  while (volando && indice < recorrido.length) {
    const poi = recorrido[indice];
    precargar(poi);
    mostrarTarjeta(poi, indice === 0 ? t('vuelo.hacia') : t('vuelo.desde', { lugar: recorrido[indice - 1].nombre }), t('vuelo.pausar'));
    const llego = await volarDron(posicion, poi);
    if (!llego) break;
    posicion = { lat: poi.lat, lon: poi.lon, rumbo: rumbo(posicion.lat, posicion.lon, poi.lat, poi.lon) };
    mostrarTarjeta(poi, t('vuelo.llegaste'), t('vuelo.seAbre'));
    await new Promise(r => setTimeout(r, 1200));
    if (!volando) break;
    await abrirPortal(poi, { camara: false });
    indice++;
  }
  if (indice >= recorrido.length) {
    indice = 0;
    volando = false;
    frase('vuelo-fin');
    mostrarTarjeta(recorrido[0], t('vuelo.terminado'), t('vuelo.otraVez'));
    $('tarjetaIcono').textContent = '▶';
  }
}

function pausar() {
  if (!volando) return;
  volando = false;
  cerrarPortal();
  callar();
  if (animacion) cancelAnimationFrame(animacion);
  const poi = recorrido[indice];
  mostrarTarjeta(poi, t('vuelo.pausa'), t('vuelo.seguir'));
  $('tarjetaIcono').textContent = '▶';
}

$('tarjeta').onclick = () => (volando ? pausar() : volar());

function vistaGeneral() {
  mirar(posicion.lat, posicion.lon, posicion.rumbo, 600);
}

// ---------- Música ----------
const btnMusica = $('btnMusica');
const pintarMusica = () => {
  btnMusica.textContent = musicaEncendida() ? '🎵' : '🔇';
  btnMusica.setAttribute('aria-label', t(musicaEncendida() ? 'musica.apagar' : 'musica.prender'));
};
btnMusica.onclick = () => { alternarMusica(); pintarMusica(); };
pintarMusica();

await crearVisor();
vistaGeneral();

$('btnVolar').onclick = async () => {
  iniciarSonido();
  $('inicio').classList.add('oculto');
  setTimeout(() => $('inicio').remove(), 900);
  await frase('vuelo-inicio');
  volar();
};
