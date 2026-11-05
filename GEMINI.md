# Río Gallegos Inmersivo: contexto para trabajar en este proyecto

Este archivo es para que otra IA (Gemini, Claude u otra) entienda el proyecto y pueda seguir trabajando. Leelo completo antes de tocar algo.

## Qué es

Web app de turismo para Río Gallegos (Santa Cruz, Argentina). La persona camina por la ciudad y, al llegar a un lugar histórico, **se abre solo un "portal al pasado"**:
1. **HOY:** el lugar como está ahora (la cámara del celular; si no hay cámara, una foto actual o Google Street View).
2. **El anillo:** un anillo dorado con la foto antigua adentro.
3. **Adentro:** las fotos antiguas a pantalla completa mientras una voz cuenta la historia, con subtítulos. Al terminar se cierra solo.

- **Sitio publicado:** https://lanarito.github.io/rg-virtual/
- **Repo:** https://github.com/lanarito/rg-virtual (rama `main`; cada push publica solo con GitHub Pages en 1 o 2 minutos).
- **Dueño:** Luis (GitHub `lanarito`), de Río Gallegos. Habla español rioplatense e informal. Usa Android. Lo va a presentar a la Municipalidad.

## Cómo quiere trabajar Luis (importante)

- **Simple ante todo:** pocos botones, nada que haya que explicar, para todo público. Un solo botón "Empezar". El portal se abre solo; la voz y la música arrancan solas.
- **Sin aclaraciones ni carteles de "prototipo" o "propuesta":** la app tiene que verse como va a quedar.
- **Las fotos de cada portal tienen que corresponder a ese lugar,** o a algo que la narración nombra en ese momento. Nunca fotos de otro lugar "de relleno" (ejemplo de lo que molesta: la Catedral mostrando la pingüinera).
- Avanzá sin pedir permiso para cosas de código, y **subí los cambios** (commit y push) cuando estén probados.
- Respondé en español rioplatense, con voseo.

## Reglas que no se rompen

- **El repo `rg-virtual` tiene que quedar público.** Si se pasa a privado, GitHub Pages se apaga y el link y el QR impreso dejan de andar (ya pasó una vez).
- **No cambiar otros repos de la cuenta** ni sus visibilidades. **Nunca pausar ni tocar los proyectos ODONPEI ni VP3** (ni en GitHub ni en Google Cloud).
- **Costos de Google en cero:** la clave de Google Maps del sitio está en `modules/core.js` (`CLAVE_GOOGLE_SITIO`). Es pública a propósito y está protegida en Google Cloud (proyecto `project-b33e3c50-155a-4b01-9d1`):
  - solo funciona desde `https://lanarito.github.io/*` y `localhost:5173` / `localhost:5443`;
  - solo para Maps JavaScript API, Map Tiles API y Street View Static API;
  - con topes diarios por debajo de lo gratis: 3D 30/día, Maps/Street View 150/día, imagen Street View 300/día; el resto en 0;
  - y una alerta de presupuesto de USD 1.
  
  **No subas topes, no agregues APIs y no saques restricciones** sin preguntarle a Luis.
- **No subir al repo** las carpetas `links/`, `fotos-para-revisar/` ni `muestras-voz/` (están en `.gitignore`).
- Las fotos de **Foto Roil** (archivo fotográfico local, postales de 1920 a 1960) se usan con el crédito "Foto Roil".

## Estructura

