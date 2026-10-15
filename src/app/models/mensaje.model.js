'use strict';

/**
 * ALMACENAMIENTO DE LOS MENSAJES DE CONTACTO
 * ==========================================
 *
 * Guarda lo que llega por el formulario de contacto y lo entrega al panel
 * interno. Es el único modelo que ESCRIBE datos; los demás solo leen.
 *
 * DÓNDE SE GUARDAN
 * En `storage/mensajes.json`, un archivo de texto. No hay base de datos
 * porque el proyecto debe funcionar conectando una USB en cualquier equipo,
 * sin instalar ni configurar nada.
 *
 * PENSADO PARA MIGRAR
 * Las dos funciones públicas —`crear` y `listar`— son exactamente las que
 * tendría este modelo con una base de datos detrás. El día que exista, se
 * reescribe el interior de este archivo y ni el controlador ni las vistas
 * cambian una sola línea.
 *
 * LIMITACIÓN CONOCIDA
 * Con muchos mensajes simultáneos podrían perderse escrituras, porque cada
 * guardado reescribe el archivo entero. Para el volumen de este proyecto no
 * es un problema; con una base de datos deja de existir.
 */

const fs = require('node:fs'); //   Sistema de archivos
const path = require('node:path'); // Construcción de rutas

const config = require('../../config');

// ── BLOQUE 1: Ubicación del archivo ─────────────────────────────────────────
// Ruta absoluta, construida con `path.join` para que funcione igual en
// Windows (\) y en Linux o macOS (/).
const ARCHIVO = path.join(config.paths.storage, 'mensajes.json');

// ── BLOQUE 2: Preparación del almacenamiento ────────────────────────────────
/**
 * Se asegura de que existan la carpeta y el archivo antes de tocarlos.
 *
 * Es lo que permite que el proyecto funcione recién copiado, sin que nadie
 * tenga que crear la carpeta `storage/` a mano. Se llama al principio de
 * cada operación porque es muy barata y evita errores si alguien borra la
 * carpeta con el servidor encendido.
 */
function asegurarArchivo() {
  // `recursive: true` crea también las carpetas padre que falten.
  if (!fs.existsSync(config.paths.storage)) {
    fs.mkdirSync(config.paths.storage, { recursive: true });
  }

  // Un array vacío en JSON: el punto de partida válido para el archivo.
  if (!fs.existsSync(ARCHIVO)) {
    fs.writeFileSync(ARCHIVO, '[]', 'utf8');
  }
}

// ── BLOQUE 3: Lectura ───────────────────────────────────────────────────────
/**
 * Devuelve todos los mensajes guardados.
 *
 * Está blindado a propósito. Si el archivo se corrompiera (por ejemplo, si
 * la USB se retira a mitad de una escritura), `JSON.parse` lanzaría una
 * excepción y tumbaría el panel entero. En su lugar se registra el problema
 * y se devuelve una lista vacía: el panel se ve sin mensajes, pero se ve.
 *
 * @returns {Array<object>} Mensajes, o array vacío si no se pudo leer.
 */
function listar() {
  asegurarArchivo();

  try {
    const contenido = fs.readFileSync(ARCHIVO, 'utf8');
    const datos = JSON.parse(contenido);

    // Comprobación extra: el archivo podría contener JSON válido pero que no
    // sea un array (un objeto, un número). Se verifica antes de devolverlo.
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    console.error('[mensaje.model] No se pudo leer el archivo de mensajes:', error.message);
    return [];
  }
}

// ── BLOQUE 4: Escritura ─────────────────────────────────────────────────────
/**
 * Guarda un mensaje nuevo.
 *
 * Proceso en cuatro pasos: leer lo que hay, añadir el nuevo, escribir todo
 * de vuelta y devolver lo guardado.
 *
 * Los datos que entran YA vienen validados y limpios desde el controlador
 * (`utils/validacion.js`): este modelo no valida, solo persiste. Cada capa
 * hace una cosa.
 *
 * @param {{nombre: string, correo: string, etapa?: string, mensaje: string}} datos
 * @returns {object} El mensaje almacenado, con su id y su fecha.
 */
function crear(datos) {
  const mensajes = listar();

  const nuevo = {
    // Id a partir de la marca de tiempo en base 36 (números y letras), que
    // la hace más corta. Suficiente aquí porque los mensajes se guardan de
    // uno en uno y nunca coinciden en el mismo milisegundo.
    id: `msg_${Date.now().toString(36)}`,

    nombre: datos.nombre,
    correo: datos.correo,
    // La etapa es opcional en el formulario; se guarda `null` si no la eligió.
    etapa: datos.etapa || null,
    mensaje: datos.mensaje,

    // Formato ISO: ordenable como texto y sin ambigüedad de zona horaria.
    // La vista lo convierte a formato colombiano al mostrarlo.
    fecha: new Date().toISOString(),
  };

  mensajes.push(nuevo);

  asegurarArchivo();
  // El `2` de JSON.stringify indenta el archivo, para poder abrirlo y leerlo
  // sin herramientas si hace falta revisarlo a mano.
  fs.writeFileSync(ARCHIVO, JSON.stringify(mensajes, null, 2), 'utf8');

  return nuevo;
}

module.exports = { crear, listar };
