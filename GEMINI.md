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

- 21 portales (se sumó la Barraca Amberense) con fotos curadas y sincronizadas con la voz.
- Un portal sin fotos antiguas (por ahora, la Escuela N°1) muestra solo el HOY mientras narra.
- 3 idiomas, voz y música automáticas, vuelo 3D tipo drone, QR y cartel listos.
- Probado en Chrome de escritorio con vista de celular. **Falta probarlo en un iPhone real.**

## Pendientes e ideas

- **Municipalidad sin foto antigua** (solo HOY). Portales con pocas fotos: Escuela N°1, Casa de Gobierno, María Auxiliadora, Malvinas, Museo Padre Molina, Laguna Azul y Cabo Vírgenes.
- Fotos de Roil sin identificar: un edificio de ladrillo con balcón y reloj (FOTO4 y FOTO68), la esquina exacta del reloj de columna de calle Roca (La foto "de las alumnas" resultó ser la primera Gobernación: ya está en el Balcón de Roca.)
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

- [ ] **Orden #5 (2026-11-05): Generar en el Escritorio de Luis el archivo PDF `C:\Users\luis\Desktop\Rio-Gallegos-Inmersivo-Guia-y-Modalidades.pdf` con el resumen completo del funcionamiento, modalidades de visita, GPS/Street View, VR y fotos/capturas explicativas.**

  **Pedido de Luis:** Luis pidió un resumen completo de cómo funciona el seguimiento al caminar (GPS, distancia al próximo punto, Street View), todas las modalidades de visita que tiene la app y cómo funciona con VR, dejado también en formato **PDF en su Escritorio (`C:\Users\luis\Desktop\Rio-Gallegos-Inmersivo-Guia-y-Modalidades.pdf`)** con fotos explicativas del funcionamiento.

  ### Qué tenés que hacer:
  1. Gemini ya armó la maqueta base ilustrada en `fotos-para-revisar/guia-rio-gallegos-inmersivo.html`.
  2. Con **Puppeteer** (que ya tenés instalado y funcionando):
     - Tomá capturas reales de la app en vista de celular (390×844):
       1. La pantalla de inicio (`index.html` con el escudo 3D y el botón "Empezar").
       2. El mapa con el punto azul de GPS (`index.html?simular=1`) mostrando la tarjeta inferior con el próximo portal y la distancia en metros (`"a ... m al ..."`).
       3. Las 3 etapas de un portal (`HOY`, `El anillo dorado` abriéndose y `Adentro` con foto histórica y subtítulo).
       4. El vuelo 3D (`ciudad3d.html`) y el Paseo 360 (`paseo360.html`).
     - Incorporá esas capturas reales en `fotos-para-revisar/guia-rio-gallegos-inmersivo.html` (o enriquecé el HTML que dejó Gemini) y exportalo con `page.pdf({ path: 'C:/Users/luis/Desktop/Rio-Gallegos-Inmersivo-Guia-y-Modalidades.pdf', format: 'A4', printBackground: true })`.
  3. Verificá que `C:\Users\luis\Desktop\Rio-Gallegos-Inmersivo-Guia-y-Modalidades.pdf` exista y tenga todas las imágenes cargadas, marcá `[x]` esta Orden #5 y avisá en `Respuestas y dudas`.

- [x] **Orden #4 (2026-11-05): Cargar la foto actual del Instituto María Auxiliadora (`ima-actual-3.jpg`) en `maria-auxiliadora.fotosActuales` con el OK expreso de Luis.**

  **Confirmación de Luis:** Le mostré a Luis la foto `fotos-para-revisar/nuevas-escritorio/candidatas/ima-actual-3.jpg` (el ingreso real del Colegio María Auxiliadora en Río Gallegos, altura 521) y confirmó expresamente: *"si metamos esa"*.

  ### Qué tenés que hacer:
  1. Tomá `fotos-para-revisar/nuevas-escritorio/candidatas/ima-actual-3.jpg` y guardala como JPEG real optimizado en `assets/fotos/actuales/ima-actual-hoy.jpg` (podés dejarla completa con el crédito en `autor: "La Opinión Austral"` o como prefieras según la regla de créditos).
  2. En `data/pois.json` (`maria-auxiliadora.fotosActuales`), agregá:
     - `archivo`: `"assets/fotos/actuales/ima-actual-hoy.jpg"`
     - `titulo`: `"Fachada actual del Colegio María Auxiliadora"`
     - `autor`: `"La Opinión Austral"`, `licencia`: `"Difusión periodística"`
  3. Verificá que el título `"Fachada actual del Colegio María Auxiliadora"` esté en `data/traducciones.json` (`en.fotos` y `pt.fotos`).
  4. Subí `VERSION` en `modules/core.js` a `'2026-11-05d'`, hacé `commit` y `push` a `main`, marcá `[x]` esta Orden #4 y dejá el reporte en `Respuestas y dudas`.

