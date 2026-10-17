# Áurea Fem — Landing page

> Cuidarte también es conocerte

Sitio web corporativo de **Áurea Fem**, empresa de acompañamiento integral en
salud y bienestar femenino. Incluye el sitio público, un panel interno y
**Aura**, la orientadora con inteligencia artificial basada en Google Gemini.

---

## 1. Cómo ejecutarlo

El proyecto está pensado para funcionar **en local, desde una USB**, sin
instalar nada aparte de Node.js.

```bash
npm install     # solo la primera vez, o si node_modules no viaja en la USB
npm start       # abre http://localhost:3000
```

Para desarrollar con recarga automática al guardar archivos del servidor:

```bash
npm run dev
```

**Requisito único:** Node.js 18 o superior (probado en Node 22).
Comprobar con `node --version`.

### Llevarlo a otro portátil

Copiar la carpeta completa, `node_modules` incluido. Si la copia se hace sin
esa carpeta, basta con ejecutar `npm install` en el equipo nuevo.

### Con Docker

Cada cambio en `main` publica la imagen en GitHub Container Registry. Para
ejecutarla con todas las funciones (chat, formulario y panel):

```bash
docker run -p 3000:3000 --env-file .env ghcr.io/josebolivarc07/aurea-fem:latest
```

O construirla desde el código:

```bash
docker build -t aurea-fem .
docker run -p 3000:3000 --env-file .env aurea-fem
```

### Versión pública en GitHub Pages

https://josebolivarc07.github.io/aurea-fem/

GitHub Pages solo sirve archivos estáticos, así que el workflow
`.github/workflows/pages.yml` ejecuta `npm run build:static`, que genera el HTML
de cada página en `dist/`. En esa versión el chat de Aura aparece como no
disponible, el formulario de contacto abre el correo de la visitante y el
acceso interno no existe. El carrito y el pedido por WhatsApp sí funcionan,
porque corren solo en el navegador. Para tener todo funcionando hay que usar la versión
con Node o con Docker.

---

## 2. Estructura del proyecto

```
1.0v/
├── app.js                    Punto de entrada: carga el entorno y escucha
├── package.json
├── .env                      Claves y configuración (NO se sube a repositorios)
├── .env.example              Plantilla del archivo anterior
├── node_modules/
├── storage/                  Mensajes del formulario (se crea solo)
│
└── src/
    ├── config/               Toda la lectura de variables de entorno
    ├── server.js             Construcción de la app Express
    │
    ├── middlewares/
    │   ├── layout.js         Sistema de plantillas y CSS por vista
    │   ├── locals.js         Variables comunes a todas las plantillas
    │   ├── security.js       Cabeceras de seguridad y CSP
    │   ├── rate-limit.js     Límite de peticiones del chat
    │   ├── not-found.js      404
    │   └── error-handler.js  500
    │
    ├── utils/
    │   ├── validacion.js     Saneamiento y validación de entradas
    │   ├── sesion.js         Sesión por cookie firmada (HMAC)
    │   └── json-html.js      Catálogo del pedido incrustado en el HTML (JSON seguro)
    │
    ├── app/                  ── Módulo del sitio público ──
    │   ├── controllers/      Uno por vista
    │   ├── models/           Datos: marca, servicios, etapas, productos, equipo
    │   ├── routes/           web.routes.js · chat.routes.js
    │   ├── services/         gemini.service.js · prompt.service.js
    │   └── views/            Plantillas EJS + layout + parciales
    │                         (partials/carrito.ejs: panel del pedido)
    │
    ├── auth/                 ── Módulo de acceso interno ──
    │   ├── controllers/
    │   ├── models/
    │   ├── routes/
    │   ├── services/         ldap.service.js (preparado, hoy en modo local)
    │   └── views/
    │
    └── public/               ── Archivos servidos al navegador ──
        ├── css/
        │   ├── base/         reset · tokens · typography · layout · animations
        │   ├── components/   button · header · footer · chat · form · page-header · carrito
        │   └── views/        home · nosotras · servicios · productos · contacto · acceso · error
        ├── js/
        │   ├── core/         main · nav · reveal · no-fouc
        │   ├── components/   chat.js · carrito.js (pantalla) · carrito-logica.js (cálculos puros)
        │   └── views/        home · servicios · productos · contacto
        └── images/           Logotipo, emblema y favicon en SVG

test/                         Pruebas (`npm test`): lógica del carrito y páginas
```

Para correr las pruebas: `npm test`.

### Una hoja de estilos por vista

Cada vista carga **solo** su propio CSS. El controlador lo declara:

```js
res.renderPage('productos.view', {
  styles: ['/css/components/page-header.css', '/css/views/productos.css'],
  scripts: ['/js/views/productos.js'],
  // ...
});
```

El middleware `src/middlewares/layout.js` antepone la base compartida
(reset, tokens, tipografía, cabecera, pie y chat) y nada más. Así la página
de productos nunca descarga el CSS de contacto, y tocar los estilos de una
vista no puede romper otra.

---

## 3. El agente Aura

| Aspecto | Detalle |
|---|---|
| Modelo | `gemini-3.1-flash-lite` |
| Endpoint interno | `POST /api/chat` (Server-Sent Events) |
| Estado | `GET /api/chat/estado` |
| Clave de API | Solo en el servidor, nunca llega al navegador |

