# Carrito con pedido por WhatsApp — Diseño

**Fecha:** 2026-10-16
**Estado:** aprobado en conversación, pendiente de revisión escrita

## 1. Objetivo

Que una visitante pueda elegir productos del catálogo, ajustar cantidades y
enviar el pedido por WhatsApp con un mensaje ya escrito, sin servidor de pagos.

Contexto de uso: unas 40 personas probarán el sitio, **casi todas desde el
celular**. El diseño parte del móvil y se adapta al escritorio, no al revés.

Criterio de éxito: desde un iPhone (390 px), la persona agrega productos, ve
siempre cuánto lleva, abre el pedido, toca "Enviar pedido por WhatsApp" y se
abre la app de WhatsApp con el pedido completo listo para enviar.

## 2. Decisiones acordadas

| Tema | Decisión |
|---|---|
| Canal de compra | WhatsApp al +57 313 715 6356 (número real con WhatsApp) |
| Contenido del mensaje | Saludo + cantidad, nombre y subtotal por producto + total |
| Ubicación del carrito | Bolsa con contador en la cabecera + panel |
| Refuerzo en móvil | Barra fija inferior, solo en móvil y solo con productos |
| Origen de nombres y precios | Catálogo incrustado en cada página (opción A) |
| Persistencia | `localStorage` del navegador; sin servidor |

## 3. Experiencia (móvil primero)

### 3.1 Botón "Agregar"

- Aparece en cada tarjeta del catálogo (`/productos`) y de la portada.
- En el catálogo convive con "Consultar" (abre a Aura). En móvil el pie de la
  tarjeta pasa a dos filas: arriba el precio; abajo "Agregar" (primario,
  ocupa el ancho disponible) y "Consultar" (contorno, compacto).
- En la portada no hay "Consultar": "Agregar" va debajo del precio, ancho
  completo en todas las pantallas.
- Altura mínima de todo control táctil: 44 px.
- Al tocarlo:
  - Suma 1 unidad (si no estaba, entra con cantidad 1).
  - El texto cambia a "Agregado ✓" durante 1,5 s y vuelve a "Agregar".
  - El contador de la bolsa se actualiza con una animación breve.
  - Una región `aria-live="polite"` anuncia "Té Rojo agregado a tu pedido".
  - El panel **no** se abre.
- Si el producto ya tiene 10 unidades, no suma; el botón muestra
  "Máximo 10" durante 1,5 s y se anuncia lo mismo.

### 3.2 Bolsa en la cabecera

- Botón con icono de bolsa y contador (suma de unidades). El contador se
  oculta cuando el total es 0.
- Escritorio: a la derecha de "Escríbenos".
- Móvil (≤ 60rem, donde la navegación se vuelve menú desplegable): fuera
  del `<nav>`, junto al botón hamburguesa, siempre visible.
- `aria-label` dinámico: "Ver tu pedido (vacío)", "Ver tu pedido (1 producto)",
  "Ver tu pedido (3 productos)"; `aria-expanded` y
  `aria-controls="panel-carrito"`. La barra usa el mismo singular/plural.

### 3.3 Barra inferior (solo móvil)

- Visible solo por debajo de 48rem **y** con al menos 1 unidad.
- Contenido: icono, "3 productos · $ 303.000" y botón "Ver pedido" que
  abre el panel. Toda la barra es tocable.
- Respeta `env(safe-area-inset-bottom)`.
- Mientras está visible, el botón flotante de Aura sube por encima de ella
  (clase `tiene-pedido` en `<html>`).

### 3.4 Panel del pedido

- **Móvil (< 48rem):** hoja que sube desde abajo, esquinas superiores
  redondeadas, altura máxima 85dvh, lista desplazable. El pie (total,
  "Enviar pedido por WhatsApp" y "Vaciar pedido") queda fijo abajo y respeta
  la zona segura del iPhone.
- **Escritorio (≥ 48rem):** panel lateral desde la derecha, ancho
  `min(26rem, 100%)`, alto completo.
- Fondo oscurecido detrás. Cierra con la ×, tocando el fondo o con Esc.
- Mientras está abierto, la página de fondo no se desplaza (clase
  `carrito-abierto` en `<html>` con `overflow: hidden`).