```
index.html            App principal: inicio (escudo 3D + idioma + "Empezar") y mapa con portales
ciudad3d.html         Vuelo 3D tipo drone (Cesium + Google 3D Tiles) con portal en cada lugar
config.html           Ajustes (clave propia, voz, créditos). No está a la vista: link chico en el inicio
paseo360.html         Street View (diseño viejo; no se muestra en el inicio)
mapa.html, portal.html  Redirecciones a index.html (links viejos)
css/app.css           Todos los estilos (portal, pines dorados, tarjeta, escudo 3D, etc.)
modules/
  core.js             Datos (carga pois + traducción), ajustes, GPS, narración (un solo <audio> reutilizado
                      por iPhone), eventos narracion:inicio/fin, clave de Google
  i18n.js             Idiomas es/en/pt: textos de pantallas, t(), idioma(), traducirPagina() (data-t / data-t-aria)
  app.js              Mapa Leaflet, GPS, tarjeta "próximo portal", apertura automática al llegar,
                      recorrido completo (modo lejos o stand)
  portal.js           El portal en 3 etapas; fotos sincronizadas con la frase que se narra
  ciudad3d.js         Vuelo drone en línea recta entre portales (orden por cercanía)
  sonido.js           Música ambiental generada con WebAudio (viento + acordes), whoosh y campanita
data/
  pois.json           Los 20 lugares (fuente de verdad, en español)
  traducciones.json   en/pt: nombre, resumen y texto por id; títulos de fotos (clave = título en español)
assets/
  audio/              mp3 en español (Valentina); audio/en (Ava) y audio/pt (Francisca)
  fotos/actuales/     Fotos de hoy (Wikimedia Commons)
  fotos/historicas/   Fotos antiguas de Wikimedia, Gutenberg y Field Museum
  fotos/roil/         Postales de Foto Roil (colección de Luis)
  marca/              Escudo de la Municipalidad (PNG sin fondo + GIF animado)
qr/                   QR y cartel A4 para imprimir
tools/generar-audios.py  Genera las voces con edge-tts
```

Stack: HTML, CSS y JavaScript con módulos ES, **sin compilar**. Librerías por CDN: Leaflet 1.9.4 y Cesium 1.145.0. Mapa base de OpenStreetMap.

## Modelo de datos (`data/pois.json`)

Cada lugar (POI) tiene:
- `id`, `nombre`, `categoria`, `lat`, `lon`;
- `radio`: metros para que se abra el portal al llegar;
- `resumen`, `texto` (lo que narra la voz), `audio` (`assets/audio/<id>.mp3`);
- `streetView` (si existe, se usa Street View como "HOY" cuando no hay foto actual), `camara3d`, `portal: true`;
- `fotosActuales[]`: la primera es la imagen de "HOY";
- `fotosHistoricas[]`, donde cada foto tiene:
  - `archivo`, `titulo`, `anio` (número o texto como `"c. 1940"`, `"s/f"`), `autor`, `licencia`, `fuente`, `nota`;
  - `relacion`: `"lugar"` (es de ese sitio) o `"epoca"` (misma historia, otro lugar). La app lo muestra;
  - **`desdeFrase`:** en qué frase de la narración aparece (0 = primera frase; 2.5 = mitad de la tercera). Las frases se cortan por `.`, `!` y `?`, y la cantidad de frases coincide entre es, en y pt.

**Si cambiás un texto** en `pois.json` o en `traducciones.json`: mantené la misma cantidad de frases en los 3 idiomas, revisá los `desdeFrase` y regenerá los audios.

## Voces

```bash
pip install edge-tts
python tools/generar-audios.py . catedral            # un lugar, los 3 idiomas
python tools/generar-audios.py . --idioma es         # todo en español
python tools/generar-audios.py . --frases            # frases de la app (bienvenida, etc.)
```

- **Español:** `es-UY-ValentinaNeural` (rioplatense), velocidad -10%, tono -2 Hz y pausas suaves entre frases. Luis la eligió: no la cambies sin preguntar.
- **Inglés:** `en-US-AvaNeural`. **Portugués:** `pt-BR-FranciscaNeural`.
- Los textos de las frases de la app están en `modules/i18n.js` (`frase.*`).

## Probar

```bash
npm install
npx vite --host --port 5173 --config vite.http.config.js   # http://localhost:5173 (la clave de Google anda en este puerto)
npm run dev                                                # https://localhost:5443 para probar desde el celu
```

