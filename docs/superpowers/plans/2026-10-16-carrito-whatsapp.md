# Carrito con pedido por WhatsApp — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los fallos de la versión móvil y añadir un carrito que envía el pedido por WhatsApp, pensado primero para celular.

**Architecture:** Todo el carrito vive en el navegador. El servidor incrusta en cada página un bloque JSON con los 4 productos; un módulo de lógica pura (probado con `node --test`) calcula pedido, totales y mensaje; un módulo de interfaz pinta bolsa, barra móvil y panel, y guarda `[{id, cantidad}]` en `localStorage`. GitHub Pages recibe la misma página estática con las rutas reescritas.

**Tech Stack:** Node ≥ 22, Express 4, EJS, CSS y JS del navegador sin frameworks ni dependencias nuevas, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-16-carrito-whatsapp-design.md`

## Global Constraints

- Sin dependencias nuevas en `package.json` (solo el script `test`).
- Número de WhatsApp: `573137156356`. Enlace: `https://wa.me/573137156356?text=<encodeURIComponent(mensaje)>`.
- Pesos: `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` → `'$\u00a0200.000'` (espacio U+00A0).
- Cantidad por producto: entero entre 1 y 10.
- Clave de almacenamiento: `aurea-fem:pedido`; valor `[{"id":"te-rojo","cantidad":2}]`.
- Puntos de quiebre: panel y barra móvil < 48rem; la bolsa pasa junto a la hamburguesa ≤ 60rem.
- Controles táctiles de al menos 44 px de alto.
- Textos visibles en español y con tildes; nombres de productos siempre con `textContent`, nunca `innerHTML`.
- Sin JavaScript (`<html>` sin clase `js-activo`) no se muestran bolsa, barra, panel ni botones "Agregar".
- Código y comentarios siguen el estilo del proyecto: archivos con bloque de cabecera breve, nombres en español.
- Verificación visual: Chrome sin ventana **con emulación de dispositivo por CDP** (la ventana de Chrome no baja de ~500 px). Script base reutilizable: `C:\Users\joseg\AppData\Local\Temp\claude\d--Aurea-femV2\8130de93-3e22-460e-b4c4-1037cad63279\scratchpad\captura.mjs` (args: `chromePath url selector salida.png ancho alto`). Scripts y capturas de verificación se guardan en ese scratchpad, nunca en el repo.
- En los scripts CDP no activar emulación táctil (`Emulation.setTouchEmulationEnabled` hace que las páginas carguen sin CSS); los toques se simulan con `element.click()` vía `Runtime.evaluate`. Auditoría de referencia y scripts que ya funcionan: `…\scratchpad\auditoria\` (`run-all2.mjs`, `audit-notouch.mjs`).
- En PowerShell, antes de `node`/`npm`: `$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")`. El servidor de desarrollo ya corre en `http://localhost:3000` con `node --watch`.

## Review Focus

1. **Pedido guardado por una versión anterior o editado a mano** (`"hola"`, `[{"id":5}]`, cantidades `0`, `-3`, `2.7`, `"4"`, `99`, ids repetidos) → la página carga y el pedido queda saneado. Prueba en Task 3.
2. **Nombre de producto con `</script>` o `<`** en el bloque JSON → no rompe la página ni inyecta HTML. Prueba en Task 4 (`jsonParaHtml`).
3. **Tocar "Agregar" 11 veces** → se queda en 10 y avisa "Máximo 10". Prueba en Task 3 (`agregar`) y verificación en Task 5.
4. **Tocar algo que está detrás de un elemento flotante** (botón de Aura, barra del pedido) en un iPhone → el toque llega al botón visible. Verificación en Task 1 y Task 6.
5. **Página publicada en GitHub Pages** → miniaturas del panel con prefijo `/aurea-fem/`. Verificación en Task 7.

---

### Task 1: Móvil — lo que hoy bloquea el uso