- Cada línea: miniatura, nombre, precio unitario, controles
  `[−] cantidad [+]` (botones de 44 px), subtotal y botón "Quitar".
  - `−` se deshabilita en 1; `+` se deshabilita en 10.
- Orden de las líneas: el orden en que se agregó cada producto por primera vez.
- Vacío: "Tu pedido está vacío" y enlace "Ver productos" a `/productos`; se
  ocultan el total y los botones del pie.
- "Vaciar pedido": pide confirmación con `confirm('¿Vaciar tu pedido?')`.
- Accesibilidad: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby="carrito-titulo"`. Al abrir, el foco va al botón de
  cerrar; al cerrar, vuelve al elemento que lo abrió. Tab no sale del panel
  mientras está abierto.

### 3.5 Envío por WhatsApp

- El botón es un enlace `<a>` cuyo `href` se recalcula con cada cambio:
  `https://wa.me/573137156356?text=<encodeURIComponent(mensaje)>`.
- Con puntero fino (escritorio) abre en pestaña nueva (`target="_blank"`,
  `rel="noopener"`); con puntero táctil navega en la misma pestaña para que
  el celular abra directo la app sin dejar una pestaña vacía.
- El pedido **no** se vacía al enviar.

Formato exacto del mensaje (los montos usan el mismo formateador que el
servidor: `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP',
maximumFractionDigits: 0 })`):

```
Hola, ¿cómo estás? Quisiera llevarme estos productos:

- 2 × Té Rojo — $ 200.000
- 1 × Gel Térmico — $ 103.000

Total: $ 303.000
```

Cada línea: `- {cantidad} × {nombre} — {precio × cantidad}`.

### 3.6 Sin JavaScript

La bolsa, la barra, el panel y los botones "Agregar" no se muestran si
`<html>` no tiene la clase `js-activo` (la pone `no-fouc.js`). El resto del
sitio sigue igual.

## 4. Arquitectura

### 4.1 Datos

- `site.model.js`: nuevo campo `brand.whatsapp = '573137156356'`.
- `middlewares/locals.js`: expone `res.locals.catalogoPedido`, un JSON con
  `[{ id, nombre, precio, imagen }]` construido desde `listar()` del modelo
  de productos, con `<` escapado como `<` para que no pueda cerrar la
  etiqueta.
- `layouts/main.ejs`: imprime
  `<script type="application/json" id="catalogo-pedido">…</script>` y el
  parcial del carrito. Es un bloque de datos, no código: la CSP actual
  (`script-src 'self'`) no lo bloquea.

### 4.2 Almacenamiento

- Clave `aurea-fem:pedido`, valor `[{"id":"te-rojo","cantidad":2}]`.
- Solo se guarda id y cantidad; nombre, precio e imagen salen siempre del
  catálogo incrustado.
- Todo acceso a `localStorage` va en `try/catch`. Si falla, el pedido vive en
  memoria mientras la persona no cambie de página.

### 4.3 Archivos

| Archivo | Cambio |
|---|---|
| `src/app/models/site.model.js` | campo `whatsapp` |
| `src/middlewares/locals.js` | `catalogoPedido` |
| `src/middlewares/layout.js` | añade `carrito.css` a `BASE_STYLES` |
| `src/app/views/layouts/main.ejs` | bloque de datos + `include('../partials/carrito')` |
| `src/app/views/partials/carrito.ejs` | **nuevo**: panel, barra móvil, región `aria-live` |
| `src/app/views/partials/header.ejs` | botón de la bolsa |
| `src/app/views/partials/icons.ejs` | símbolos `i-bolsa`, `i-whatsapp`, `i-mas`, `i-menos` |
| `src/app/views/productos.view.ejs` | botón "Agregar" en el pie de cada tarjeta |
| `src/app/views/home.view.ejs` | botón "Agregar" en cada tarjeta |
| `src/public/js/components/carrito-logica.js` | **nuevo**: funciones puras |
| `src/public/js/components/carrito.js` | **nuevo**: interfaz, exporta `iniciarCarrito()` |
| `src/public/js/core/main.js` | llama a `iniciarCarrito()` |
| `src/public/js/package.json` | **nuevo**: `{"type":"module"}` para que Node pruebe los módulos del navegador |
| `src/public/css/components/carrito.css` | **nuevo**: estilos, móvil primero |
| `src/public/css/views/productos.css`, `home.css` | pie de tarjeta con dos botones |
| `src/public/css/base/tokens.css` | `--capa-carrito: 130` |
| `src/app/services/prompt.service.js` | Aura: el número tiene WhatsApp y cómo se pide |
| `scripts/build-static.js` | reescribe rutas de imagen dentro del bloque de datos |
| `test/carrito-logica.test.mjs` | **nuevo**: pruebas de la lógica |
| `package.json` | script `"test": "node --test"` |
| `.github/workflows/pages.yml` | ejecuta `npm test` antes de construir |

