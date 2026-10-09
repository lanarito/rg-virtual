# Río Gallegos Inmersivo

Prototipo personal de turismo inmersivo de Río Gallegos (Santa Cruz, Argentina): mapa con paseo por GPS, ciudad 3D, Street View y **portal al pasado** en realidad aumentada.

Sitio publicado: https://lanarito.github.io/rg-virtual/

## Módulos

| Página | Qué hace | Necesita |
|---|---|---|
| `mapa.html` | Mapa con los lugares, fichas narradas, plano náutico de 1931 superpuesto y **modo paseo** (el GPS te avisa y te cuenta la historia al llegar) | Nada |
| `portal.html` | Portal al pasado: por GPS detecta que estás en el lugar. **AR** (Android + Chrome): ponés un anillo en el piso y lo cruzás. **Modo ventana** (cualquier celu): cámara + foto antigua con deslizador antes/después y brújula | Cámara y GPS |
| `ciudad3d.html` | Vuelo 3D con recorrido guiado narrado. Con clave de Google usa el 3D fotorrealista; sin clave, satélite | Clave de Google (opcional) |
| `paseo360.html` | Street View moviendo el celu, con aviso de lugares cercanos | Clave de Google |
| `config.html` | Clave de Google, voz, créditos | — |

VR para Meta Quest: pendiente (fase final).

## Editar lugares y fotos

Todo está en [`data/pois.json`](data/pois.json). Cada lugar tiene `nombre`, `lat`/`lon`, `radio` (metros para detectar la llegada), `texto` (lo que se narra), `audio` (mp3 opcional), `fotosActuales[]`, `fotosHistoricas[]` y `portal: true/false`.

Para que el portal quede **alineado** con la foto vieja, completá en cada foto histórica el campo `tomada`: el punto exacto desde donde se sacó (`lat`, `lon`) y hacia dónde apuntaba la cámara (`rumbo`, en grados: 0 = norte, 90 = este). La app te guía hasta ese punto y te dice cuánto girar.

Las fotos van en `assets/fotos/historicas/` y `assets/fotos/actuales/`. Guardá siempre autor, licencia y fuente.

## Probar en la compu y en el celu

```bash
npm install
npm run dev
```

Abre `https://localhost:5443` y también una dirección de tu red (por ejemplo `https://192.168.0.10:5443`). Abrí esa dirección en el celu conectado al mismo wifi y aceptá la advertencia del certificado. Hace falta HTTPS para la cámara, el GPS y la realidad aumentada.

Para probar sin salir de casa:
- Mapa: `mapa.html?simular=1` y tocá el mapa para "caminar".
- Portal: botón **Simular que estoy acá**.

## Publicar

El sitio se publica solo con GitHub Pages desde la rama `main` (no hace falta compilar). Cada `git push` lo actualiza en uno o dos minutos.

## Fuentes de fotos históricas

- Wikimedia Commons (dominio público y Creative Commons; créditos en cada foto).
- Pendiente, pedir permiso: Fotografía Roil, Museo Padre Molina, Archivo Histórico Municipal, AMNH (Rollo Beck, 1914–1915).

## Datos a verificar

Los textos tienen `"verificado": false` hasta confirmarlos con fuentes locales. En particular: el año del Palacio Municipal, la ubicación exacta del Club Británico, el lugar donde se tomó la foto de 1900 y el calce del plano de 1931.
