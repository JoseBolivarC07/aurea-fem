'use strict';

/**
 * SESIÓN POR COOKIE FIRMADA
 * =========================
 *
 * Mantiene identificada a quien entra al panel interno, sin instalar
 * `express-session` ni ninguna otra librería.
 *
 * CÓMO FUNCIONA, EN CORTO
 * Al iniciar sesión se guarda en el navegador una cookie con dos partes
 * separadas por un punto:
 *
 *     eyJ1c3VhcmlvIjoiYWRtaW4ifQ  .  k3Jd8sLm2p...
 *     └── datos (usuario y caducidad) ┘  └── firma ┘
 *
 * La firma es un HMAC-SHA256 de los datos hecho con una clave secreta que
 * solo conoce el servidor. Al recibir la cookie, el servidor recalcula la
 * firma sobre los datos recibidos: si coincide, la cookie es auténtica.
 *
 * POR QUÉ ES SEGURO
 * Alguien puede LEER la cookie (los datos van en base64, no cifrados), pero
 * no puede MODIFICARLA. Si edita "usuario":"admin" o alarga la caducidad, la
 * firma deja de coincidir y la sesión se descarta. Y no puede generar una
 * firma nueva porque no tiene el secreto.
 *
 * Por eso mismo la cookie NUNCA debe llevar información sensible: solo
 * el nombre de usuario, el rol y cuándo caduca.
 */

const crypto = require('node:crypto'); // Módulo de criptografía de Node
const config = require('../config');

const NOMBRE_COOKIE = 'aurea_sesion';

// ── BLOQUE 1: Firma ─────────────────────────────────────────────────────────
/**
 * Calcula la firma HMAC-SHA256 de un texto con el secreto de la aplicación.
 *
 * Un HMAC es como una huella digital: el mismo texto y el mismo secreto dan
 * siempre la misma huella, pero a partir de la huella no se puede reconstruir
 * ni el texto ni el secreto.
 *
 * `base64url` produce una huella con caracteres seguros para cookies y URLs
 * (sin +, / ni =, que darían problemas).
 */
function firmar(texto) {
  return crypto.createHmac('sha256', config.auth.sessionSecret).update(texto).digest('base64url');
}

// ── BLOQUE 2: Comparación segura ────────────────────────────────────────────
/**
 * Compara dos cadenas en TIEMPO CONSTANTE.
 *
 * El `===` normal se detiene en cuanto encuentra una diferencia: comparar
 * "aaaa" con "bbbb" es más rápido que comparar "aaaa" con "aaab". Midiendo
 * esos microsegundos, un atacante puede ir adivinando la firma carácter a
 * carácter (ataque de temporización).
 *
 * `timingSafeEqual` siempre tarda lo mismo, sin importar dónde esté la
 * diferencia. Exige que ambos búferes midan igual, de ahí la comprobación
 * previa de longitud.
 */
function sonIguales(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

// ── BLOQUE 3: Crear la sesión ───────────────────────────────────────────────
/**
 * Escribe la cookie de sesión en la respuesta.
 *
 * @param {import('express').Response} res
 * @param {{usuario: string, rol: string}} datos Información no sensible.
 */
function crear(res, datos) {
  // La caducidad viaja DENTRO de los datos firmados, no solo en la cookie.
  // Si estuviera solo en la cookie, el navegador podría ignorarla; así el
  // servidor la verifica por su cuenta.
  const carga = {
    ...datos,
    exp: Date.now() + config.auth.sessionMaxAgeMs,
  };

  // Los datos se codifican en base64url para que quepan en una cookie sin
  // caracteres problemáticos, y se les añade la firma separada por un punto.
  const cuerpo = Buffer.from(JSON.stringify(carga)).toString('base64url');
  const valor = `${cuerpo}.${firmar(cuerpo)}`;

  res.cookie(NOMBRE_COOKIE, valor, {
    // El JavaScript de la página NO puede leer esta cookie. Si alguien
    // lograra inyectar un script, no podría robar la sesión.
    httpOnly: true,

    // No se envía en peticiones que vengan de otro sitio web. Mitiga CSRF:
    // una página maliciosa no puede hacer acciones en nuestro nombre.
    sameSite: 'lax',

    // Solo por HTTPS. En desarrollo se desactiva porque local usa HTTP.
    secure: config.isProduction,

    maxAge: config.auth.sessionMaxAgeMs, // Caducidad para el navegador
    path: '/', // Válida en todo el sitio
  });
}

// ── BLOQUE 4: Leer y verificar la sesión ────────────────────────────────────
/**
 * Lee la cookie de la petición y comprueba que sea auténtica y vigente.
 *
 * Se analiza la cabecera `Cookie` a mano en lugar de usar `cookie-parser`:
 * es una dependencia menos y aquí solo hace falta una cookie concreta.
 *
 * @param {import('express').Request} req
 * @returns {object|null} Datos de la sesión, o `null` si no es válida.
 */
function leer(req) {
  // 4.1 · ¿Viene alguna cookie?
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;

  // 4.2 · Buscar la nuestra entre todas.
  // La cabecera trae varias separadas por punto y coma:
  //   "otra=valor; aurea_sesion=xxx.yyy; tercera=zzz"
  const entrada = cabecera
    .split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${NOMBRE_COOKIE}=`));

  if (!entrada) return null;

  // 4.3 · Separar datos y firma.
  // Se busca el ÚLTIMO punto (`lastIndexOf`) porque el base64url podría
  // contener puntos, pero la firma siempre es lo que va tras el final.
  const valor = decodeURIComponent(entrada.slice(NOMBRE_COOKIE.length + 1));
  const separador = valor.lastIndexOf('.');
  if (separador === -1) return null;

  const cuerpo = valor.slice(0, separador);
  const firma = valor.slice(separador + 1);

  // 4.4 · VERIFICACIÓN CLAVE: ¿la firma corresponde a estos datos?
  // Si alguien editó la cookie, aquí se detecta y se descarta.
  if (!sonIguales(firma, firmar(cuerpo))) return null;

  // 4.5 · Decodificar y comprobar la caducidad.
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));

    if (!datos.exp || datos.exp < Date.now()) return null; // Sesión vencida

    return datos;
  } catch {
    // JSON corrupto: cookie inválida, se trata como si no hubiera sesión.
    return null;
  }
}

// ── BLOQUE 5: Cerrar la sesión ──────────────────────────────────────────────
/**
 * Le indica al navegador que borre la cookie.
 * El `path` debe coincidir con el usado al crearla, o el navegador no la
 * encuentra y la sesión seguiría abierta.
 */
function destruir(res) {
  res.clearCookie(NOMBRE_COOKIE, { path: '/' });
}

// ── BLOQUE 6: Middleware de protección ──────────────────────────────────────
/**
 * Guardián de las rutas privadas.
 *
 * Se coloca ANTES del controlador en la definición de la ruta:
 *     router.get('/panel', requerirSesion, auth.mostrarPanel);
 *
 * Si no hay sesión válida, redirige al login y `mostrarPanel` nunca llega a
 * ejecutarse. Si la hay, guarda los datos en `req.sesion` para que el
 * controlador sepa quién está dentro.
 */
function requerirSesion(req, res, next) {
  const sesion = leer(req);

  if (!sesion) return res.redirect('/acceso?motivo=sesion');

  req.sesion = sesion;
  next();
}

module.exports = { crear, leer, destruir, requerirSesion, NOMBRE_COOKIE };
