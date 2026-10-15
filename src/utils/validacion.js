'use strict';

/**
 * VALIDACIÓN Y SANEAMIENTO DE ENTRADAS
 * ====================================
 *
 * Todo dato que llega del navegador pasa por aquí antes de guardarse o de
 * enviarse a un servicio externo.
 *
 * REGLA DE ORO: nunca confiar en lo que envía el cliente.
 * Aunque el formulario tenga `required` y `maxlength`, y aunque
 * `views/contacto.js` valide mientras se escribe, todo eso vive en el
 * navegador y se puede desactivar. La única validación que de verdad
 * protege es la que corre en el servidor, y es esta.
 *
 * Las reglas están duplicadas a propósito en el cliente: allí sirven para
 * avisar rápido y sin recargar; aquí, para proteger.
 */

// ── BLOQUE 1: Patrón de correo ──────────────────────────────────────────────
/**
 * Expresión regular deliberadamente sencilla. Comprueba la FORMA
 * (algo@algo.dominio), no que el buzón exista de verdad — eso solo se sabe
 * enviando un correo.
 *
 * Desglose:
 *   ^[^\s@]+   → uno o más caracteres que no sean espacio ni @
 *   @          → la arroba
 *   [^\s@]+    → el dominio, sin espacios ni arrobas
 *   \.         → un punto literal
 *   [a-z]{2,}$ → extensión de dos letras o más (.co, .com, .info)
 *
 * Los patrones "perfectos" de correo son enormes y rechazan direcciones
 * válidas. Este acepta lo razonable y descarta lo evidentemente mal escrito.
 */
const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

// ── BLOQUE 2: Limpieza de texto ─────────────────────────────────────────────
/**
 * Deja un texto en condiciones de guardarse.
 *
 * Cuatro operaciones, en orden:
 *   1. Normaliza los saltos de línea de Windows (\r\n) a la forma estándar.
 *   2. Colapsa tres o más saltos seguidos en dos: evita que alguien envíe
 *      cincuenta líneas vacías para reventar el diseño del panel.
 *   3. Quita espacios sobrantes al principio y al final.
 *   4. Recorta al largo máximo permitido.
 *
 * Si el valor no es texto (llegó un número, un objeto o nada), devuelve una
 * cadena vacía en vez de fallar: quien llame recibirá siempre un string.
 *
 * @param {unknown} valor  Dato crudo recibido del navegador.
 * @param {number} maximo  Largo máximo permitido.
 * @returns {string}
 */
function limpiarTexto(valor, maximo = 500) {
  if (typeof valor !== 'string') return '';

  return valor
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maximo);
}

// ── BLOQUE 3: Comprobación de correo ────────────────────────────────────────
/**
 * El límite de 254 caracteres no es arbitrario: es el máximo que permite el
 * estándar de correo electrónico (RFC 5321).
 *
 * @param {unknown} valor
 * @returns {boolean}
 */
function esCorreoValido(valor) {
  return typeof valor === 'string' && CORREO.test(valor.trim()) && valor.length <= 254;
}

// ── BLOQUE 4: Validación del formulario de contacto ─────────────────────────
/**
 * Revisa el formulario completo y devuelve DOS cosas de una sola pasada:
 * los datos ya limpios y los errores encontrados.
 *
 * ¿Por qué devolver también los datos limpios? Porque si la validación falla,
 * el controlador los devuelve al formulario para que la usuaria no tenga que
 * reescribir todo por culpa de un correo mal puesto.
 *
 * Los mensajes de error están redactados en el tono de la marca: explican qué
 * pasó sin regañar ("Revisa el correo: parece que le falta algo" en lugar de
 * "Correo inválido").
 *
 * @param {object} cuerpo `req.body` tal como llega.
 * @returns {{datos: object, errores: Record<string, string>}}
 */
function validarContacto(cuerpo = {}) {
  // Primero limpiar, después validar: así se evita que un nombre de solo
  // espacios ("   ") pase por válido.
  const datos = {
    nombre: limpiarTexto(cuerpo.nombre, 80),
    correo: limpiarTexto(cuerpo.correo, 254),
    etapa: limpiarTexto(cuerpo.etapa, 40),
    mensaje: limpiarTexto(cuerpo.mensaje, 1200),
  };

  // Se acumulan TODOS los errores en lugar de parar en el primero: así la
  // usuaria ve de una vez todo lo que debe corregir.
  const errores = {};

  if (datos.nombre.length < 2) {
    errores.nombre = 'Escribe tu nombre para saber cómo dirigirnos a ti.';
  }

  if (!esCorreoValido(datos.correo)) {
    errores.correo = 'Revisa el correo: parece que le falta algo.';
  }

  if (datos.mensaje.length < 10) {
    errores.mensaje = 'Cuéntanos un poco más para poder ayudarte bien.';
  }

  // `etapa` no se valida: es opcional y el desplegable ya limita las opciones.

  return { datos, errores };
}

module.exports = { limpiarTexto, esCorreoValido, validarContacto };
