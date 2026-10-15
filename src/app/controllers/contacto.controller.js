'use strict';

/**
 * CONTROLADOR DEL FORMULARIO DE CONTACTO
 * ======================================
 *
 * Único controlador del sitio que atiende DOS métodos HTTP sobre la misma
 * dirección:
 *   · GET  /contacto → muestra el formulario vacío.
 *   · POST /contacto → recibe los datos, los valida y los guarda.
 *
 * Es también el único que escribe datos, así que aquí aparece la validación
 * del lado del servidor. Aunque el navegador ya valida con JavaScript, esa
 * validación se puede saltar (desactivando JS o enviando la petición con una
 * herramienta externa). La del servidor es la única que de verdad protege.
 */

const { etapas } = require('../models/etapa.model');
const mensajeModel = require('../models/mensaje.model');
const { validarContacto } = require('../../utils/validacion');

// ── BLOQUE 1: Datos comunes de la vista ─────────────────────────────────────
/**
 * La vista de contacto se renderiza en tres situaciones distintas:
 *   a) GET normal, formulario vacío.
 *   b) GET tras enviar bien, con el mensaje de éxito.
 *   c) POST fallido, con los errores y los datos que ya había escrito.
 *
 * Esta función reúne lo que las tres tienen en común, para no repetirlo tres
 * veces. Los tres casos pasan lo suyo por `extra`, que sobrescribe lo que haga
 * falta gracias al operador de propagación (`...extra` va al final).
 *
 * IMPORTANTE: todas las claves que la plantilla consulta deben existir aquí
 * con un valor por defecto. EJS lanza un ReferenceError con una variable no
 * definida, y así se evita (ese fue un bug real en la vista de acceso).
 *
 * @param {object} [extra] Valores que sobrescriben los predeterminados.
 */
function baseVista(extra = {}) {
  return {
    title: 'Contacto · Áurea Fem',
    description:
      'Escríbenos: resolvemos dudas sobre la plataforma, los productos y el acompañamiento en cada etapa. Medellín, Laureles.',
    bodyClass: 'page-contacto',

    // `form.css` es otro componente compartido, esta vez con la página de
    // acceso: ambas usan los mismos campos, etiquetas y estados de error.
    styles: [
      '/css/components/page-header.css',
      '/css/components/form.css',
      '/css/views/contacto.css',
    ],
    scripts: ['/js/views/contacto.js'], // Contador y validación en vivo

    etapas, //          Opciones del desplegable "Etapa"
    valores: {}, //     Lo que la usuaria escribió (para no perderlo si falla)
    errores: {}, //     Mensajes de error por campo
    enviado: false, //  ¿Se muestra el aviso de éxito?

    ...extra,
  };
}

// ── BLOQUE 2: Mostrar el formulario (GET) ───────────────────────────────────
function mostrar(req, res) {
  // `?enviado=1` lo pone la redirección de más abajo, tras un envío correcto.
  // Es lo que dispara el mensaje de "mensaje recibido".
  res.renderPage('contacto.view', baseVista({ enviado: req.query.enviado === '1' }));
}

// ── BLOQUE 3: Recibir el formulario (POST) ──────────────────────────────────
function enviar(req, res, next) {
  // 3.1 · Validación.
  // Devuelve los datos ya limpios y un objeto con los errores encontrados.
  const { datos, errores } = validarContacto(req.body);

  // 3.2 · Si hay errores, se vuelve a mostrar el formulario.
  // Se devuelven los valores que la usuaria ya había escrito: obligarla a
  // reescribir todo por un correo mal puesto es una pésima experiencia.
  //
  // 422 = "Unprocessable Entity": la petición se entendió pero los datos
  // no son válidos. Es más preciso que un 400 genérico.
  if (Object.keys(errores).length > 0) {
    return res.status(422).renderPage('contacto.view', baseVista({ valores: datos, errores }));
  }

  // 3.3 · Guardado.
  // Se envuelve en try/catch porque escribe en disco y eso puede fallar
  // (disco lleno, permisos, USB desconectada a mitad). `next(error)` lo
  // manda al manejador de errores en vez de tumbar el servidor.
  try {
    mensajeModel.crear(datos);
  } catch (error) {
    return next(error);
  }

  // 3.4 · Patrón POST → Redirect → GET.
  //
  // En lugar de responder directamente al POST, se redirige a un GET.
  // ¿Por qué? Porque si se respondiera al POST, al recargar la página el
  // navegador preguntaría "¿reenviar formulario?" y volvería a guardar el
  // mismo mensaje. Con la redirección, la usuaria termina en una URL normal
  // que se puede recargar sin efectos secundarios.
  //
  // El `#formulario` lleva el scroll hasta el aviso de éxito.
  return res.redirect('/contacto?enviado=1#formulario');
}

module.exports = { mostrar, enviar };
