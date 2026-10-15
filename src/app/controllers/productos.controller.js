'use strict';

/**
 * CONTROLADOR DEL CATÁLOGO DE PRODUCTOS
 * =====================================
 *
 * Único controlador del sitio que lee parámetros de la URL: el filtro por
 * categoría llega como `?categoria=infusiones`.
 *
 * DECISIÓN DE DISEÑO — ¿por qué filtrar en el servidor y no con JavaScript?
 * Porque así la vista filtrada tiene su propia dirección. Eso significa que:
 *   · Se puede compartir el enlace de "solo infusiones".
 *   · Se puede guardar en favoritos.
 *   · El botón "atrás" del navegador funciona como se espera.
 *   · Y sobre todo: funciona aunque el JavaScript falle o esté desactivado.
 * Los filtros son enlaces <a> normales, no botones que ocultan tarjetas.
 */

const { categorias, listar } = require('../models/producto.model');
const { etapas } = require('../models/etapa.model');

// ── Manejador de GET /productos ─────────────────────────────────────────────
function mostrar(req, res) {
  // ---- BLOQUE 1: Leer y validar el filtro -------------------------------
  // `req.query.categoria` viene de la URL, así que es dato NO confiable:
  // podría llegar cualquier cosa escrita a mano en la barra de direcciones.
  // Se convierte a texto y se comprueba contra la lista real de categorías.
  const solicitada = String(req.query.categoria || 'todos');
  const existe = categorias.some((categoria) => categoria.id === solicitada);

  // Si la categoría pedida no existe, se muestra el catálogo completo en
  // lugar de un error: es más amable y evita una página rota.
  const activa = existe ? solicitada : 'todos';

  // ---- BLOQUE 2: Renderizar ---------------------------------------------
  res.renderPage('productos.view', {
    title: 'Productos · Áurea Fem',
    description:
      'Tés, cremas, compresas y diarios seleccionados y distribuidos por Áurea Fem para acompañar el bienestar femenino en cada etapa.',
    bodyClass: 'page-productos',

    styles: ['/css/components/page-header.css', '/css/views/productos.css'],
    // El script conecta el botón "Consultar" de cada tarjeta con el chat.
    scripts: ['/js/views/productos.js'],

    categorias, //       Para pintar los botones de filtro
    categoriaActiva: activa, // Para marcar cuál está seleccionado
    // `listar()` devuelve los productos ya filtrados y con el precio
    // formateado en pesos colombianos: la vista no tiene que calcular nada.
    productos: listar(activa),
    etapas, //           Para traducir el id de etapa a su nombre legible
  });
}

module.exports = { mostrar };