- [x] **Orden #3 (2026-11-05): Reemplazar las fotos de "HOY" (`fotosActuales`) por las fotografías actuales descargadas en `fotos-para-revisar/nuevas-escritorio/` (con el OK expreso de Luis) en Casa de Gobierno, Instituto María Auxiliadora, Barcaza Swift, Palacio Municipal, Avenida Roca y Costanera.**

  **Importante (autorización de Luis):** Luis subió personalmente la foto actual de la **Casa de Gobierno** (pintada de blanco y gris, como está hoy; la foto de 2015 color terracota ya quedó vieja) y pidió expresamente que usemos fotografías reales actuales descargadas de la web en lugar de depender de capturas en vivo de Street View o de fotos viejas. Gemini ya buscó, descargó y revisó visualmente una por una las fotos en `fotos-para-revisar/nuevas-escritorio/`. **Tenés el OK expreso de Luis para procesarlas, guardarlas en `assets/fotos/` y publicarlas.**

  ### Paso 1: Procesar y copiar las fotos desde `fotos-para-revisar/nuevas-escritorio/` a `assets/fotos/`
  *(Nota técnica: algunos archivos descargados tienen bytes en formato WebP aunque terminen en `.jpg`; abrí cada uno con `PIL.Image` en Python, convertilo a `RGB` y guardalo como JPEG real optimizado en `assets/fotos/`).*

  1. **Casa de Gobierno (`casa-de-gobierno`):**
     - Tomá `fotos-para-revisar/nuevas-escritorio/casa-de-gobierno-actual.jpg` (la foto subida por Luis que muestra el pórtico actual blanco y gris con las banderas) y guardala como JPEG real en `assets/fotos/actuales/casa-de-gobierno.jpg` (reemplazando la foto vieja de 2015).
     - En `data/pois.json` (`casa-de-gobierno.fotosActuales[0]`), actualizá el objeto a:
       - `archivo`: `"assets/fotos/actuales/casa-de-gobierno.jpg"`
       - `titulo`: `"Pórtico de la Casa de Gobierno de Santa Cruz hoy"`
       - `autor`: `"Gobierno de Santa Cruz"`, `licencia`: `"Difusión oficial"`

  2. **Instituto María Auxiliadora (`maria-auxiliadora`):**
     - Tomá `fotos-para-revisar/nuevas-escritorio/candidatas/ima-actual-2.jpg` (foto diurna soleada de la fachada blanca actual con el cartel `"COLEGIO MARIA AUXILIADORA"`) y guardala en `assets/fotos/actuales/ima-actual.jpg`.
     - En `data/pois.json` (`maria-auxiliadora.fotosActuales`), agregá:
       - `archivo`: `"assets/fotos/actuales/ima-actual.jpg"`
       - `titulo`: `"Fachada actual del Colegio María Auxiliadora"`
       - `autor`: `"Colegio María Auxiliadora"`, `licencia`: `"Difusión institucional"`

  3. **Barcaza Swift (`frigorifico-swift`):**
     - **Foto de HOY:** Tomá `fotos-para-revisar/nuevas-escritorio/candidatas/barcaza-swift-3.jpg` (foto limpia de la Barcaza Swift restaurada, pintada de blanco y rojo sobre la costanera e iluminada) y guardala como JPEG real en `assets/fotos/actuales/barcaza-swift-actual.jpg`.
     - En `data/pois.json` (`frigorifico-swift.fotosActuales`), agregá:
       - `archivo`: `"assets/fotos/actuales/barcaza-swift-actual.jpg"`
       - `titulo`: `"La Barcaza Swift restaurada en la costanera"`
       - `autor`: `"Municipalidad de Río Gallegos"`, `licencia`: `"Difusión oficial"`
     - **Bonus foto histórica del muelle Swift:** Tomá `fotos-para-revisar/nuevas-escritorio/candidatas/barcaza-swift-1.jpg` (postal histórica de Foto Roil del muelle del Frigorífico Swift nevado en invierno, archivo Mi Río Gallegos) y guardala como JPEG real en `assets/fotos/roil/muelle-swift-invierno.jpg`. Sumala en `frigorifico-swift.fotosHistoricas` con `titulo`: `"El muelle del Frigorífico Swift en invierno"`, `anio`: `"c. 1930"`, `relacion`: `"lugar"`, `autor`: `"Foto Roil"`, `licencia`: `"Postal antigua – Mi Río Gallegos"`, `desdeFrase`: `1.5`.

  4. **Palacio Municipal (`municipalidad`):**
     - Tomá `fotos-para-revisar/nuevas-escritorio/candidatas/municipalidad-actual-1.jpg` (vista limpia de la esquina y fachada del Palacio Municipal con su techo rojo y banderas, sin marcas de agua) y guardala en `assets/fotos/actuales/municipalidad-actual.jpg`.
     - Además, tomá `fotos-para-revisar/nuevas-escritorio/candidatas/municipalidad-actual-2.jpg` (frente de la entrada con las letras azules `"MUNICIPALIDAD DE RIO GALLEGOS"`), **recortale los 50 píxeles inferiores** (donde está el zócalo azul del diario) y guardala en `assets/fotos/actuales/municipalidad-frente.jpg`.
     - En `data/pois.json` (`municipalidad.fotosActuales`), poné primero `municipalidad-actual.jpg` (`titulo`: `"El Palacio Municipal de Río Gallegos hoy"`, `autor`: `"Municipalidad de Río Gallegos"`, `licencia`: `"Difusión oficial"`) y segunda `municipalidad-frente.jpg` (`titulo`: `"Ingreso principal a la Municipalidad sobre la Av. San Martín"`).
     - *(Con esto además se arregla el pin del mapa y la miniatura de `portada(poi)` de `municipalidad`, que habían quedado vacíos al no tener ni `fotosActuales` ni `fotosHistoricas`).*

  5. **Avenida Roca / Kirchner (`avenida-roca`):**
     - Tomá `fotos-para-revisar/nuevas-escritorio/candidatas/avenida-roca-actual-1.jpg` (foto diurna en alta resolución del centro comercial de la Av. Kirchner hoy) y guardala optimizada (~1400px de ancho) en `assets/fotos/actuales/avenida-kirchner-actual.jpg`.
     - En `data/pois.json` (`avenida-roca.fotosActuales`), poné `assets/fotos/actuales/avenida-kirchner-actual.jpg` (`titulo`: `"La Avenida Presidente Néstor Kirchner (ex Roca) en la actualidad"`, `autor`: `"Municipalidad de Río Gallegos"`, `licencia`: `"Difusión oficial"`), dejando `assets/fotos/actuales/centro.jpg` como segunda foto en `fotosActuales`.

  6. **Costanera y mirador de la ría (`costanera`):**
     - Tomá `fotos-para-revisar/nuevas-escritorio/candidatas/costanera-actual-1.jpg` (foto soleada del paseo costanero actual junto a la ría) y guardala en `assets/fotos/actuales/costanera-paseo.jpg`.
     - En `data/pois.json` (`costanera.fotosActuales`), poné `assets/fotos/actuales/costanera-paseo.jpg` en **primer lugar (`fotosActuales[0]`)** (`titulo`: `"Paseo de la costanera junto a la ría de Río Gallegos hoy"`, `autor`: `"Turismo Río Gallegos"`, `licencia`: `"Difusión oficial"`), seguida por `assets/fotos/actuales/costanera-cartel.jpg` en `fotosActuales[1]`.

  ### Paso 2: Traducciones, versión de caché y publicación
  1. Agregá en `data/traducciones.json` (`en.fotos` y `pt.fotos`) las traducciones de los títulos nuevos de fotos.
  2. Subí `VERSION` en `modules/core.js` (de `'2'` a `'3'`) y pasá también `conVersion(url)` a las imágenes de `fotosActuales` / `fotosHistoricas` o verificá que carguen las nuevas sin caché viejo.
  3. Verificá que los 21 portales tengan imagen válida en `portada(poi)`, hacé `commit` y `push` a `main`, marcá `[x]` esta Orden #3 y dejá el reporte en `Respuestas y dudas`.

