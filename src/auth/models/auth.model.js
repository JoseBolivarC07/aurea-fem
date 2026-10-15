'use strict';

/**
 * MODELO DE AUTENTICACIÓN
 * =======================
 *
 * Responde a una sola pregunta: ¿estas credenciales son correctas?
 *
 * Elige la estrategia según `AUTH_MODE` del archivo `.env`:
 *   · 'ldap'  → delega en el directorio corporativo de la empresa.
 *   · 'local' → compara con las credenciales del `.env` (modo actual).
 *
 * El controlador no sabe cuál se está usando: llama a `verificar()` y recibe
 * la misma respuesta en ambos casos. Cambiar de una a otra es cambiar una
 * variable de entorno, no reescribir código.
 */

const crypto = require('node:crypto');

const config = require('../../config');
const ldap = require('../services/ldap.service');

// ── BLOQUE 1: Comparación segura de credenciales ────────────────────────────
/**
 * Compara dos textos en tiempo constante.
 *
 * EL PROBLEMA CON `===`
 * Se detiene en la primera diferencia, así que tarda más cuanto más coincidan
 * los textos. Midiendo ese tiempo, un atacante podría deducir la contraseña
 * carácter por carácter.
 *
 * POR QUÉ SE APLICA UN HASH ANTES
 * `timingSafeEqual` exige que ambos valores midan lo mismo, y falla si no.
 * Pasar los textos por SHA-256 los deja siempre en 32 bytes, sin importar el
 * original. De paso se evita filtrar la LONGITUD de la contraseña: sin esto,
 * probar contraseñas de distintos largos revelaría cuál tiene el tamaño
 * correcto.
 */
function comparar(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

// ── BLOQUE 2: Verificación de credenciales ──────────────────────────────────
/**
 * @param {string} usuario
 * @param {string} contrasena
 * @returns {Promise<{ok: boolean, perfil?: object, mensaje?: string}>}
 */
async function verificar(usuario, contrasena) {
  // 2.1 · Normalización de la entrada.
  // `String(...)` protege de que llegue algo que no sea texto (por ejemplo,
  // si alguien envía la petición manipulada con un array o un objeto).
  const nombre = String(usuario || '').trim();
  const clave = String(contrasena || '');

  if (!nombre || !clave) {
    return { ok: false, mensaje: 'Ingresa tu usuario y tu contraseña.' };
  }

  // 2.2 · Estrategia LDAP (para cuando exista el directorio corporativo).
  if (config.auth.mode === 'ldap') {
    const resultado = await ldap.autenticar(nombre, clave);

    if (resultado.ok) return { ok: true, perfil: resultado.perfil };

    // El motivo real del fallo (servidor caído, usuario inexistente,
    // contraseña mala) queda solo en el servidor: al usuario se le da un
    // mensaje genérico para no darle pistas a quien esté probando accesos.
    return { ok: false, mensaje: 'No fue posible validar tus credenciales en el directorio.' };
  }

  // 2.3 · Estrategia local (modo actual).
  // Sin contraseña configurada en el `.env`, el acceso queda cerrado. Es
  // deliberado: mejor bloqueado que abierto con una clave vacía.
  if (!config.auth.localPassword) {
    return { ok: false, mensaje: 'El acceso interno no está configurado en este equipo.' };
  }

  // El usuario se compara sin distinguir mayúsculas ("Admin" vale igual que
  // "admin"); la contraseña SÍ las distingue, como debe ser.
  const usuarioOk = comparar(nombre.toLowerCase(), config.auth.localUser.toLowerCase());
  const claveOk = comparar(clave, config.auth.localPassword);

  // Nota: se evalúan las DOS comparaciones siempre, aunque la primera ya
  // haya fallado. Si se cortocircuitara con `&&`, el tiempo de respuesta
  // revelaría si el usuario existe o no.
  if (usuarioOk && claveOk) {
    return {
      ok: true,
      perfil: { usuario: config.auth.localUser, rol: 'administradora', origen: 'local' },
    };
  }

  // Mensaje único para usuario incorrecto y contraseña incorrecta: decir
  // "el usuario no existe" le confirmaría a un atacante qué nombres son
  // válidos y cuáles no.
  return { ok: false, mensaje: 'Usuario o contraseña incorrectos.' };
}

module.exports = { verificar };