### 4.4 `carrito-logica.js` (sin DOM)

- `sanear(guardado, catalogo)` → descarta lo que no sea arreglo, ids que no
  existan en el catálogo y duplicados; ajusta cantidades a enteros entre 1 y 10.
- `agregar(pedido, id)`, `cambiarCantidad(pedido, id, cantidad)`,
  `quitar(pedido, id)` → devuelven un pedido nuevo, sin mutar el anterior.
- `unidades(pedido)` y `total(pedido, catalogo)`.
- `armarMensaje(pedido, catalogo)` → texto exacto de §3.5.
- `enlaceWhatsApp(numero, mensaje)`.
- `formatearPesos(valor)`.

### 4.5 `carrito.js` (interfaz)

Lee el catálogo de `#catalogo-pedido`; si no existe, no hace nada. Mantiene el
estado, lo guarda tras cada cambio y vuelve a pintar la bolsa, la barra y el
panel. Los nombres se insertan con `textContent`, nunca con `innerHTML`.

### 4.6 Aura

En la regla 5 de `prompt.service.js` se reemplaza "el número es un teléfono,
no afirmes que es WhatsApp" por: el número también es WhatsApp; para comprar,
la persona toca "Agregar" en los productos y envía el pedido desde la bolsa con
"Enviar pedido por WhatsApp". Se mantiene la prohibición de dar una dirección
exacta.

### 4.7 GitHub Pages

`build-static.js` reescribe `"imagen":"/` → `"imagen":"<BASE>/` dentro del
bloque `#catalogo-pedido` y falla si no encuentra el bloque en la portada.

## 5. Manejo de errores

| Situación | Comportamiento |
|---|---|
| `localStorage` con JSON roto o formato viejo | se trata como pedido vacío |
| id guardado que ya no existe | se descarta en silencio |
| cantidad fuera de rango o no entera | se ajusta a 1–10 |
| `localStorage` no disponible | pedido en memoria |
| página sin `#catalogo-pedido` | el carrito no se activa |

## 6. Pruebas

**Automáticas** (`node --test`, sin dependencias nuevas), sobre
`carrito-logica.js`:
- `sanear` con entradas inválidas, ids inexistentes, duplicados y cantidades
  fuera de rango.
- `agregar` respeta el máximo de 10; `cambiarCantidad` y `quitar`.
- `total` y `unidades`.
- `armarMensaje` produce exactamente el texto de §3.5.
- `enlaceWhatsApp` codifica saltos de línea, tildes, `¿`, `×` y `—`.

**Visuales** con Chrome sin ventana y emulación móvil:
- iPhone 390×844: catálogo con barra visible; panel abierto con 2 productos;
  pedido vacío.
- Escritorio 1366×900: panel lateral abierto.
- Se decodifica el `href` del botón de WhatsApp y se compara con el mensaje
  esperado.

**Publicación:** tras el despliegue, `/aurea-fem/productos/` responde 200 y
las miniaturas del bloque de datos apuntan a `/aurea-fem/images/...`.

## 7. Fuera de alcance

- Pagos en línea, inventario, envíos con costo y cuentas de usuaria.
- Sincronizar el pedido entre pestañas o dispositivos.
- Páginas individuales por producto.
