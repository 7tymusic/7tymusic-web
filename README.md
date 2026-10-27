# 7TY · web oficial

Web estática de 7TY (artista y productor): portfolio, beat store conectada con BeatStars, estudio, packs, bio y contacto. No necesita servidor ni base de datos: es HTML, CSS, JS y archivos JSON, así que se aloja gratis en **GitHub Pages** (o en Netlify o Cloudflare Pages).

El contenido que cambia (beats, proyectos, bio, tienda, estudio y datos legales) vive en la carpeta `content/` y se edita desde el **panel** en `/admin/`, que guarda los cambios directamente en este repositorio.

---

## Estructura

```
index.html            la web
404.html              página de "no encontrado"
assets/
  css/site.css        estilos
  js/site.js          reproductor, catálogo, licencias, contacto…
  img/                fotos, favicon e imagen para compartir (og-7ty.jpg)
  fonts/              tipografías (se sirven desde la propia web, sin Google Fonts)
content/
  beats.json          catálogo de beats de la web
  projects.json       proyectos destacados (con portada, créditos y año)
  bio.json            texto de la bio, cifras y ruta del presskit
  store.json          tienda de BeatStars (perfil, nº de beats, precio "desde")
  studio.json         fotos del estudio y reseñas de artistas
  legal.json          datos del titular para el aviso legal y la privacidad
  stats.json          código de GoatCounter para las estadísticas (vacío = no se cuenta nada)
  radio.json          ajustes del drop del viernes y cuñas de voz de Radio 7TY
  wall.json           temas del muro «Hecho con 7TY»
  extras.json         destellos y premio, papelera secreta, modo noche, salvapantallas y estado del estudio
media/
  beats/              previews MP3 de los beats
  projects/           audio de los proyectos destacados
  covers/             portadas de los proyectos
  studio/             fotos del estudio y audios de «antes y después»
  radio/              cuñas de voz de Radio 7TY
  wall/               portadas del muro
  papelera/           snippets de la papelera secreta
  presskit/           7ty-presskit.pdf (el botón «Descargar presskit»)
admin/                panel privado (no aparece en la web ni en Google)
.nojekyll             le dice a GitHub Pages que sirva los archivos tal cual
robots.txt            oculta /admin/ a los buscadores
```

---

## 1. Subirla a GitHub

1. Crea una cuenta en GitHub si no la tienes.
2. **New repository** → nombre, por ejemplo `7tymusic-web` → **Public** → *Create repository*.
3. En el repositorio vacío: **Add file → Upload files** y arrastra **todo el contenido de esta carpeta** (no la carpeta en sí: `index.html` tiene que quedar en la raíz). Pulsa *Commit changes*.
   - Los archivos que empiezan por punto (`.nojekyll`, `.gitignore`) a veces no se ven al arrastrar. Si `.nojekyll` no se sube, créalo a mano: *Add file → Create new file*, nombre `.nojekyll`, vacío, *Commit*.
   - Si usas Git: `git init && git add . && git commit -m "Web 7TY" && git branch -M main && git remote add origin https://github.com/USUARIO/7tymusic-web.git && git push -u origin main`

## 2. Activar GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. *Source*: **Deploy from a branch** → *Branch*: `main` / `/ (root)` → **Save**.
3. En uno o dos minutos la web está en `https://USUARIO.github.io/7tymusic-web/`.

## 3. Dominio propio (opcional, recomendado)

1. Compra el dominio (por ejemplo `7tymusic.com`) en cualquier registrador.
2. En **Settings → Pages → Custom domain** escribe el dominio y guarda. GitHub crea el archivo `CNAME` en el repositorio.
3. En el panel DNS del registrador:
   - Dominio raíz (`7tymusic.com`): cuatro registros **A** a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`.
   - `www`: un registro **CNAME** a `USUARIO.github.io`.
4. Cuando GitHub lo verifique, marca **Enforce HTTPS**.
5. Cambia en `index.html` la línea `og:image` por la dirección completa, por ejemplo `https://7tymusic.com/assets/img/og-7ty.jpg`, para que la vista previa salga bien al compartir el enlace en WhatsApp o Instagram.