- [x] **Orden #2 (2026-11-05): Corregir voz unificada (Valentina en los 21 puntos, sin caída a voz española del navegador, sin demora al hablar y pronunciando "I C F"), limpiar fotos viejas en memoria entre portales, corregir fotos de Municipalidad/Escuela 1/Balcón de Roca/Hotel Argentino y actualizar las fotos de "HOY" feas o desactualizadas.**

  Luis probó todos los puntos uno por uno y detectó los siguientes problemas que hay que resolver de forma definitiva:

  ### 1. Audio y narración: misma voz en los 21 portales (la de Monumento a Malvinas), arranque inmediato y pronunciación de "YCF"
  - **Problema detectado:**
    1. En varios portales (`plaza-san-martin`, `puerto-viejo`) salió otra voz (incluso una voz española de España diciendo *"igriega ce efe"*), y en otros (`escuela-1`, `hotel-argentino`, `fundacion`, `barraca-amberense`) directamente no se escuchó nada ni apareció texto, o tardó mucho en empezar a hablar (`avenida-roca`, `balcon-de-roca`, `plaza-san-martin`).
    2. **Causa técnica en `modules/core.js` y `modules/portal.js`:**
       - Cuando el internet anda lento o se cambia de portal, `a.play()` o la descarga del `.mp3` falla/aborta y `reproducir()` dispara `respaldo()` → `hablarInterno()` (`speechSynthesis` del navegador), que en el dispositivo de Luis usa una voz **española (`es-ES`)** o se cuelga muda.
       - Además, en `portal.js` hay un `despues(0.6, ...)` antes de llamar a `narrar()`, en `ciudad3d.js` hay un `setTimeout` de `1200ms` antes de abrir el portal, y el subtítulo (`subt.textContent`) queda vacío hasta que el `.mp3` descarga y dispara `ontimeupdate`.
  - **Qué tenés que hacer:**
    1. **En `tools/generar-audios.py`:**
       - Agregá una función de normalización fonética para español (`es`) antes de enviar el texto a `edge-tts` (sin cambiar `pois.json`, para que en pantalla siga diciendo `YCF`, `N°1`, etc.):
         - Reemplazar `"YCF"` por `"I C F"` (para que Valentina diga *"i ce efe"* y nunca *"igriega ce efe"*).
         - Reemplazar `"N°1"` / `"N° 1"` por `"Número 1"`.
       - Bajá la pausa extra de `con_pausas(texto)` después del nombre del POI (o no le agregues `.. ` al título inicial) para que no haya un silencio largo entre el título y la primera frase.
       - **Regenerá los 21 audios en español (`python tools/generar-audios.py . --idioma es`)** con `es-UY-ValentinaNeural` para garantizar que **absolutamente todos los puntos** tengan exactamente la misma voz que `malvinas.mp3`.
    2. **En `modules/core.js` (`reproducir` y `elegirVoz`):**
       - Como los 21 POIs tienen su `.mp3` grabado en el repo, cuando `usarGrabada()` es `true`:
         - Antes de cambiar `a.src`, hacé `a.pause(); a.removeAttribute('src'); a.load();` si hacía falta, o manejá la promesa de `a.play()` para que si rechaza por `AbortError` o demora de red, **reintente reproducir el `.mp3` cuando dispare `canplay` / `loadeddata`** en lugar de saltar enseguida a `respaldo()` (`speechSynthesis`).
         - Prohibí que `elegirVoz()` elija una voz `es-ES` (España) salvo que el usuario la haya elegido manualmente en Ajustes; preferí siempre esperar al `.mp3` de Valentina.
    3. **En `modules/portal.js` y `modules/ciudad3d.js` (arranque inmediato sin perder tiempo):**
       - En `portal.js`, **eliminá el `despues(0.6, ...)`**: llamá a `narrar(poi, ...)` **de inmediato (0 ms)** apenas se abre el portal.
       - En `portal.js`, apenas se abre el portal (antes de que empiece a sonar el audio), poné **de inmediato la primera frase en el subtítulo**: `subt.textContent = lineas[0] || poi.texto;`. Así nunca queda un portal mudo y sin texto si el internet tarda en bajar el `.mp3`.
       - Reducí `SEGUNDOS_HOY` de `4.5` a `3.2` y `SEGUNDOS_ANILLO` de `2.6` a `2.0` para que la transición sea más ágil.
       - En `ciudad3d.js` (línea 155), reducí la espera antes de `abrirPortal` de `1200` ms a `250` ms.
       - En `precargar(poi)` (`portal.js`), precargá también el audio (`if (poi.audio) { const a = new Audio(); a.preload = 'auto'; a.src = poi.audio; }`).

  ### 2. Bug de fotos fantasma entre portales con internet lento (`modules/portal.js`)
  - **Problema detectado:** Al entrar al **Museo Padre Molina** después del **Museo de los Pioneros**, Luis vio la foto de la **Casa Parisi** (y en otros portales tardaban en aparecer las fotos).
  - **Causa técnica:** `capa` reutiliza los mismos elementos `<img class="portal-presente-foto">`, `<img class="portal-foto a">` y `<img class="portal-foto b">`. Al abrir un nuevo portal, se asigna `fotoHoy.src = ...` e `imgA.src = ...` sin limpiar antes la imagen anterior; con internet lento, mientras descarga la foto nueva se sigue viendo la foto del portal anterior (y `imgB.src` ni siquiera se limpiaba). Además, en `museo-padre-molina`, las 3 fotos actuales puestas en `fotosHistoricas` reciben el filtro `sepia(.35)` de `.portal-foto`, haciéndolas parecer fotos viejas.
  - **Qué tenés que hacer en `modules/portal.js` y `css/app.css`:**
    1. Al inicio de `abrirPortal(poi)` (y en `cerrar()`), limpiá inmediatamente las tres imágenes (`fotoHoy.removeAttribute('src'); imgA.removeAttribute('src'); imgB.removeAttribute('src'); imgA.classList.remove('activa'); imgB.classList.remove('activa');`) para que jamás quede visible una foto del portal anterior mientras carga la nueva.
    2. Cuando una foto de `fotosHistoricas` tiene `anio === 'Hoy'` (como las salas de paleontología del Museo Padre Molina), agregale una clase `.actual` al `<img class="portal-foto">` (por ejemplo `siguiente.classList.toggle('actual', f.anio === 'Hoy')`) y en `css/app.css` poné `.portal-foto.actual { filter: none; }` para que las fotos actuales del Museo Molina se vean con sus colores reales y no en sepia.

  ### 3. Corrección de Street View (`heading` faltante) y actualización de las fotos de "HOY" (actualidad) en 6 lugares
  - **Bug en `modules/portal.js` (`imagenDeHoy`, línea 56):**
    - `URLSearchParams` para Street View Static API **no estaba enviando el parámetro `heading`**, por lo que Google devolvía la cámara apuntando a cualquier lado de la calle (autos estacionados, paredones o terrenos vacíos).
    - **Corregí `imagenDeHoy(poi)`** en `portal.js` para incluir siempre `heading: String(poi.streetView.heading ?? 0)`.
  - **Además, actualizá las imágenes de "HOY" (`fotosActuales`) en estos 6 puntos donde Luis pidió una foto actual linda y clara:**
    1. **Avenida Roca (`avenida-roca`):**
       - La foto actual (`assets/fotos/actuales/avenida-roca.jpg`, de 2006 con el parabrisas de un auto tapando toda la toma y un pasacalle al revés) **no va más**.
       - Reemplazala en `avenida-roca.fotosActuales` por `assets/fotos/actuales/centro.jpg` (que ya está en el repo y muestra la avenida arbolada y los edificios del centro en un día soleado) o buscá en Wikimedia Commons / Street View con `heading` exacto una foto actual impecable de la Av. Kirchner / Roca y el Club Británico.
    2. **Hotel Argentino (`hotel-argentino`):**
       - Luis pidió: *"pone una foto de donde seria el lugar en el que se encuentra por mas que el hotel hoy no este desir aca se encontraba y se muestra una buena foto actual, tampoco tiene locucion el lugar y no puede no decir nada del hotel algo se tiene que poder saber leer y escuchar"*.
       - Configurá una imagen actual clara de la esquina de **Chacabuco y Av. Kirchner (ex Roca)** (ya sea descargando una foto actual libre o ajustando las coordenadas exactas de la esquina `-51.62215, -69.21335` y el `heading` exacto hacia la esquina en Street View / guardando la imagen en `assets/fotos/actuales/esquina-hotel-argentino-hoy.jpg`) con `titulo`: `"Esquina de Chacabuco y Av. Kirchner hoy, donde estuvo el Hotel Argentino"`.
       - Actualizá el `texto` de `hotel-argentino` (y sus traducciones en `en` y `pt`, manteniendo 4 frases, y regenerá su audio) para que diga claramente que aunque el edificio original ya no está, ahí mismo se levantaba el hotel:
         - **ES (4 frases):** `"En esta esquina de Chacabuco y la avenida principal se levantaba el histórico Hotel Argentino, aunque su antiguo edificio hoy ya no existe. Fue uno de los primeros grandes hoteles del centro de Río Gallegos y ya aparece en fotografías de principios de la década de 1920. Foto Roil lo retrató varias veces con los primeros automóviles del pueblo estacionados frente a su puerta. Por sus habitaciones y su salón pasaron estancieros, viajantes y familias recién llegadas a la Patagonia."`
    3. **Casa de Gobierno (`casa-de-gobierno`):**
       - La foto `assets/fotos/actuales/casa-de-gobierno.jpg` se ve vieja, lavada y con una pintada en el paredón. Buscá en Wikimedia Commons otra foto actual más limpia y luminosa de la Casa de Gobierno de Santa Cruz (o mejorá/recortá la toma actual / ajustá Street View apuntando de frente al pórtico de Alcorta 231) para que la vista de "HOY" se vea impecable.
    4. **Instituto María Auxiliadora (`maria-auxiliadora`):**
       - Hoy tiene `fotosActuales: []` y el Street View sin `heading` mostraba cualquier cosa ("horrible"). Buscá en Wikimedia Commons una foto actual del edificio del Instituto María Auxiliadora / Salesiano en Río Gallegos o configurá la coordenada y el `heading` exactos de la fachada actual del colegio sobre la esquina para que la imagen de "HOY" muestre claramente el colegio actual.
    5. **Barcaza Swift (`frigorifico-swift`):**
       - Hoy tiene `fotosActuales: []` y el Street View sin `heading` se ve feo y no muestra la barcaza. Buscá en Wikimedia Commons una foto actual de la **Barcaza Swift** en la costanera de Río Gallegos (o ajustá la coordenada exacta donde está emplazada la barcaza en la costanera y el `heading` directo hacia el casco de la barcaza) para que en "HOY" se vea bien la Barcaza Swift.
    6. **Costanera y mirador de la ría (`costanera`):**
       - En `costanera.fotosActuales`, la primera foto (`fotosActuales[0]`, que el portal usa como imagen de "HOY") es `viejo-muelle-costanera.jpg` (una foto vieja y amarillenta). Pasá `assets/fotos/actuales/costanera-cartel.jpg` (la foto moderna y colorida del cartel "COSTANERA RGL" frente a la ría) al **primer lugar (`fotosActuales[0]`)** (o sumá una foto panorámica actual de la costanera en primer lugar) para que al abrir el portal de la Costanera se vea una foto bien actual.

  ### 4. Correcciones de fotos históricas y textos en Palacio Municipal, Escuela N°1 y Balcón de Roca
  1. **Palacio Municipal (`municipalidad`):**
     - Luis detectó con toda razón que `assets/fotos/roil/avenida-san-martin.jpg` muestra el edificio del **Correo Argentino**, NO el Palacio Municipal. **Eliminá `avenida-san-martin.jpg` de `municipalidad.fotosHistoricas`**.
     - Sobre la segunda foto (`correa-falcon-1928.jpg`, el retrato del caballero): Luis dijo *"despues viene la foto de un caballero que no se quien es si tiene algo que ver con el palacio municipal queda"*. Edelmiro Correa Falcón fue gobernador interino del Territorio (no intendente municipal, y ya aparece en `avenida-roca`).
     - Revisá en `fotos-para-revisar/rio gallegos viejas/` (por ejemplo las fotos de Av. San Martín / centro) y en Wikimedia Commons si hay alguna foto histórica donde se vea el edificio de la Municipalidad (Av. San Martín 791, inaugurado en 1927) y una foto actual del Palacio Municipal para `fotosActuales`.
     - Mejorá el `texto` de `municipalidad` (sacando la frase dudosa *"Dato a confirmar: el edificio sería de 1925"*) para contar datos firmes de la Municipalidad de Río Gallegos (por ejemplo, que el primer Concejo Municipal se constituyó en 1904 presidido por Juan Ferrari, y que el edificio histórico sobre la Avenida San Martín, vecino a la Catedral, es desde hace casi un siglo la sede del gobierno de la ciudad). Si dejás o sacás a Correa Falcón según las fotos que encuentres, mantené sincronizados los 3 idiomas y regenerá el audio `municipalidad.mp3`.
  2. **Escuela N°1 Hernando de Magallanes (`escuela-1`):**
     - Al haber quedado con `fotosHistoricas: []`, el portal no abría el anillo dorado.
     - Agregá en `escuela-1.fotosHistoricas` la foto `assets/fotos/roil/alumnas-escuela.jpg` (que ya está en el repo y muestra escolares frente a un antiguo edificio escolar de chapa de la época: `titulo`: `"Escolares frente a un edificio escolar de chapa de la época"`, `anio`: `"c. 1935"`, `relacion`: `"epoca"`, `autor`: `"Colección particular"`, `desdeFrase`: `0`), y fijate en `fotos-para-revisar/rio gallegos viejas/` o Wikimedia si hay otra foto histórica de la Escuela N°1 para sumar. Así la Escuela N°1 vuelve a abrir su anillo dorado con foto antigua y voz inmediata.
  3. **Balcón de Roca (`balcon-de-roca`):**
     - Luis preguntó por la foto del barco (`abrazo-del-estrecho-1899.jpg`): *"hay se ve la foto de un barco tiene que ver en algo con el balcon ? de ser asi que quede nomas"*.
     - **Sí tiene que ver:** es la foto de Roca en la cubierta del barco durante el viaje del Abrazo del Estrecho en febrero de 1899, el mismo viaje en el que bajó en Río Gallegos y habló desde este balcón. **Dejala**, pero cambiale el `titulo` (en `pois.json` y `traducciones.json`) a: `"El presidente Roca a bordo durante el viaje al sur de 1899 en el que habló desde este balcón"`, así cualquier persona que mira la foto entiende al instante por qué está ese barco ahí.

  ### 5. Verificación y publicación
  - Agregá un parámetro de versión (ej. `fetch('data/pois.json?v=2')`) o cache-busting liviano si hace falta para que el navegador del celu no muestre datos viejos en caché.
  - Probá que los 21 portales abran sin fotos fantasma del portal anterior, que el subtítulo aparezca en el segundo 0, que todos hablen de inmediato con la voz de Valentina (igual a Malvinas), y que `puerto-viejo` pronuncie *"I C F"*.
  - Hacé `commit` y `push` a `main`, marcá `[x]` esta Orden #2 y dejá el reporte en `Respuestas y dudas`.

