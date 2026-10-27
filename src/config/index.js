'use strict';

/**
 * CONFIGURACIÓN CENTRALIZADA
 * ==========================
 *
 * Único archivo del proyecto que lee `process.env`.
 *
 * ¿Por qué? Porque si cada módulo leyera las variables por su cuenta, para
 * saber qué se puede configurar habría que abrir treinta archivos, y cada uno
 * tendría su propio valor por defecto (o ninguno). Aquí se ve todo de un
 * vistazo: qué existe, de qué tipo es y qué pasa si no está definido.
 *
 * El resto del proyecto hace `require('../config')` y lee lo que necesita.
 */

const path = require('node:path');

// ── BLOQUE 1: Rutas base del proyecto ───────────────────────────────────────
// Se calculan una sola vez a partir de la ubicación de ESTE archivo.
// `__dirname` es `<proyecto>/src/config`, así que subir dos niveles da la raíz.
// Usar rutas absolutas evita depender de desde qué carpeta se ejecutó Node.
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

// ── BLOQUE 2: Ayudante de conversión ────────────────────────────────────────
/**
 * Convierte una variable de entorno a número entero.
 *
 * Las variables de entorno SIEMPRE llegan como texto: `PORT=3000` produce
 * la cadena "3000", no el número 3000. Si el valor no es convertible
 * (está vacío o mal escrito), se devuelve el respaldo en lugar de `NaN`.
 *
 * @param {string|undefined} value  Valor crudo leído del entorno.
 * @param {number} fallback         Valor a usar si no se pudo convertir.
 */
function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// ── BLOQUE 3: Entorno de ejecución ──────────────────────────────────────────
// 'development' mientras se trabaja en local, 'production' al publicar.
// Cambia el comportamiento de la caché y del detalle mostrado en los errores.
const env = process.env.NODE_ENV || 'development';

// ── BLOQUE 4: Objeto de configuración ───────────────────────────────────────
const config = {
  env,
  isProduction: env === 'production',

  // ---- Servidor -----------------------------------------------------------
  server: {
    port: toInt(process.env.PORT, 3000),
    host: '0.0.0.0', // Acepta conexiones de cualquier interfaz de red.
  },

  // ---- Rutas de carpetas --------------------------------------------------
  // Se guardan resueltas para que ningún módulo tenga que armarlas a mano.
  paths: {
    root: ROOT, //                                    Raíz del proyecto
    src: SRC, //                                      Carpeta src/
    views: path.join(SRC, 'app', 'views'), //         Plantillas del sitio
    authViews: path.join(SRC, 'auth', 'views'), //    Plantillas de acceso
    // En la raíz y no en src/: Vercel solo sirve archivos estáticos desde
    // `public/` (allí express.static no se usa).
    public: path.join(ROOT, 'public'), //             CSS, JS e imágenes
    storage: path.join(ROOT, 'storage'), //           Mensajes de contacto
  },

  // ---- Agente de inteligencia artificial ----------------------------------
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '', // Vacío = el chat se desactiva
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',

    // Límites defensivos: protegen la cuota gratuita y evitan respuestas
    // eternas o peticiones que se queden colgadas para siempre.
    timeoutMs: 30000, //          Espera máxima SIN recibir datos nuevos
    maxOutputTokens: 800, //      Largo máximo de la respuesta
    temperature: 0.7, //          0 = muy predecible · 1 = muy creativo
    maxHistoryTurns: 12, //       Turnos previos enviados como contexto
    maxMessageLength: 1000, //    Caracteres máximos por consulta
  },

  // ---- Acceso al panel interno --------------------------------------------
  auth: {
    mode: process.env.AUTH_MODE || 'local', // 'local' | 'ldap'
    localUser: process.env.AUTH_LOCAL_USER || 'admin',
    localPassword: process.env.AUTH_LOCAL_PASSWORD || '',

    // Secreto con el que se firman las cookies de sesión. Si cambia, todas
    // las sesiones abiertas dejan de ser válidas (lo cual es correcto).
    sessionSecret: process.env.SESSION_SECRET || 'aurea-fem-dev-secret',
    sessionMaxAgeMs: 1000 * 60 * 60 * 4, // 4 horas de duración

    // Datos del directorio corporativo, para cuando exista.
    ldap: {
      url: process.env.LDAP_URL || '',
      baseDn: process.env.LDAP_BASE_DN || '',
    },
  },

  // ---- Formulario de contacto ---------------------------------------------
  // 'archivo'  → guarda en storage/mensajes.json y se lee en el panel.
  // 'whatsapp' → abre WhatsApp con el mensaje ya escrito.
  // Vercel (que define VERCEL=1) tiene el disco en solo lectura, así que allí
  // el valor por defecto es 'whatsapp'.
  contacto: {
    canal: process.env.CONTACTO_CANAL || (process.env.VERCEL ? 'whatsapp' : 'archivo'),
  },

  // ---- Límite de peticiones -----------------------------------------------
  // Se aplica solo al endpoint del chat: 15 consultas por minuto y por IP.
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 15,
  },
};

module.exports = config;