---

## 4. Panel (`/admin/`)

Desde `https://TU-WEB/admin/` 7TY puede, sin tocar código:

- **Inicio:** la lista de lanzamiento. Marca qué falta antes de lanzar (datos legales, enlaces de BeatStars, audio de los proyectos, GoatCounter) y qué es recomendable u opcional, con un botón para ir a cada sitio.

- **Beats:** arrastra uno o varios MP3/M4A a la zona rosa y se preparan todos a la vez: el nº y el nombre salen del nombre del archivo, y el BPM y el tono se detectan analizando el audio (si el nombre ya los trae, como `333 Sugarbaby 94bpm F#m.mp3`, se usan esos). Revísalos antes de añadirlos: el BPM a veces sale al doble o a la mitad (hay un botón con la alternativa) y el tono puede confundirse con uno cercano. También puedes subir de uno en uno con el formulario, editar, marcar como vendido, ocultar o borrar. En la web salen 10 al azar en cada visita.
- **Proyectos:** añadir, editar, reordenar, ocultar o borrar los temas destacados, con su audio, portada, streams, año, enlace de Spotify y qué hizo 7TY en cada uno (producción, mezcla, master…). El tema con más streams sale solo en la portada. Sin portada sale la inicial del tema.
- **Bio:** el texto (línea en blanco entre párrafos, `**así**` para resaltar en rosa), las cifras de streams y oyentes, y el **presskit en PDF**. El PDF nuevo sustituye al anterior en la misma dirección (`media/presskit/7ty-presskit.pdf`), así que los enlaces que ya hayas mandado siguen funcionando.
- **Tienda:** perfil de BeatStars, número de beats que tiene allí y precio "desde".
- **Estudio:** fotos del estudio (se reducen solas antes de subirlas) y reseñas de artistas. Cada bloque aparece en la web en cuanto tenga al menos una foto o una reseña. Solo reseñas reales y con permiso.
- **Drops y radio:** programa la salida de un beat («Próximo viernes 18:00» con un toque). Hasta esa hora no aparece en el catálogo ni en la radio: la web enseña una cuenta atrás en la sección Beats y en la barra de arriba, con un adelanto de 12 s que suena «a través de la pared», botones para añadirlo al calendario (Google, iPhone y Outlook) y, si lo pones, un botón a tu canal de avisos (WhatsApp, Telegram…). A la hora exacta sale solo, el primero de la lista y con la etiqueta «Nuevo» durante los días que elijas. Opción de nombre secreto («???») hasta el drop. Aquí también subes las cuñas de voz de la radio y eliges cada cuántas canciones suenan. Un beat nuevo también se puede programar al subirlo, con el campo «Salida programada». Ojo: el audio de un beat programado ya está en el repositorio, así que alguien que mire los archivos por dentro podría encontrarlo antes de tiempo.
- **Antes y después (en Estudio):** sube el mismo trozo de un tema dos veces, la toma en bruto y la versión con tu mezcla y master (mejor de 30 a 60 s y cortados en el mismo punto). En la web aparece un comparador: le das al play y con el interruptor saltas de una versión a otra sin que se corte.
- **Reservas (arriba en Estudio):** conecta tu agenda de citas de Google Calendar y la web enseña un bloque «Reserva tu sesión» con tus huecos reales; los artistas eligen día y hora y reservan sin escribirte. Cómo crearla (una vez, desde el ordenador): en Google Calendar, «Crear» → «Agenda de citas»; pon nombre, duración, días y horas en que abres, y guarda. Ábrela, pulsa «Compartir» y en «Insertar en el sitio web» copia el código; pégalo en el panel y publica. Con una cuenta gratis tienes una agenda de citas; los recordatorios automáticos al artista son de Google One. La agenda solo se carga cuando alguien pulsa «Ver huecos libres» (Google usa sus cookies a partir de ahí, y la política de cookies de la web lo explica sola).
- **Estado del estudio (arriba en Estudio):** «3 huecos libres esta semana», «Grabando ahora», «Agenda llena hasta…». Sale en Estudio y Contacto con la fecha de actualización y se oculta solo si no lo tocas en 14 días (12 horas en «Grabando ahora»).
- **Muro:** los temas que los artistas sacan con tus beats (portada, enlace y beat usado). Desde la web, cualquiera puede mandarte el suyo por WhatsApp con un formulario; tú lo copias aquí.
- **Secretos:** el premio de los 7 destellos escondidos (mensaje, código y enlace a un regalo), la papelera secreta con snippets inéditos (se abre tocando 7 veces el logo 7TY o escribiendo 777), el modo noche y el salvapantallas.
- **Legal:** nombre, NIF, domicilio y email del titular. Salen en el aviso legal y la política de privacidad (enlaces al pie de la web); lo que falte aparece marcado como «pendiente». Los textos son una base: conviene que los revise una asesoría.