- [x] **Orden #1 (2026-11-05): Incorporar las 20 fotos nuevas del Escritorio (8 portales existentes + 1 nuevo portal "Barraca Amberense"), actualizar textos/traducciones, generar audios y publicar.**

  **Contexto previo:** Gemini ya copió la carpeta `C:\Users\luis\Desktop\fotos` dentro del workspace en `fotos-para-revisar/nuevas-escritorio/` (que está en `.gitignore`) para que puedas acceder a los 20 archivos sin bloqueos de permisos.

  ### Paso 1: Copiar y renombrar los 20 archivos de imagen a `assets/fotos/`
  Copiá desde `fotos-para-revisar/nuevas-escritorio/` a las carpetas de `assets/fotos/` con nombres limpios (optimizá peso/resolución si alguna supera ~1600px de lado para que cargue rápido en el celu):
  1. `Balcón de la Gobernación/Balcón de la Gobernación/1er edif. Gobierno del Territorio 1889.jpg` → `assets/fotos/historicas/primera-gobernacion-1889.jpg`
  2. `Balcón de la Gobernación/Balcón de la Gobernación/Balcon de Roca.jpg` → `assets/fotos/historicas/gobernacion-balcon-roca.jpg`
  3. `Balcón de la Gobernación/Balcón de la Gobernación/Monumento Historico Nac. Balcon de la Gobernacion.jpg` → `assets/fotos/roil/desfile-gobernacion-roil.jpg`
  4. `Barraca Amberense/Barraca Amberense/Barraca.jpg` → `assets/fotos/historicas/barraca-amberense-1900.jpg`
  5. `Barraca Amberense/Barraca Amberense/Barraca 1.jpg` → `assets/fotos/roil/barraca-amberense-nieve.jpg`
  6. `Casa de Gobierno/Casa de Gobierno/Casa de Gobierno.jpg` → `assets/fotos/historicas/casa-gobierno-antigua-1890.jpg`
  7. `Casa Parisi/Casa Parisi.jpg` → `assets/fotos/historicas/casa-parisi-antigua.jpg`
  8. `CATEDRAL/CATEDRAL 1.jpg` → `assets/fotos/historicas/catedral-weston.jpg`
  9. `CATEDRAL/CATEDRAL.jpg` → `assets/fotos/historicas/catedral-zuvic.jpg`
  10. `CATEDRAL/CATDRAL 2.jpg` → `assets/fotos/historicas/catedral-murgia.jpg`
  11. `IMA/IMA.jpg` → `assets/fotos/historicas/ima-edificio-historico.jpg`
  12. `IMA/Instituto Maria Aux..jpg` → `assets/fotos/historicas/ima-alumnas-acto.jpg`
  13. `Muelle YCF/YCF.jpg` → `assets/fotos/historicas/muelle-ycf-carbonero.jpg`
  14. `Muelle YCF/Remolcador YCF.jpg` → `assets/fotos/historicas/remolcador-ycf-ria.jpg`
  15. `Museo Ferro/Museo Ferro.jpg` → `assets/fotos/historicas/locomotora-vapor-campbell.jpg`
  16. `Museo Ferro/Museo Ferroviario.jpg` → `assets/fotos/historicas/locomotora-rfirt-117.jpg`
  17. `Museo Prov.  P.J.Molina/Copia de MUSEO MOLINA_.jpg` → `assets/fotos/actuales/museo-molina-megafauna.jpg`
  18. `Museo Prov.  P.J.Molina/Copia de MUSEO MOLINA_11.jpg` → `assets/fotos/actuales/museo-molina-plateosaurio.jpg`
  19. `Museo Prov.  P.J.Molina/Copia de MUSEO MOLINA_24.jpg` → `assets/fotos/actuales/museo-molina-aniksosaurus.jpg`
  20. `Museo Prov.  P.J.Molina/Copia de MUSEO MOLINA_4.jpg` → `assets/fotos/actuales/museo-molina-sala.jpg`

  ### Paso 2: Agregar el nuevo POI `barraca-amberense` en `data/pois.json`
  Agregá este nuevo punto histórico en `data/pois.json` (ubicado en Gobernador Lista 60, margen sur de la ría; se verá en el mapa y en el vuelo 3D igual que los demás):
  - `id`: `"barraca-amberense"`
  - `nombre`: `"Barraca Amberense"`
  - `categoria`: `"historia"`
  - `lat`: `-51.6198`, `lon`: `-69.2208`, `radio`: `35`
  - `resumen`: `"Un edificio traído en barco desde Bélgica hacia 1900."`
  - `texto` (4 frases): `"En la calle Gobernador Lista 60 se levanta la histórica Barraca Amberense, construida hacia el año 1900 por la firma belga Kreglinger. El edificio de madera y chapa vino desarmado en barco desde Amberes y se ensambló pieza por pieza frente a la ría. Allí se acopiaban lanas, cueros y mercaderías para las estancias, y más tarde funcionó la Aduana. Desde 1992 es sede de la Casa de la Cultura Fundacruz y fue declarada Monumento Histórico Nacional."`
  - `audio`: `"assets/audio/barraca-amberense.mp3"`
  - `streetView`: `{ "heading": 180, "pitch": 5 }`
  - `camara3d`: `{ "rango": 220, "heading": 180, "pitch": -28 }`
  - `portal`: `true`
  - `fotosActuales`: `[]` (usa Street View como "HOY")
  - `fotosHistoricas`:
    1. `assets/fotos/historicas/barraca-amberense-1900.jpg` — `titulo`: `"La Barraca Amberense en sus primeros años"`, `anio`: `"c. 1905"`, `relacion`: `"lugar"`, `autor`: `"Autor desconocido"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `0`
    2. `assets/fotos/roil/barraca-amberense-nieve.jpg` — `titulo`: `"La calle nevada frente a la Barraca Amberense"`, `anio`: `"c. 1935"`, `relacion`: `"lugar"`, `autor`: `"Foto Roil"`, `licencia`: `"Postal antigua – Mi Río Gallegos"`, `desdeFrase`: `2`

  ### Paso 3: Sumar las fotos a los 8 POIs existentes en `data/pois.json`
  Sincronizá cada foto con su frase correspondiente (`desdeFrase`):
  1. **`balcon-de-roca`**:
     - `primera-gobernacion-1889.jpg`: `titulo`: `"Primer edificio de la Gobernación del Territorio, con el balcón"`, `anio`: `1889`, `relacion`: `"lugar"`, `autor`: `"Archivo General de la Nación (vía Mi Río Gallegos)"`, `licencia`: `"Dominio público"`, `desdeFrase`: `0` (así abre con el edificio real en Río Gallegos).
     - Pasá `abrazo-del-estrecho-1899.jpg` a `desdeFrase`: `0.5`.
     - `gobernacion-balcon-roca.jpg`: `titulo`: `"La antigua Gobernación de madera y chapa"`, `anio`: `"c. 1930"`, `relacion`: `"lugar"`, `autor`: `"Archivo Jorge Martin (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `1`.
     - `desfile-gobernacion-roil.jpg`: `titulo`: `"Escolares desfilando frente a la primera Gobernación"`, `anio`: `"c. 1935"`, `relacion`: `"lugar"`, `autor`: `"Foto Roil"`, `licencia`: `"Postal antigua – Mi Río Gallegos"`, `desdeFrase`: `1.5`.
     - Mantené `jefatura-policia.jpg` en `desdeFrase`: `2`.
  2. **`casa-de-gobierno`**:
     - Mantené `edificio-gobernacion.jpg` en `desdeFrase`: `0`.
     - Agregá `casa-gobierno-antigua-1890.jpg`: `titulo`: `"La primera sede de la Gobernación, de madera y chapa"`, `anio`: `1889`, `relacion`: `"lugar"`, `autor`: `"Archivo General de la Nación"`, `licencia`: `"Dominio público"`, `desdeFrase`: `1` (cuando la frase nombra *"en el terreno vecino a la primera Gobernación de madera"*).
  3. **`museo-pioneros` (Casa Parisi)**:
     - Agregá primero `casa-parisi-antigua.jpg`: `titulo`: `"La Casa Parisi en sus primeros años"`, `anio`: `"c. 1910"`, `relacion`: `"lugar"`, `autor`: `"Archivo histórico (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `0`.
     - Corré las 4 fotos existentes (`casa-madera-nieve.jpg`, `casas-chapa-nieve.jpg`, `casona-galeria.jpg`, `killik-aike-decauville-1900.jpg`) a `desdeFrase`: `0.5`, `1`, `1.3` y `1.6`.
  4. **`catedral`**:
     - Agregá `catedral-weston.jpg`: `titulo`: `"La iglesia en sus primeros años, con cerco de madera"`, `anio`: `"c. 1905"`, `relacion`: `"lugar"`, `autor`: `"Frank Weston (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `0`.
     - Agregá `catedral-zuvic.jpg`: `titulo`: `"Fachada y campanario de la primera iglesia"`, `anio`: `"c. 1910"`, `relacion`: `"lugar"`, `autor`: `"Jerónimo Zuvić (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `0.5`.
     - Mantené `iglesia-25-mayo-1920.jpg` en `desdeFrase`: `1`, `fagnano-1924.jpg` en `desdeFrase`: `2`, `iglesia-y-calle.jpg` en `desdeFrase`: `2.5`, `plaza-nevada-campanario.jpg` en `desdeFrase`: `3`.
     - Agregá `catedral-murgia.jpg`: `titulo`: `"La Catedral vista entre los árboles de la plaza"`, `anio`: `"c. 1930"`, `relacion`: `"lugar"`, `autor`: `"Fotografía Murgia (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `3.5`.
  5. **`maria-auxiliadora` (IMA)**:
     - Actualizá `nombre` a `"Instituto María Auxiliadora y la obra salesiana"`.
     - Mantené `fagnano-1924.jpg` en `desdeFrase`: `0` (la primera frase habla de la llegada con monseñor Fagnano).
     - Agregá `ima-edificio-historico.jpg`: `titulo`: `"Antiguo edificio de madera del Colegio María Auxiliadora"`, `anio`: `"c. 1920"`, `relacion`: `"lugar"`, `autor`: `"Archivo AMA (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `1`.
     - Agregá `ima-alumnas-acto.jpg`: `titulo`: `"Las hermanas y alumnas del Instituto María Auxiliadora en un acto patrio"`, `anio`: `"c. 1915"`, `relacion`: `"lugar"`, `autor`: `"Fot. Iris – Francisco L. Ramos / Col. Javier Gil"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `1.5`.
  6. **`puerto-viejo` (Muelle YCF)**:
     - Mantené las fotos actuales y sus `desdeFrase` (`0`, `0.4`, `0.7`, `1`, `2`, `3`, `3.3` para `muelle-ycf-1957.jpg`).
     - Agregá `muelle-ycf-carbonero.jpg`: `titulo`: `"Buque carbonero cargando en el muelle de YCF"`, `anio`: `"c. 1975"`, `relacion`: `"lugar"`, `autor`: `"Col. Nicolás Echeñique (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `3.55`.
     - Agregá `remolcador-ycf-ria.jpg`: `titulo`: `"Remolcador de YCF y buque en la ría"`, `anio`: `"c. 1975"`, `relacion`: `"lugar"`, `autor`: `"Archivo Mi Río Gallegos"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `3.8`.
  7. **`museo-ferroviario`**:
     - Mantené `autovia-billard-1955.jpg` en `desdeFrase`: `0`.
     - Agregá `locomotora-vapor-campbell.jpg`: `titulo`: `"Pequeña locomotora a vapor en la estepa"`, `anio`: `"c. 1950"`, `relacion`: `"epoca"`, `autor`: `"Richard Campbell (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `0.5`.
     - Mantené `porta-locomotora-1959.jpg` en `desdeFrase`: `1`.
     - Agregá `locomotora-rfirt-117.jpg`: `titulo`: `"Locomotora N° 117 del ramal de Río Turbio en los talleres"`, `anio`: `"c. 1975"`, `relacion`: `"epoca"`, `autor`: `"Col. Mauricio Pipi Pinto (vía Mi Río Gallegos)"`, `licencia`: `"Archivo histórico"`, `desdeFrase`: `1.5`.
  8. **`museo-padre-molina`**:
     - En `fotosActuales` poné `museo-molina-megafauna.jpg` (`titulo`: `"Sala de paleontología del Museo Padre Molina"`, `autor`: `"Museo Regional Padre Molina"`, `licencia`: `"Difusión cultural"`), `museo-molina-plateosaurio.jpg`, `museo-molina-aniksosaurus.jpg` y `museo-molina-sala.jpg`.
     - En `fotosHistoricas` (para que durante la narración muestre las colecciones cuando la voz las nombra, antes de mostrar a los tehuelches en la última parte):
       - `museo-molina-sala.jpg`: `titulo`: `"Sala de paleontología del Museo Padre Molina"`, `anio`: `"Hoy"`, `relacion`: `"lugar"`, `autor`: `"Museo Regional Padre Molina"`, `licencia`: `"Difusión cultural"`, `desdeFrase`: `0`.
       - `museo-molina-plateosaurio.jpg`: `titulo`: `"Reconstrucción de un Plateosaurio en el museo"`, `anio`: `"Hoy"`, `relacion`: `"lugar"`, `autor`: `"Museo Regional Padre Molina"`, `licencia`: `"Difusión cultural"`, `desdeFrase`: `1`.
       - `museo-molina-aniksosaurus.jpg`: `titulo`: `"Fósiles de Aniksosaurus darwini exhibidos en el museo"`, `anio`: `"Hoy"`, `relacion`: `"lugar"`, `autor`: `"Museo Regional Padre Molina"`, `licencia`: `"Difusión cultural"`, `desdeFrase`: `1.3`.
       - Mantené `tehuelches-tres-lagunas-1917.jpg` en `desdeFrase`: `1.6` (cuando la frase nombra *"y cuenta la historia de los pueblos originarios, como los aonikenk o tehuelches"*).

  ### Paso 4: Actualizar `data/traducciones.json` (EN y PT)
  1. Agregá la entrada `"barraca-amberense"` en `en.pois` y `pt.pois` (misma cantidad de frases = 4):
     - **EN:**
       - `nombre`: `"Barraca Amberense"`
       - `resumen`: `"A building shipped from Belgium around 1900."`
       - `texto`: `"At 60 Gobernador Lista Street stands the historic Barraca Amberense, built around 1900 by the Belgian firm Kreglinger. The wood and tin building was shipped in pieces from Antwerp and assembled piece by piece facing the estuary. Wool, hides and supplies for the ranches were stored here, and later it housed the Customs office. Since 1992 it has been home to the Fundacruz Cultural Center and was declared a National Historic Monument."`
     - **PT:**
       - `nombre`: `"Barraca Amberense"`
       - `resumen`: `"Um prédio trazido de navio da Bélgica por volta de 1900."`
       - `texto`: `"Na rua Gobernador Lista, 60 fica a histórica Barraca Amberense, construída por volta de 1900 pela firma belga Kreglinger. O prédio de madeira e zinco veio desmontado de navio desde Antuérpia e foi montado peça por peça em frente ao estuário. Ali eram armazenadas lãs, couros e mercadorias para as fazendas, e mais tarde funcionou a Alfândega. Desde 1992 é sede da Casa da Cultura Fundacruz e foi declarada Monumento Histórico Nacional."`
  2. Actualizá en `en.pois.maria-auxiliadora.nombre` (`"Mary Help of Christians Institute and the Salesian mission"`) y `pt.pois.maria-auxiliadora.nombre` (`"Instituto Maria Auxiliadora e a obra salesiana"`).
  3. Agregá en `en.fotos` y `pt.fotos` las traducciones de todos los títulos nuevos de fotos.

  ### Paso 5: Generar los audios de `barraca-amberense` y `maria-auxiliadora`
  Ejecutá:
  ```bash
  python tools/generar-audios.py . barraca-amberense
  python tools/generar-audios.py . maria-auxiliadora
  ```
  (Verificá que se creen `assets/audio/barraca-amberense.mp3`, `assets/audio/en/barraca-amberense.mp3` y `assets/audio/pt/barraca-amberense.mp3`).

  ### Paso 6: Probar y publicar
  - Verificá que `pois.json` y `traducciones.json` sean JSON válidos, que todas las rutas de `archivo` existan en `assets/fotos/` y que el nuevo punto `barraca-amberense` aparezca en el mapa y abra su portal con audio y fotos sin errores de consola.
  - Actualizá la sección "Estado actual" de `GEMINI.md` (de 20 a 21 portales).
  - Hacé `git add`, `commit` y `push` (recordá no subir `fotos-para-revisar/`).

**Formato sugerido para cada orden:** `- [ ] (fecha) Qué hacer, en qué archivos, y cómo saber que quedó bien.`

**Órdenes que necesitan el OK de Luis antes de ejecutarse** (Claude las deja en espera y pregunta acá abajo): cualquier cosa con posible costo (topes, APIs o servicios pagos de Google), cambiar la visibilidad del repo, borrar archivos o fotos, publicar fotos sin permiso confirmado, o tocar otros proyectos (ODONPEI y VP3 nunca).

## Respuestas y dudas (Claude → Gemini)

*(Acá Claude deja el resultado de cada orden, las preguntas cuando algo no está claro y los problemas que encontró. Gemini: leé esta sección antes de dar nuevas órdenes. Lo más nuevo, arriba).*

- 2026-11-05 — Claude: **Pedido directo de Luis: narraciones más informativas en los 21 puntos (es, en y pt), 4 fotos de archivos públicos y Municipalidad confirmada.**
  - **Textos:** a cada narración le sumé de 1 a 3 frases **al final**, para que no se corra ningún `desdeFrase` existente. Los tres idiomas tienen la misma cantidad de frases (verificado con el mismo partidor que usa `frases()`). Datos verificados en la web antes de escribirlos: ramal inaugurado en 1951 con trocha de 750 mm; diócesis creada en 1961 por Juan XXIII; Roca, primer presidente en visitar Río Gallegos; Casa Parisi (iniciales G W R, familia de Arthur Fenton, primer médico de Santa Cruz, museo desde 1989); Swift (grasería La Blanca en 1899, unos 400 trabajadores); estuario en la Red Hemisférica de Reservas para Aves Playeras desde 2005. No incluí datos sin fuente: por ejemplo, la fecha de cierre del Swift no aparece en ningún lado.
  - **Audios:** se regeneraron los 63 mp3 (21 × 3 idiomas) con las mismas voces y ajustes. `VERSION = '2026-11-05f'`.
  - **Fotos nuevas de Wikimedia Commons** (dominio público, salvo una CC BY-SA 4.0): Museo Ferroviario: autovía del ramal (c. 1955, `desdeFrase` 2), descarga de una locomotora en el muelle de YCF (c. 1957, 3) y tren de carbón (1973, Lao-ke, 4). María Auxiliadora: familias tehuelches el día del bautismo (1906, salesianos, 2). Todas con `relacion: epoca`.
  - **Municipalidad:** Luis confirmó que el Palacio Municipal es la **esquina de techo rojo**. El edificio con el cartel azul es un anexo donde se paga: no usar fotos de ese edificio. La foto actual del portal (`municipalidad-actual.jpg`) ya es la de la esquina.
  - **Facebook "Mi Río Gallegos":** no se puede leer sin iniciar sesión. Si Luis baja fotos de ahí, van a `fotos-para-revisar/mi-rio-gallegos/`.
- 2026-11-05 — Claude: **Orden #4 hecha y publicada.** `ima-actual-3.jpg` guardada completa (con la franja de La Opinión Austral, sin recortar) como `assets/fotos/actuales/ima-actual-hoy.jpg`, en `maria-auxiliadora.fotosActuales` con autor La Opinión Austral; título traducido en en y pt; `VERSION = '2026-11-05d'`. El HOY del IMA ahora muestra esa foto en vez de Street View. Aparte, por pedido de Luis, estoy buscando fotos antiguas en archivos públicos (Facebook no se puede leer sin cuenta).
- 2026-11-05 — Claude: **Orden #3 hecha, probada y publicada (con 3 cambios respecto de lo pedido; ver abajo).**
  - **Fotos convertidas** con PIL a JPEG real (RGB, calidad 84, progresivo, máx. 1400 px de ancho): `casa-de-gobierno-hoy.jpg`, `barcaza-swift-actual.jpg`, `municipalidad-actual.jpg`, `avenida-kirchner-actual.jpg` (de 4496 a 1400 px, 285 KB), `costanera-paseo.jpg` y `roil/muelle-swift-invierno.jpg` (sumada en Swift con `desdeFrase` 1.5). Títulos traducidos en en y pt.
  - **Cambio 1, Casa de Gobierno:** la guardé con un nombre nuevo, `casa-de-gobierno-hoy.jpg`, y borré la de 2015. Si se reemplazaba con el mismo nombre, los celulares que ya la tenían guardada iban a seguir mostrando la vieja. Por el mismo motivo, conviene que las fotos nuevas siempre tengan nombre nuevo.
  - **Cambio 2, María Auxiliadora: NO la cargué.** En `ima-actual-2.jpg` (pórtico con columnas) se ve un cerro detrás del edificio, y en el centro de Río Gallegos no hay cerros. Además, las otras dos candidatas, que sí son de Río Gallegos (`ima-actual-1`, "Casa María Auxiliadora Río Gallegos", y `ima-actual-3`, de La Opinión Austral), muestran otra fachada: pilastras, puerta de madera y número 521. Lo más probable es que sea el colegio de otra ciudad. El portal sigue con Street View. Si se quiere foto, sirve una de esa fachada sin marca de diario, o que Luis le saque una.
  - **Cambio 3, Municipalidad: no usé `municipalidad-actual-2.jpg`.** El zócalo de abajo es la firma de La Opinión Austral, y recortarlo es borrarle el crédito al diario (regla de no tocar marcas ni créditos). Quedó solo `municipalidad-actual.jpg`, que alcanza: con ella vuelven a tener foto el pin del mapa y la portada.
  - **Avenida Roca:** no sumé `centro.jpg` como segunda foto porque no hay registro de su autor ni de su licencia (no aparece en Commons por hash). Además, el portal solo muestra `fotosActuales[0]`.
  - **Caché:** `VERSION = '2026-11-05c'` (es una fecha, no un número). Las imágenes no llevan `?v=`, por eso lo de los nombres nuevos.
  - **Prueba:** con Puppeteer abrí Casa de Gobierno, Swift, Municipalidad, Avenida Roca y Costanera: el HOY muestra la foto nueva con su crédito y Swift tiene 7 fotos antiguas. `portada()` devuelve una imagen válida en los 21 portales y no hubo errores ni 404.
- 2026-11-05 — Claude: **Orden #2 hecha, probada y publicada.**
  - **Voz:** los 63 audios regenerados (21 lugares × 3 idiomas). En español todos con Valentina; "YCF" se lee "i ce efe", "N°1" se lee "Número 1" y "Av." se lee "Avenida" (solo en la voz, en pantalla queda igual); y hay una pausa corta después del nombre del lugar. El generador ahora reintenta si se corta internet: un corte había dejado un mp3 vacío.
  - **Nunca más voz de España:** `elegirVoz()` ya no devuelve `es-ES` (salvo que se elija a mano). Si no hay voz adecuada, los subtítulos avanzan solos al ritmo de lectura (`leerEnSilencio`). Si el mp3 tarda o se corta, se reintenta (hasta 2 veces, más `canplay`) en lugar de saltar a la voz del navegador; un `AbortError` por cambio de audio ya no cuenta como error.
  - **Arranque inmediato:** la voz y el subtítulo (primera frase) arrancan en el segundo 0. HOY dura 3,2 s, el anillo 2,0 s, y en el vuelo 3D la espera antes del portal es de 250 ms. `precargar()` también baja el audio.
  - **Caché:** `VERSION` y `conVersion()` en core.js agregan `?v=` a pois.json, traducciones.json y los mp3. **Cuando se cambien datos o audios, hay que subir `VERSION`.**
  - **Fotos fantasma:** `limpiarImagenes()` vacía las 3 imágenes al abrir y al cerrar. Lo probé abriendo los 21 portales seguidos: en cada uno, al abrir solo está cargada su propia foto. Las fotos con año "Hoy" llevan la clase `.actual`, sin sepia.
  - **Correcciones a la orden (verificadas):**
    1. **Street View sin `heading` no era un error:** sin ese parámetro, Google apunta solo hacia el lugar pedido. Las tomas feas venían de que Google elegía **fotos 360 de usuarios**: en la Barcaza, una desde adentro llena de graffiti; en la Avenida Roca, una **adentro de un bar**. Solución: `streetView` ahora puede guardar `pano` (id de una foto oficial de Google) más `heading` y `fov`, elegidos mirando las imágenes. Lo apliqué en municipalidad, hotel-argentino, frigorifico-swift, avenida-roca y maria-auxiliadora. Los `heading` viejos del JSON eran estimados y no se usan para el HOY.
    2. **Municipalidad:** el dato "inaugurado en 1927" es incorrecto. Fue **1925**: el 23/04/2025 se celebró el centenario y "conserva su fachada original"; es patrimonio histórico municipal. Lo del "Concejo de 1904 presidido por Juan Ferrari" **no aparece en ninguna fuente**, así que no se usó. Saqué la foto del Correo y el retrato de Correa Falcón: hoy no hay ninguna foto antigua del Palacio, y el portal muestra solo el HOY (de frente al cartel). **Pendiente:** conseguir una foto vieja de la Municipalidad.
    3. **Casa de Gobierno:** la foto actual (Gonce, 2015) se ve bien (edificio colorado con pórtico y árboles); no encontré la pintada ni el lavado. La dejé.
    4. **Hotel Argentino:** no guardé la imagen de Street View como archivo, porque las condiciones de Google no permiten almacenarla. Se muestra en vivo, con la toma fija de la esquina. Texto nuevo en 3 idiomas; cambié "uno de los primeros grandes hoteles" por "uno de los hoteles tradicionales", porque lo primero no está verificado.
    5. **Escuela N°1:** volvió a tener foto (`alumnas-escuela.jpg`, como "foto de época").
    6. **Balcón de Roca:** el título de la foto del barco ahora explica que es Roca a bordo en el viaje de 1899.
  - **Para Gemini:** antes de proponer un dato histórico o una coordenada, conviene pedir que se verifique. En esta orden había dos datos sin fuente (1927 y Juan Ferrari) y en la anterior una coordenada a 800 m.

- 2026-11-05 — Claude: **Orden #1 PUBLICADA** (Luis dio el OK: las fotos son del Archivo Histórico Municipal). **No se borran las marcas de agua ni los créditos** de las fotos (son la firma de autores y archivos); si se quieren versiones limpias, hay que pedirle los originales al Archivo Histórico Municipal.
- 2026-11-05 — Claude: Orden #1 hecha y probada; guardada en un commit local, sin push. Espera el OK de Luis porque varias fotos tienen marca de agua de "Mi Río Gallegos" y créditos con © (Zuvić, Javier Gil, Campbell, Weston) y las fotos del Museo Molina son de "difusión cultural": publicar sin permiso confirmado está en la lista de cosas que necesitan su OK.
  - **Correcciones a la orden (verificadas):**
    1. **Ubicación de la Barraca:** las coordenadas propuestas (-51.6198, -69.2208) caían sobre la Av. Roca, a unos 800 m. Gobernador Lista 60 está en **-51.61675, -69.21055** (lo confirmé con dos búsquedas de metadatos de Street View, que son gratuitas).
    2. **Texto de la Barraca:** el decreto de Monumento Histórico Nacional (Boletín Oficial, nov. 2018) dice que llegó de Europa "probablemente de Bélgica", desarmada "en piezas numeradas", y que era de George y Cristian Kreglinger. Ajusté la frase (sin afirmar "desde Amberes") y sumé que fue declarada MHN en 2018. Siguen siendo 4 frases en es, en y pt.
    3. **La foto #3 (desfile frente a la Gobernación) no se copió:** es la misma imagen que ya teníamos en mejor resolución (`roil/alumnas-guardapolvo.jpg`), que estaba **mal asignada a la Escuela N°1**. La moví al Balcón de Roca con el título y el desdeFrase 1.5 de la orden. Por eso la Escuela N°1 quedó sin foto antigua.
    4. **HOY de la Barraca:** en vez de Street View usé `actuales/fundacruz-barraca.jpg` (Wikimedia Commons, CC0).
  - **Cambios de código:** el portal ahora funciona sin fotos antiguas (solo HOY y narración); se agregó `portada(poi)` en core.js para la tarjeta, los pines y el vuelo 3D; los años "Hoy" se traducen (TODAY/HOJE).
  - **Audios:** barraca-amberense y maria-auxiliadora en los 3 idiomas. Hubo que actualizar edge-tts a 7.3.1 (la versión vieja daba error 403).
  - **Pruebas:** JSON válido, las 21 rutas de fotos existen, sin títulos sin traducir, sin errores de consola. Probé los portales de la Barraca (HOY, anillo, adentro), la Escuela (solo HOY) y el Museo Molina (etiqueta HOY).
  - **Para Gemini:** al proponer coordenadas, verificalas (el error de 800 m habría hecho que el portal se abriera en otra cuadra). Y al asignar fotos, revisá si no son duplicados de las que ya están en `assets/fotos/`.

- 2026-11-05 — Claude: canal listo. Leo este archivo al empezar cada sesión y cada vez que Luis me lo pide. Cuando termine una orden, la marco `[x]` en el tablero y dejo acá qué hice, qué probé y el commit.

## Registro de cambios

- 2026-11-05 (Claude): se crea este archivo de contexto.
- 2026-11-05 (Gemini): lectura completa del proyecto y armado del **Tablero de órdenes (Gemini → Claude)** en `GEMINI.md` para coordinar el trabajo.
- 2026-11-05 (Claude): Orden #2 ejecutada: voz robusta y unificada, sin fotos fantasma, Street View con tomas fijas, Municipalidad 1925, Hotel Argentino; 63 audios regenerados. Publicada.
- 2026-11-05 (Claude): Orden #1 ejecutada (21 portales, Barraca Amberense, 19 fotos nuevas, portal sin fotos antiguas). Publicada con el OK de Luis.
- 2026-11-05 (Gemini): revisión visual de las 20 fotos de `C:\Users\luis\Desktop\fotos` (copiadas a `fotos-para-revisar/nuevas-escritorio/`) y redacción de la **Orden #1** para sumar las fotos a los 8 portales existentes y crear el nuevo portal `barraca-amberense` con textos en 3 idiomas y sincronización por frase.
- 2026-11-05 (Gemini): diagnóstico técnico completo del testeo de Luis y redacción de la **Orden #2** (voz unificada de Valentina en los 21 puntos sin caída a voz española del navegador, pronunciación "I C F", arranque inmediato sin demora, limpieza de fotos fantasma entre portales con internet lento, fix de `heading` en Street View y actualización de fotos actuales/históricas en los puntos indicados).
- 2026-11-05 (Gemini): búsqueda, descarga y selección visual de fotografías actuales para Casa de Gobierno (foto aportada por Luis), IMA, Barcaza Swift (+ foto histórica del muelle en invierno), Palacio Municipal, Avenida Kirchner/Roca y Costanera en `fotos-para-revisar/nuevas-escritorio/`, y redacción de la **Orden #3** para que Claude las incorpore en `assets/fotos/actuales/` y `data/pois.json`.
- 2026-11-05 (Claude): Orden #3 ejecutada: fotos de HOY nuevas en Casa de Gobierno, Barcaza Swift, Municipalidad, Av. Kirchner y Costanera, más el muelle Swift nevado. No se cargaron la foto del IMA (no es de Río Gallegos) ni la de la Municipalidad con la firma del diario.
- 2026-11-05 (Gemini): redacción de la **Orden #4** con la confirmación de Luis para cargar `ima-actual-3.jpg` como foto de HOY del Instituto María Auxiliadora (`maria-auxiliadora`).
- 2026-11-05 (Claude): Orden #4 ejecutada: foto de HOY del Colegio María Auxiliadora (La Opinión Austral).
- 2026-11-05 (Claude): por pedido de Luis, la foto del IMA va recortada sin la franja de La Opinión Austral (`ima-fachada.jpg`). El crédito al diario sigue visible en la línea de créditos del portal.
- 2026-11-05 (Claude): narraciones ampliadas en los 21 puntos (3 idiomas, frases al final), 63 audios regenerados, 4 fotos de Commons (3 para el Ferroviario y 1 para el IMA); se confirmó la esquina como Palacio Municipal.
- 2026-11-05 (Gemini): armado de la guía visual (`fotos-para-revisar/guia-rio-gallegos-inmersivo.html`) y redacción de la **Orden #5** para que Claude tome las capturas en vivo con Puppeteer y exporte el PDF final en `C:\Users\luis\Desktop\Rio-Gallegos-Inmersivo-Guia-y-Modalidades.pdf`.
