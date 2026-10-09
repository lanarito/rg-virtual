import { cargarDatos, crearHoja, fichaHTML, narrar, googleKey, parametro, distancia, esc, toast } from './core.js';

const datos = await cargarDatos();
const hoja = crearHoja();
const $ = id => document.getElementById(id);
const key = googleKey();
// Street View solo tiene sentido en la ciudad (no en Laguna Azul o Cabo Vírgenes por ahora).
const pois = datos.pois.filter(p => p.streetView);

if (!key) {
  $('pano').innerHTML = `<div class="sinclave">
    <h2>Falta la clave de Google</h2>
    <p class="hint">El paseo 360 usa Google Street View. Cargá tu clave una sola vez en Configuración y queda guardada en este dispositivo.</p>
    <a class="btn" href="config.html">⚙️ Ir a Configuración</a>
  </div>`;
} else {
  await cargarMaps(key);
  iniciar();
}

function cargarMaps(k) {
  return new Promise((resolve, reject) => {
    window.__mapsListo = resolve;
    window.gm_authFailure = () => toast('Google rechazó la clave. Revisá que tenga habilitada Maps JavaScript API y el dominio permitido.', 6000);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(k)}&v=weekly&language=es&region=AR&callback=__mapsListo`;
    s.async = true;
    s.onerror = reject;
    document.head.append(s);
  });
}

function iniciar() {
  const g = window.google.maps;
  const servicio = new g.StreetViewService();
  const inicial = pois.find(p => p.id === parametro('poi')) || pois[0];

  const pano = new g.StreetViewPanorama($('pano'), {
    position: { lat: inicial.lat, lng: inicial.lon },
    pov: { heading: inicial.streetView.heading, pitch: inicial.streetView.pitch },
    motionTracking: false,
    motionTrackingControl: true,
    addressControl: false,
    fullscreenControl: false,
    showRoadLabels: true
  });

  // En celulares con giroscopio: mirar moviendo el teléfono.
  if (window.DeviceOrientationEvent && matchMedia('(pointer: coarse)').matches) {
    $('btnGiro').hidden = false;
    $('btnGiro').onclick = async () => {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { await DeviceOrientationEvent.requestPermission(); } catch { /* sigue igual */ }
      }
      const activo = !pano.get('motionTracking');
      pano.setOptions({ motionTracking: activo });
      $('btnGiro').textContent = activo ? '✋ Mover con el dedo' : '📱 Mover con el celu';
    };
  }

  // Busca la panorámica más cercana al lugar (puede no estar justo en el punto).
  function irA(poi) {
    servicio.getPanorama({ location: { lat: poi.lat, lng: poi.lon }, radius: 120, source: g.StreetViewSource.OUTDOOR }, (data, st) => {
      if (st !== g.StreetViewStatus.OK) { toast(`No hay Street View cerca de ${poi.nombre}`); return; }
      pano.setPano(data.location.pano);
      pano.setPov({ heading: poi.streetView.heading, pitch: poi.streetView.pitch });
      abrirFicha(poi);
    });
  }

  function abrirFicha(poi) {
    hoja.abrir(poi, fichaHTML(poi, datos, { acciones: `<a class="btn small sec" href="mapa.html?poi=${encodeURIComponent(poi.id)}">🗺️ Mapa</a>` }));
  }

  // A medida que caminás por Street View, avisa qué lugar tenés cerca.
  let avisado = null;
  pano.addListener('position_changed', () => {
    const p = pano.getPosition(); if (!p) return;
    let cerca = null, dMin = Infinity;
    for (const poi of pois) {
      const d = distancia(p.lat(), p.lng(), poi.lat, poi.lon);
      if (d < dMin) { dMin = d; cerca = poi; }
    }
    const btn = $('btnCercano');
    if (cerca && dMin < Math.max(80, cerca.radio || 0)) {
      btn.hidden = false;
      btn.textContent = `📍 ${cerca.nombre} · tocá para escuchar`;
      btn.onclick = () => { abrirFicha(cerca); narrar(cerca); };
      if (avisado !== cerca.id) { avisado = cerca.id; toast(`Estás cerca de ${cerca.nombre}`); }
    } else btn.hidden = true;
  });

  $('chips').innerHTML = pois.map(p => `<button class="chip ${p === inicial ? 'on' : ''}" data-id="${esc(p.id)}">${esc(p.nombre)}</button>`).join('');
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $('chips').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    irA(pois.find(p => p.id === b.dataset.id));
  });

  irA(inicial);
}