Los cambios se van acumulando y no se ven en la web hasta que pulses **Publicar**. Antes puedes pulsar **Vista previa**: abre la web tal y como quedará, con los beats, fotos y audios nuevos, solo en tu navegador (una franja rosa arriba te recuerda que es la vista previa; deja el panel abierto mientras la miras). Entonces el panel hace un solo *commit* en el repositorio y GitHub Pages actualiza la web en uno o dos minutos (a veces hay que recargar sin caché: Ctrl/Cmd + Shift + R).

### Crear el token (una vez)

El panel entra en el repositorio con un token personal que se queda guardado solo en tu navegador.

1. GitHub → foto de perfil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. *Token name*: `panel 7ty`. *Expiration*: la que quieras (como mucho un año; cuando caduque, se crea otro igual).
3. *Repository access*: **Only select repositories** → elige `7tymusic-web`.
4. *Permissions → Repository permissions → Contents*: **Read and write**. (Metadata se pone sola en *Read*.) No hace falta nada más.
5. *Generate token* y copia el valor (`github_pat_…`). Solo se muestra una vez.
6. En `/admin/` escribe tu usuario de GitHub, el nombre del repositorio, la rama (`main`) y el token. Marca *Recordar en este dispositivo* solo en tu ordenador o móvil personal.

Si pierdes el móvil o crees que alguien tiene el token: GitHub → *Fine-grained tokens* → **Revoke**, y crea uno nuevo.

### Límites a tener en cuenta

- Cada audio, como mucho **25 MB** desde el panel. Para previews de beats sobra (un minuto a 128–192 kbps son 1–2 MB).
- GitHub recomienda que el repositorio no pase de 1 GB. Con previews cortas caben cientos de beats.
- Las previews son públicas por diseño: sube siempre la versión con tag de voz. Los WAV y stems no se suben aquí: los entrega BeatStars o 7TY a mano.

---

## Para quien visita la web

- **Cabina:** el botón del micro en cada beat abre una cabina para grabar la voz encima con el micrófono (cuenta atrás, efecto de voz, ajuste de sincronía) y descargar la toma en WAV. Todo pasa en el dispositivo de quien graba: no se sube nada.
- **Favoritos:** el corazón guarda beats en ese navegador; la lista se puede compartir con un enlace (`#favs-319,328`).
- **Destellos:** hay 7 escondidos por la web. Quien los encuentra todos ve el premio de la pestaña Secretos.
- **Modo noche:** de 22:00 a 6:00 (hora de cada visitante) la portada cambia: cielo estrellado, «Sesión nocturna» y un beat de la noche distinto cada día.
- **Salvapantallas:** en ordenador, tras 90 segundos sin tocar nada, salen estrellas y el logo rebotando. Si suena algo, enseña qué está sonando.

## Radio 7TY

