/**
 * LÓGICA DEL CARRITO (SIN DOM)
 * ============================
 *
 * Funciones puras que calculan el pedido, el total y el mensaje de WhatsApp.
 * No tocan la página ni el almacenamiento: así se pueden probar con
 * `node --test` y la interfaz (`carrito.js`) solo se ocupa de pintar.
 *
 * TIPOS
 *   Producto = { id, nombre, precio, imagen }
 *   Linea    = { id: string, cantidad: number }
 *   Pedido   = Linea[]
 *
 * Ninguna función muta lo que recibe: todas devuelven arreglos nuevos.
 */

export const MAXIMO = 10;

// Mismas opciones que `formatoPesos` en el modelo del servidor, para que el
// precio se vea igual en la tarjeta y en el carrito.
const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Convierte cualquier valor en un entero entre 1 y MAXIMO. */
function acotar(cantidad) {
  const entero = Math.trunc(Number(cantidad));
  // NaN no es comparable, por eso se trata aparte: vale 1.
  if (Number.isNaN(entero)) return 1;
  return Math.min(MAXIMO, Math.max(1, entero));
}

/**
 * Convierte lo leído del almacenamiento (que puede venir corrupto o editado
 * a mano) en un pedido válido: solo ids del catálogo, sin duplicados.
 */
export function sanear(guardado, catalogo) {
  if (!Array.isArray(guardado)) return [];
  const conocidos = new Set(catalogo.map((producto) => producto.id));
  const vistos = new Set();
  const pedido = [];
  for (const linea of guardado) {
    if (!linea || typeof linea !== 'object') continue;
    const { id } = linea;
    if (!conocidos.has(id) || vistos.has(id)) continue;
    vistos.add(id);
    pedido.push({ id, cantidad: acotar(linea.cantidad) });
  }
  return pedido;
}

export function agregar(pedido, id) {
  if (pedido.some((linea) => linea.id === id)) {
    return pedido.map((linea) => (linea.id === id ? { ...linea, cantidad: acotar(linea.cantidad + 1) } : { ...linea }));
  }
  return [...pedido.map((linea) => ({ ...linea })), { id, cantidad: 1 }];
}

export function cambiarCantidad(pedido, id, cantidad) {
  return pedido.map((linea) => (linea.id === id ? { ...linea, cantidad: acotar(cantidad) } : { ...linea }));
}

export function quitar(pedido, id) {
  return pedido.filter((linea) => linea.id !== id).map((linea) => ({ ...linea }));
}

export function unidades(pedido) {
  return pedido.reduce((suma, linea) => suma + linea.cantidad, 0);
}

export function total(pedido, catalogo) {
  return pedido.reduce((suma, linea) => {
    const producto = catalogo.find((p) => p.id === linea.id);
    return producto ? suma + producto.precio * linea.cantidad : suma;
  }, 0);
}

export function formatearPesos(valor) {
  return formatoPesos.format(valor);
}

/** Texto del pedido para WhatsApp; vacío si no hay líneas válidas. */
export function armarMensaje(pedido, catalogo) {
  const lineas = [];
  const validas = [];
  for (const linea of pedido) {
    const producto = catalogo.find((p) => p.id === linea.id);
    if (!producto) continue;
    validas.push(linea);
    lineas.push(`- ${linea.cantidad} × ${producto.nombre} — ${formatearPesos(producto.precio * linea.cantidad)}`);
  }
  if (lineas.length === 0) return '';
  return (
    'Hola, ¿cómo estás? Quisiera llevarme estos productos:\n\n' +
    lineas.join('\n') +
    `\n\nTotal: ${formatearPesos(total(validas, catalogo))}`
  );
}

export function enlaceWhatsApp(numero, mensaje) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
