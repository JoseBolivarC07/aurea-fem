'use strict';

/**
 * Servicio de directorio (LDAP).
 *
 * En esta versión local NO hay servidor LDAP: el proyecto debe funcionar
 * conectando una USB en cualquier equipo, sin infraestructura previa.
 *
 * El servicio queda definido con la interfaz definitiva (`autenticar`) para
 * que, cuando exista el directorio corporativo, solo haya que instalar el
 * cliente LDAP e implementar el cuerpo de la función. Ni el controlador ni
 * el modelo de autenticación necesitarán cambios.
 *
 * Implementación futura, en resumen:
 *   1. `ldapjs.createClient({ url: config.auth.ldap.url })`
 *   2. `client.bind(`uid=${usuario},${config.auth.ldap.baseDn}`, contrasena)`
 *   3. Buscar el usuario y devolver sus atributos (nombre, área, rol).
 *   4. `client.unbind()` siempre, incluso si el bind falló.
 */

const config = require('../../config');

/** ¿Hay un servidor LDAP configurado en el entorno? */
function estaDisponible() {
  return Boolean(config.auth.ldap.url && config.auth.ldap.baseDn);
}

/**
 * Autentica contra el directorio corporativo.
 *
 * @param {string} usuario
 * @param {string} contrasena
 * @returns {Promise<{ok: boolean, perfil?: object, motivo?: string}>}
 */
async function autenticar(usuario, contrasena) {
  if (!estaDisponible()) {
    return { ok: false, motivo: 'ldap_no_configurado' };
  }

  // Punto de extensión: aquí irá el bind real contra el directorio.
  void usuario;
  void contrasena;
  return { ok: false, motivo: 'ldap_no_implementado' };
}

module.exports = { estaDisponible, autenticar };
