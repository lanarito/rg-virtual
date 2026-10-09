// Pantalla principal: mapa con los portales, GPS, y apertura automática del portal al llegar.
import { cargarDatos, seguirPosicion, distancia, rumbo, textoDistancia, frase, leerAjuste, guardarAjuste, esc, parametro } from './core.js';
import { iniciarSonido, alternarMusica, musicaEncendida, campanita } from './sonido.js';
import { abrirPortal, portalAbierto, precargar } from './portal.js';

const $ = id => document.getElementById(id);
const datos = await cargarDatos();
const { centro } = datos.ciudad;
const KM_LEJOS = 20; // más lejos que esto del centro = "visita desde casa"

// ---------- Mapa ----------
const mapa = L.map('mapa', { zoomControl: false, attributionControl: true }).setView([centro.lat, centro.lon], centro.zoom);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapa);

// El tamaño de los portales depende del zoom, para que no se pisen con el mapa alejado.
const pintarZoom = () => { mapa.getContainer().dataset.zoom = mapa.getZoom() >= 16 ? 'cerca' : mapa.getZoom() >= 15 ? 'medio' : 'lejos'; };
mapa.on('zoomend', pintarZoom);
pintarZoom();

const visitados = new Set(leerAjuste('visitados', []));
const marcas = new Map();

function iconoPortal(poi) {
  const foto = poi.fotosHistoricas[0]?.archivo || '';
  return L.divIcon({
    className: '',
    html: `<div class="pin-portal ${visitados.has(poi.id) ? 'visto' : ''}" style="background-image:url('${esc(foto)}')"></div>`,
    iconSize: [58, 58], iconAnchor: [29, 29]
  });
}

for (const poi of datos.pois) {
  const m = L.marker([poi.lat, poi.lon], { icon: iconoPortal(poi), title: `Portal: ${poi.nombre}`, alt: poi.nombre, keyboard: true })
    .addTo(mapa)
    .on('click', () => { detenerRecorrido(); entrarAlPortal(poi); });
  marcas.set(poi.id, m);
}

// En la ciudad, no mostramos Laguna Azul y Cabo Vírgenes en el encuadre inicial (están lejos).
const cercanos = datos.pois.filter(p => distancia(p.lat, p.lon, centro.lat, centro.lon) < 5000);
mapa.fitBounds(cercanos.map(p => [p.lat, p.lon]), { padding: [40, 40] });

function marcarVisitado(poi) {
  visitados.add(poi.id);
  guardarAjuste('visitados', [...visitados]);
  marcas.get(poi.id)?.setIcon(iconoPortal(poi));
}

async function entrarAlPortal(poi) {
  if (portalAbierto()) return;
  mapa.flyTo([poi.lat, poi.lon], Math.max(mapa.getZoom(), 16), { duration: 0.8 });
  marcarVisitado(poi);
  await abrirPortal(poi);
  actualizarTarjeta();
}

// ---------- Tarjeta de abajo ----------
const tarjeta = $('tarjeta');
let modo = 'esperando'; // 'ciudad' | 'lejos'
let ultimaPos = null;
let objetivo = null;

const PUNTOS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const cardinal = g => PUNTOS[Math.round(g / 45) % 8];

function actualizarTarjeta() {
  tarjeta.hidden = false;
  if (modo === 'lejos' || !ultimaPos) {
    objetivo = null;
    $('tarjetaFoto').style.backgroundImage = `url('${datos.pois[0].fotosHistoricas[0].archivo}')`;
    $('tarjetaArriba').textContent = modo === 'lejos' ? 'Estás lejos de Río Gallegos' : 'Buscando tu ubicación…';
    $('tarjetaNombre').textContent = 'Ver todos los portales';
    $('tarjetaAbajo').textContent = `Recorré los ${datos.pois.length} lugares desde donde estés`;
    return;
  }
  // El más cercano que todavía no visitaste (si ya viste todos, el más cercano)
  const ordenados = [...datos.pois].sort((a, b) => dist(a) - dist(b));
  objetivo = ordenados.find(p => !visitados.has(p.id)) || ordenados[0];
  const d = dist(objetivo);
  $('tarjetaFoto').style.backgroundImage = `url('${objetivo.fotosHistoricas[0].archivo}')`;
  $('tarjetaArriba').textContent = visitados.has(objetivo.id) ? 'Portal más cercano' : 'Próximo portal';
  $('tarjetaNombre').textContent = objetivo.nombre;
  $('tarjetaAbajo').textContent = d < (objetivo.radio || 50)
    ? '¡Estás acá! Tocá para entrar'
    : `A ${textoDistancia(d)}, hacia el ${cardinal(rumbo(ultimaPos.lat, ultimaPos.lon, objetivo.lat, objetivo.lon))} · tocá para entrar`;
}
const dist = p => distancia(ultimaPos.lat, ultimaPos.lon, p.lat, p.lon);

