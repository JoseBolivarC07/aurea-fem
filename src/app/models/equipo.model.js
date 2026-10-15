'use strict';

/**
 * EQUIPO, VALORES Y OBJETIVOS
 * ===========================
 *
 * Tres conjuntos de datos que alimentan la página "Nosotras":
 *   1. `equipo`     → las 5 integrantes fundadoras con su cargo
 *   2. `valores`    → los 5 valores corporativos
 *   3. `objetivos`  → los 5 objetivos estratégicos
 *
 * Los `valores` además se envían al agente de IA: son los que definen el TONO
 * con el que Aura responde (empatía, tolerancia, confidencialidad), no solo
 * el contenido.
 *
 * Fuente: "Estructura Organizacional" y "Asignación Estratégica de Cargos".
 */

// ── BLOQUE 1: Equipo fundador ───────────────────────────────────────────────
/**
 * El campo `iniciales` se usa como avatar en las tarjetas: en vez de exigir
 * una fotografía de cada integrante, se dibuja un círculo con sus iniciales.
 * Es una solución que se ve intencional y nunca queda rota por una imagen
 * que falte.
 */
const equipo = [
  {
    id: 'ehinny-requena',
    nombre: 'Ehinny Requena',
    cargo: 'Gerente General',
    area: 'Dirección',
    iniciales: 'ER',
    descripcion:
      'Propuso la idea original del proyecto. Define el rumbo de la empresa, supervisa las áreas y representa a Áurea Fem ante aliados y entidades.',
  },
  {
    id: 'shantal-saldarriaga',
    nombre: 'Shantal Saldarriaga',
    cargo: 'Coordinadora Administrativa y Financiera',
    area: 'Administrativa y financiera',
    iniciales: 'SS',
    descripcion:
      'Lleva el control de ingresos y gastos, planifica el uso de los recursos y acompaña las decisiones financieras de la empresa.',
  },
  {
    id: 'mariana-franco',
    nombre: 'Mariana Franco',
    cargo: 'Coordinadora de Desarrollo y Tecnología',
    area: 'Tecnología y desarrollo',
    iniciales: 'MF',
    descripcion:
      'Coordina la construcción de la plataforma digital, la organización de sus contenidos y el uso eficiente de las herramientas tecnológicas.',
  },
  {
    id: 'mariangel-franco',
    nombre: 'Mariangel Franco',
    cargo: 'Coordinadora de Productos y Bienestar',
    area: 'Producción y bienestar',
    iniciales: 'MF',
    descripcion:
      'Selecciona proveedores y productos, supervisa la calidad de cada envío y responde las dudas de las usuarias sobre el catálogo.',
  },
  {
    id: 'ana-sofia-ruiz',
    nombre: 'Ana Sofía Ruiz',
    cargo: 'Coordinadora de Marketing y Comunicación',
    area: 'Marketing y comunicación',
    iniciales: 'AR',
    descripcion:
      'Da a conocer la marca, mantiene activas las redes sociales y cuida que la comunicación con las usuarias sea clara y cercana.',
  },
];

// ── BLOQUE 2: Valores corporativos ──────────────────────────────────────────
/**
 * Declarados en la Fase 1 del proyecto.
 * Doble uso: se muestran en /nosotras Y se inyectan en la instrucción de
 * sistema de Aura, para que el chat encarne los mismos principios.
 */
const valores = [
  {
    id: 'confidencialidad',
    nombre: 'Confidencialidad',
    texto:
      'La información sobre la salud femenina es privada. Garantizamos un entorno seguro y protegido en la plataforma y en el foro.',
  },
  {
    id: 'empatia',
    nombre: 'Empatía',
    texto:
      'Trabajamos con procesos hormonales y emocionales sensibles. Entender lo que siente cada mujer es la base de un acompañamiento real.',
  },
  {
    id: 'bienestar-integral',
    nombre: 'Bienestar integral',
    texto:
      'No nos enfocamos solo en el dolor físico, sino también en el bienestar emocional, mental y educativo de cada mujer.',
  },
  {
    id: 'tolerancia',
    nombre: 'Tolerancia',
    texto:
      'Cada mujer vive sus procesos de manera distinta. Respetamos las diferentes experiencias, creencias y decisiones: aquí nadie es juzgada.',
  },
  {
    id: 'compromiso',
    nombre: 'Compromiso',
    texto:
      'No buscamos vender un producto y desaparecer, sino estar presentes en las etapas más importantes de la vida de cada usuaria.',
  },
];

// ── BLOQUE 3: Objetivos estratégicos ────────────────────────────────────────
/**
 * Array de textos simples: la vista los numera automáticamente con el índice
 * del bucle, así que reordenarlos o agregar uno nuevo no obliga a renumerar
 * nada a mano.
 */
const objetivos = [
  'Diseñar e implementar una plataforma informativa con contenido confiable sobre salud femenina y un directorio de profesionales.',
  'Seleccionar y distribuir productos de bienestar femenino que ayuden a aliviar síntomas físicos durante los procesos hormonales.',
  'Desarrollar espacios de acompañamiento emocional —foros y diarios personalizados— que fomenten el autocuidado y la educación.',
  'Establecer alianzas estratégicas con profesionales de la salud para fortalecer la credibilidad del servicio.',
  'Posicionar la empresa como una marca innovadora, confiable y empática dentro del sector de salud y bienestar femenino.',
];

module.exports = { equipo, valores, objetivos };