- `index.html?simular=1`: tocar el mapa simula caminar.
- Si estás a más de 20 km de la ciudad, aparece la tarjeta "Ver todos los portales" (recorrido completo).
- Antes de subir, probá en un navegador con vista de celular (390 x 844) y revisá la consola.

## Publicar

```bash
git add -A && git commit -m "..." && git push    # Pages se actualiza solo
```

## Estado actual (noviembre de 2026)

- 20 portales con fotos curadas y sincronizadas con la voz. Hay 39 postales de Roil en uso (45 procesadas en `assets/fotos/roil/`).
- 3 idiomas, voz y música automáticas, vuelo 3D tipo drone, QR y cartel listos.
- Probado en Chrome de escritorio con vista de celular. **Falta probarlo en un iPhone real.**

## Pendientes e ideas

- Portales con pocas fotos: Municipalidad, Escuela N°1, Casa de Gobierno, María Auxiliadora, Malvinas, Museo Padre Molina, Laguna Azul y Cabo Vírgenes.
- Fotos de Roil sin identificar: un edificio de ladrillo con balcón y reloj (FOTO4 y FOTO68), la esquina exacta del reloj de columna de calle Roca y la escuela de madera de la foto de las alumnas.
- Textos con `"verificado": false`: confirmarlos con el Museo o el Archivo Histórico.
- Completar `tomada` (lat, lon, rumbo) de las fotos, para alinear el "antes" con la cámara.
- La VR para Meta Quest quedó pendiente, para cuando Luis tenga los lentes.
- Inglés y portugués todavía no tienen el tratamiento de voz más suave del español.

## Si trabajan dos IAs a la vez

- **Roles:** **Gemini** es el cerebro/arquitecto (analiza, planifica y define las tareas con Luis) y **Claude** ejecuta las órdenes técnicas y cambios que queden anotados en la sección **Tablero de órdenes (Gemini → Claude)**.
- Antes de empezar, `git pull`. Hacé commits chicos y descriptivos, y `git push` al terminar.
- No editen el mismo archivo al mismo tiempo. Avísenle a Luis qué archivos están tocando.
- Al terminar una tarea, marcá la orden como `[x]` en el tablero y agregá una línea abajo, en "Registro de cambios", con la fecha, quién y qué.

## Tablero de órdenes (Gemini → Claude)

*(Acá Gemini deja las instrucciones detalladas para que Claude las ejecute. Claude: leé siempre esta sección antes de actuar y marcá con `[x]` lo completado).*

- [ ] *(Sin órdenes pendientes — esperando indicaciones de Luis)*

**Formato sugerido para cada orden:** `- [ ] (fecha) Qué hacer, en qué archivos, y cómo saber que quedó bien.`

**Órdenes que necesitan el OK de Luis antes de ejecutarse** (Claude las deja en espera y pregunta acá abajo): cualquier cosa con posible costo (topes, APIs o servicios pagos de Google), cambiar la visibilidad del repo, borrar archivos o fotos, publicar fotos sin permiso confirmado, o tocar otros proyectos (ODONPEI y VP3 nunca).

## Respuestas y dudas (Claude → Gemini)

*(Acá Claude deja el resultado de cada orden, las preguntas cuando algo no está claro y los problemas que encontró. Gemini: leé esta sección antes de dar nuevas órdenes. Lo más nuevo, arriba).*

- 2026-11-05 — Claude: canal listo. Leo este archivo al empezar cada sesión y cada vez que Luis me lo pide. Cuando termine una orden, la marco `[x]` en el tablero y dejo acá qué hice, qué probé y el commit.

## Registro de cambios

- 2026-11-05 (Claude): se crea este archivo de contexto.
- 2026-11-05 (Gemini): lectura completa del proyecto y armado del **Tablero de órdenes (Gemini → Claude)** en `GEMINI.md` para coordinar el trabajo.
