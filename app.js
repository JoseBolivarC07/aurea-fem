'use strict';

/**
 * ÁUREA FEM — PUNTO DE ENTRADA DE LA APLICACIÓN
 * =============================================
 *
 * Este es el primer archivo que ejecuta Node cuando se corre `npm start`.
 *
 * Tiene una sola responsabilidad: preparar el entorno, construir el servidor
 * y ponerlo a escuchar. Nada de lógica del sitio vive aquí; toda está en
 * `src/`. Así, si mañana el proyecto necesita arrancar de otra forma (por
 * ejemplo, dentro de una prueba automatizada), solo cambia este archivo.
 *
 * Orden de arranque:
 *   1. Cargar las variables del archivo .env
 *   2. Leer la configuración ya interpretada
 *   3. Construir la aplicación Express
 *   4. Escuchar un puerto y mostrar el resumen en consola
 *   5. Quedar atento a las señales de apagado
 */

// ── BLOQUE 1: Carga de variables de entorno ─────────────────────────────────
// Lee el archivo `.env` y vuelca su contenido en `process.env`.
// Debe ir ANTES de cualquier otro require: los módulos que se cargan más
// abajo leen esas variables al importarse, y si aún no existen tomarían
// sus valores por defecto.
require('dotenv').config();

// ── BLOQUE 2: Dependencias internas ─────────────────────────────────────────
// `config` = configuración ya validada y con valores por defecto aplicados.
// `createServer` = función que arma la aplicación Express completa.
const config = require('./src/config');
const createServer = require('./src/server');

// ── BLOQUE 3: Construcción de la aplicación ─────────────────────────────────
// Se arma la app (rutas, middlewares, motor de vistas) pero todavía no
// escucha ningún puerto: construir y escuchar son dos pasos separados.
const app = createServer();

// ── BLOQUE 4: Puesta en marcha del servidor ─────────────────────────────────
// `listen` abre el puerto. La función que recibe se ejecuta una vez que el
// servidor ya está aceptando conexiones, y se aprovecha para imprimir un
// resumen útil: dónde abrir el navegador y si el agente de IA está activo.
const server = app.listen(config.server.port, () => {
  const url = `http://localhost:${config.server.port}`;

  console.log('');
  console.log('  ÁUREA FEM · Cuidarte también es conocerte');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Servidor    ${url}`);
  console.log(`  Entorno     ${config.env}`);
  // Si falta la API key, se avisa aquí en lugar de dejar que el chat falle
  // en silencio cuando alguien lo abra.
  console.log(
    `  Agente IA   ${config.gemini.apiKey ? config.gemini.model : 'sin API key (chat deshabilitado)'}`
  );
  console.log('');
  console.log('  Ctrl + C para detener.');
  console.log('');
});

// ── BLOQUE 5: Apagado ordenado ──────────────────────────────────────────────
/**
 * Cierra el servidor con calma en lugar de matar el proceso de golpe.
 *
 * `server.close()` deja de aceptar conexiones nuevas y espera a que terminen
 * las que están en curso. Esto importa sobre todo para el chat: si alguien
 * está recibiendo una respuesta en streaming, se le permite terminarla.
 *
 * @param {string} signal Nombre de la señal recibida (solo para el mensaje).
 */
function shutdown(signal) {
  console.log(`\n  ${signal} recibido. Cerrando servidor...`);

  server.close(() => process.exit(0));

  // Red de seguridad: si a los 5 segundos alguna conexión sigue colgada,
  // se fuerza la salida. `.unref()` evita que este propio temporizador
  // mantenga vivo el proceso si todo cerró bien antes de tiempo.
  setTimeout(() => process.exit(1), 5000).unref();
}

// SIGINT  = Ctrl + C en la terminal.
// SIGTERM = orden de cierre del sistema operativo o de un gestor de procesos.
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