El "entrenamiento" está en `src/app/services/prompt.service.js` y **se genera
a partir de los modelos de datos**: catálogo, servicios, etapas y valores. Si
se añade un producto en `producto.model.js`, Aura lo conoce sin tocar nada más.

Límites configurados:

- No diagnostica, no receta y no interpreta exámenes.
- Ante señales de alarma deriva a urgencias y a la línea 123.
- Ante crisis emocional entrega la Línea Amiga Saludable (604 444 44 48) y la
  línea 155 para violencia contra la mujer.
- Rechaza temas fuera del alcance de salud y bienestar femenino.
- Resiste intentos de cambiarle la identidad o de revelar sus instrucciones.
- No inventa precios, productos ni convenios.

### Por qué los filtros automáticos de Gemini están desactivados

Con los umbrales por defecto, el clasificador de Google **cortaba las
respuestas a mitad de frase**. Ejemplo real medido en este proyecto: ante la
pregunta "¿dónde quedan y cómo los contacto?", la respuesta se detenía en
*"puedes ponerte en contacto con nos—"*, justo antes de dar el correo.

Al inspeccionar las puntuaciones, ese texto aparecía clasificado como
`HARASSMENT = MEDIUM` y `SEXUALLY_EXPLICIT = MEDIUM`, pese a limitarse a dar
la dirección de la empresa. La causa: el clasificador puntúa **todo el
contexto**, y la instrucción de sistema contiene por necesidad palabras como
*menstruación*, *vulva*, *útero* o *violencia contra la mujer*. El dominio
entero del proyecto elevaba la puntuación de cada respuesta.

Subir el umbral a `BLOCK_ONLY_HIGH` redujo los cortes pero no los eliminó
(1 de cada 4 respuestas seguía truncándose, una de ellas a mitad del número
de teléfono). Con `OFF`, 8 de 8 pruebas salieron completas.

La seguridad del agente descansa entonces en la instrucción de sistema, cuyos
límites son mucho más pertinentes para este caso que un clasificador de
propósito general, y están verificados con pruebas (ver la lista de arriba).

Además, `gemini.service.js` detecta cualquier corte por `finishReason` y añade
un aviso al final, para que una respuesta interrumpida nunca se lea como una
frase a medias.

### Cambiar de modelo

Editar `GEMINI_MODEL` en `.env`. Para ver los modelos disponibles con la clave:

```bash
curl -H "x-goog-api-key: TU_CLAVE" https://generativelanguage.googleapis.com/v1beta/models
```

---

## 4. Acceso interno

`http://localhost:3000/acceso`

Credenciales en `.env` (`AUTH_LOCAL_USER` y `AUTH_LOCAL_PASSWORD`). El panel
muestra los mensajes recibidos por el formulario de contacto.

El archivo `src/auth/services/ldap.service.js` deja la interfaz lista para
conectar el directorio corporativo cuando el proyecto salga de local: al
implementarla, basta con cambiar `AUTH_MODE=ldap` en `.env`.

---

## 5. Identidad visual

| Color | Hex | Significado |
|---|---|---|
| Vino | `#620725` | Fuerza, seguridad, liderazgo |
| Rojo principal | `#910D2B` | Pasión, valentía, empoderamiento |
| Coral | `#C65060` | Inspiración y perseverancia |
| Rosa | `#EEADAE` | Sensibilidad, empatía, amor propio |
| Arena | `#E2D5CA` | Calma, armonía, bienestar |

Los dos principales son `#910D2B` y `#E2D5CA`.

**Tipografía corporativa:** Montserrat, en toda la interfaz.
**Tipografía de titulares:** Cormorant Garamond, la serif que recoge el
registro del logotipo. Para usar Montserrat también en los títulos, basta
cambiar `--fuente-display` en `src/public/css/base/tokens.css`.

Todos los colores, tamaños, sombras y tiempos de animación viven en ese mismo
archivo de tokens: es el único sitio donde tocar para reajustar el diseño.

---

## 6. Seguridad

- La clave de Gemini vive en `.env`, fuera del control de versiones.
- Cabeceras de seguridad y Content-Security-Policy en `middlewares/security.js`.
- Sesión en cookie `httpOnly` firmada con HMAC-SHA256: si se edita, se descarta.
- Comparación de contraseñas en tiempo constante.
- Límite de 15 consultas por minuto al chat.
- Toda entrada de la usuaria se sanea en `utils/validacion.js`.

> **Importante:** la clave de API incluida en `.env` quedó registrada en
> capturas de pantalla del proceso. Antes de publicar el sitio en internet
> conviene generar una clave nueva en Google AI Studio y borrar la anterior.

---

## 7. Accesibilidad

- Navegación completa por teclado; pestañas con el patrón ARIA de *tabs*.
- Enlace "Saltar al contenido" al inicio de cada página.
- Foco visible solo en navegación por teclado.
- Se respeta `prefers-reduced-motion`: sin desplazamientos ni desenfoques.
- Sin JavaScript la página se ve completa: las animaciones son una mejora,
  no un requisito para leer el contenido.