El botón **Radio** (barra de arriba, portada y reproductor) pone en aleatorio y sin parar todos los beats visibles y los proyectos con audio, con una sintonía entre canción y canción y, si las has subido, cuñas de voz cada pocas canciones. Si alguien pulsa un beat concreto, la radio se apaga y suena ese beat.

## Estadísticas (GoatCounter)

La pestaña **Estadísticas** del panel enseña cuántas visitas tiene la web y, por cada beat, cuántas veces se escucha, se abre en BeatStars y se comparte, con avisos del tipo «este beat se escucha mucho pero nadie lo abre en BeatStars». Cada cosa se cuenta una vez por visita.

Las cifras las guarda [GoatCounter](https://www.goatcounter.com): no usa cookies ni guarda datos personales, así que no hace falta aviso de cookies, y es gratis para webs pequeñas. Para activarlo:

1. Crea una cuenta en goatcounter.com y elige un código, por ejemplo `7tymusic` (tus estadísticas quedan en `https://7tymusic.goatcounter.com`).
2. En GoatCounter, **Settings** → marca **Allow adding visitor counts on your website** (sin esto el panel no puede leer las cifras) y guarda.
3. En el panel → **Estadísticas** → escribe el código → *Aplicar código* → **Publicar**.

Mientras el código esté vacío, la web no cuenta nada. Tus propias visitas no cuentan en el navegador donde uses el panel (casilla «No contar mis visitas en este navegador»). Las cifras tardan unos minutos en aparecer. Si el panel no consigue leerlas, míralas directamente en tu página de GoatCounter, que además tiene de dónde viene la gente, países y dispositivos.

## Enlace directo a un beat

Cada beat tiene un botón de compartir (en su fila y en el reproductor). Genera un enlace como `https://TU-WEB/#beat-319`: al abrirlo, ese beat sale el primero de la lista, resaltado y cargado en el reproductor. En el móvil abre el menú de compartir del sistema (WhatsApp, Instagram…); en el ordenador copia el enlace.

Las páginas legales también tienen dirección propia: `#aviso-legal`, `#privacidad` y `#cookies`.

## Privacidad y cookies

La web no usa cookies ni carga servicios de terceros (las tipografías están en `assets/fonts/`). Solo guarda en el navegador el volumen del reproductor. Con GoatCounter activado, envía avisos anónimos de visitas y escuchas, sin cookies; la política de cookies de la web lo explica sola en cuanto pones el código. Si algún día añades otra analítica (Google Analytics, Meta Pixel…), esa sí necesitaría un aviso de cookies y actualizar la política.

## Editar a mano (sin panel)

Todo el contenido son JSON legibles en `content/`. Se pueden editar desde la propia web de GitHub (icono del lápiz) respetando el formato. Los audios van en `media/beats/` o `media/projects/`, y su ruta se escribe en el campo `src` (beats) o `audio` (proyectos). Las portadas van en `media/covers/` (campo `cover`), y las fotos del estudio en `media/studio/`.

Ejemplo de beat en `content/beats.json`:

```json
{
  "id": "b333-sugarbaby",
  "code": "333",
  "t": "Sugarbaby",
  "tags": ["Reggaetón", "Dancehall"],
  "bpm": 94,
  "key": "F#m",
  "src": "media/beats/333-sugarbaby.mp3",
  "bs": "https://www.beatstars.com/beat/…",
  "sold": false,
  "hidden": false,
  "order": 333
}
```

## Probar en local

Abrir `index.html` con doble clic funciona, pero el navegador no deja leer `content/` desde el disco y verás el contenido de serie. Para verla tal cual:

```
cd 7tymusic-web
python3 -m http.server 8000
```

y abre `http://localhost:8000`.

## Otros alojamientos

Es una web estática, así que funciona igual en **Netlify** o **Cloudflare Pages** conectándolos a este repositorio (sin comando de build, carpeta de publicación: la raíz). El panel sigue funcionando porque escribe en GitHub y esos servicios publican cada cambio del repositorio.