Hallazgos de la auditoría (`…\scratchpad\auditoria\out2\`): menú roto tras hacer scroll, franja invisible del chat que bloquea toques, lanzador de Aura tapando contenido, zoom automático de iOS en los campos y lanzador encima del menú abierto.

**Files:**
- Modify: `src/public/css/components/header.css:19-25`
- Modify: `src/public/css/components/chat.css:26-35, 75-79, 325, 381-406`
- Modify: `src/public/css/components/form.css:33`
- Modify: `src/public/css/components/footer.css` (regla `.pie`)
- Modify: `src/public/js/core/nav.js:83-91` (`cambiar()`)

**Interfaces:**
- Produces: clase `menu-abierto` en `<html>` mientras el menú móvil está abierto (la usa Task 6).

- [ ] **Step 1: Escribir la verificación que falla** `…\scratchpad\verificar-movil.mjs` (CDP con emulación, sin táctil). Imprime `OK`/`FALLA` por comprobación:
  1. `/nosotras` a 390×844: `scrollTo(0, 1500)`, clic en `[data-menu-toggle]`, esperar 600 ms → `.cabecera__nav` mide `window.innerHeight` de alto (±1 px).
  2. Igual que 1 → `getComputedStyle(document.querySelector('.chat')).display === 'none'`.
  3. `/productos` a 390×844: `document.elementFromPoint(40, innerHeight - 30)` no está dentro de `.chat`.
  4. `/productos` a 594×858: `.chat__lanzador` mide ≤ 56 px de ancho.
  5. `/contacto` a 390×844: `font-size` calculado de `#nombre`, `#mensaje` y `#chat-entrada` es `16px`.
  6. `/productos` a 390×844: abrir el chat (`[data-chat-abrir]`) → `elementFromPoint` en el centro de la franja de 68 px que hay sobre el panel no está dentro de `.chat`.
  Run: `node …\scratchpad\verificar-movil.mjs` — Expected: FALLA en 1–6.

- [ ] **Step 2: Implementar**
  - `header.css`: el fondo translúcido y el `backdrop-filter` de `.es-desplazada` pasan a `.cabecera::before` (`content:''; position:absolute; inset:0; z-index:-1; opacity:0`, con transición de opacidad); `.cabecera.es-desplazada::before { opacity: 1 }`. Borde y sombra se quedan en `.cabecera`. Así la cabecera deja de ser el bloque contenedor del menú fijo.
  - `chat.css`: `.chat { pointer-events: none }` y `.chat__lanzador, .chat__panel { pointer-events: auto }`; `.chat.es-abierto .chat__lanzador { display: none }`; las reglas del lanzador redondo solo con icono (`.chat__lanzador-texto { display:none }`, ancho 3.5rem) pasan a un `@media (max-width: 48rem)` (el panel a ancho completo sigue en 34rem); `.chat__entrada { font-size: 1rem }`; `html.menu-abierto .chat { display: none }`.
  - `form.css`: `.campo__control { font-size: 1rem }`.
  - `footer.css`: por debajo de 48rem, `.pie` suma 4.5rem a su `padding-bottom` para que el botón de Aura no tape el cierre del pie.
  - `nav.js` `cambiar(abierto)`: `document.documentElement.classList.toggle('menu-abierto', abierto)`.

- [ ] **Step 3: Verificar** — Run: `node …\scratchpad\verificar-movil.mjs` → 6 `OK`. Capturas con `captura.mjs` a 390×844 de `/nosotras` con el menú abierto tras scroll y de `/productos` en `.catalogo`; revisarlas.

- [ ] **Step 4: Commit** — `git commit -m "Móvil: menú a pantalla completa, chat sin bloquear toques y sin zoom en iOS"`.

---

### Task 2: Móvil — pulido

**Files:**
- Modify: `src/public/js/views/servicios.js:109-117`
- Modify: `src/public/css/views/servicios.css:93-123`, `src/app/views/servicios.view.ejs:58-61` (tabla comparativa)
- Modify: `src/app/views/contacto.view.ejs:77-79`, `src/public/css/views/contacto.css:70-74`
- Modify: `src/public/css/components/footer.css:40, 64-74`, `src/public/css/components/button.css:139-143`, `src/public/css/components/chat.css:137, 146-153, 373`, `src/public/css/views/home.css:333-337`, `src/public/css/components/header.css:72-78, 246-250`
- Modify: `src/public/js/core/reveal.js:35-39`, `src/public/css/base/tokens.css` (`--seccion-y`)

- [ ] **Step 1: Ampliar `verificar-movil.mjs`** con, a 390×844:
  7. `/servicios#embarazo` → tras 1,5 s, `#pestana-embarazo` está dentro del viewport y por debajo de la cabecera (`top ≥ 64`).
  8. `/contacto` → existen `a[href="tel:123"]` y `a[href="tel:+576044444448"]`.
  9. Ningún elemento visible de `.pie a, .contacto__valor, .chat__cerrar, .boton--compacto, .etapa-fila__enlace` mide menos de 44 px de alto.
  10. Ningún texto visible de `.cabecera__eslogan, .pie__eslogan, .chat__estado, .chat__nota` tiene `font-size` < 12 px (o está oculto).
  Run — Expected: FALLA en 7–10; 1–6 siguen `OK`.

- [ ] **Step 2: Implementar**
  - `servicios.js`: tras `activar(ancla)`, desplazar a la lista de pestañas con `scrollIntoView({ block: 'start' })`; la lista lleva `scroll-margin-top: 6rem` para quedar bajo la cabecera fija.
  - Contacto: `123` → `<a href="tel:123">`, `604 444 44 48` → `<a href="tel:+576044444448">`, mismo aspecto en negrita.
  - Tabla comparativa < 48rem: se oculta la fila de encabezado y cada celda muestra su etiqueta ("El resto del sector" / "Áurea Fem") con `data-etiqueta` + `::before`.
  - Áreas táctiles: `min-height: 44px` (con `display:inline-flex; align-items:center` donde haga falta) en enlaces del pie, `.contacto__valor`, `.boton--compacto`; `.chat__cerrar` y flechas de etapa 44×44.
  - Textos pequeños: `.cabecera__eslogan` oculto por debajo de 48rem (sustituye el corte de 26rem); `.pie__eslogan`, `.chat__estado`, `.chat__nota` a `0.75rem`.
  - `reveal.js`: `rootMargin: '0px 0px -5% 0px'`, `threshold: 0`.
  - `--seccion-y`: mínimo del `clamp` de 4.5rem a 3rem.

- [ ] **Step 3: Verificar** — `verificar-movil.mjs` → 10 `OK`. Capturas a 390×844 de la tabla comparativa de `/servicios` y del bloque de urgencias de `/contacto`; revisarlas.

- [ ] **Step 4: Commit** — `git commit -m "Móvil: anclas de servicios, llamadas de urgencia, áreas táctiles y textos legibles"`.

Fuera de alcance de este plan: el bloqueo de scroll del fondo en iOS Safari con el menú abierto (auditoría #13) requiere probarse en un iPhone real.

---

### Task 3: Lógica del carrito (módulo puro) y pruebas

**Files:**
- Create: `src/public/js/package.json` → `{ "type": "module" }`
- Create: `src/public/js/components/carrito-logica.js`
- Create: `test/carrito-logica.test.mjs`
- Modify: `package.json` (script `"test": "node --test"`)
- Modify: `.github/workflows/pages.yml` (paso `- run: npm test` entre `npm ci` y `npm run build:static`)

**Interfaces:**
- Produces (ES module, sin DOM). Tipos: `Producto = { id, nombre, precio, imagen }`, `Linea = { id: string, cantidad: number }`, `Pedido = Linea[]`.
  - `export const MAXIMO = 10`
  - `sanear(guardado: unknown, catalogo: Producto[]): Pedido`
  - `agregar(pedido, id): Pedido` · `cambiarCantidad(pedido, id, cantidad): Pedido` · `quitar(pedido, id): Pedido` — nunca mutan la entrada
  - `unidades(pedido): number` · `total(pedido, catalogo): number`
  - `formatearPesos(valor: number): string`
  - `armarMensaje(pedido, catalogo): string` — `''` si no hay líneas válidas
  - `enlaceWhatsApp(numero: string, mensaje: string): string`

- [ ] **Step 1: Escribir las pruebas que fallan** en `test/carrito-logica.test.mjs` (importa `../src/public/js/components/carrito-logica.js`). Catálogo de prueba: `te-rojo` 100000, `gel-termico` 103000, `kit-menstrual-basico` 102000 (con `nombre` e `imagen`).
  - `sanear`: `'hola'`, `null`, `{}` → `[]`; `[{id:'x',cantidad:1}]` → `[]`; `[{id:'te-rojo',cantidad:0}]` → cantidad 1; `-3` → 1; `2.7` → 2; `'4'` → 4; `99` → 10; `NaN`/`'abc'` → 1; `[{id:'te-rojo',cantidad:2},{id:'te-rojo',cantidad:5}]` → una sola línea con 2; conserva el orden de entrada.
  - `agregar`: id nuevo entra al final con 1; id existente suma 1; en 10 se queda en 10; no muta el arreglo original.
  - `cambiarCantidad`: ajusta a 1–10; `quitar` elimina la línea.
  - `unidades([{te-rojo,2},{gel-termico,1}])` = 3; `total(...)` = 303000; ids desconocidos no suman.
  - `formatearPesos(200000)` === `'$\u00a0200.000'`.
  - `armarMensaje([{id:'te-rojo',cantidad:2},{id:'gel-termico',cantidad:1}], catalogo)` ===
    ```js
    'Hola, ¿cómo estás? Quisiera llevarme estos productos:\n\n' +
    '- 2 × Té Rojo — $\u00a0200.000\n' +
    '- 1 × Gel Térmico — $\u00a0103.000\n\n' +
    'Total: $\u00a0303.000'
    ```
  - `armarMensaje([], catalogo)` === `''`.
  - `enlaceWhatsApp('573137156356', 'Hola, ¿qué tal?\n- 1 × Té — $\u00a01')` empieza por `'https://wa.me/573137156356?text='` y `decodeURIComponent` del resto devuelve el mensaje original.

- [ ] **Step 2: Ejecutar y comprobar que fallan**
  Run: `npm test` — Expected: FAIL (`Cannot find module ... carrito-logica.js`).

- [ ] **Step 3: Implementar `carrito-logica.js`** con las firmas de Interfaces. `sanear` convierte con `Math.trunc(Number(x))` y ajusta a [1, 10]. `armarMensaje` omite líneas cuyo id no esté en el catálogo.

- [ ] **Step 4: Ejecutar y comprobar que pasan**
  Run: `npm test` — Expected: todas PASS, 0 fail.

- [ ] **Step 5: Commit**
  `git add src/public/js/package.json src/public/js/components/carrito-logica.js test/carrito-logica.test.mjs package.json .github/workflows/pages.yml`
  `git commit -m "Carrito: lógica de pedido y mensaje de WhatsApp con pruebas"`

---

### Task 4: Datos y HTML del carrito

**Files:**
- Create: `src/utils/json-html.js` → `jsonParaHtml(valor): string` (CommonJS)
- Modify: `src/app/models/site.model.js` (`brand.whatsapp: '573137156356'`)
- Modify: `src/middlewares/locals.js` (`res.locals.catalogoPedido`)
- Modify: `src/app/views/layouts/main.ejs` (bloque de datos + parcial, antes de los `<script>` del final)
- Create: `src/app/views/partials/carrito.ejs`
- Modify: `src/app/views/partials/header.ejs` (bolsa entre `</nav>` y la hamburguesa)
- Modify: `src/app/views/partials/icons.ejs` (símbolos `i-bolsa`, `i-whatsapp`, `i-mas`, `i-menos`, mismo estilo de trazo 1.5 que los demás)
- Modify: `src/app/views/productos.view.ejs`, `src/app/views/home.view.ejs`
- Test: `test/paginas.test.mjs`

**Interfaces:**
- Consumes: `listar()` de `producto.model.js` (ya devuelve `imagen` y `precio`).
- Produces (ganchos que usa Task 5 y estilos de Task 6):
  - `<script type="application/json" id="catalogo-pedido"><%- catalogoPedido %></script>` con `[{id,nombre,precio,imagen}]`.
  - Bolsa: `<button class="bolsa" type="button" data-carrito-abrir aria-controls="panel-carrito" aria-expanded="false" aria-label="Ver tu pedido (vacío)">` con `<svg class="icono">…#i-bolsa…</svg>` y `<span class="bolsa__contador" data-carrito-contador hidden>0</span>`.
  - Parcial `carrito.ejs`:
    - `<div class="carrito" data-carrito data-whatsapp="<%= brand.whatsapp %>" hidden>` con `<div class="carrito__fondo" data-carrito-cerrar></div>` y `<section class="carrito__panel" id="panel-carrito" role="dialog" aria-modal="true" aria-labelledby="carrito-titulo">`.
    - Dentro: cabecera con `<h2 id="carrito-titulo">Tu pedido</h2>` y botón `.carrito__cerrar[data-carrito-cerrar]` (`aria-label="Cerrar el pedido"`, icono `#i-cerrar`); `<ul class="carrito__lista" data-carrito-lista>`; `<div class="carrito__vacio" data-carrito-vacio hidden>` con "Tu pedido está vacío" y `<a href="/productos">Ver productos</a>`; `<footer class="carrito__pie" data-carrito-pie>` con `Total <span data-carrito-total></span>`, `<a class="boton boton--primario boton--ancho carrito__whatsapp" data-carrito-enviar href="#" rel="noopener">` (icono `#i-whatsapp` + "Enviar pedido por WhatsApp") y `<button class="carrito__vaciar" type="button" data-carrito-vaciar>Vaciar pedido</button>`.
    - Barra: `<button class="barra-pedido" type="button" data-carrito-barra data-carrito-abrir aria-controls="panel-carrito" aria-expanded="false" hidden>` con icono `#i-bolsa`, `<span data-carrito-resumen></span>` y `<span class="barra-pedido__accion">Ver pedido</span>`.
    - `<p class="visualmente-oculto" data-carrito-aviso aria-live="polite"></p>`.
  - Botón en tarjetas: `<button class="boton boton--primario boton--compacto producto__agregar" type="button" data-agregar="<%= producto.id %>">Agregar</button>` dentro de `.producto__pie` (antes de "Consultar"); en la portada la clase es `tarjeta-producto__agregar` y va después de `.tarjeta-producto__precio`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `test/paginas.test.mjs`. Carga `src/server.js` con `createRequire`, escucha en el puerto 0 en `before` y cierra en `after`.
  - `jsonParaHtml({ nombre: '</script><b>' })` no contiene `<` y `JSON.parse` devuelve el objeto original.
  - `GET /productos`: el bloque `#catalogo-pedido` (extraído con regex) parsea a 4 objetos con exactamente las claves `id,nombre,precio,imagen`; el de `kit-menstrual-basico` tiene `precio` 102000 e `imagen` `/images/productos/kit-menstrual-basico.jpg`.
  - `GET /productos` y `GET /` tienen 4 ocurrencias de `data-agregar="` cada una.
  - `GET /contacto` contiene `data-carrito-abrir`, `id="panel-carrito"` y `data-whatsapp="573137156356"`.

- [ ] **Step 2: Ejecutar y comprobar que fallan**
  Run: `npm test` — Expected: FAIL en `paginas.test.mjs`; `carrito-logica.test.mjs` sigue PASS.

- [ ] **Step 3: Implementar** `jsonParaHtml` (`JSON.stringify(valor).replace(/</g, '\\u003c')`), el campo `whatsapp`, `catalogoPedido` en `locals.js` (solo `id,nombre,precio,imagen` de `listar()`), el parcial, la bolsa, los iconos y los botones según Interfaces.

- [ ] **Step 4: Ejecutar y comprobar que pasan**
  Run: `npm test` — Expected: todas PASS.

- [ ] **Step 5: Commit**
  `git commit -m "Carrito: catálogo incrustado, bolsa, panel y botones Agregar en el HTML"` (con los archivos de la lista).

---

### Task 5: Comportamiento del carrito en el navegador

**Files:**
- Create: `src/public/js/components/carrito.js`
- Modify: `src/public/js/core/main.js` (importar y llamar `iniciarCarrito()` en `iniciar()`)

**Interfaces:**
- Consumes: Task 3 (todas las funciones) y los ganchos `data-*` de Task 4.
- Produces para Task 6 (clases que pinta el JS):
  - En `<html>`: `tiene-pedido` (unidades > 0) y `carrito-abierto` (panel abierto). En `[data-carrito]`: `es-abierto` un frame después de quitar `hidden`; al cerrar se quita `es-abierto` y se pone `hidden` con el `transitionend` del panel o, como respaldo, a los 400 ms (lo que ocurra primero; de inmediato con `prefers-reduced-motion: reduce`). Sin el respaldo el panel nunca se ocultaría mientras no exista la transición de Task 6.
  - Cada línea: `<li class="carrito__linea">` con `img.carrito__miniatura` (`alt=""`, `width="64" height="48"`), `.carrito__info` (`.carrito__nombre`, `.carrito__precio` unitario), `.carrito__controles` (`button.carrito__boton-cantidad[data-accion="menos"]`, `span.carrito__cantidad`, `button.carrito__boton-cantidad[data-accion="mas"]`; botones con `aria-label` "Quitar una unidad de {nombre}" / "Agregar una unidad de {nombre}"), `.carrito__subtotal` y `button.carrito__quitar[data-accion="quitar"]` ("Quitar"). Cada `li` lleva `data-id`.
  - Contador de la bolsa con clase temporal `es-pulso` (600 ms) al agregar.

- [ ] **Step 1: Escribir el script de verificación que falla** `scratchpad\verificar-carrito.mjs` (CDP, emulación 390×844 móvil, parte de `captura.mjs`). En `http://localhost:3000/productos`, tras `localStorage.clear()` y recarga, imprime una línea `OK`/`FALLA` por cada comprobación:
  1. Tocar `[data-agregar="te-rojo"]` dos veces y `[data-agregar="gel-termico"]` una vez → `localStorage['aurea-fem:pedido']` es `[{"id":"te-rojo","cantidad":2},{"id":"gel-termico","cantidad":1}]`.
  2. `[data-carrito-contador]` muestra `3` y no está oculto; la bolsa tiene `aria-label` "Ver tu pedido (3 productos)".
  3. `[data-carrito-barra]` visible y `[data-carrito-resumen]` es `3 productos · $ 303.000` (con U+00A0); `<html>` tiene `tiene-pedido`.
  4. Tocar `[data-agregar="te-rojo"]` 9 veces más → cantidad 10 y el botón muestra "Máximo 10".
  5. Tocar la barra → `[data-carrito]` sin `hidden`, `<html>` con `carrito-abierto`, foco en `.carrito__cerrar`.
  6. `decodeURIComponent` del `href` de `[data-carrito-enviar]` (tras `?text=`) es igual al mensaje esperado para 10 × Té Rojo + 1 × Gel Térmico (total `$ 1.103.000`).
  7. Tecla Escape → panel oculto y foco de vuelta en la barra.
  8. Recargar la página → el pedido sigue y el contador muestra 11.
  9. `localStorage['aurea-fem:pedido'] = '[{"id":"no-existe","cantidad":3}]'` + recargar → contador oculto, sin errores en consola.
  Run: `node <scratchpad>\verificar-carrito.mjs` — Expected ahora: FALLA (no existe `carrito.js`).

- [ ] **Step 2: Implementar `export function iniciarCarrito(): void`** en `carrito.js`: lee y parsea `#catalogo-pedido` (si falta, `return`); estado en memoria saneado con `sanear`; lectura/escritura de `localStorage` en `try/catch`; un `pintar()` que actualiza bolsa (contador, `aria-label` con singular/plural), barra, lista, total, `href` de WhatsApp, estado vacío y clases de `<html>`; delegación de eventos para `[data-agregar]` (texto "Agregado ✓" o "Máximo 10" 1,5 s + aviso en `[data-carrito-aviso]`: "{nombre} agregado a tu pedido" / "Máximo 10 unidades de {nombre}"), `[data-carrito-abrir]`, `[data-carrito-cerrar]`, `data-accion`, `[data-carrito-vaciar]` (`confirm('¿Vaciar tu pedido?')`). Escape cierra; Tab y Shift+Tab ciclan dentro del panel; al cerrar el foco vuelve a quien abrió. `target="_blank"` en el enlace solo si `matchMedia('(pointer: fine)').matches`.

- [ ] **Step 3: Ejecutar la verificación**
  Run: `node <scratchpad>\verificar-carrito.mjs` — Expected: 9 líneas `OK`. Además `npm test` sigue en PASS.

- [ ] **Step 4: Commit**
  `git commit -m "Carrito: comportamiento en el navegador"` (`carrito.js`, `main.js`).

---

### Task 6: Estilos del carrito, móvil primero

**Files:**
- Create: `src/public/css/components/carrito.css`
- Modify: `src/middlewares/layout.js` (`'/css/components/carrito.css'` al final de `BASE_STYLES`)
- Modify: `src/public/css/base/tokens.css` (`--capa-carrito: 130;`)
- Modify: `src/public/css/components/header.css` (posición de `.bolsa`)
- Modify: `src/public/css/components/chat.css` (con `html.tiene-pedido` y < 48rem, el `.chat` sube por encima de la barra)
- Modify: `src/public/css/views/productos.css`, `src/public/css/views/home.css` (pie de tarjeta con "Agregar")

**Interfaces:**
- Consumes: clases y ganchos de Task 4 y Task 5; la clase `menu-abierto` de Task 1.

- [ ] **Step 1: Capturas "antes"** con `captura.mjs` a 390×844 de `/productos` (selector `.catalogo`) para comparar.

- [ ] **Step 2: Implementar los estilos** según el spec §3:
  - `.bolsa`: botón redondo de 44 px como la hamburguesa; contador en pastilla sobre la esquina con color primario; `es-pulso` escala 1 → 1,25 → 1. En ≤ 60rem queda junto a la hamburguesa y no dentro del menú.
  - `.barra-pedido`: fija abajo, ancho completo, solo < 48rem cuando no tiene `hidden`; alto ≥ 56 px; `padding-bottom: calc(… + env(safe-area-inset-bottom))`; colores de marca; "Ver pedido" alineado a la derecha.
  - `.carrito`: capa `--capa-carrito`; `.carrito__fondo` oscurece; panel < 48rem: hoja inferior, `max-height: 85dvh`, esquinas superiores redondeadas, lista con scroll y `.carrito__pie` fijo abajo con zona segura; ≥ 48rem: lateral derecho `width: min(26rem, 100%)`, alto completo. Transición de entrada (deslizar) con `es-abierto`; sin animación con `prefers-reduced-motion`.
  - `html.carrito-abierto { overflow: hidden; }`.
  - Líneas: miniatura 64×48 con `object-fit: cover` y radio; botones de cantidad de 44×44.
  - `html:not(.js-activo)` oculta `.bolsa`, `[data-agregar]`, `.barra-pedido`, `.carrito`; `html.menu-abierto` oculta `.barra-pedido`.
  - Pie de tarjeta del catálogo < 48rem: precio en la primera fila; "Agregar" (crece) y "Consultar" en la segunda. En la portada "Agregar" a ancho completo.

- [ ] **Step 3: Verificación visual** con `captura.mjs` (pedido de prueba cargado vía `localStorage` antes de capturar):
  - 390×844: `/productos` con barra visible; panel abierto con 2 productos; panel vacío; portada en `.productos-inicio`.
  - 1366×900: panel lateral abierto.
  Revisar cada PNG: nada cortado, el botón de Aura no tapa la barra ni el pie del panel, controles ≥ 44 px. Run `node <scratchpad>\verificar-carrito.mjs` — Expected: 9 `OK`.

- [ ] **Step 4: Commit**
  `git commit -m "Carrito: estilos móvil primero"`.

---

### Task 7: Aura, GitHub Pages y publicación

**Files:**
- Modify: `src/app/services/prompt.service.js:103,110`
- Modify: `scripts/build-static.js` (`adaptarHtml` y comprobación final)

- [ ] **Step 1: Texto de Aura.** Línea 103: `Teléfono y WhatsApp: ${brand.phoneDisplay}` en lugar de `Teléfono: ${brand.phoneDisplay}`. Regla 5, reemplazar desde "Menciona los canales…" hasta el final por: `Menciona los canales tal como aparecen abajo. El número de teléfono también es WhatsApp. Para comprar, la persona toca "Agregar" en los productos que quiera y envía el pedido desde la bolsa de la parte superior con el botón "Enviar pedido por WhatsApp". No des una dirección exacta, solo el barrio y la ciudad.` y en la misma regla "ofrece el correo o el teléfono" → "ofrece el correo o el WhatsApp".

- [ ] **Step 2: Rutas en el bloque de datos.** En `adaptarHtml` añadir `.replace(/"imagen":"\//g, \`"imagen":"${BASE}/\`)`; tras generar, lanzar error si `dist/index.html` no contiene `id="catalogo-pedido"` o contiene `"imagen":"/images`.
  Run: `npm run build:static` — Expected: termina sin error y `dist/productos/index.html` contiene `"imagen":"/aurea-fem/images/productos/te-rojo.jpg"`.

- [ ] **Step 3: Pruebas completas** — Run: `npm test` (PASS) y `node <scratchpad>\verificar-carrito.mjs` (9 `OK`).

- [ ] **Step 4: Commit**
  `git commit -m "Carrito: Aura conoce el pedido por WhatsApp y GitHub Pages reescribe las fotos"`.

- [ ] **Step 5: Publicación (la hace el orquestador tras la revisión final)** — `git push`; esperar los workflows "Publicar en GitHub Pages" e "Imagen Docker" en verde; `https://josebolivarc07.github.io/aurea-fem/productos/` responde 200 y su bloque `#catalogo-pedido` usa `/aurea-fem/images/`; repetir `verificar-carrito.mjs` contra esa URL.
