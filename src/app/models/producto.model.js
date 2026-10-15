'use strict';

/**
 * CATÁLOGO DE PRODUCTOS DE BIENESTAR
 * ==================================
 *
 * Único modelo del proyecto con FUNCIONES además de datos: da formato a los
 * precios y elige los destacados de la portada.
 *
 * PENSADO PARA CRECER
 * Cuando exista una base de datos, solo cambia el interior de `listar()` y
 * `destacados()`: en vez de recorrer un array, harán una consulta. La firma
 * de las funciones sigue igual, así que ni el controlador ni la vista se
 * enteran del cambio. Eso es lo que da el separar en capas.
 */

// ── BLOQUE 1: El catálogo ───────────────────────────────────────────────────
/**
 * Campos de cada producto:
 *   id        → identificador único; también nombra su foto en
 *               `public/images/productos/<id>.jpg`
 *   precio    → número puro en pesos, SIN formato (ver BLOQUE 2)
 *   formato   → presentación ("Tubo 150 g")
 *   resumen   → frase corta para la tarjeta
 *   detalle   → explicación ampliada
 *   etapas    → ids de `etapa.model.js`; conecta producto con momento de vida
 *   destacado → si aparece en la portada
 *
 * El precio se guarda como NÚMERO y no como texto ("100.000 COP") a propósito:
 * así se puede ordenar, sumar o comparar. El formato se aplica al mostrarlo.
 */
const productos = [
  {
    id: 'kit-menstrual-basico',
    nombre: 'Kit Menstrual Básico',
    precio: 102000,
    formato: 'Neceser + compresa de gel',
    resumen: 'Todo lo esencial para ti.',
    detalle:
      'Diseñado para acompañarte durante tu ciclo menstrual con practicidad, comodidad y cariño. Reúne elementos esenciales para que te sientas preparada y tranquila durante tu periodo, recordándote que cuidar de ti también significa escuchar tu cuerpo y atender tus necesidades.',
    etapas: ['menstruacion'],
    destacado: true,
  },
  {
    id: 'gel-termico',
    nombre: 'Gel Térmico',
    precio: 103000,
    formato: 'Tubo 150 g',
    resumen: 'Alivio y calidez.',
    detalle:
      'Un pequeño aliado para esos días en los que tu cuerpo necesita un poco más de cuidado. Brinda una sensación reconfortante de calor en la zona abdominal, te acompaña durante los cólicos menstruales y convierte el descanso en un momento de bienestar.',
    etapas: ['menstruacion'],
    destacado: true,
  },
  {
    id: 'faja-termica-menstrual',
    nombre: 'Faja Térmica Menstrual',
    precio: 107000,
    formato: 'Faja eléctrica con control de calor',
    resumen: 'Comodidad que te acompaña.',
    detalle:
      'Una aliada pensada para brindarte comodidad y una agradable sensación de calor en la zona abdominal durante los días del periodo. Su diseño permite llevar el calor cerca de ti mientras descansas o realizas actividades cotidianas, sin dejar de lado tu rutina.',
    etapas: ['menstruacion'],
    destacado: true,
  },
  {
    id: 'te-rojo',
    nombre: 'Té Rojo',
    precio: 100000,
    formato: 'Caja · infusión de bienestar',
    resumen: 'Una pausa para reconectar contigo.',
    detalle:
      'Una taza de calidez para regalarte unos minutos de tranquilidad en medio de tus días. Te invita a crear pequeños rituales de autocuidado, disfrutando de su aroma y sabor mientras haces una pausa para respirar, relajarte y reconectar contigo misma.',
    etapas: [],
    destacado: true,
  },
];

// ── BLOQUE 2: Formato de moneda ─────────────────────────────────────────────
/**
 * `Intl.NumberFormat` es la herramienta nativa de JavaScript para dar formato
 * a números según el país. Con 'es-CO' y 'COP' convierte 28000 en "$ 28.000":
 * pone el separador de miles que se usa en Colombia (punto, no coma) y el
 * símbolo de peso.
 *
 * Se crea UNA sola vez fuera de las funciones porque construir un formateador
 * es costoso; reutilizarlo evita rehacerlo en cada producto de cada visita.
 *
 * `maximumFractionDigits: 0` quita los centavos, que aquí no aportan nada.
 */
const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

// ── BLOQUE 3: Consultas al catálogo ─────────────────────────────────────────
/**
 * Devuelve los productos con el precio ya listo para mostrar y la ruta de
 * su foto.
 *
 * El formateo ocurre AQUÍ y no en la plantilla porque las vistas deben
 * limitarse a colocar datos, no a transformarlos. Así, si mañana hay que
 * mostrar precios en otra moneda, se cambia una línea de este archivo en
 * lugar de buscar por todas las plantillas.
 *
 * Se devuelve una copia de cada producto (`...producto`) con el campo nuevo,
 * en vez de modificar el original: el array `productos` queda intacto.
 *
 * @returns {Array} Productos con `precioFormateado` e `imagen` añadidos.
 */
function listar() {
  return productos.map((producto) => ({
    ...producto, // Copia de todos los campos originales
    precioFormateado: formatoPesos.format(producto.precio),
    imagen: `/images/productos/${producto.id}.jpg`,
  }));
}

/**
 * Los productos marcados como destacados, para la portada.
 *
 * Reutiliza `listar()` en lugar de recorrer `productos` por su cuenta, así
 * los precios también llegan formateados sin duplicar esa lógica.
 *
 * @param {number} [limite] Cuántos devolver como máximo.
 */
function destacados(limite = 3) {
  return listar().filter((producto) => producto.destacado).slice(0, limite);
}

module.exports = { productos, listar, destacados };
