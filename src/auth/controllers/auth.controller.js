'use strict';

/**
 * CONTROLADOR DE ACCESO AL PANEL INTERNO
 * ======================================
 *
 * Maneja las cuatro acciones del módulo de acceso:
 *   GET  /acceso        → formulario de ingreso
 *   POST /acceso        → validar credenciales y abrir sesión
 *   GET  /acceso/panel  → panel con los mensajes (requiere sesión)
 *   POST /acceso/salir  → cerrar sesión
 *
 * Este módulo vive en `src/auth/` y no en `src/app/` porque es una parte
 * independiente del sitio: tiene sus propias vistas, su propio modelo y su
 * propio servicio. Podría quitarse entero sin tocar el sitio público.
 */

const config = require('../../config');
const authModel = require('../models/auth.model');
const ldap = require('../services/ldap.service');
const sesion = require('../../utils/sesion');
const mensajeModel = require('../../app/models/mensaje.model');

// ── BLOQUE 1: Datos comunes de la vista de acceso ───────────────────────────
/**
 * La pantalla de login se renderiza en varias situaciones: vacía, con un
 * aviso ("tu sesión expiró"), o con un error ("contraseña incorrecta").
 * Esta función reúne lo común para no repetirlo en cada caso.
 *
 * CLAVE: `error` y `aviso` deben existir SIEMPRE, aunque valgan `null`. La
 * plantilla las consulta con `<% if (aviso) %>` y EJS lanza un
 * ReferenceError ante una variable no definida — este fue un bug real que
 * devolvía 500 al equivocarse de contraseña.
 */
function baseLogin(extra = {}) {
  return {
    title: 'Acceso interno · Áurea Fem',
    description: 'Acceso al panel administrativo de Áurea Fem.',
    bodyClass: 'page-acceso',

    // Sin widget de chat: es un área privada, no tiene sentido ofrecer
    // orientación sobre salud aquí.
    showChat: false,

    styles: ['/css/components/form.css', '/css/views/acceso.css'],

    // Se muestran al pie del formulario para que el equipo sepa contra qué
    // se está autenticando, y detecte si el LDAP quedó mal configurado.
    modo: config.auth.mode,
    ldapDisponible: ldap.estaDisponible(),

    valores: {}, // Lo escrito, para no perderlo si falla
    error: null, //  Credenciales incorrectas
    aviso: null, //  Sesión expirada, cierre de sesión...

    ...extra,
  };
}

// ── BLOQUE 2: Mostrar el formulario (GET /acceso) ───────────────────────────
function mostrarLogin(req, res) {
  // Si ya hay sesión abierta, no tiene sentido pedir credenciales otra vez.
  if (sesion.leer(req)) return res.redirect('/acceso/panel');

  // El parámetro `?motivo=` lo ponen las redirecciones internas:
  //   'sesion' → lo añade `requerirSesion` al caducar la sesión
  //   'salida' → lo añade `cerrarSesion` tras un cierre voluntario
  const avisos = {
    sesion: 'Tu sesión expiró. Vuelve a ingresar.',
    salida: 'Cerraste sesión correctamente.',
  };

  // Si llega un motivo desconocido, `avisos[...]` da `undefined` y el `||`
  // lo convierte en `null`: no se muestra nada raro en pantalla.
  res.renderPage('login.view', baseLogin({ aviso: avisos[req.query.motivo] || null }));
}

// ── BLOQUE 3: Validar credenciales (POST /acceso) ───────────────────────────
async function iniciarSesion(req, res, next) {
  try {
    const { usuario, contrasena } = req.body || {};

    // El modelo decide si son correctas (local o LDAP según configuración).
    const resultado = await authModel.verificar(usuario, contrasena);

    // ---- Credenciales incorrectas ---------------------------------------
    // 401 = "Unauthorized": la petición se entendió pero falta autenticación
    // válida. Se devuelve el nombre de usuario escrito (nunca la contraseña).
    if (!resultado.ok) {
      return res.status(401).renderPage(
        'login.view',
        baseLogin({
          error: resultado.mensaje,
          valores: { usuario: String(usuario || '').trim() },
        })
      );
    }

    // ---- Credenciales correctas -----------------------------------------
    // Se crea la cookie firmada y se redirige al panel. La redirección evita
    // que al recargar el navegador reenvíe las credenciales.
    sesion.crear(res, { usuario: resultado.perfil.usuario, rol: resultado.perfil.rol });
    return res.redirect('/acceso/panel');
  } catch (error) {
    // `verificar` es asíncrona (el modo LDAP hace red), así que se envuelve
    // en try/catch: sin esto, un fallo dejaría la petición colgada.
    return next(error);
  }
}

// ── BLOQUE 4: Panel interno (GET /acceso/panel) ─────────────────────────────
/**
 * Ruta protegida: `requerirSesion` corre antes en `auth.routes.js`, así que
 * si esta función se ejecuta es porque la sesión ya fue verificada, y
 * `req.sesion` tiene los datos de quien entró.
 */
function mostrarPanel(req, res) {
  // Con el canal de WhatsApp no hay archivo que leer (y en Vercel el disco es
  // de solo lectura: intentar crearlo fallaría).
  const porWhatsApp = config.contacto.canal === 'whatsapp';

  // `slice(-20)` toma los 20 últimos; `reverse()` los pone del más reciente
  // al más antiguo, que es como se espera leer una bandeja de mensajes.
  const mensajes = porWhatsApp ? [] : mensajeModel.listar().slice(-20).reverse();

  res.renderPage('panel.view', {
    title: 'Panel interno · Áurea Fem',
    description: 'Mensajes recibidos desde el formulario de contacto.',
    bodyClass: 'page-panel',
    showChat: false,
    styles: ['/css/components/form.css', '/css/views/acceso.css'],

    sesion: req.sesion, // Para saludar y mostrar el rol
    mensajes,
    porWhatsApp,
  });
}

// ── BLOQUE 5: Cerrar sesión (POST /acceso/salir) ────────────────────────────
/**
 * Se usa POST y no GET a propósito. Con un enlace GET, cualquier imagen o
 * script externo podría apuntar a esa dirección y cerrar la sesión sin que
 * la persona hiciera nada. Un POST exige un formulario enviado desde el sitio.
 */
function cerrarSesion(req, res) {
  sesion.destruir(res);
  res.redirect('/acceso?motivo=salida');
}

module.exports = { mostrarLogin, iniciarSesion, mostrarPanel, cerrarSesion };