tarjeta.onclick = () => {
  if (objetivo) entrarAlPortal(objetivo);
  else iniciarRecorrido();
};

// ---------- Recorrido completo (para verlo desde casa o en un stand) ----------
let recorriendo = false;
async function iniciarRecorrido() {
  recorriendo = true;
  for (const poi of datos.pois) {
    if (!recorriendo) break;
    precargar(poi);
    mapa.flyTo([poi.lat, poi.lon], 16, { duration: 1.8 });
    await new Promise(r => setTimeout(r, 2200));
    if (!recorriendo) break;
    marcarVisitado(poi);
    const inicio = Date.now();
    await abrirPortal(poi);
    // Si la persona cerró el portal enseguida, entendemos que quiere parar.
    if (Date.now() - inicio < 6000) break;
  }
  recorriendo = false;
  actualizarTarjeta();
}
function detenerRecorrido() { recorriendo = false; }

// ---------- GPS: al llegar a un lugar, el portal se abre solo ----------
let marcaYo = null;
let ultimoMovimientoManual = 0;
const avisadosEstaVez = new Set();
mapa.on('dragstart', () => { ultimoMovimientoManual = Date.now(); });

function alMoverme(pos) {
  ultimaPos = pos;
  const lejos = distancia(pos.lat, pos.lon, centro.lat, centro.lon) > KM_LEJOS * 1000;
  if (lejos) { if (modo !== 'lejos') pasarAModoLejos(); return; }
  modo = 'ciudad';

  if (!marcaYo) {
    marcaYo = L.marker([pos.lat, pos.lon], { icon: L.divIcon({ className: '', html: '<div class="yo"></div>', iconSize: [22, 22] }), zIndexOffset: 1000, keyboard: false }).addTo(mapa);
    mapa.setView([pos.lat, pos.lon], 16);
  } else {
    marcaYo.setLatLng([pos.lat, pos.lon]);
    if (Date.now() - ultimoMovimientoManual > 15000 && !portalAbierto()) mapa.panTo([pos.lat, pos.lon]);
  }
  actualizarTarjeta();

  for (const poi of datos.pois) {
    if (avisadosEstaVez.has(poi.id) || portalAbierto() || recorriendo) continue;
    if (dist(poi) <= (poi.radio || 50)) {
      avisadosEstaVez.add(poi.id);
      campanita();
      entrarAlPortal(poi);
      break;
    }
  }
}

let saludo = Promise.resolve();
function pasarAModoLejos() {
  modo = 'lejos';
  actualizarTarjeta();
  saludo.then(() => !portalAbierto() && !recorriendo && frase('lejos', 'Parece que no estás en Río Gallegos. No pasa nada: tocá cualquier portal del mapa, o la tarjeta de abajo para ver el recorrido completo.'));
}

// ---------- Música ----------
const btnMusica = $('btnMusica');
function pintarMusica() {
  btnMusica.textContent = musicaEncendida() ? '🎵' : '🔇';
  btnMusica.setAttribute('aria-label', musicaEncendida() ? 'Apagar música' : 'Prender música');
}
btnMusica.onclick = () => { alternarMusica(); pintarMusica(); };
pintarMusica();

// ---------- Empezar ----------
// Un solo toque: habilita el sonido, pide el GPS y da la bienvenida.
$('btnEmpezar').onclick = () => {
  iniciarSonido();
  document.getElementById('inicio').classList.add('oculto');
  setTimeout(() => document.getElementById('inicio').remove(), 900);
  saludo = frase('bienvenida-paseo', 'Bienvenidos a Río Gallegos. Caminá por la ciudad: cada vez que llegues a un lugar histórico, se va a abrir un portal al pasado.');
  actualizarTarjeta();
  datos.pois.slice(0, 4).forEach(precargar);

  const simular = parametro('simular') === '1';
  if (simular) {
    mapa.on('click', e => alMoverme({ lat: e.latlng.lat, lon: e.latlng.lng }));
    alMoverme({ lat: centro.lat, lon: centro.lon });
    return;
  }
  seguirPosicion(alMoverme, () => { if (modo !== 'lejos') pasarAModoLejos(); });
};
