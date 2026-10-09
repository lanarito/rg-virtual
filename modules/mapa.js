import {
  cargarDatos, fichaHTML, crearHoja, narrar, frase, seguirPosicion, distancia, textoDistancia,
  toast, vibrar, esc, parametro, leerAjuste, guardarAjuste
} from './core.js';

const datos = await cargarDatos();
const { centro, planoHistorico } = datos.ciudad;
const hoja = crearHoja();

const mapa = L.map('mapa', { zoomControl: false }).setView([centro.lat, centro.lon], centro.zoom);
L.control.zoom({ position: 'topright' }).addTo(mapa);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapa);

// ---------- Marcadores ----------
const visitados = new Set(leerAjuste('visitados', []));
const marcadores = new Map();

function icono(poi) {
  const cat = datos.categorias[poi.categoria] || { color: '#555', icono: '📍' };
  return L.divIcon({
    className: '',
    html: `<div class="pin ${visitados.has(poi.id) ? 'visto' : ''}" style="background:${cat.color}"><span>${cat.icono}</span></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34]
  });
}

function abrirFicha(poi) {
  const acciones = `
    <a class="btn small sec" href="ciudad3d.html?poi=${encodeURIComponent(poi.id)}">🛰️ Ver en 3D</a>
    <a class="btn small sec" href="paseo360.html?poi=${encodeURIComponent(poi.id)}">📷 Street View</a>
    <a class="btn small sec" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}">🧭 Cómo llegar</a>`;
  hoja.abrir(poi, fichaHTML(poi, datos, { acciones }));
}

for (const poi of datos.pois) {
  const m = L.marker([poi.lat, poi.lon], { icon: icono(poi), title: poi.nombre })
    .addTo(mapa)
    .on('click', () => { mapa.panTo([poi.lat, poi.lon]); abrirFicha(poi); });
  m.bindTooltip(esc(poi.nombre), { direction: 'top', offset: [0, -30] });
  marcadores.set(poi.id, { m, poi });
}

for (const g of datos.gastronomia || []) {
  L.circleMarker([g.lat, g.lon], { radius: 7, color: '#d62828', fillOpacity: .8 })
    .addTo(mapa)
    .bindPopup(`<b>${esc(g.nombre)}</b><br>🕒 ${esc(g.horario)}<br>${g.menu.map(esc).join(' · ')}${g.nota ? `<br><i>${esc(g.nota)}</i>` : ''}`);
}

// ---------- Filtros por categoría ----------
const chips = document.getElementById('chips');
const filtros = [['todos', 'Todos', ''], ...Object.entries(datos.categorias).map(([k, c]) => [k, c.nombre, c.icono])];
chips.innerHTML = filtros.map(([k, n, i]) => `<button class="chip ${k === 'todos' ? 'on' : ''}" data-cat="${k}">${i} ${esc(n)}</button>`).join('');
chips.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
  const cat = b.dataset.cat;
  const visibles = [];
  for (const { m, poi } of marcadores.values()) {
    const ver = cat === 'todos' || poi.categoria === cat;
    if (ver) { m.addTo(mapa); visibles.push([poi.lat, poi.lon]); } else m.remove();
  }
  if (cat !== 'todos' && visibles.length) mapa.fitBounds(visibles, { padding: [50, 50], maxZoom: 16 });
});

// ---------- Plano histórico de 1931 ----------
let capaPlano = null;
const panelOpacidad = document.getElementById('opacidad');
const slider = document.getElementById('sliderPlano');
document.getElementById('btnPlano').onclick = () => {
  if (capaPlano) { capaPlano.remove(); capaPlano = null; panelOpacidad.classList.remove('on'); return; }
  const l = planoHistorico.limites;
  capaPlano = L.imageOverlay(planoHistorico.archivo, [[l.sur, l.oeste], [l.norte, l.este]], {
    opacity: +slider.value,
    attribution: `${esc(planoHistorico.titulo)} · ${esc(planoHistorico.autor)} · ${esc(planoHistorico.licencia)}`
  }).addTo(mapa);
  panelOpacidad.classList.add('on');
  mapa.setView([centro.lat, centro.lon], 14);
  toast('Carta náutica de 1931 (calce aproximado)');
};
slider.oninput = () => capaPlano?.setOpacity(+slider.value);

// ---------- Modo paseo: te avisa al llegar a cada lugar ----------
const btnPaseo = document.getElementById('btnPaseo');
const estado = document.getElementById('estado');
const simular = parametro('simular') === '1';
let dejarDeSeguir = null;
let marcaYo = null;
let ultimoAviso = null;

function actualizarPosicion(pos) {
  if (!marcaYo) {
    marcaYo = L.marker([pos.lat, pos.lon], { icon: L.divIcon({ className: '', html: '<div class="yo"></div>', iconSize: [18, 18] }), zIndexOffset: 1000 }).addTo(mapa);
    mapa.setView([pos.lat, pos.lon], 17);
  } else marcaYo.setLatLng([pos.lat, pos.lon]);

  let cercano = null, dMin = Infinity;
  for (const poi of datos.pois) {
    const d = distancia(pos.lat, pos.lon, poi.lat, poi.lon);
    if (d < dMin) { dMin = d; cercano = poi; }
  }
  estado.hidden = false;
  estado.textContent = `Más cerca: ${cercano.nombre} · ${textoDistancia(dMin)}${pos.precision ? ` (GPS ±${Math.round(pos.precision)} m)` : ''}`;

  if (dMin <= (cercano.radio || 50) && ultimoAviso !== cercano.id) {
    ultimoAviso = cercano.id;
    visitados.add(cercano.id);
    guardarAjuste('visitados', [...visitados]);
    marcadores.get(cercano.id)?.m.setIcon(icono(cercano));
    vibrar();
    toast(`📍 Llegaste a ${cercano.nombre}`);
    abrirFicha(cercano);
    narrar(cercano);
  }
}

function activarPaseo() {
  // Un primer "hablar" dentro del toque habilita la voz automática después (Chrome lo exige).
  if (simular) frase('paseo-simulado', 'Modo paseo simulado. Tocá el mapa para moverte.');
  else frase('paseo-activado', 'Modo paseo activado. Te aviso cuando llegues a un lugar.');
  btnPaseo.textContent = '⏹ Terminar paseo';
  if (simular) {
    toast('Simulación: tocá el mapa para "caminar"');
    mapa.on('click', clickSimulado);
    dejarDeSeguir = () => mapa.off('click', clickSimulado);
  } else {
    dejarDeSeguir = seguirPosicion(actualizarPosicion, e => toast(`GPS: ${e.message}`));
  }
}
function clickSimulado(e) { actualizarPosicion({ lat: e.latlng.lat, lon: e.latlng.lng, precision: 0 }); }

btnPaseo.onclick = () => {
  if (dejarDeSeguir) {
    dejarDeSeguir(); dejarDeSeguir = null;
    btnPaseo.textContent = '🚶 Activar modo paseo';
    estado.hidden = true; marcaYo?.remove(); marcaYo = null; ultimoAviso = null;
  } else activarPaseo();
};

// Abrir directamente un POI si viene en la URL: mapa.html?poi=catedral
const inicial = datos.pois.find(p => p.id === parametro('poi'));
if (inicial) { mapa.setView([inicial.lat, inicial.lon], 17); abrirFicha(inicial); }
