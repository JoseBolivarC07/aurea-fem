'use strict';

/**
 * CATÁLOGO DE PRODUCTOS DE BIENESTAR
 * ==================================
 *
 * Único modelo del proyecto con FUNCIONES además de datos: filtra por
 * categoría y da formato a los precios.
 *
 * Los precios son de referencia para la maqueta del proyecto escolar.
 *
 * PENSADO PARA CRECER
 * Cuando exista una base de datos, solo cambia el interior de `listar()` y
 * `destacados()`: en vez de recorrer un array, harán una consulta. La firma
 * de las funciones sigue igual, así que ni el controlador ni la vista se
 * enteran del cambio. Eso es lo que da el separar en capas.
 */

// ── BLOQUE 1: Categorías del filtro ─────────────────────────────────────────
// El id viaja en la URL (?categoria=infusiones) y el nombre es lo que se ve
// en el botón. 'todos' es un caso especial: no filtra nada.
const categorias = [
  { id: 'todos', nombre: 'Todo el catálogo' },
  { id: 'infusiones', nombre: 'Infusiones' },
  { id: 'topicos', nombre: 'Cremas y tópicos' },
  { id: 'confort', nombre: 'Confort' },
  { id: 'papeleria', nombre: 'Diarios' },
];

// ── BLOQUE 2: El catálogo ───────────────────────────────────────────────────
/**
 * Campos de cada producto:
 *   id        → identificador único
 *   categoria → debe coincidir con un id del BLOQUE 1
 *   precio    → número puro en pesos, SIN formato (ver BLOQUE 3)
 *   formato   → presentación ("Caja x 20 bolsitas")
 *   resumen   → frase corta para la tarjeta
 *   detalle   → explicación ampliada
 *   etapas    → ids de `etapa.model.js`; conecta producto con momento de vida
 *   destacado → si aparece en la portada
 *
 * El precio se guarda como NÚMERO y no como texto ("28.000 COP") a propósito:
 * así se puede ordenar, sumar o comparar. El formato se aplica al mostrarlo.
 */
const productos = [
  {
    id: 'te-ciclo-suave',
    nombre: 'Té Ciclo Suave',
    categoria: 'infusiones',
    precio: 28000,
    formato: 'Caja x 20 bolsitas',
    resumen: 'Mezcla de manzanilla, jengibre y canela para los días de cólico.',
    detalle:
      'Infusión pensada para los primeros días del ciclo. Ingredientes de origen natural, sin azúcares añadidos.',
    etapas: ['menstruacion'],
    destacado: true,
  },
  {
    id: 'te-noche-serena',
    nombre: 'Té Noche Serena',
    categoria: 'infusiones',
    precio: 30000,
    formato: 'Caja x 20 bolsitas',
    resumen: 'Toronjil y lavanda para las noches en que el descanso no llega.',
    detalle:
      'Formulada para acompañar el descanso durante los cambios hormonales de la menopausia.',
    etapas: ['menopausia'],
    destacado: false,
  },
  {
    id: 'crema-calor-tibio',
    nombre: 'Crema Calor Tibio',
    categoria: 'topicos',
    precio: 42000,
    formato: 'Frasco 120 ml',
    resumen: 'Crema de efecto calor para masaje abdominal y lumbar.',
    detalle:
      'Textura ligera de rápida absorción con aceites esenciales. Uso externo, no apta sobre piel lesionada.',
    etapas: ['menstruacion', 'procesos-medicos'],
    destacado: true,
  },
  {
    id: 'crema-piel-nueva',
    nombre: 'Crema Piel Nueva',
    categoria: 'topicos',
    precio: 48000,
    formato: 'Frasco 200 ml',
    resumen: 'Hidratación intensiva para la piel durante el embarazo.',
    detalle:
      'Manteca de karité y aceite de almendras para zonas de mayor tensión de la piel. Sin fragancias fuertes.',
    etapas: ['embarazo'],
    destacado: false,
  },
  {
    id: 'compresa-termica',
    nombre: 'Compresa térmica reutilizable',
    categoria: 'confort',
    precio: 55000,
    formato: 'Unidad · funda lavable',
    resumen: 'Calor local sostenido, sin cables y sin pilas.',
    detalle:
      'Relleno de semillas naturales. Se calienta en microondas y conserva la temperatura cerca de 25 minutos.',
    etapas: ['menstruacion', 'procesos-medicos'],
    destacado: true,
  },
  {
    id: 'kit-primer-ciclo',
    nombre: 'Kit Primer Ciclo',
    categoria: 'confort',
    precio: 89000,
    formato: 'Kit x 5 piezas',
    resumen: 'El acompañamiento que muchas hubiéramos querido a los doce años.',
    detalle:
      'Guía educativa ilustrada, diario juvenil, compresa térmica pequeña, té suave y neceser para el colegio.',
    etapas: ['pubertad'],
    destacado: true,
  },
  {
    id: 'diario-adolescente',
    nombre: 'Diario Áurea Joven',
    categoria: 'papeleria',
    precio: 38000,
    formato: '120 páginas · tapa dura',
    resumen: 'Un diario guiado para entender lo que el cuerpo empieza a decir.',
    detalle:
      'Secciones para registrar el ciclo, el ánimo y preguntas frecuentes respondidas con lenguaje claro.',
    etapas: ['pubertad'],
    destacado: false,
  },
  {
    id: 'diario-adulta',
    nombre: 'Diario Áurea Ciclo',
    categoria: 'papeleria',
    precio: 45000,
    formato: '160 páginas · tapa dura',
    resumen: 'Registro mensual del ciclo, síntomas y energía.',
    detalle:
      'Doce meses de seguimiento con espacio para anotar consultas médicas y observaciones personales.',
    etapas: ['menstruacion', 'embarazo', 'menopausia'],
    destacado: false,
  },
];

// ── BLOQUE 3: Formato de moneda ─────────────────────────────────────────────
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

// ── BLOQUE 4: Consultas al catálogo ─────────────────────────────────────────
/**
 * Devuelve los productos, opcionalmente filtrados, con el precio ya listo
 * para mostrar.
 *
 * El formateo ocurre AQUÍ y no en la plantilla porque las vistas deben
 * limitarse a colocar datos, no a transformarlos. Así, si mañana hay que
 * mostrar precios en otra moneda, se cambia una línea de este archivo en
 * lugar de buscar por todas las plantillas.
 *
 * Se devuelve una copia de cada producto (`...producto`) con el campo nuevo,
 * en vez de modificar el original: el array `productos` queda intacto.
 *
 * @param {string} [categoria] Id de categoría; 'todos' o vacío devuelve todo.
 * @returns {Array} Productos con `precioFormateado` añadido.
 */
function listar(categoria) {
  const filtrados =
    !categoria || categoria === 'todos'
      ? productos // Sin filtro: el catálogo completo.
      : productos.filter((producto) => producto.categoria === categoria);

  return filtrados.map((producto) => ({
    ...producto, // Copia de todos los campos originales
    precioFormateado: formatoPesos.format(producto.precio), // + el nuevo
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

module.exports = { productos, categorias, listar, destacados };
