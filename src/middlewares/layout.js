'use strict';

/**
 * SISTEMA DE LAYOUT Y CSS POR VISTA
 * =================================
 *
 * Es la pieza que hace posible el requisito de "cada vista con su propio CSS".
 *
 * EL PROBLEMA QUE RESUELVE
 * Una plantilla EJS suelta (por ejemplo `home.view.ejs`) solo contiene el
 * contenido de esa página: no tiene <html>, ni <head>, ni cabecera, ni pie.
 * Repetir todo eso en las siete vistas sería insostenible.
 *
 * CÓMO LO RESUELVE — renderizado en dos pasos:
 *   Paso 1 · Se renderiza la vista concreta a un texto HTML.
 *   Paso 2 · Ese texto se inyecta en `layouts/main.ejs` como la variable
 *            `body`, que ya trae <head>, cabecera, pie y chat.
 *
 * Y DE PASO, EL CSS
 * Cada vista declara ÚNICAMENTE sus propias hojas de estilo. Este middleware
 * les antepone la base compartida. Resultado: la página de productos nunca
 * descarga el CSS de contacto, y tocar los estilos de una vista no puede
 * romper otra.
 *
 * Uso desde un controlador:
 *   res.renderPage('productos.view', {
 *     title: 'Productos · Áurea Fem',
 *     styles:  ['/css/views/productos.css'],
 *     scripts: ['/js/views/productos.js'],
 *   });
 */

// ── BLOQUE 1: Recursos compartidos ──────────────────────────────────────────

/**
 * Hojas de estilo que se cargan en TODAS las páginas, en este orden exacto.
 *
 * El orden importa porque en CSS lo último que se declara gana:
 *   1. reset       → normaliza el navegador
 *   2. tokens      → define colores, tipografías y espaciados
 *   3. typography  → aplica esos tokens al texto
 *   4. layout      → contenedores y ritmo de las secciones
 *   5. animations  → transiciones y fotogramas
 *   6-9. componentes que aparecen en toda página (botón, cabecera, pie, chat)
 */
const BASE_STYLES = [
  '/css/base/reset.css',
  '/css/base/tokens.css',
  '/css/base/typography.css',
  '/css/base/layout.css',
  '/css/base/animations.css',
  '/css/components/button.css',
  '/css/components/header.css',
  '/css/components/footer.css',
  '/css/components/chat.css',
];

/**
 * Scripts presentes en todas las páginas.
 * `main.js` importa a su vez la navegación, el revelado y el chat.
 */
const BASE_SCRIPTS = ['/js/core/main.js'];

// ── BLOQUE 2: Resolución del nombre de plantilla ────────────────────────────

/**
 * Completa la extensión `.ejs` del nombre de la plantilla.
 *
 * Las vistas se llaman `home.view.ejs` para dejar claro su rol dentro de la
 * arquitectura. El problema: si se pidieran como `'home.view'`, Express leería
 * `.view` como si fuera la extensión del motor de plantillas y buscaría un
 * módulo llamado "view" que no existe (fallaba con "Cannot find module 'view'").
 *
 * Añadiendo `.ejs` aquí se conserva la convención de nombres sin sorpresas.
 *
 * @param {string} view Nombre pedido, con o sin extensión.
 */
function resolverPlantilla(view) {
  return view.endsWith('.ejs') ? view : `${view}.ejs`;
}

// ── BLOQUE 3: El middleware ─────────────────────────────────────────────────

module.exports = function layout(req, res, next) {
  /**
   * Renderiza una vista dentro del layout principal.
   *
   * Se cuelga de `res` para que cualquier controlador pueda llamarlo como
   * `res.renderPage(...)`, igual que usaría el `res.render` nativo.
   *
   * @param {string} view   Nombre de la plantilla, ej. `'home.view'`.
   * @param {object} [data] Datos para la vista. Dos claves son especiales:
   *                        `styles` y `scripts` (rutas propias de esa vista).
   */
  res.renderPage = function renderPage(view, data = {}) {
    // Se separan las listas de recursos del resto de datos: `styles` y
    // `scripts` no los usa la vista, los usa el layout.
    const { styles = [], scripts = [], ...viewData } = data;

    // PASO 1 · Renderizar solo la vista.
    // El tercer argumento es una función de retorno: al pasarla, Express NO
    // envía nada al navegador, sino que entrega el HTML resultante en `body`.
    res.render(resolverPlantilla(view), viewData, (error, body) => {
      // Si la plantilla tiene un fallo (variable inexistente, sintaxis mal),
      // se pasa al manejador de errores en vez de dejar la petición colgada.
      if (error) return next(error);

      // PASO 2 · Renderizar el layout con la vista ya montada dentro.
      // Aquí sí se envía la respuesta al navegador.
      res.render('layouts/main.ejs', {
        ...viewData, //                             Datos originales
        body, //                                    HTML de la vista (paso 1)
        styles: [...BASE_STYLES, ...styles], //     Base + CSS propio
        scripts: [...BASE_SCRIPTS, ...scripts], //  Base + JS propio
      });
    });
  };

  // Sin `next()` la petición se quedaría atascada aquí para siempre.
  next();
};

// Se exportan las listas por si algún script externo necesita consultarlas.
module.exports.BASE_STYLES = BASE_STYLES;
module.exports.BASE_SCRIPTS = BASE_SCRIPTS;
